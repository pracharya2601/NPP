import { createHash } from 'node:crypto';
import type { FonepayPluginOptions } from '../config';
import type {
  InitiatePaymentInput,
  NepalPaymentProvider,
  PaymentAttemptStatus,
  PaymentInitiation,
  VerifiedPayment,
  VerifyPaymentInput,
} from '../types';
import { minorUnitsToDecimal } from './amount';
import { PaymentHttpClient } from './http-client';
import { hmacSha512Hex } from './signing';

const QR_PATH = '/merchant/merchantDetailsForThirdParty/thirdPartyDynamicQrDownload';
const STATUS_PATH = '/merchant/merchantDetailsForThirdParty/thirdPartyDynamicQrGetStatus';

interface FonepayQrResponse {
  message?: string;
  qrMessage?: string;
  status?: string;
  statusCode?: number;
  success?: boolean;
  thirdpartyQrWebSocketUrl?: string;
  documentation?: string;
  errorCode?: number;
}

interface FonepayStatusResponse {
  fonepayTraceId?: number | string;
  merchantCode?: string;
  paymentStatus?: string;
  prn?: string;
}

/** Experimental adapter for Fonepay's merchant Dynamic QR protocol. */
export class FonepayProvider implements NepalPaymentProvider {
  readonly code = 'fonepay' as const;
  private readonly baseUrl: string;

  constructor(
    private readonly options: FonepayPluginOptions,
    private readonly http = new PaymentHttpClient(),
  ) {
    this.baseUrl = options.environment === 'production'
      ? 'https://merchantapi.fonepay.com/api'
      : 'https://dev-merchantapi.fonepay.com/convergent-merchant-web/api';
  }

  async initiate(input: InitiatePaymentInput): Promise<PaymentInitiation> {
    const amount = minorUnitsToDecimal(input.amount);
    const prn = createFonepayPrn(input.attemptId);
    const remarks1 = normalizeFonepayRemark(`Order ${input.orderCode}`, 'Vendure order');
    const remarks2 = normalizeFonepayRemark('Online payment', 'Payment');
    const message = [amount, prn, this.options.merchantCode, remarks1, remarks2].join(',');
    const response = await this.http.request<FonepayQrResponse>(`${this.baseUrl}${QR_PATH}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        amount,
        remarks1,
        remarks2,
        prn,
        merchantCode: this.options.merchantCode,
        dataValidation: hmacSha512Hex(message, this.options.secretKey),
        username: this.options.username,
        password: this.options.password,
      }),
    });

    if (response.success !== true || response.status?.trim().toUpperCase() !== 'CREATED') {
      throw new Error(`Fonepay QR creation failed${response.message ? `: ${response.message}` : ''}`);
    }
    if (!response.qrMessage || !response.thirdpartyQrWebSocketUrl) {
      throw new Error('Fonepay QR response is missing qrMessage or WebSocket URL');
    }
    assertFonepayWebSocketUrl(response.thirdpartyQrWebSocketUrl, this.options.environment);

    return {
      providerReference: prn,
      qrPayload: response.qrMessage,
      raw: response,
    };
  }

  async verify(input: VerifyPaymentInput): Promise<VerifiedPayment> {
    if (!input.providerReference) throw new Error('Fonepay verification requires a PRN');
    if (!/^[a-f0-9]{20}$/.test(input.providerReference)) {
      throw new Error('Fonepay PRN has an invalid format');
    }
    const prn = input.providerReference;
    if (prn !== createFonepayPrn(input.merchantReference)) {
      throw new Error('Fonepay PRN is not bound to the payment attempt');
    }
    const message = `${prn},${this.options.merchantCode}`;
    const response = await this.http.request<FonepayStatusResponse>(`${this.baseUrl}${STATUS_PATH}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        prn,
        merchantCode: this.options.merchantCode,
        dataValidation: hmacSha512Hex(message, this.options.secretKey),
        username: this.options.username,
        password: this.options.password,
      }),
    });

    if (response.prn !== prn) {
      throw new Error('Fonepay status PRN does not match the payment attempt');
    }
    if (response.merchantCode !== this.options.merchantCode) {
      throw new Error('Fonepay status merchant code does not match the configured merchant');
    }
    const status = mapFonepayStatus(response.paymentStatus ?? '');
    if (status === 'settled' && response.fonepayTraceId == null) {
      throw new Error('Fonepay successful status is missing the trace ID');
    }

    return {
      providerReference: prn,
      transactionId: response.fonepayTraceId == null ? undefined : String(response.fonepayTraceId),
      // Fonepay's documented status response binds status to the signed, unique
      // initiation PRN but does not echo the amount. The attempt retains the
      // exact immutable amount used in that signed initiation request.
      amount: input.amount,
      status,
      raw: response,
    };
  }
}

export function createFonepayPrn(attemptId: string): string {
  if (!attemptId) throw new Error('Fonepay PRN requires a payment attempt ID');
  return createHash('sha256').update(attemptId, 'utf8').digest('hex').slice(0, 20);
}

export function normalizeFonepayRemark(value: string, fallback: string): string {
  const normalized = value
    .normalize('NFKD')
    .replace(/[^A-Za-z0-9 ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 25)
    .trim();
  return normalized || fallback.slice(0, 25);
}

export function mapFonepayStatus(status: string): PaymentAttemptStatus {
  switch (status.trim().toLowerCase()) {
    case 'success':
    case 'successful':
    case 'complete':
    case 'completed': return 'settled';
    case 'pending':
    case 'created':
    case 'initiated': return 'pending';
    case 'cancelled':
    case 'canceled': return 'cancelled';
    case 'expired': return 'expired';
    case 'failed':
    case 'failure': return 'failed';
    default: return 'unknown';
  }
}

function assertFonepayWebSocketUrl(value: string, environment: FonepayPluginOptions['environment']): void {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error('Fonepay returned an invalid WebSocket URL');
  }
  const expectedHost = environment === 'production' ? 'ws.fonepay.com' : 'dev-ws.fonepay.com';
  if (url.protocol !== 'wss:' || url.hostname !== expectedHost || url.username || url.password) {
    throw new Error('Fonepay returned an untrusted WebSocket URL');
  }
}
