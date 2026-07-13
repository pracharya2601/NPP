import { createHmac, timingSafeEqual } from 'node:crypto';

export function hmacSha256Base64(message: string, secret: string): string {
  return createHmac('sha256', secret).update(message, 'utf8').digest('base64');
}

export function secureStringEqual(left: string, right: string): boolean {
  const a = Buffer.from(left, 'utf8');
  const b = Buffer.from(right, 'utf8');
  return a.length === b.length && timingSafeEqual(a, b);
}

export function signSettlementProof(input: {
  provider: string;
  attemptId: string;
  orderId: string;
  amount: number;
  providerReference: string;
}, secret: string): string {
  return hmacSha256Base64(
    [input.provider, input.attemptId, input.orderId, input.amount, input.providerReference].join('|'),
    secret,
  );
}
