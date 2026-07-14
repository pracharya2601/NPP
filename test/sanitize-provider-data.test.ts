import { describe, expect, it } from 'vitest';
import { sanitizeProviderData, sanitizedProviderRecord } from '../src/providers/sanitize-provider-data';

describe('provider response sanitization', () => {
  it('redacts credentials, customer data, signatures, and signed URLs recursively', () => {
    expect(sanitizeProviderData({
      status: 'Completed',
      transaction_id: 'txn-1',
      payment_url: 'https://provider.example/secret-link',
      customer_info: { email: 'customer@example.com', mobile: '9800000000' },
      nested: { signature: 'signed-value', dataValidation: 'hmac', total_amount: 1000 },
      qrMessage: '000201secret-qr-payload',
      thirdpartyQrWebSocketUrl: 'wss://provider.example/secret-capability',
    })).toEqual({
      status: 'Completed',
      transaction_id: 'txn-1',
      payment_url: '[REDACTED]',
      customer_info: '[REDACTED]',
      nested: { signature: '[REDACTED]', dataValidation: '[REDACTED]', total_amount: 1000 },
      qrMessage: '[REDACTED]',
      thirdpartyQrWebSocketUrl: '[REDACTED]',
    });
  });

  it('returns only object records for entity storage', () => {
    expect(sanitizedProviderRecord('response')).toBeNull();
    expect(sanitizedProviderRecord({ status: 'Pending' })).toEqual({ status: 'Pending' });
  });
});
