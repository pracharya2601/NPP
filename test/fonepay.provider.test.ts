import { describe, expect, it, vi } from 'vitest';
import {
  createFonepayPrn,
  FonepayProvider,
  mapFonepayStatus,
  normalizeFonepayRemark,
} from '../src/providers/fonepay.provider';
import { hmacSha512Hex } from '../src/providers/signing';

const options = {
  merchantCode: 'MERCHANT1',
  username: 'merchant-user',
  password: 'merchant-password',
  secretKey: 'merchant-secret',
} as const;

describe('FonepayProvider', () => {
  it('generates a stable HMAC-SHA512 hexadecimal test vector', () => {
    expect(hmacSha512Hex(
      '14.00,0123456789abcdef0123,MERCHANT1,Order 1001,Online payment',
      'test-fonepay-secret',
    )).toBe('9c7314eb4a37aade006b211a56ae169906728b449573b299aac83f681df6b96c7a0809f0693a555dfa6121996da819b04472d62af83d720929fb17befb4f85ac');
  });

  it('creates a compact deterministic PRN and signed Dynamic QR request', async () => {
    const request = vi.fn().mockResolvedValue({
      message: 'successful',
      qrMessage: '000201010212example',
      status: 'CREATED',
      statusCode: 201,
      success: true,
      thirdpartyQrWebSocketUrl: 'wss://dev-ws.fonepay.com/convergent-webSocket-web/merchantEndPoint/device/MERCHANT1/Y',
    });
    const provider = new FonepayProvider(options, { request } as never);
    const input = {
      attemptId: '5d76d323-d1f6-4a38-8231-0063f9581c98',
      orderId: 1,
      orderCode: 'ORDER-1001',
      amount: 1400,
      currencyCode: 'NPR',
      returnUrl: 'https://merchant.example/callback',
    } as const;

    const result = await provider.initiate(input as never);
    const prn = createFonepayPrn(input.attemptId);
    const body = JSON.parse(request.mock.calls[0][1].body) as Record<string, string>;

    expect(prn).toMatch(/^[a-f0-9]{20}$/);
    expect(result).toMatchObject({ providerReference: prn, qrPayload: '000201010212example' });
    expect(request.mock.calls[0][0]).toContain('/convergent-merchant-web/api/merchant/');
    expect(body).toMatchObject({
      amount: '14.00',
      prn,
      merchantCode: options.merchantCode,
      username: options.username,
      password: options.password,
    });
    expect(body.dataValidation).toBe(hmacSha512Hex(
      [body.amount, body.prn, body.merchantCode, body.remarks1, body.remarks2].join(','),
      options.secretKey,
    ));
    expect(body.dataValidation).toMatch(/^[a-f0-9]{128}$/);
  });

  it('verifies status using the stored PRN and configured merchant', async () => {
    const prn = createFonepayPrn('attempt-2');
    const request = vi.fn().mockResolvedValue({
      fonepayTraceId: 17404,
      merchantCode: options.merchantCode,
      paymentStatus: 'success',
      prn,
    });
    const provider = new FonepayProvider(options, { request } as never);

    const result = await provider.verify({
      merchantReference: 'attempt-2',
      providerReference: prn,
      amount: 1050,
    });
    const body = JSON.parse(request.mock.calls[0][1].body) as Record<string, string>;

    expect(result).toEqual(expect.objectContaining({
      providerReference: prn,
      transactionId: '17404',
      amount: 1050,
      status: 'settled',
    }));
    expect(body.dataValidation).toBe(hmacSha512Hex(`${prn},${options.merchantCode}`, options.secretKey));
  });

  it('rejects mismatched status references and merchants', async () => {
    const prn = createFonepayPrn('attempt-3');
    const wrongPrn = new FonepayProvider(options, {
      request: vi.fn().mockResolvedValue({ merchantCode: options.merchantCode, paymentStatus: 'success', prn: 'a'.repeat(20) }),
    } as never);
    await expect(wrongPrn.verify({ merchantReference: 'attempt-3', providerReference: prn, amount: 100 }))
      .rejects.toThrow('PRN');

    const wrongMerchant = new FonepayProvider(options, {
      request: vi.fn().mockResolvedValue({ merchantCode: 'OTHER', paymentStatus: 'success', prn }),
    } as never);
    await expect(wrongMerchant.verify({ merchantReference: 'attempt-3', providerReference: prn, amount: 100 }))
      .rejects.toThrow('merchant');
  });

  it('rejects a valid-looking PRN that is not bound to the attempt', async () => {
    const provider = new FonepayProvider(options, { request: vi.fn() } as never);
    await expect(provider.verify({
      merchantReference: 'attempt-expected',
      providerReference: createFonepayPrn('another-attempt'),
      amount: 100,
    })).rejects.toThrow('bound');
  });

  it('rejects a successful status without a provider trace ID', async () => {
    const prn = createFonepayPrn('attempt-no-trace');
    const provider = new FonepayProvider(options, {
      request: vi.fn().mockResolvedValue({ merchantCode: options.merchantCode, paymentStatus: 'success', prn }),
    } as never);
    await expect(provider.verify({
      merchantReference: 'attempt-no-trace',
      providerReference: prn,
      amount: 100,
    })).rejects.toThrow('trace ID');
  });

  it('rejects QR responses with an untrusted WebSocket host', async () => {
    const provider = new FonepayProvider(options, {
      request: vi.fn().mockResolvedValue({
        success: true,
        status: 'CREATED',
        qrMessage: 'qr-data',
        thirdpartyQrWebSocketUrl: 'wss://attacker.example/fonepay',
      }),
    } as never);
    await expect(provider.initiate({
      attemptId: 'attempt-4', orderId: 1, orderCode: 'O-4', amount: 100, currencyCode: 'NPR', returnUrl: 'https://example.com',
    } as never)).rejects.toThrow('untrusted');
  });

  it('normalizes remarks and maps only documented terminal states', () => {
    expect(normalizeFonepayRemark('Order #१२३ / test', 'Fallback')).toBe('Order test');
    expect(normalizeFonepayRemark('***', 'Fallback')).toBe('Fallback');
    expect(normalizeFonepayRemark('a'.repeat(40), 'Fallback')).toHaveLength(25);
    expect(mapFonepayStatus('success')).toBe('settled');
    expect(mapFonepayStatus('pending')).toBe('pending');
    expect(mapFonepayStatus('failed')).toBe('failed');
    expect(mapFonepayStatus('unexpected')).toBe('unknown');
  });
});
