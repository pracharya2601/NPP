import { describe, expect, it } from 'vitest';
import { secureStringEqual, signSettlementProof } from '../src/providers/signing';

describe('settlement proof', () => {
  it('binds provider transaction data to a Vendure order', () => {
    const input = { provider: 'khalti', attemptId: 'a', orderId: '1', amount: 1000, providerReference: 'p' };
    const proof = signSettlementProof(input, 'a-secure-secret-that-is-long-enough');
    expect(secureStringEqual(proof, signSettlementProof(input, 'a-secure-secret-that-is-long-enough'))).toBe(true);
    expect(secureStringEqual(proof, signSettlementProof({ ...input, orderId: '2' }, 'a-secure-secret-that-is-long-enough'))).toBe(false);
  });
});
