import type { KhaltiPluginOptions } from '../config';
import type {
  InitiatePaymentInput,
  NepalPaymentProvider,
  PaymentInitiation,
  RefundPaymentInput,
  RefundResult,
  VerifiedPayment,
  VerifyPaymentInput,
} from '../types';
import { PaymentHttpClient } from './http-client';

interface KhaltiInitiateResponse {
  pidx: string;
  payment_url: string;
  expires_at?: string;
}

interface KhaltiLookupResponse {
  pidx: string;
  total_amount: number;
  status: string;
  transaction_id?: string | null;
  fee?: number;
  refunded?: boolean;
}

export class KhaltiProvider implements NepalPaymentProvider {
  readonly code = 'khalti' as const;
  private readonly baseUrl: string;

  constructor(
    private readonly options: KhaltiPluginOptions,
    private readonly http = new PaymentHttpClient(),
  ) {
    this.baseUrl = options.environment === 'production'
      ? 'https://khalti.com/api/v2'
      : 'https://dev.khalti.com/api/v2';
  }

  async initiate(input: InitiatePaymentInput): Promise<PaymentInitiation> {
    const response = await this.http.request<KhaltiInitiateResponse>(`${this.baseUrl}/epayment/initiate/`, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify({
        return_url: input.returnUrl,
        website_url: this.options.websiteUrl,
        amount: input.amount,
        purchase_order_id: input.attemptId,
        purchase_order_name: `Order ${input.orderCode}`,
        customer_info: input.customer,
      }),
    });
    if (!response.pidx || !response.payment_url) {
      throw new Error('Khalti initiation response is missing pidx or payment_url');
    }
    return {
      providerReference: response.pidx,
      redirectUrl: response.payment_url,
      expiresAt: response.expires_at ? new Date(response.expires_at) : undefined,
      raw: response,
    };
  }

  async verify(input: VerifyPaymentInput): Promise<VerifiedPayment> {
    if (!input.providerReference) throw new Error('Khalti verification requires pidx');
    const response = await this.http.request<KhaltiLookupResponse>(`${this.baseUrl}/epayment/lookup/`, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify({ pidx: input.providerReference }),
    });
    if (response.pidx !== input.providerReference) {
      throw new Error('Khalti lookup reference does not match the payment attempt');
    }
    return {
      providerReference: response.pidx,
      transactionId: response.transaction_id ?? undefined,
      amount: response.total_amount,
      status: mapKhaltiStatus(response.status),
      raw: response,
    };
  }

  async refund(input: RefundPaymentInput): Promise<RefundResult> {
    const base = this.options.environment === 'production' ? 'https://khalti.com/api' : 'https://dev.khalti.com/api';
    const body: Record<string, number | string> = {};
    if (input.amount != null) body.amount = input.amount;
    if (input.mobile) body.mobile = input.mobile;
    const response = await this.http.request<Record<string, unknown>>(
      `${base}/merchant-transaction/${encodeURIComponent(input.transactionId)}/refund/`,
      { method: 'POST', headers: this.headers(), body: JSON.stringify(body) },
    );
    return { status: 'settled', transactionId: input.transactionId, raw: response };
  }

  private headers(): Record<string, string> {
    return {
      Authorization: `Key ${this.options.secretKey}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };
  }
}

export function mapKhaltiStatus(status: string) {
  switch (status.trim().toLowerCase()) {
    case 'completed': return 'settled' as const;
    case 'pending':
    case 'initiated': return 'pending' as const;
    case 'refunded': return 'refunded' as const;
    case 'partially refunded': return 'partially-refunded' as const;
    case 'expired': return 'expired' as const;
    case 'user canceled':
    case 'cancelled':
    case 'canceled': return 'cancelled' as const;
    case 'failed': return 'failed' as const;
    default: return 'unknown' as const;
  }
}
