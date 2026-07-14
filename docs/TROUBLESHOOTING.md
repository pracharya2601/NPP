# Troubleshooting

## Plugin fails during bootstrap

Common causes:

- `NepalPaymentsPlugin` was added without calling `.init()`;
- the internal signing secret is shorter than 32 characters;
- a public URL uses HTTP outside localhost;
- no payment provider is configured;
- a required provider credential is empty;
- Vendure is outside the plugin compatibility range.

Run:

```bash
npx vendure doctor --check dependencies config
```

## Payment method is not eligible

Confirm that:

- the payment method code exactly matches `paymentMethodCode`;
- the method is enabled;
- it is assigned to the active channel;
- the channel currency is NPR;
- any custom eligibility checker accepts the order;
- the order is in `ArrangingPayment`.

## Database table is missing

Generate and run the host Vendure application's migration after registering the plugin:

```bash
npx vendure migrate
```

Do not fix production by enabling schema synchronization.

## Callback returns `pending`

This can be normal for provider processing or a temporary lookup failure. Confirm that the Vendure worker and scheduler are running. Review the payment attempt and provider merchant dashboard using the merchant/provider references. Do not fulfill the order until Vendure records a settled payment.

## eSewa signature failure

Check that:

- the correct sandbox or production secret is configured;
- form fields were submitted without reformatting;
- the storefront did not parse and reconstruct decimal amounts;
- `productCode` matches the merchant environment;
- proxies preserve the callback query/body.

The reconciliation task can still perform a trusted server status lookup, but a malformed callback itself is never accepted.

## Khalti lookup reference mismatch

The `pidx` returned by lookup must equal the stored provider reference. Confirm that the callback URL and attempt ID were not reused or modified. Treat a mismatch as a security event rather than editing the database.

## Fonepay QR creation or TLS failure

Confirm that merchant code, username, password, signing key, environment, and endpoint contract all belong to the same Fonepay merchant setup. Do not use credentials copied from public examples. If the sandbox certificate or documented path is invalid, contact Fonepay or the acquiring bank; never disable TLS verification.

## Fonepay remains pending

The first integration does not use provider WebSocket messages for settlement. Confirm that the Vendure worker and scheduler are running and that server-side status requests reach Fonepay. A status response must return the exact stored PRN and configured merchant code before settlement.

## Duplicate payment attempt

The plugin permits only one non-expired active attempt per provider and order. Let the existing attempt complete, expire, or be reconciled. Do not generate repeated payment requests automatically after browser/network errors.

## Refund fails

Confirm that the provider transaction is refundable, the merchant account has permission, and the correct production/sandbox key is active. Khalti bank-funded refunds may require payer mobile information depending on the merchant contract; the current Vendure handler does not collect that value, so such refunds may need the merchant dashboard.

## Getting help

Use GitHub Discussions for integration questions and GitHub Issues for reproducible bugs. Redact all sensitive data as described in [`SECURITY.md`](../SECURITY.md).
