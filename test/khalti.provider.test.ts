import { CurrencyCode } from '@vendure/core';
import { describe, expect, it, vi } from 'vitest';
import { KhaltiProvider, mapKhaltiStatus } from '../src/providers/khalti.provider';

describe('KhaltiProvider', () => {
  it('initiates KPG-2 with the exact minor-unit amount', async () => {
    const http = { request: vi.fn().mockResolvedValue({
      pidx: 'pidx-1', payment_url: 'https://pay.khalti.com/test',
    }) };
    const provider = new KhaltiProvider({
      secretKey: 'secret', websiteUrl: 'https://merchant.example', environment: 'sandbox',
    }, http as never);
    const result = await provider.initiate({
      attemptId: 'attempt-1', orderId: '1', orderCode: 'ORDER-1', amount: 12345,
      currencyCode: CurrencyCode.NPR, returnUrl: 'https://merchant.example/callback',
    });
    const request = http.request.mock.calls[0][1] as RequestInit;
    expect(JSON.parse(String(request.body))).toMatchObject({ amount: 12345, purchase_order_id: 'attempt-1' });
    expect(result.redirectUrl).toBe('https://pay.khalti.com/test');
  });

  it('maps lookup results', async () => {
    const http = { request: vi.fn().mockResolvedValue({
      pidx: 'pidx-2', total_amount: 5000, status: 'Completed', transaction_id: 'txn-2',
    }) };
    const provider = new KhaltiProvider({ secretKey: 'secret', websiteUrl: 'https://merchant.example' }, http as never);
    await expect(provider.verify({
      merchantReference: 'attempt-2', providerReference: 'pidx-2', amount: 5000,
    })).resolves.toMatchObject({ amount: 5000, status: 'settled', transactionId: 'txn-2' });
    expect(mapKhaltiStatus('Partially refunded')).toBe('partially-refunded');
    expect(mapKhaltiStatus('something new')).toBe('unknown');
  });

  it('rejects a lookup for another provider reference', async () => {
    const http = { request: vi.fn().mockResolvedValue({
      pidx: 'different-pidx', total_amount: 5000, status: 'Completed', transaction_id: 'txn-3',
    }) };
    const provider = new KhaltiProvider({ secretKey: 'secret', websiteUrl: 'https://merchant.example' }, http as never);
    await expect(provider.verify({
      merchantReference: 'attempt-3', providerReference: 'expected-pidx', amount: 5000,
    })).rejects.toThrow('reference');
  });

  it('sends an empty body for full refunds and an amount for partial refunds', async () => {
    const http = { request: vi.fn().mockResolvedValue({ detail: 'Transaction refund successful.' }) };
    const provider = new KhaltiProvider({ secretKey: 'secret', websiteUrl: 'https://merchant.example' }, http as never);
    await provider.refund({ transactionId: 'txn-full' });
    await provider.refund({ transactionId: 'txn-partial', amount: 7500 });
    expect(JSON.parse(String((http.request.mock.calls[0][1] as RequestInit).body))).toEqual({});
    expect(JSON.parse(String((http.request.mock.calls[1][1] as RequestInit).body))).toEqual({ amount: 7500 });
  });
});
