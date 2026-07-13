# Storefront integration

The plugin adds one Shop API mutation. It does not add UI components, so any Vendure-compatible storefront can use it.

## Checkout sequence

1. Build the cart, addresses, shipping method, and customer details normally.
2. Transition the active order to `ArrangingPayment`.
3. Query eligible payment methods and show only methods returned by Vendure.
4. Call `initiateNepalPayment` with the selected provider.
5. Redirect to Khalti or submit the returned eSewa form.
6. The provider returns to the plugin callback controller.
7. The plugin verifies server-to-server and creates a settled Vendure payment.
8. The plugin redirects to the configured storefront result page.
9. The result page queries Vendure for the authoritative order state.

## GraphQL mutation

```graphql
mutation InitiateNepalPayment($provider: NepalPaymentProviderCode!) {
  initiateNepalPayment(provider: $provider) {
    attemptId
    provider
    status
    redirectUrl
    qrPayload
    expiresAt
    form {
      action
      fields {
        name
        value
      }
    }
  }
}
```

Variables:

```json
{ "provider": "KHALTI" }
```

or:

```json
{ "provider": "ESEWA" }
```

The request must carry the same Vendure session token/cookie used for the active order.

## Khalti response

Khalti returns `redirectUrl`. Navigate the top-level browser to that URL:

```ts
const payment = result.data.initiateNepalPayment;
if (!payment.redirectUrl) throw new Error('Khalti redirect URL was not returned');
window.location.assign(payment.redirectUrl);
```

Do not open checkout in an iframe unless Khalti's current merchant documentation explicitly supports it.

## eSewa response

eSewa requires an HTML POST. Submit the exact returned field names and values:

```ts
function submitPaymentForm(form: {
  action: string;
  fields: Array<{ name: string; value: string }>;
}) {
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

Do not recalculate, reformat, translate, or round any signed eSewa field.

## Result page

The callback controller redirects to `storefrontResultUrl` with:

```text
?attemptId=<uuid>&provider=<provider>&status=<status>
```

Possible status values include `settled`, `pending`, `failed`, `cancelled`, `expired`, and `unknown`.

These query parameters are presentation hints, not authorization or fulfillment proof. The storefront must query Vendure and use the order/payment state as authoritative. For `pending`, show a waiting state and poll with backoff; the reconciliation worker may settle the payment later.

## Preventing duplicate initiation

Disable the payment button while the mutation is running. The server also rejects another active attempt for the same order and provider. Do not automatically retry an initiation after a network timeout; first allow the callback/reconciliation flow to determine whether the provider created the transaction.

## Do not expose secrets

The storefront needs no secret keys, signatures, provider lookup APIs, or settlement proofs. If any provider secret appears in browser code, browser network responses, analytics, or source maps, the integration is incorrect.
