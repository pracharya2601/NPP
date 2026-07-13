# Installing in Vendure

This guide installs the plugin into an existing Vendure 3.7 application. The plugin is a server plugin; it is not installed in the storefront package.

## Requirements

- Vendure `>=3.7.0 <4.0.0`
- Node.js 22 or newer
- A Vendure SQL database
- A separately running Vendure worker for scheduled reconciliation in production
- Merchant sandbox credentials from at least one supported provider
- A publicly reachable HTTPS server URL for provider callbacks

## 1. Install the package

From the Vendure server project:

```bash
npm install @tiat/vendure-plugin-nepal-payments
```

When developing from a local clone before the first npm release:

```bash
# In the plugin repository
npm ci
npm run build
npm pack

# In the Vendure application; use the generated filename
npm install ../vendure-plugin-nepal-payments/tiat-vendure-plugin-nepal-payments-0.1.0.tgz
```

## 2. Add environment variables

Copy the relevant names from [`.env.example`](../.env.example) into the Vendure application's environment configuration. Never commit real values.

Generate the internal signing secret separately from provider keys:

```bash
openssl rand -base64 48
```

The generated value is used only inside this plugin to bind a verified gateway transaction to a specific Vendure order.

## 3. Register the plugin

Add `NepalPaymentsPlugin.init()` to `vendure-config.ts`:

```ts
import { DefaultSchedulerPlugin, VendureConfig } from '@vendure/core';
import { NepalPaymentsPlugin } from '@tiat/vendure-plugin-nepal-payments';

export const config: VendureConfig = {
  // Existing database, API, auth, order and other configuration...
  plugins: [
    DefaultSchedulerPlugin.init(),
    NepalPaymentsPlugin.init({
      publicServerUrl: process.env.PUBLIC_SERVER_URL!,
      storefrontResultUrl: process.env.STOREFRONT_PAYMENT_RESULT_URL!,
      internalSigningSecret: process.env.NEPAL_PAYMENTS_INTERNAL_SECRET!,
      khalti: {
        environment: process.env.KHALTI_ENVIRONMENT === 'production' ? 'production' : 'sandbox',
        secretKey: process.env.KHALTI_SECRET_KEY!,
        websiteUrl: process.env.KHALTI_WEBSITE_URL!,
        paymentMethodCode: 'khalti',
      },
      esewa: {
        environment: process.env.ESEWA_ENVIRONMENT === 'production' ? 'production' : 'sandbox',
        productCode: process.env.ESEWA_PRODUCT_CODE!,
        secretKey: process.env.ESEWA_SECRET_KEY!,
        paymentMethodCode: 'esewa',
      },
    }),
  ],
};
```

Omit a provider block if that provider should not be enabled. At least one implemented provider must be configured.

`DefaultSchedulerPlugin` is required for automatic pending-payment reconciliation. Set `reconciliationSchedule: false` only when another process calls equivalent reconciliation logic.

## 4. Generate the database migration

The plugin adds a `NepalPaymentAttempt` entity. From the Vendure application, run:

```bash
npx vendure migrate
```

Choose **Generate a new migration**, inspect the generated SQL, then run the migration command again and choose **Run pending migrations**.

Commit the generated migration to the Vendure application repository. Do not enable TypeORM schema synchronization in production.

## 5. Create Vendure payment methods

Start the server and open the Vendure Dashboard:

1. Go to **Settings → Payment methods**.
2. Create a method with code `khalti`.
3. Select the **Khalti by IME** handler (`nepal-khalti`).
4. Enable it and assign it only to channels that use NPR.
5. Create a method with code `esewa`.
6. Select the **eSewa** handler (`nepal-esewa`).
7. Enable it and assign it only to channels that use NPR.

The payment method code must equal the matching `paymentMethodCode` in plugin configuration. The handler code and payment method code are different concepts.

| Provider | Payment method code | Handler code |
| --- | --- | --- |
| Khalti by IME | `khalti` | `nepal-khalti` |
| eSewa | `esewa` | `nepal-esewa` |

## 6. Integrate the storefront

Follow [STOREFRONT.md](./STOREFRONT.md). The storefront must transition the order to `ArrangingPayment`, call `initiateNepalPayment`, then redirect to Khalti or submit the signed eSewa form.

Do not call Vendure's standard `addPaymentToOrder` mutation directly from the storefront for these providers. The callback orchestrator does that only after server verification.

## 7. Verify the installation

Before using real money:

```bash
npx vendure doctor --check dependencies config schema database
```

Then complete the sandbox matrix in [PRODUCTION.md](./PRODUCTION.md), including duplicate callbacks, cancellations, altered amounts, timeouts, and delayed status changes.

## Upgrading

Read [`CHANGELOG.md`](../CHANGELOG.md) before every upgrade. Run `npx vendure migrate` when a release changes plugin entities. Public API breaking changes occur only in semver-major releases after 1.0; while the project is `0.x`, minor versions may contain breaking changes and will call them out prominently.
