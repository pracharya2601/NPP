# Data handling and privacy

The plugin processes payment and order identifiers and therefore should be included in the merchant's privacy, retention, access-control, and incident-response reviews.

## Stored payment-attempt fields

`NepalPaymentAttempt` stores:

- Vendure order ID and code;
- channel ID and token;
- provider and Vendure payment method code;
- generated merchant reference and provider reference;
- integer amount and currency code;
- normalized status and timestamps;
- provider transaction ID and resulting Vendure payment ID;
- a sanitized subset of provider response data for operations.

The plugin does not intentionally store wallet passwords, OTPs, PINs, card data, provider secret keys, or the internal signing secret in the database.

## Provider-response redaction

Before a provider response is stored, recursive redaction removes fields whose names indicate credentials, API keys, PINs, OTPs, customer details, phone/mobile numbers, email addresses, signatures, tokens, signed payment/redirect URLs, Fonepay QR payloads, or provider WebSocket capability URLs. Depth, array size, and string length are bounded.

This is defense in depth, not a substitute for reviewing every provider adapter. New adapters must return the smallest useful `raw` object and must add tests for provider-specific sensitive fields.

## Logs

The plugin does not intentionally log provider payloads or credentials. Host applications, reverse proxies, GraphQL instrumentation, error tracking, and HTTP debugging can still capture request data. Configure those systems to redact:

- `Authorization` headers and API keys;
- callback query/body payloads;
- phone numbers and email addresses;
- provider and merchant transaction references where not operationally required;
- GraphQL variables containing payment form fields.

## Retention

Version 0.1 does not automatically delete payment attempts. Merchants must define a retention policy balancing accounting, dispute, fraud, provider-contract, privacy, and Nepalese legal requirements. Do not add a generic cleanup job without confirming which financial records must be retained.

## Access

The entity is not exposed through a public Shop API query. Database and operational access should be limited to staff who need payment reconciliation capability. Future Admin API/Dashboard views must use Vendure order/payment permissions and avoid exposing raw provider responses by default.

## Telemetry

This plugin sends no analytics or project telemetry. It communicates only with the provider endpoints required for payment initiation, verification, and refunds.
