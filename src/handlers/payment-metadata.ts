import type { PaymentMetadata } from '@vendure/core';

export interface NepalSettlementMetadata extends PaymentMetadata {
  attemptId: string;
  providerReference: string;
  proof: string;
}

export function readSettlementMetadata(metadata: PaymentMetadata): NepalSettlementMetadata {
  const input = metadata as Partial<NepalSettlementMetadata>;
  if (
    typeof input.attemptId !== 'string' ||
    typeof input.providerReference !== 'string' ||
    typeof input.proof !== 'string'
  ) {
    throw new Error('Missing authenticated Nepal payment settlement metadata');
  }
  return input as NepalSettlementMetadata;
}
