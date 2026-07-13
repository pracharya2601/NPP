import { Injectable } from '@nestjs/common';
import { RequestContext, TransactionalConnection } from '@vendure/core';
import { In, LessThan } from 'typeorm';
import { NepalPaymentAttempt } from '../entities/payment-attempt.entity';
import { PaymentOrchestratorService } from './payment-orchestrator.service';

@Injectable()
export class ReconciliationService {
  constructor(
    private readonly connection: TransactionalConnection,
    private readonly orchestrator: PaymentOrchestratorService,
  ) {}

  async reconcile(ctx: RequestContext, limit = 50): Promise<{ checked: number; settled: number }> {
    const repository = this.connection.getRepository(ctx, NepalPaymentAttempt);
    const staleBefore = new Date(Date.now() - 5 * 60_000);
    await repository.update({ status: 'verifying', updatedAt: LessThan(staleBefore) }, { status: 'pending' });
    const attempts = await repository.find({
      where: {
        status: In(['initiated', 'pending', 'unknown']),
        updatedAt: LessThan(new Date(Date.now() - 30_000)),
      },
      order: { updatedAt: 'ASC' },
      take: Math.max(1, Math.min(limit, 200)),
    });
    let settled = 0;
    for (const attempt of attempts) {
      try {
        const result = await this.orchestrator.processCallback(attempt.provider, attempt.merchantReference, {});
        if (result.status === 'settled') settled += 1;
      } catch {
        // A future run will retry attempts that remain pending.
      }
    }
    return { checked: attempts.length, settled };
  }
}
