# Fonepay Dynamic QR integration

Fonepay support was introduced in version 0.2.0 as an experimental provider. It is implemented and covered by automated contract tests, but it is not production-certified. Complete Fonepay or acquiring-bank onboarding and the live certification checklist below before enabling it for real payments.

## Implemented scope

- Dynamic QR initiation using a unique provider reference number (PRN).
- HMAC-SHA512 request signatures encoded as lowercase hexadecimal.
- EMV QR payload returned through `initiateNepalPayment().qrPayload`.
- Authenticated server-to-server PRN status lookup.
- Conservative `success`, `pending`, `failed`, `cancelled`, `expired`, and unknown status mapping.
- Scheduled reconciliation through the Vendure worker.
- Exact merchant-code, PRN-to-attempt, and successful trace-ID validation.
- Redaction of credentials, signatures, QR payloads, and provider WebSocket capability URLs before provider responses are persisted.

The first implementation does not use Fonepay WebSocket messages for settlement. It also does not implement ordinary refunds. The historical `thirdPartyPostTaxRefund` operation is an IRD/tax-reporting flow, not a general payment refund API.

## Merchant requirements

Obtain these values from Fonepay or the merchant's acquiring bank:

- merchant code;
- API username;
- API password;
- HMAC secret key;
- confirmed sandbox and production endpoint contract;
- permission to use Dynamic QR for the merchant account.

Never use credentials copied from public examples. Store merchant credentials in the Vendure deployment's secret manager or ignored environment file, not in source control, storefront code, issues, logs, or support messages.

## Plugin configuration

```ts
NepalPaymentsPlugin.init({
  publicServerUrl: process.env.PUBLIC_SERVER_URL!,
  storefrontResultUrl: process.env.STOREFRONT_PAYMENT_RESULT_URL!,
  internalSigningSecret: process.env.NEPAL_PAYMENTS_INTERNAL_SECRET!,
  fonepay: {
    environment: process.env.FONEPAY_ENVIRONMENT === 'production' ? 'production' : 'sandbox',
    merchantCode: process.env.FONEPAY_MERCHANT_CODE!,
    username: process.env.FONEPAY_USERNAME!,
    password: process.env.FONEPAY_PASSWORD!,
    secretKey: process.env.FONEPAY_SECRET_KEY!,
    paymentMethodCode: 'fonepay',
  },
})
```

Create a Vendure payment method with payment method code `fonepay` and select the `nepal-fonepay` handler. Assign it only to NPR channels.

## Protocol behavior

### Dynamic QR initiation

The adapter:

1. Derives a deterministic 20-character lowercase hexadecimal PRN from the internal UUID attempt ID.
2. Converts Vendure integer minor units into a two-decimal NPR amount.
3. Normalizes both mandatory remarks to the documented alphanumeric length limit.
4. Signs this exact comma-separated sequence:

   ```text
   amount,prn,merchantCode,remarks1,remarks2
   ```

5. Sends the request only from the Vendure server.
6. Requires a successful `CREATED` response, a non-empty QR payload, and an environment-appropriate `wss://` Fonepay WebSocket host.

The WebSocket URL is validated and redacted but is not returned to the storefront or used to authorize payment.

### Payment verification

The status request signs:

```text
prn,merchantCode
```

Before settlement, the adapter requires:

- the PRN to have the expected internal format;
- the PRN to be derived from the stored attempt ID;
- the response PRN to equal the stored PRN;
- the response merchant code to equal configured merchant code;
- a successful status to include a Fonepay trace ID.

The researched status response does not echo the amount. The plugin therefore binds the unique PRN to the immutable amount in the signed QR-initiation request and returns that locally stored amount only after the authenticated status lookup succeeds. The payment handler then performs a second lookup before Vendure records a `Settled` payment. Confirm the immutability of the initiated PRN/amount relationship in the current merchant agreement.

## Vendure and storefront lifecycle

1. The storefront moves the active order to `ArrangingPayment`.
2. It calls `initiateNepalPayment(provider: FONEPAY)`.
3. The server stores the attempt, creates the signed Dynamic QR, and returns `attemptId` plus `qrPayload`.
4. The storefront renders `qrPayload` locally.
5. The customer scans and completes payment using a compatible application.
6. The Vendure worker reconciles the attempt using Fonepay's status endpoint.
7. After successful verification, the plugin creates an authenticated internal settlement proof.
8. The `nepal-fonepay` payment handler independently checks Fonepay again.
9. Vendure creates the settled payment and advances the order through its normal state machine.

Poll the authoritative Vendure order/payment state with backoff while displaying the QR. Do not send the QR payload to a public QR-image service, connect the browser to the Fonepay WebSocket, or fulfill from a scan notification, screenshot, customer statement, or locally inferred status.

## Endpoint status observed on July 14, 2026

The adapter currently uses the researched sandbox base path:

```text
https://dev-merchantapi.fonepay.com/convergent-merchant-web/api
```

Both the Dynamic QR and status routes failed standard TLS verification during testing because the sandbox certificate was expired (`curl` verification result 10). No certificate bypass was used, and no authenticated sandbox request was attempted.

The corresponding production routes under this base responded with valid TLS and HTTP `405` to non-authenticated `HEAD` requests:

```text
https://merchantapi.fonepay.com/api
```

The `405` result is consistent with POST-only routes, but it does not certify the payload contract or merchant account. Do not use production merely because the routes are reachable. Contact Fonepay or the acquiring bank for a corrected sandbox certificate and confirmed endpoint path.

## Automated test coverage

The version 0.2.0 test suite contains eight focused Fonepay tests covering:

- deterministic hexadecimal HMAC-SHA512 output;
- compact PRN generation;
- exact signature field ordering;
- NPR decimal formatting;
- QR response and WebSocket-host validation;
- status request signing;
- PRN and merchant mismatch rejection;
- PRN-to-attempt binding;
- successful status trace-ID requirements;
- conservative status mapping and remark normalization.

The full suite contains 26 passing tests across Fonepay, Khalti, eSewa, configuration, amount conversion, sanitization, and settlement signing. These are isolated tests with mocked provider responses; they are not a substitute for merchant sandbox certification.

Run the checks with:

```bash
npm test -- --run test/fonepay.provider.test.ts
npm run check
npm pack --dry-run
```

## Live certification checklist

- [ ] Obtain merchant-issued sandbox credentials without sharing them publicly.
- [ ] Obtain a sandbox endpoint with a valid certificate and confirm the correct base path.
- [ ] Confirm whether QR initiation PRNs are limited to 20 characters.
- [ ] Confirm that amount and PRN are immutable after QR creation.
- [ ] Generate and scan a real sandbox QR.
- [ ] Verify successful, pending, failed, cancelled, and expired results.
- [ ] Verify decimal amounts and the smallest/largest merchant-supported amounts.
- [ ] Verify duplicate PRN handling.
- [ ] Verify reconciliation when no WebSocket message is received.
- [ ] Verify initiation and status timeouts without duplicate fulfillment.
- [ ] Confirm refund and tax-reporting procedures separately.
- [ ] Obtain Fonepay/acquiring-bank approval before production activation.

Record only sanitized evidence. Never commit credentials, raw QR payloads, WebSocket capability URLs, customer data, or private merchant documents.

## Research provenance and licensing

Fonepay's public website confirms Dynamic QR and merchant integration but directs merchants to Fonepay or partner banks for onboarding. Protocol research also reviewed the third-party [Fonepay implementation guide](https://github.com/shoesheill/Nepal.Payments.Gateways/blob/master/docs/FONEPAY-IMPLEMENTATION.md) and [historical integration PDF](https://github.com/shoesheill/Nepal.Payments.Gateways/blob/master/docs/Billing-3rdparty-Integration-Requirement.pdf).

Those third-party materials are not official current Fonepay documentation and contain inconsistencies. The PDF is not redistributed, example credentials are not copied, and the .NET implementation is not used. This adapter is an independent interoperability implementation under this project's MIT License. Fonepay APIs, marks, merchant credentials, and onboarding materials remain subject to their owners' terms.

Official public information: [Fonepay business and Dynamic QR](https://fonepay.com/business) and [Fonepay FAQ](https://fonepay.com/faqs).
