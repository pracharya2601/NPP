# Security and production checklist

## Before sandbox testing

- [ ] Plugin and Vendure versions satisfy the compatibility range.
- [ ] The database migration is generated and reviewed.
- [ ] Provider payment methods are assigned only to NPR channels.
- [ ] Provider environment is explicitly `sandbox`.
- [ ] Secrets are loaded from a secret manager or local ignored `.env` file.
- [ ] The Vendure worker and scheduler are running.

## Sandbox test matrix

- [ ] Successful Khalti payment
- [ ] Successful eSewa payment
- [ ] Successful Fonepay Dynamic QR payment (experimental)
- [ ] Customer cancellation
- [ ] Expired checkout
- [ ] Provider pending/ambiguous status
- [ ] Browser closed before redirect
- [ ] Callback delivered twice
- [ ] Callback delivered concurrently
- [ ] Altered callback amount
- [ ] Altered provider reference
- [ ] Provider timeout during initiation
- [ ] Provider timeout during verification
- [ ] Reconciliation after a lost callback
- [ ] Full Khalti refund
- [ ] Partial Khalti refund
- [ ] Manual eSewa refund process
- [ ] Fonepay QR status reconciliation without WebSocket delivery
- [ ] Fonepay duplicate PRN, merchant mismatch, and failed/pending status handling

Verify in every case that fulfillment occurs only after the Vendure payment is `Settled`.

## Before production

- [ ] Merchant onboarding and KYC are complete for each provider.
- [ ] Production domains and callback URLs, where applicable, are approved by providers.
- [ ] Production keys are separate from sandbox keys.
- [ ] Experimental Fonepay support has passed acquiring-bank/Fonepay certification and current endpoint/TLS review.
- [ ] `publicServerUrl` and `storefrontResultUrl` use HTTPS.
- [ ] `internalSigningSecret` is unique, random, and at least 32 characters.
- [ ] Logs redact authorization headers, secrets, customer identifiers, and raw callbacks.
- [ ] Callback routes and payment-status polling are protected by infrastructure rate limiting and request-size limits.
- [ ] Database backups and migration rollback procedures are tested.
- [ ] Alerts exist for old `pending`, `unknown`, and repeated verification failures.
- [ ] Operations staff can reconcile provider and Vendure transaction references.
- [ ] Refund roles and approval processes are defined.
- [ ] `npx vendure doctor --profile production --strict` passes in the host project.

## Operational rule

Never manually change a payment attempt or Vendure payment to settled based only on a screenshot, customer claim, redirect query parameter, or callback body. Confirm the transaction in the provider merchant system or through its server status API.
