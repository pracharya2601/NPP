import type { CurrencyCode, ID } from '@vendure/core';

export const NEPAL_PAYMENT_PROVIDERS = ['khalti', 'esewa', 'fonepay'] as const;
/** Provider identifiers used by the shared adapter layer. */
export type NepalPaymentProviderCode = (typeof NEPAL_PAYMENT_PROVIDERS)[number];

export const PAYMENT_ATTEMPT_STATUSES = [
  'initiated',
  'pending',
  'settled',
  'failed',
  'cancelled',
  'expired',
  'partially-refunded',
  'refunded',
  'unknown',
] as const;
/** Conservative normalized payment states shared across providers. */
export type PaymentAttemptStatus = (typeof PAYMENT_ATTEMPT_STATUSES)[number];

/** Optional customer fields accepted by provider initiation APIs. */
export interface CustomerDetails {
  name?: string;
  email?: string;
  phone?: string;
}

/** Provider-neutral initiation input created from the active Vendure order. */
export interface InitiatePaymentInput {
  attemptId: string;
  orderId: ID;
  orderCode: string;
  amount: number;
  currencyCode: CurrencyCode;
  returnUrl: string;
  customer?: CustomerDetails;
}

/** Provider-neutral redirect, QR, or signed-form initiation result. */
export interface PaymentInitiation {
  providerReference: string;
  redirectUrl?: string;
  qrPayload?: string;
  form?: {
    action: string;
    fields: Array<{ name: string; value: string }>;
  };
  expiresAt?: Date;
  raw?: unknown;
}

/** Input used for a trusted server-to-server payment verification. */
export interface VerifyPaymentInput {
  merchantReference: string;
  providerReference?: string;
  amount: number;
  callbackPayload?: Record<string, unknown>;
}

/** Normalized result of a provider status lookup. */
export interface VerifiedPayment {
  providerReference?: string;
  transactionId?: string;
  amount: number;
  status: PaymentAttemptStatus;
  raw?: unknown;
}

/** Provider-neutral refund request. */
export interface RefundPaymentInput {
  transactionId: string;
  amount?: number;
  mobile?: string;
}

/** Normalized result of a provider refund request. */
export interface RefundResult {
  transactionId?: string;
  status: 'settled' | 'pending' | 'failed';
  raw?: unknown;
}

/**
 * Contract implemented by Nepalese payment provider adapters.
 *
 * This interface is exported for experimentation but may evolve before 1.0.
 */
export interface NepalPaymentProvider {
  readonly code: NepalPaymentProviderCode;
  initiate(input: InitiatePaymentInput): Promise<PaymentInitiation>;
  verify(input: VerifyPaymentInput): Promise<VerifiedPayment>;
  refund?(input: RefundPaymentInput): Promise<RefundResult>;
}
