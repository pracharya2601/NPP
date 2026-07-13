import { LanguageCode, PaymentMethodHandler } from '@vendure/core';
import { getPluginOptions } from '../config';
import type { NepalPaymentProviderCode } from '../types';
import { createProvider } from '../providers/provider.factory';
import { secureStringEqual, signSettlementProof } from '../providers/signing';
import { readSettlementMetadata } from './payment-metadata';

function createHandler(providerCode: NepalPaymentProviderCode, displayName: string, withRefund: boolean) {
  return new PaymentMethodHandler({
    code: `nepal-${providerCode}`,
    description: [{ languageCode: LanguageCode.en, value: displayName }],
    args: {},
    createPayment: async (ctx, order, amount, _args, metadata) => {
      try {
        const input = readSettlementMetadata(metadata);
        const expectedProof = signSettlementProof({
          provider: providerCode,
          attemptId: input.attemptId,
          orderId: String(order.id),
          amount,
          providerReference: input.providerReference,
        }, getPluginOptions().internalSigningSecret);
        if (!secureStringEqual(input.proof, expectedProof)) {
          throw new Error('Invalid settlement proof');
        }
        const verified = await createProvider(providerCode).verify({
          merchantReference: input.attemptId,
          providerReference: input.providerReference,
          amount,
        });
        if (verified.status !== 'settled') {
          throw new Error(`${displayName} payment is ${verified.status}, not settled`);
        }
        if (verified.amount !== amount) {
          throw new Error(`${displayName} verified amount does not match the order`);
        }
        return {
          amount,
          state: 'Settled' as const,
          transactionId: verified.transactionId ?? verified.providerReference ?? input.providerReference,
          metadata: {
            provider: providerCode,
            providerReference: input.providerReference,
            public: { attemptId: input.attemptId, provider: providerCode },
          },
        };
      } catch (error) {
        return {
          amount,
          state: 'Declined' as const,
          errorMessage: error instanceof Error ? error.message : 'Payment verification failed',
          metadata: { provider: providerCode },
        };
      }
    },
    settlePayment: async () => ({ success: true as const }),
    ...(withRefund ? {
      createRefund: async (_ctx: unknown, _input: unknown, amount: number, _order: unknown, payment: { transactionId: string; amount: number }) => {
        try {
          const result = await createProvider(providerCode).refund?.({
            transactionId: payment.transactionId,
            amount: amount < payment.amount ? amount : undefined,
          });
          if (!result || result.status === 'failed') return { state: 'Failed' as const };
          return {
            state: result.status === 'settled' ? 'Settled' as const : 'Pending' as const,
            transactionId: result.transactionId,
          };
        } catch (error) {
          return {
            state: 'Failed' as const,
            metadata: { errorMessage: error instanceof Error ? error.message : 'Refund failed' },
          };
        }
      },
    } : {}),
  });
}

export const khaltiPaymentHandler = createHandler('khalti', 'Khalti by IME', true);
export const esewaPaymentHandler = createHandler('esewa', 'eSewa', false);
