import { Injectable } from '@nestjs/common';
import {
  ActiveOrderService,
  isGraphQlErrorResult,
  OrderService,
  PaymentMethodService,
  RequestContext,
  RequestContextService,
  TransactionalConnection,
} from '@vendure/core';
import { randomUUID } from 'node:crypto';
import { In } from 'typeorm';
import { defaultPaymentMethodCodes, getPluginOptions } from '../config';
import { NepalPaymentAttempt } from '../entities/payment-attempt.entity';
import { createProvider } from '../providers/provider.factory';
import { sanitizedProviderRecord } from '../providers/sanitize-provider-data';
import { signSettlementProof } from '../providers/signing';
import type { NepalPaymentProviderCode, PaymentInitiation } from '../types';

export interface InitiatedPayment extends PaymentInitiation {
  attemptId: string;
  provider: NepalPaymentProviderCode;
  status: string;
}

@Injectable()
export class PaymentOrchestratorService {
  constructor(
    private readonly connection: TransactionalConnection,
    private readonly activeOrderService: ActiveOrderService,
    private readonly orderService: OrderService,
    private readonly paymentMethodService: PaymentMethodService,
    private readonly requestContextService: RequestContextService,
  ) {}

  async initiate(ctx: RequestContext, providerCode: NepalPaymentProviderCode): Promise<InitiatedPayment> {
    const order = await this.activeOrderService.getActiveOrder(ctx, undefined);
    if (!order) throw new Error('No active order exists');
    if (order.state !== 'ArrangingPayment') {
      throw new Error(`Order must be in ArrangingPayment, but is in ${order.state}`);
    }
    if (order.currencyCode !== 'NPR') throw new Error('Nepal payment providers require NPR');

    const repository = this.connection.getRepository(ctx, NepalPaymentAttempt);
    const existing = await repository.findOne({
      where: {
        orderId: String(order.id),
        provider: providerCode,
        status: In(['initiated', 'pending']),
      },
      order: { createdAt: 'DESC' },
    });
    if (existing && (!existing.expiresAt || existing.expiresAt > new Date())) {
      throw new Error(`An active ${providerCode} payment attempt already exists: ${existing.id}`);
    }

    const attemptId = randomUUID();
    const options = getPluginOptions();
    const providerOptions = options[providerCode];
    const paymentMethodCode = providerOptions?.paymentMethodCode ?? defaultPaymentMethodCodes[providerCode];
    const provider = createProvider(providerCode);
    const eligibleMethods = await this.paymentMethodService.getEligiblePaymentMethods(ctx, order);
    if (!eligibleMethods.some(method => method.code === paymentMethodCode)) {
      throw new Error(`Payment method "${paymentMethodCode}" is not eligible for this order`);
    }
    const attempt = repository.create({
      orderId: String(order.id),
      orderCode: order.code,
      channelId: String(ctx.channelId),
      channelToken: ctx.channel.token,
      provider: providerCode,
      paymentMethodCode,
      merchantReference: attemptId,
      providerReference: null,
      amount: order.totalWithTax,
      currencyCode: order.currencyCode,
      status: 'initiated',
      idempotencyKey: `${providerCode}:${attemptId}`,
      expiresAt: undefined,
      verifiedAt: undefined,
      providerTransactionId: null,
      vendurePaymentId: null,
      providerResponse: null,
    });
    await repository.save(attempt);

    try {
      const initiation = await provider.initiate({
        attemptId,
        orderId: order.id,
        orderCode: order.code,
        amount: order.totalWithTax,
        currencyCode: order.currencyCode,
        returnUrl: `${options.publicServerUrl.replace(/\/$/, '')}/nepal-payments/callback/${providerCode}/${attemptId}`,
        customer: order.customer ? {
          name: `${order.customer.firstName} ${order.customer.lastName}`.trim(),
          email: order.customer.emailAddress,
          phone: order.customer.phoneNumber,
        } : undefined,
      });
      attempt.providerReference = initiation.providerReference;
      attempt.expiresAt = initiation.expiresAt;
      attempt.providerResponse = sanitizedProviderRecord(initiation.raw);
      await repository.save(attempt);
      return { ...initiation, attemptId, provider: providerCode, status: attempt.status };
    } catch (error) {
      attempt.status = 'failed';
      attempt.providerResponse = { error: error instanceof Error ? error.message : 'Initiation failed' };
      await repository.save(attempt);
      throw error;
    }
  }

  async processCallback(
    providerCode: NepalPaymentProviderCode,
    attemptId: string,
    callbackPayload: Record<string, unknown>,
  ): Promise<NepalPaymentAttempt> {
    const rawRepository = this.connection.rawConnection.getRepository(NepalPaymentAttempt);
    let attempt = await rawRepository.findOne({ where: { merchantReference: attemptId, provider: providerCode } });
    if (!attempt) throw new Error('Payment attempt was not found');
    if (attempt.status === 'settled' || attempt.status === 'refunded' || attempt.status === 'partially-refunded') {
      return attempt;
    }

    const claim = await rawRepository.createQueryBuilder()
      .update(NepalPaymentAttempt)
      .set({ status: 'verifying' })
      .where('id = :id', { id: attempt.id })
      .andWhere('status IN (:...statuses)', { statuses: ['initiated', 'pending', 'unknown', 'failed'] })
      .execute();
    if (!claim.affected) {
      return (await rawRepository.findOneByOrFail({ id: attempt.id }));
    }

    try {
      const verified = await createProvider(providerCode).verify({
        merchantReference: attempt.merchantReference,
        providerReference: attempt.providerReference ?? undefined,
        amount: attempt.amount,
        callbackPayload,
      });
      if (verified.amount !== attempt.amount) {
        throw new Error('Verified payment amount does not match the payment attempt');
      }
      attempt.status = verified.status;
      attempt.providerTransactionId = verified.transactionId ?? null;
      attempt.providerResponse = sanitizedProviderRecord(verified.raw);
      if (verified.status !== 'settled') {
        await rawRepository.save(attempt);
        return attempt;
      }

      const ctx = await this.requestContextService.create({
        apiType: 'shop',
        channelOrToken: attempt.channelToken,
        activeOrderId: attempt.orderId,
      });
      const proof = signSettlementProof({
        provider: providerCode,
        attemptId: attempt.merchantReference,
        orderId: attempt.orderId,
        amount: attempt.amount,
        providerReference: attempt.providerReference ?? verified.providerReference ?? '',
      }, getPluginOptions().internalSigningSecret);
      const result = await this.orderService.addPaymentToOrder(ctx, attempt.orderId, {
        method: attempt.paymentMethodCode,
        metadata: {
          attemptId: attempt.merchantReference,
          providerReference: attempt.providerReference ?? verified.providerReference,
          proof,
        },
      });
      if (isGraphQlErrorResult(result)) {
        throw new Error(result.message);
      }
      attempt.status = 'settled';
      attempt.verifiedAt = new Date();
      const payment = result.payments?.find(item => item.metadata?.public?.attemptId === attempt.merchantReference);
      attempt.vendurePaymentId = payment ? String(payment.id) : null;
      await rawRepository.save(attempt);
      return attempt;
    } catch (error) {
      attempt.status = 'pending';
      attempt.providerResponse = { error: error instanceof Error ? error.message : 'Callback processing failed' };
      await rawRepository.save(attempt);
      throw error;
    }
  }
}
