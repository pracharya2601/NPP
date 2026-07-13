# Adding a provider

Provider contributions are welcome when based on official, shareable documentation.

## 1. Extend the provider type

Add the provider code to `NEPAL_PAYMENT_PROVIDERS` in `src/types.ts`. Treat this as a public API change and update `CHANGELOG.md`.

## 2. Implement `NepalPaymentProvider`

Create `src/providers/<provider>.provider.ts` implementing:

```ts
interface NepalPaymentProvider {
  readonly code: NepalPaymentProviderCode;
  initiate(input: InitiatePaymentInput): Promise<PaymentInitiation>;
  verify(input: VerifyPaymentInput): Promise<VerifiedPayment>;
  refund?(input: RefundPaymentInput): Promise<RefundResult>;
}
```

The adapter must:

- use fixed sandbox and production base URLs;
- keep credentials server-side;
- set bounded network timeouts;
- reject unexpected redirects;
- validate provider reference, merchant reference, exact amount, and currency where available;
- map only documented terminal success states to `settled`;
- preserve unknown states as `unknown` or `pending`;
- return sanitized response data suitable for restricted operational logs/storage.

Do not use floating-point money calculations.

## 3. Add configuration

Add a provider options interface in `src/config.ts`, validate required values at bootstrap, and document every option in `docs/CONFIGURATION.md` and `.env.example`.

## 4. Register the provider

Update `createProvider()` and add a dedicated Vendure `PaymentMethodHandler`. The handler must validate the settlement proof and perform its own provider lookup.

Refund support is optional. If no verified API exists, omit `createRefund` and document the manual process.

## 5. Add GraphQL and callback support

Update the GraphQL enum and ensure the provider can use the shared callback route. If a provider requires a webhook with different authentication, add a narrowly scoped controller and document it.

## 6. Test the contract

Unit tests must cover:

- initiation payload and authorization headers without revealing real credentials;
- successful verification;
- pending, failed, cancelled, expired, refunded, and unknown mappings;
- mismatched amount and references;
- malformed responses;
- network errors and timeouts;
- full and partial refunds, if supported.

An end-to-end sandbox test plan is required before marking the provider production-ready.

## 7. Document and release

Update:

- root `README.md` support matrix;
- `docs/PROVIDERS.md` with official links;
- `docs/INSTALLATION.md` payment method and environment setup;
- `docs/STOREFRONT.md` for any unique UI behavior;
- `CHANGELOG.md`;
- package keywords when appropriate.

Never commit private provider manuals unless their license expressly permits redistribution.
