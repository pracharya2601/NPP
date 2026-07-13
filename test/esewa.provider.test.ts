import { CurrencyCode } from '@vendure/core';
import { describe, expect, it, vi } from 'vitest';
import { EsewaProvider } from '../src/providers/esewa.provider';
import { hmacSha256Base64 } from '../src/providers/signing';

const options = {
  productCode: 'EPAYTEST',
  secretKey: '8gBm/:&EnhH.1/q(',
  environment: 'sandbox' as const,
};

describe('EsewaProvider', () => {
  it('creates a signed ePay form', async () => {
    const provider = new EsewaProvider(options);
    const result = await provider.initiate({
      attemptId: 'attempt-1', orderId: '1', orderCode: 'ORDER-1', amount: 11000,
      currencyCode: CurrencyCode.NPR, returnUrl: 'https://merchant.example/callback',
    });
    const fields = Object.fromEntries(result.form!.fields.map(field => [field.name, field.value]));
    expect(fields.total_amount).toBe('110.00');
    expect(fields.signature).toBe(hmacSha256Base64(
      'total_amount=110.00,transaction_uuid=attempt-1,product_code=EPAYTEST', options.secretKey,
    ));
  });

  it('validates signed callback data and verifies status server-side', async () => {
    const payload: Record<string, string | number> = {
      transaction_code: '000AWEO', status: 'COMPLETE', total_amount: '100.00',
      transaction_uuid: 'attempt-2', product_code: 'EPAYTEST',
      signed_field_names: 'transaction_code,status,total_amount,transaction_uuid,product_code,signed_field_names',
    };
    const message = String(payload.signed_field_names).split(',')
      .map(name => `${name}=${payload[name]}`).join(',');
    payload.signature = hmacSha256Base64(message, options.secretKey);
    const data = Buffer.from(JSON.stringify(payload)).toString('base64');
    const http = { request: vi.fn().mockResolvedValue({
      product_code: 'EPAYTEST', transaction_uuid: 'attempt-2', total_amount: 100,
      status: 'COMPLETE', ref_id: '000AWEO',
    }) };
    const provider = new EsewaProvider(options, http as never);
    const result = await provider.verify({
      merchantReference: 'attempt-2', providerReference: 'attempt-2', amount: 10000,
      callbackPayload: { data },
    });
    expect(result).toMatchObject({ amount: 10000, status: 'settled', transactionId: '000AWEO' });
    expect(http.request).toHaveBeenCalledOnce();
  });

  it('rejects a modified callback', () => {
    const provider = new EsewaProvider(options);
    const data = Buffer.from(JSON.stringify({
      total_amount: '100.00', transaction_uuid: 'attempt-3',
      signed_field_names: 'total_amount,transaction_uuid', signature: 'invalid',
    })).toString('base64');
    expect(() => provider.verifyCallbackData(data, 'attempt-3', 10000)).toThrow('signature');
  });

  it('rejects a status response for another transaction', async () => {
    const http = { request: vi.fn().mockResolvedValue({
      product_code: 'EPAYTEST', transaction_uuid: 'another-attempt', total_amount: 100,
      status: 'COMPLETE', ref_id: '000OTHER',
    }) };
    const provider = new EsewaProvider(options, http as never);
    await expect(provider.verify({ merchantReference: 'attempt-4', amount: 10000 }))
      .rejects.toThrow('transaction');
  });
});
