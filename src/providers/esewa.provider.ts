import type { EsewaPluginOptions } from '../config';
import type {
  InitiatePaymentInput,
  NepalPaymentProvider,
  PaymentInitiation,
  VerifiedPayment,
  VerifyPaymentInput,
} from '../types';
import { decimalToMinorUnits, minorUnitsToDecimal } from './amount';
import { PaymentHttpClient } from './http-client';
import { hmacSha256Base64, secureStringEqual } from './signing';

interface EsewaStatusResponse {
  product_code: string;
  transaction_uuid: string;
  total_amount: number | string;
  status: string;
  ref_id?: string | null;
}

export class EsewaProvider implements NepalPaymentProvider {
  readonly code = 'esewa' as const;
  private readonly formUrl: string;
  private readonly statusUrl: string;

  constructor(
    private readonly options: EsewaPluginOptions,
    private readonly http = new PaymentHttpClient(),
  ) {
    const production = options.environment === 'production';
    this.formUrl = production
      ? 'https://epay.esewa.com.np/api/epay/main/v2/form'
      : 'https://rc-epay.esewa.com.np/api/epay/main/v2/form';
    this.statusUrl = production
      ? 'https://esewa.com.np/api/epay/transaction/status/'
      : 'https://rc.esewa.com.np/api/epay/transaction/status/';
  }

  async initiate(input: InitiatePaymentInput): Promise<PaymentInitiation> {
    const totalAmount = minorUnitsToDecimal(input.amount);
    const signedFieldNames = 'total_amount,transaction_uuid,product_code';
    const message = `total_amount=${totalAmount},transaction_uuid=${input.attemptId},product_code=${this.options.productCode}`;
    const fields = {
      amount: totalAmount,
      tax_amount: '0.00',
      total_amount: totalAmount,
      transaction_uuid: input.attemptId,
      product_code: this.options.productCode,
      product_service_charge: '0.00',
      product_delivery_charge: '0.00',
      success_url: `${input.returnUrl}?outcome=success`,
      failure_url: `${input.returnUrl}?outcome=failure`,
      signed_field_names: signedFieldNames,
      signature: hmacSha256Base64(message, this.options.secretKey),
    };
    return {
      providerReference: input.attemptId,
      form: {
        action: this.formUrl,
        fields: Object.entries(fields).map(([name, value]) => ({ name, value })),
      },
    };
  }

  async verify(input: VerifyPaymentInput): Promise<VerifiedPayment> {
    if (input.callbackPayload?.data) {
      this.verifyCallbackData(String(input.callbackPayload.data), input.merchantReference, input.amount);
    }
    const params = new URLSearchParams({
      product_code: this.options.productCode,
      total_amount: minorUnitsToDecimal(input.amount),
      transaction_uuid: input.merchantReference,
    });
    const response = await this.http.request<EsewaStatusResponse>(`${this.statusUrl}?${params}`, {
      method: 'GET',
      headers: { Accept: 'application/json' },
    });
    if (response.product_code !== this.options.productCode) {
      throw new Error('eSewa status product code does not match the merchant');
    }
    if (response.transaction_uuid !== input.merchantReference) {
      throw new Error('eSewa status transaction does not match the payment attempt');
    }
    return {
      providerReference: response.transaction_uuid,
      transactionId: response.ref_id ?? undefined,
      amount: decimalToMinorUnits(response.total_amount),
      status: mapEsewaStatus(response.status),
      raw: response,
    };
  }

  verifyCallbackData(data: string, merchantReference: string, expectedAmount: number): Record<string, unknown> {
    let payload: Record<string, unknown>;
    try {
      payload = JSON.parse(Buffer.from(data, 'base64').toString('utf8')) as Record<string, unknown>;
    } catch {
      throw new Error('Invalid eSewa callback data');
    }
    const fieldNames = String(payload.signed_field_names ?? '').split(',').filter(Boolean);
    if (fieldNames.length === 0 || !fieldNames.every(name => Object.hasOwn(payload, name))) {
      throw new Error('Invalid eSewa signed fields');
    }
    const message = fieldNames.map(name => `${name}=${String(payload[name])}`).join(',');
    const expectedSignature = hmacSha256Base64(message, this.options.secretKey);
    if (!secureStringEqual(String(payload.signature ?? ''), expectedSignature)) {
      throw new Error('Invalid eSewa callback signature');
    }
    if (String(payload.transaction_uuid) !== merchantReference) {
      throw new Error('eSewa callback transaction does not match the payment attempt');
    }
    if (decimalToMinorUnits(String(payload.total_amount)) !== expectedAmount) {
      throw new Error('eSewa callback amount does not match the order');
    }
    return payload;
  }
}

export function mapEsewaStatus(status: string) {
  switch (status.trim().toUpperCase()) {
    case 'COMPLETE':
    case 'SUCCESS': return 'settled' as const;
    case 'PENDING':
    case 'BOOKED':
    case 'AMBIGUOUS': return 'pending' as const;
    case 'FULL_REFUND':
    case 'REVERTED': return 'refunded' as const;
    case 'PARTIAL_REFUND': return 'partially-refunded' as const;
    case 'CANCELED':
    case 'CANCELLED': return 'cancelled' as const;
    case 'NOT_FOUND':
    case 'FAILED': return 'failed' as const;
    default: return 'unknown' as const;
  }
}
