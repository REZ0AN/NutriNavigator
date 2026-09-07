# Stripe Webhook Integration and Testing Guide

**Project:** NutriNavigator  
**Date:** 2026-09-08  
**Endpoint:** `POST /api/v1/payment/webhook`

## Purpose

A Stripe webhook is a server-to-server notification from Stripe. It tells the
backend what happened to a payment even when the customer's browser closes,
loses connection, refreshes, or never returns to the success page.

Without a webhook, the application depends on this fragile sequence:

```text
Browser confirms payment
→ Browser calls the order API
→ Browser clears the cart
```

With a webhook, Stripe becomes the reliable payment event source:

```text
Browser confirms payment
→ Stripe records the payment
→ Stripe sends payment_intent.succeeded
→ Backend verifies and processes the event
→ Backend creates or recovers the order
```

Before the browser confirms the card, `/payment/process` validates the catalog
items and creates a `PaymentReconciliation` snapshot containing the authenticated
user, shipping information, server-calculated totals, and PaymentIntent ID. The
PaymentIntent metadata contains the server user ID for operational tracing; the
webhook never trusts that metadata for authorization.

Stripe recommends using webhooks to monitor PaymentIntent status and to handle
successful payments asynchronously. See the [Stripe payment status
documentation](https://docs.stripe.com/payments/payment-intents/verifying-status).

## What the NutriNavigator endpoint does

The current endpoint is:

```text
POST /api/v1/payment/webhook
```

It is intentionally not protected by the normal JWT authentication middleware.
Stripe does not have a NutriNavigator user cookie. Instead, authenticity is
provided by the `Stripe-Signature` header and the webhook signing secret.

The current handler:

1. Receives Stripe's raw request body.
2. Reads the `Stripe-Signature` header.
3. Verifies the event with `STRIPE_WEBHOOK_SECRET`.
4. Handles `payment_intent.succeeded`.
5. Handles `payment_intent.payment_failed`.
6. Looks up the matching server-side `PaymentReconciliation` by PaymentIntent ID.
7. For a succeeded payment, verifies amount/currency, reserves stock by marker,
   creates exactly one order, and removes the reconciliation only after success.
8. Returns a `2xx` response when the event is accepted; transient finalization
   failures remain retryable by Stripe.

## Supported events

The application currently recognizes:

```text
payment_intent.succeeded
payment_intent.payment_failed
```

The successful event finalizes the matching reconciliation into an order. A
failed event marks the reconciliation `failed` and releases any applicable
reservation markers. Duplicate success events are acknowledged safely because
the existing order or completed reconciliation is detected.

Other Stripe events are acknowledged but do not currently change order data.
This is useful while expanding the integration because Stripe does not keep
retrying an event merely because the application does not need to act on it.

## Why signature verification matters

The webhook URL is public. Anyone who knows it could send a fake HTTP request
claiming that a payment succeeded.

Stripe signs webhook requests. The backend verifies the signature using:

```js
const event = stripe.webhooks.constructEvent(
  req.body,
  signature,
  process.env.STRIPE_WEBHOOK_SECRET
);
```

If the signature is invalid, the backend returns:

```text
400 Invalid Stripe webhook signature.
```

Never trust the JSON body before signature verification.

## Raw-body requirement in Express

Stripe signs the exact bytes of the request body. Parsing the body with
`express.json()` before verification can change the representation and cause
signature verification to fail.

Therefore the route is registered before the global JSON parser:

```js
app.post(
  "/api/v1/payment/webhook",
  express.raw({ type: "application/json" }),
  handleStripeWebhook
);

app.use(express.json());
```

This ordering is essential. A webhook endpoint that receives an already-parsed
object instead of the raw body may consistently return `400`.

## Environment configuration

The example configuration contains:

```env
STRIPE_WEBHOOK_SECRET=whsec_your_stripe_webhook_signing_secret
```

The actual secret belongs only in the local backend `.env` or a deployment
secret manager. It must not be placed in React code, committed to Git, or added
to this documentation.

There are three different Stripe values that must not be confused:

| Value | Purpose |
|---|---|
| `pk_test_...` | Browser-safe publishable key |
| `sk_test_...` | Backend Stripe API secret |
| `whsec_...` | Webhook signature verification secret |

## Local setup with Stripe CLI

### 1. Install Stripe CLI

On macOS:

```bash
brew install stripe/stripe-cli/stripe
```

Check the installation:

```bash
stripe --version
```

### 2. Authenticate the CLI

```bash
stripe login
```

Log in with the Stripe developer account used for test payments.

### 3. Start the backend

Start the backend using the port configured in your local environment. In the
successful local test documented during this work, the backend was running on
port `8080`:

```bash
cd backend
npm run dev
```

If your backend uses another port, replace `8080` in the forwarding command.

### 4. Start webhook forwarding

Open a second terminal:

```bash
stripe listen \
  --forward-to http://localhost:8080/api/v1/payment/webhook
```

The CLI prints a temporary signing secret:

```text
Ready! Your webhook signing secret is whsec_...
```

Copy that exact value into the backend `.env`:

```env
STRIPE_WEBHOOK_SECRET=whsec_the_value_from_stripe_listen
```

Restart the backend after changing `.env` so dotenv loads the new value.

The CLI secret is associated with the current local listener. It is different
from the secret for a Dashboard-created webhook endpoint.

## Basic endpoint test

With the backend and `stripe listen` running, trigger a test event:

```bash
stripe trigger payment_intent.succeeded
```

Expected Stripe CLI output:

```text
[200 POST] payment_intent.succeeded
```

## Manual end-to-end checkout test

`stripe trigger payment_intent.succeeded` creates a synthetic PaymentIntent and
normally has no NutriNavigator reconciliation snapshot. For an order-finalizing
test, use the application checkout while `stripe listen` is running:

1. Log in as a verified user.
2. Add an in-stock product to the cart and save shipping information.
3. Submit the payment page with a Stripe test card such as `4242 4242 4242 4242`.
4. Confirm that `/payment/process` creates a PaymentIntent and a pending
   reconciliation containing the user, shipping information, items, totals,
   and PaymentIntent ID.
5. Confirm the card payment and watch the CLI for
   `payment_intent.succeeded`.
6. Verify that the webhook creates exactly one order, reserves stock once, and
   removes the reconciliation after order persistence succeeds.
7. Replay the same event or let Stripe deliver it again; the order count and
   stock must not change.
8. If the browser is interrupted after payment, retry the browser order request;
   it should return the existing order without creating another reservation.

To exercise the failed-payment path, use a failing Stripe test card or run:

```bash
stripe trigger payment_intent.payment_failed
```

For the synthetic command, inspect the response and confirm that no order is
created without a matching reconciliation. For a real checkout reconciliation,
the matching PaymentIntent ID must be used.

Expected backend behavior:

- The endpoint receives the event.
- Signature verification succeeds.
- The endpoint returns HTTP `200`.
- No authentication-cookie error occurs.
- If no matching reconciliation record exists, no order is created by this
  basic synthetic event.

The trigger verifies connectivity and signature handling. It does not always
represent a real NutriNavigator checkout with the application's user and
reconciliation metadata.

Stripe documents this workflow in [Handle payment events with
webhooks](https://docs.stripe.com/webhooks/handling-payment-events?lang=node).

## Realistic checkout test

The realistic test verifies the relationship between Stripe, the backend, and
MongoDB.

1. Start the backend.
2. Start `stripe listen`.
3. Open the NutriNavigator frontend.
4. Log in with a verified user.
5. Add an in-stock product to the cart.
6. Proceed to checkout.
7. Use Stripe's test card:

   ```text
   Number: 4242 4242 4242 4242
   Expiry: Any future date
   CVC: Any three digits
   ```

8. Complete payment.
9. Watch the Stripe CLI terminal.
10. Check the backend response and MongoDB records.

Expected event flow:

```text
payment_intent.created
→ payment_intent.succeeded
→ HTTP 200 from /api/v1/payment/webhook
```

Expected data behavior:

- The PaymentIntent has a succeeded status.
- The payment ID matches the order/reconciliation record.
- The order is created once.
- Stock is reserved once.
- A duplicate webhook does not create a duplicate order.

## Testing failed payments

Use a Stripe test card that produces a failure, or trigger:

```bash
stripe trigger payment_intent.payment_failed
```

Expected behavior:

- The webhook signature is accepted.
- The reconciliation/payment state becomes failed when a matching record exists.
- No paid order is created.
- No success page is shown for a failed payment.
- Reserved inventory is released according to the order lifecycle policy.

## Testing duplicate delivery

Webhook delivery is not guaranteed to happen exactly once. Stripe may deliver
the same event again.

The application must satisfy this invariant:

```text
One PaymentIntent ID
→ At most one order
→ At most one stock reservation
```

Test by sending the same event more than once or retrying the same checkout.
Record:

- Number of webhook requests.
- Number of orders with that PaymentIntent ID.
- Product stock before and after processing.
- Payment reconciliation status.

Expected result:

```text
Repeated event delivery does not duplicate the order or decrement stock again.
```

## Testing payment/order failure recovery

This tests the most important reliability scenario:

```text
Stripe payment succeeds
→ Order persistence fails
→ Reconciliation record remains
→ Retry recovers the order
```

Record:

1. PaymentIntent ID.
2. HTTP status from the order request.
3. `reconciliationRequired` response field.
4. Number of reconciliation records.
5. Number of orders after retry.
6. Product stock before and after retry.

Expected behavior:

- The first attempt does not falsely report a completed order.
- A pending reconciliation record exists.
- Retrying does not create a second payment or second reservation.
- Exactly one order is eventually persisted.

## Troubleshooting

### Repeated `400` responses

Most commonly, the webhook signing secret is wrong or missing.

Check that:

1. The backend `.env` contains `STRIPE_WEBHOOK_SECRET`.
2. The value exactly matches the current `stripe listen` output.
3. The backend was restarted after changing `.env`.
4. You did not use `STRIPE_SECRET_KEY` or `STRIPE_API_KEY` by mistake.
5. You did not use a Dashboard webhook secret with the local CLI listener.
6. The webhook route is registered before `express.json()`.

### The CLI shows `404`

The forwarding URL or route path is wrong. Confirm:

```text
POST /api/v1/payment/webhook
```

Also confirm the backend port.

### The CLI shows connection refused

The backend is not running on the forwarded port, or the port is incorrect.

### The endpoint returns `500` for missing configuration

The backend cannot find `STRIPE_WEBHOOK_SECRET`. Add it to the local backend
environment and restart the server.

### The event returns `200` but no order appears

The synthetic CLI event may not contain a NutriNavigator reconciliation record.
Use a real checkout flow or inspect MongoDB for a matching
`paymentIntentId`. An unmatched event is acknowledged but cannot create an
order because the server has no trusted shipping, user, item, or pricing
snapshot. A real checkout followed by `payment_intent.succeeded` should create
one order and reserve stock once.

## Dashboard/deployment setup

For a deployed environment, use a public HTTPS endpoint:

```text
https://your-domain.com/api/v1/payment/webhook
```

In Stripe Dashboard test mode:

1. Open Developers → Webhooks.
2. Add an endpoint.
3. Enter the HTTPS URL.
4. Subscribe to `payment_intent.succeeded` and
   `payment_intent.payment_failed`.
5. Save the endpoint.
6. Copy the generated `whsec_...` secret.
7. Store it in the backend deployment environment.

Stripe requires registered webhook endpoints to be publicly reachable HTTPS
URLs. See [Receive Stripe events in your webhook endpoint](https://docs.stripe.com/webhooks).

## Security checklist

- Keep `STRIPE_WEBHOOK_SECRET` server-side.
- Verify every `Stripe-Signature` header.
- Use the raw request body for verification.
- Do not authorize Stripe with a user JWT.
- Do not trust payment status from the browser alone.
- Match PaymentIntent IDs to server-side records.
- Make webhook processing idempotent.
- Do not create duplicate orders on repeated events.
- Return a `2xx` response only after the event is safely accepted.
- Log event IDs and PaymentIntent IDs, but never log card data or secrets.

## Learning summary

The webhook is not merely another API endpoint. It changes the ownership of
the payment truth:

```text
Frontend callback = useful user experience signal
Stripe webhook    = trusted server-side payment event
Database order    = application fulfillment record
```

All three must be reconciled, but only the server and Stripe should determine
whether money was actually paid. The browser should display the result, not
define it.
