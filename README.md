# Vendure Nepal Payments

[![CI](https://github.com/pracharya2601/NPP/actions/workflows/ci.yml/badge.svg)](https://github.com/pracharya2601/NPP/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)

An open-source Vendure 3.7 plugin for Nepalese payment providers, licensed under MIT. The initial release implements Khalti KPG-2 and eSewa ePay v2 behind a shared payment-attempt and provider interface. Fonepay is reserved in the API, but intentionally disabled until current official merchant documentation is available.

> **Pre-release status:** the code is suitable for integration and sandbox testing, but version 0.1.0 has not yet been validated with real merchant sandbox credentials or published to npm. Do not process production payments until the production checklist and provider certification/onboarding steps are complete.

## Documentation

- [Install in an existing Vendure project](./docs/INSTALLATION.md)
- [Configuration reference](./docs/CONFIGURATION.md)
- [Storefront integration](./docs/STOREFRONT.md)
- [Provider support](./docs/PROVIDERS.md)
- [Architecture](./docs/ARCHITECTURE.md)
- [Production checklist](./docs/PRODUCTION.md)
- [Data handling and privacy](./docs/DATA_HANDLING.md)
- [Troubleshooting](./docs/TROUBLESHOOTING.md)
- [Complete documentation index](./docs/README.md)

## What is implemented

- Khalti server-side initiation, redirect, lookup verification, and wallet refund calls; some bank-funded refunds require manual provider handling
- eSewa signed ePay form generation, signed callback validation, and status verification
- Separate Vendure payment handlers: `nepal-khalti` and `nepal-esewa`
- Persistent, idempotent `NepalPaymentAttempt` records
- Signed internal settlement proofs that bind a provider transaction to its Vendure order
- GET and POST callback routes
- A worker-safe scheduled task that retries pending payments every five minutes
- Integer-only NPR conversion and provider contract tests

Only a server-to-server provider lookup can settle an order. Browser callback fields are never accepted as proof of payment.

## Install

This repository is currently the package itself. In a Vendure application, install the package and ensure Vendure's recommended `DefaultSchedulerPlugin` is enabled.

```bash
# Available after the first npm publication
npm install @prakashacharya/vendure-plugin-nepal-payments
```

For installation from a local clone before publication, build an npm tarball and install it into the Vendure server project. See the [complete installation guide](./docs/INSTALLATION.md#1-install-the-package).

Configure it in `vendure-config.ts`:

```ts
import { DefaultSchedulerPlugin, VendureConfig } from '@vendure/core';
import { NepalPaymentsPlugin } from '@prakashacharya/vendure-plugin-nepal-payments';

export const config: VendureConfig = {
  // ...
  plugins: [
    DefaultSchedulerPlugin.init(),
    NepalPaymentsPlugin.init({
      publicServerUrl: process.env.PUBLIC_SERVER_URL!,
      storefrontResultUrl: process.env.STOREFRONT_PAYMENT_RESULT_URL!,
      internalSigningSecret: process.env.NEPAL_PAYMENTS_INTERNAL_SECRET!,
      khalti: {
        environment: process.env.KHALTI_ENVIRONMENT as 'sandbox' | 'production',
        secretKey: process.env.KHALTI_SECRET_KEY!,
        websiteUrl: process.env.KHALTI_WEBSITE_URL!,
        paymentMethodCode: 'khalti',
      },
      esewa: {
        environment: process.env.ESEWA_ENVIRONMENT as 'sandbox' | 'production',
        productCode: process.env.ESEWA_PRODUCT_CODE!,
        secretKey: process.env.ESEWA_SECRET_KEY!,
        paymentMethodCode: 'esewa',
      },
      reconciliationSchedule: '*/5 * * * *',
    }),
  ],
};
```

`publicServerUrl` must be the externally reachable Vendure origin. Production values must use HTTPS. Generate `internalSigningSecret` independently from gateway credentials, with at least 32 random characters.

## Database migration

The plugin adds the `NepalPaymentAttempt` entity. Generate and run a Vendure migration from the host application before deploying:

```bash
npx vendure migrate
```

Do not enable schema synchronization in production.

## Create payment methods

In the Vendure Dashboard, create and assign these payment methods to the NPR channel:

| Payment method code | Handler |
| --- | --- |
| `khalti` | `Khalti by IME` / `nepal-khalti` |
| `esewa` | `eSewa` / `nepal-esewa` |

If a different payment method code is used, set the matching `paymentMethodCode` in plugin configuration. Keep the methods unavailable outside NPR channels using channel assignment or an eligibility checker.

## Storefront checkout

First transition the active order to `ArrangingPayment`, then initiate a provider payment:

```graphql
mutation InitiateNepalPayment($provider: NepalPaymentProviderCode!) {
  initiateNepalPayment(provider: $provider) {
    attemptId
    provider
    status
    redirectUrl
    expiresAt
    form {
      action
      fields { name value }
    }
  }
}
```

For Khalti, redirect the browser to `redirectUrl`.

For eSewa, submit the returned fields as an HTML POST without changing any value:

```ts
function submitProviderForm(form: { action: string; fields: Array<{ name: string; value: string }> }) {
  const element = document.createElement('form');
  element.method = 'POST';
  element.action = form.action;
  for (const field of form.fields) {
    const input = document.createElement('input');
    input.type = 'hidden';
    input.name = field.name;
    input.value = field.value;
    element.appendChild(input);
  }
  document.body.appendChild(element);
  element.submit();
}
```

After the provider returns, the plugin redirects to `storefrontResultUrl` with `attemptId`, `provider`, and `status` query parameters. The storefront should then query the active order/order state from Vendure; it must not treat the redirect query string itself as proof of fulfillment.

## Callback routes

The plugin creates both GET and POST routes:

```text
/nepal-payments/callback/khalti/:attemptId
/nepal-payments/callback/esewa/:attemptId
```

These URLs are generated automatically. They must be reachable from the public internet in production.

## Payment lifecycle

1. A UUID payment attempt is stored against the active Vendure order.
2. The plugin creates a Khalti payment or signed eSewa form.
3. The provider returns the customer to the callback route.
4. The plugin claims the attempt atomically and calls the provider status endpoint.
5. It verifies the exact amount and successful provider state.
6. It generates a short-lived internal settlement proof bound to provider, attempt, order, amount, and provider reference.
7. The Vendure payment handler verifies that proof and independently checks the provider again.
8. Vendure creates a `Settled` payment and transitions the order normally.
9. The scheduled reconciliation task repeats verification for delayed or interrupted callbacks.

## Fonepay

Fonepay dynamic QR requires merchant-specific onboarding documentation and credentials. The shared adapter boundary and GraphQL enum are present, but initiating `FONEPAY` currently fails explicitly. Do not implement signing or callback rules from unofficial copies of its API document. Add the provider only after obtaining:

- sandbox and production base URLs
- authentication and signing specification
- dynamic QR request and response schema
- transaction enquiry endpoint
- refund capability
- callback authentication or source requirements

IME Pay is not implemented separately because it has merged into Khalti by IME.

## Development

```bash
npm install
npm run typecheck
npm test
npm run build
```

The unit tests mock provider HTTP requests and do not contact live gateways.

## Compatibility

| Component | Supported |
| --- | --- |
| Vendure | `>=3.7.0 <4.0.0` |
| Node.js | 22 and 24 |
| Currency | NPR |
| Databases | Vendure-supported PostgreSQL, MySQL/MariaDB, and SQLite; end-to-end database tests are planned before 1.0 |

## Contributing and support

Contributions are welcome. Read [CONTRIBUTING.md](./CONTRIBUTING.md), the [Code of Conduct](./CODE_OF_CONDUCT.md), and [SECURITY.md](./SECURITY.md) before participating. General support expectations are in [SUPPORT.md](./SUPPORT.md), and planned work is tracked in [ROADMAP.md](./ROADMAP.md).

Do not open public issues containing credentials, customer information, private merchant documents, or security vulnerabilities.

## License

The plugin's original code is available under the [MIT License](./LICENSE). Vendure's official plugin-publishing guide states that its GPLv3 plugin exception permits independently distributed plugins to use another license. See [licensing and trademark details](./docs/LICENSING.md) and [NOTICE.md](./NOTICE.md).

This community project is not affiliated with or endorsed by Vendure or any payment provider.

## Production checklist

- Complete merchant onboarding separately with Khalti and eSewa.
- Use distinct sandbox and production credentials.
- Keep all secrets in a secret manager, not source control or Dashboard descriptions.
- Run the generated database migration before enabling payment methods.
- Run Vendure workers and `DefaultSchedulerPlugin` for reconciliation.
- Test duplicate, delayed, cancelled, expired, altered-amount, pending, timeout, and refund flows.
- Alert on attempts that remain pending or unknown beyond an agreed threshold.
- Confirm provider refund rules and transaction limits in the signed merchant agreements.

Official references: [Vendure payments](https://docs.vendure.io/current/core/core-concepts/payment), [publishing a Vendure plugin](https://docs.vendure.io/current/core/how-to/publish-plugin), [Khalti KPG-2](https://docs.khalti.com/khalti-epayment/), [Khalti refunds](https://docs.khalti.com/api/refund/), and [eSewa ePay](https://developer.esewa.com.np/pages/Epay).
