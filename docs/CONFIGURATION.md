# Configuration reference

`NepalPaymentsPlugin.init(options)` validates configuration during Vendure bootstrap and fails early for unsafe or incomplete settings.

## Top-level options

| Option | Type | Required | Description |
| --- | --- | --- | --- |
| `publicServerUrl` | `string` | Yes | Public Vendure server origin used to build provider callbacks. HTTPS is required except on loopback hosts. |
| `storefrontResultUrl` | `string` | Yes | Storefront page receiving the final redirect. HTTPS is required except on loopback hosts. |
| `internalSigningSecret` | `string` | Yes | At least 32 characters. Authenticates internal settlement metadata. Do not reuse a provider secret. |
| `reconciliationSchedule` | cron string or `false` | No | Defaults to every five minutes (`*/5 * * * *`). `false` disables the scheduled task. |
| `khalti` | `KhaltiPluginOptions` | Conditional | Enables Khalti. |
| `esewa` | `EsewaPluginOptions` | Conditional | Enables eSewa. |
| `fonepay` | `FonepayPluginOptions` | No | Reserved API shape only; Fonepay initiation is not implemented yet. |

At least one of `khalti` or `esewa` is required.

## Khalti options

| Option | Type | Required | Description |
| --- | --- | --- | --- |
| `secretKey` | `string` | Yes | Merchant secret key. It is used only server-side. |
| `websiteUrl` | `string` | Yes | Public storefront website URL registered with Khalti. |
| `environment` | `sandbox` or `production` | No | Defaults to `sandbox`. |
| `paymentMethodCode` | `string` | No | Vendure payment method code. Defaults to `khalti`. |

## eSewa options

| Option | Type | Required | Description |
| --- | --- | --- | --- |
| `productCode` | `string` | Yes | Merchant product code supplied by eSewa. |
| `secretKey` | `string` | Yes | HMAC secret supplied by eSewa. It is used only server-side. |
| `environment` | `sandbox` or `production` | No | Defaults to `sandbox`. |
| `paymentMethodCode` | `string` | No | Vendure payment method code. Defaults to `esewa`. |

## Environment separation

Create separate deployments or secret sets for sandbox and production. Never select production merely because `NODE_ENV=production`; the provider environment must be explicit so staging cannot accidentally charge real accounts.

## Multi-channel limitation

Version 0.1 uses one credential set per provider for the entire Vendure instance. Payment attempts record `channelId` and `channelToken`, but per-channel credential resolution is not implemented yet. Do not use this release when multiple channels require different merchant accounts for the same provider.

## Secret rotation

Rotating `internalSigningSecret` while callbacks are pending can prevent those attempts from settling. During rotation, stop new initiations, reconcile pending attempts, deploy the new value, and then resume checkout.

Provider-secret rotation follows the provider's merchant procedure. Existing attempts may require the old key for lookup, so coordinate rotation during a low-traffic window and reconcile first.
