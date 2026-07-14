# Architecture

The package contains one Vendure plugin with separate payment handlers and a shared provider contract.

```text
Storefront
  │ initiateNepalPayment(provider)
  ▼
PaymentOrchestratorService ── persists ── NepalPaymentAttempt
  │                                      │
  │ initiate                             │ idempotency/status
  ▼                                      │
Provider adapter                         │
  │ redirect, signed form, or QR payload  │
  ▼                                      │
Provider checkout or customer QR scan    │
  │ callback or scheduled reconciliation │
  ▼                                      │
Verification orchestrator ───────────────┘
  │ server lookup + exact validation
  ▼
Authenticated settlement proof
  │
  ▼
Vendure PaymentMethodHandler
  │ second provider lookup
  ▼
Settled Vendure Payment → order state transition
```

## Why separate payment handlers

Vendure payment methods are independently enabled, assigned to channels, checked for eligibility, displayed to customers, refunded, and reported. Keeping `nepal-khalti`, `nepal-esewa`, and `nepal-fonepay` separate preserves those native behaviors while sharing internal infrastructure.

## Why payment attempts are separate from Vendure payments

A redirect or QR initiation is not authorization or settlement. Creating an `Authorized` Vendure payment before the customer pays would misrepresent the financial state. `NepalPaymentAttempt` tracks the asynchronous provider lifecycle; the actual Vendure payment is created only after verification succeeds.

## Settlement proof

Vendure's standard `addPaymentToOrder` mutation accepts arbitrary metadata from the storefront. The handlers therefore do not trust an attempt ID or provider reference by itself. The callback orchestrator creates an HMAC proof binding:

```text
provider | attemptId | orderId | amount | providerReference
```

The handler checks this proof using `internalSigningSecret` and then independently calls the provider lookup endpoint. This prevents a customer from attaching a known transaction for another order, channel, or amount.

## Idempotency

- Merchant references are UUIDs.
- Provider/merchant and provider/provider-reference pairs are unique.
- Callback or reconciliation processing atomically changes an eligible attempt to `verifying`.
- Already-settled verification requests return the existing attempt.
- Stale `verifying` attempts return to `pending` during reconciliation.
- Vendure creates a payment only after a successful provider lookup.

## Status normalization

Provider-specific statuses map to a conservative shared vocabulary:

```text
initiated, pending, settled, failed, cancelled, expired,
partially-refunded, refunded, unknown
```

Only `settled` creates a Vendure payment. Unknown and ambiguous provider states never settle.

## Amounts

Vendure stores money as integer minor units. Khalti consumes paisa directly. eSewa and Fonepay consume canonical rupee decimal strings. Conversion uses string/integer arithmetic and rejects unsafe or over-precise values. Fonepay status responses do not echo the amount, so the unique PRN remains bound to the immutable amount from its signed initiation request.

## Reconciliation

The scheduled task checks old `initiated`, `pending`, and `unknown` attempts. It does not infer success; it calls the same provider verification and settlement path as a callback. This handles lost redirects, browser closure, transient network errors, and QR providers such as Fonepay that do not return the browser through the shared callback route.
