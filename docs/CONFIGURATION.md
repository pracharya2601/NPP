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
| `fonepay` | `FonepayPluginOptions` | Conditional | Enables experimental Fonepay Dynamic QR. |

At least one provider is required.

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

## Fonepay options

| Option | Type | Required | Description |
| --- | --- | --- | --- |
| `merchantCode` | `string` | Yes | Merchant code supplied during Fonepay/acquiring-bank onboarding. |
| `username` | `string` | Yes | Server-side merchant API username. |
| `password` | `string` | Yes | Server-side merchant API password. Never expose it to the storefront. |
| `secretKey` | `string` | Yes | HMAC-SHA512 signing key. Never reuse the internal settlement secret. |
| `environment` | `sandbox` or `production` | No | Defaults to `sandbox`. Production use requires merchant certification. |
| `paymentMethodCode` | `string` | No | Vendure payment method code. Defaults to `fonepay`. |

Fonepay support is experimental. Confirm the current endpoint contract, PRN limits, sandbox TLS configuration, and merchant certification requirements with Fonepay or the acquiring bank before enabling production.

## Environment separation

Create separate deployments or secret sets for sandbox and production. Never select production merely because `NODE_ENV=production`; the provider environment must be explicit so staging cannot accidentally charge real accounts.

## Multi-channel limitation

The current release uses one credential set per provider for the entire Vendure instance. Payment attempts record `channelId` and `channelToken`, but per-channel credential resolution is not implemented yet. Do not use this release when multiple channels require different merchant accounts for the same provider.

## Secret rotation

Rotating `internalSigningSecret` while callbacks are pending can prevent those attempts from settling. During rotation, stop new initiations, reconcile pending attempts, deploy the new value, and then resume checkout.

Provider-secret rotation follows the provider's merchant procedure. Existing attempts may require the old key for lookup, so coordinate rotation during a low-traffic window and reconcile first.
