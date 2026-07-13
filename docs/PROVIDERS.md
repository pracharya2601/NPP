# Provider support

Provider behavior and access can change. Confirm the current official documentation and merchant agreement before each production launch.

## Support matrix

| Provider | Initiation | Verification | Refund | Status |
| --- | --- | --- | --- | --- |
| Khalti by IME | KPG-2 server request and hosted redirect | `/epayment/lookup/` using `pidx` | Wallet full/partial; bank-funded refunds may need payer mobile/manual handling | Implemented with refund caveat |
| eSewa | ePay v2 signed HTML form | Signed callback plus transaction status API | No public refund call implemented | Implemented |
| Fonepay | Dynamic QR expected | Merchant documentation required | Unknown until onboarding | Reserved, disabled |
| IME Pay | — | — | — | No separate integration; migrated into Khalti by IME |
| connectIPS / NEPALPAY | Not implemented | Not implemented | Not implemented | Candidate future provider |

## Khalti by IME

Official documentation:

- [KPG-2 Web Checkout](https://docs.khalti.com/khalti-epayment/)
- [Refund API](https://docs.khalti.com/api/refund/)
- [Merchant support](https://docs.khalti.com/contact-us/)

The plugin sends Vendure's integer NPR minor-unit amount directly as Khalti paisa. Only the `Completed` lookup status settles a payment. Unknown or pending statuses remain unsettled.

The public Khalti refund API documents additional mobile data for some bank-funded refunds. Vendure's standard refund input does not collect that provider-specific value, so those cases may fail through the handler and should be completed in the Khalti merchant dashboard. Wallet refunds can use the implemented API path.

Khalti can expose multiple underlying payment sources. That does not change the plugin's provider code; Vendure records the payment under the Khalti payment method.

## eSewa

Official documentation:

- [eSewa ePay](https://developer.esewa.com.np/pages/Epay)

The plugin converts Vendure minor units into a two-decimal rupee string, signs the documented fields using HMAC-SHA256, verifies signed callback data when supplied, and performs an independent status lookup. Only `COMPLETE` or `SUCCESS` settles a payment.

Programmatic refunds are intentionally not advertised because the public ePay documentation does not provide a complete merchant refund request contract. Vendure administrators must follow their merchant agreement and settle refund records manually unless a future verified API is added.

## Fonepay

Fonepay advertises dynamic QR integration, but the implementation contract is merchant-specific and is not publicly complete. The project will not reproduce private documentation or implement unofficial signature recipes.

A contribution may enable Fonepay after maintainers can verify legally shareable details for:

- sandbox and production endpoints;
- merchant authentication and signature canonicalization;
- dynamic QR request/response fields;
- enquiry and terminal status mapping;
- callback authentication;
- expiry behavior;
- full and partial refunds.

Until then, `FONEPAY` exists in the GraphQL enum for forward compatibility but initiation fails explicitly.

## Provider terms and fees

This open-source package does not create merchant accounts, negotiate fees, certify an integration, or grant access to provider APIs. Each merchant is responsible for onboarding, KYC, commercial terms, limits, settlement, disputes, refunds, and compliance directly with the relevant provider.
