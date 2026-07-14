import { describe, expect, it } from 'vitest';
import { setPluginOptions } from '../src/config';

const valid = {
  publicServerUrl: 'https://api.example.com',
  storefrontResultUrl: 'https://shop.example.com/payment-result',
  internalSigningSecret: 'a-random-secret-with-at-least-32-characters',
  khalti: { secretKey: 'test-key', websiteUrl: 'https://shop.example.com' },
};

describe('plugin configuration', () => {
  it('accepts secure provider configuration', () => {
    expect(() => setPluginOptions(valid)).not.toThrow();
  });

  it('rejects insecure production URLs', () => {
    expect(() => setPluginOptions({ ...valid, publicServerUrl: 'http://api.example.com' }))
      .toThrow('HTTPS');
  });

  it('allows HTTP for local sandbox development', () => {
    expect(() => setPluginOptions({
      ...valid,
      publicServerUrl: 'http://localhost:3000',
      storefrontResultUrl: 'http://127.0.0.1:3001/payment-result',
    })).not.toThrow();
  });

  it('accepts Fonepay as the only configured provider', () => {
    expect(() => setPluginOptions({
      publicServerUrl: valid.publicServerUrl,
      storefrontResultUrl: valid.storefrontResultUrl,
      internalSigningSecret: valid.internalSigningSecret,
      fonepay: {
        merchantCode: 'merchant',
        username: 'username',
        password: 'password',
        secretKey: 'secret',
      },
    })).not.toThrow();
  });

  it('rejects incomplete Fonepay credentials', () => {
    expect(() => setPluginOptions({
      publicServerUrl: valid.publicServerUrl,
      storefrontResultUrl: valid.storefrontResultUrl,
      internalSigningSecret: valid.internalSigningSecret,
      fonepay: { merchantCode: 'merchant' } as never,
    })).toThrow('Fonepay');
  });
});
