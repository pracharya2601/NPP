import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { Allow, Ctx, Permission, RequestContext } from '@vendure/core';
import { PaymentOrchestratorService } from '../services/payment-orchestrator.service';
import type { NepalPaymentProviderCode } from '../types';

@Resolver()
export class NepalPaymentsShopResolver {
  constructor(private readonly orchestrator: PaymentOrchestratorService) {}

  @Mutation()
  @Allow(Permission.Owner)
  initiateNepalPayment(
    @Ctx() ctx: RequestContext,
    @Args() args: { provider: 'KHALTI' | 'ESEWA' | 'FONEPAY' },
  ) {
    return this.orchestrator.initiate(ctx, args.provider.toLowerCase() as NepalPaymentProviderCode);
  }
}
