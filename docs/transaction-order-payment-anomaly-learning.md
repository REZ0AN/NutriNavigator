# Learning Guide: Finding Transaction, Order, and Payment Anomalies

This guide explains how to review an e-commerce flow for consistency problems. It uses the current NutriNavigator implementation as a practical example.

The goal is not only to ask whether the happy path works. The important questions are:

- What happens if a request is repeated?
- What happens if two requests run at the same time?
- What happens if an external service succeeds but the database fails?
- Can the server trust values sent by the browser?
- Can a later admin action undo an earlier business event?

## 1. First understand the business operation

Before reading code, write the operation as a sequence of state changes:

```text
Browser
  → Backend validates cart and current catalog
  → Stripe creates PaymentIntent
  → Customer confirms payment
  → Stripe sends webhook
  → Backend creates/reconciles order
  → Backend reserves or deducts stock
  → Order moves through processing → shipped → delivered
```

Every arrow is a failure boundary. For each arrow ask:

1. What state has already changed?
2. What if the next operation fails?
3. Can the previous operation be repeated safely?
4. Which system is the source of truth?
5. How can an operator recover the incomplete state?

## 2. Important terminology

### Atomicity

An operation is all-or-nothing. For example, an order should not be created while its stock reservation silently fails.

### Idempotency

Repeating the same request produces the same final result instead of duplicate orders, payments, or stock deductions.

### Race condition

The result changes depending on timing. Two requests read the same old state and both make decisions based on it.

### TOCTOU

“Time of check versus time of use.” Code checks a condition, another request changes it, and the first request continues using the stale assumption.

### Saga / compensating action

Several systems participate in one business operation, but there is no single transaction across them. If a later step fails, the application performs an explicit undo action, such as releasing stock.

### Reconciliation

Comparing two systems and repairing differences. For example, Stripe reports a successful payment but the application has no order.

### Database transaction

A database-supported atomic unit, usually using MongoDB sessions and `withTransaction()`. It can make multiple database writes commit or roll back together, but it cannot automatically roll back a Stripe charge.

## 3. Payment processing review questions

### Question: Does the server calculate the amount?

Expected answer: yes.

The browser should send product IDs and quantities only. The backend should load current prices, validate stock, calculate tax and shipping, and derive the Stripe amount.

If the server accepts `totalprice`, `tax`, or `itemsprice` from the browser, a customer can change the request and underpay.

Inspect:

- Payment controller
- Product lookup and stock validation
- Stripe PaymentIntent creation
- Order creation request body

### Question: Does the Stripe amount match the order amount?

Expected answer: yes, and the check must happen server-side.

The backend should retrieve the PaymentIntent and verify:

- PaymentIntent ID
- Payment status is `succeeded`
- Amount matches the server-calculated order total
- Currency matches

Never trust only the payment status sent by the browser.

### Question: What happens when the browser retries?

Expected answer: the retry is idempotent.

Use:

- A client payment-attempt key
- A user-scoped Stripe idempotency key
- A unique database index on the PaymentIntent ID
- Existing-order lookup before creating a new order

The final result should be one payment and one order.

### Question: What if Stripe succeeds and MongoDB fails?

Expected answer: the payment becomes recoverable, not silently lost.

The current recovery design stores compressed checkout data in Stripe metadata. The success webhook can rebuild the missing reconciliation record and continue order finalization.

The review question to ask is:

> Can I reconstruct the order using only durable data after the browser disappears?

If the answer is no, the system can produce a paid customer without an order.

## 4. Order creation review questions

### Question: Is order creation driven by the browser or by a trusted payment event?

The browser may request order creation for user experience, but the server must verify the PaymentIntent. The Stripe webhook should be able to finalize the order independently.

This protects against:

- Fake successful payment statuses
- Modified prices
- Requests sent after the browser is closed
- Webhook retries

### Question: Can two requests create the same order?

Expected answer: no.

Use multiple protections because each protects a different failure mode:

1. Lookup an existing order.
2. Atomically claim the reconciliation record.
3. Use a unique PaymentIntent index.
4. Treat duplicate-key errors as an idempotent success when the existing order is found.

### Question: What is the reconciliation state machine?

The current states represent lifecycle and concurrency:

```text
pending/recovered → finalizing → order created
pending/recovered → canceling → canceled/failed/expired
finalizing        → pending       (recoverable failure)
```

`finalizingAt` acts as a lease. If a worker crashes while finalizing, another worker can retry after the lease expires.

When reviewing a state machine, ask:

- Which transitions are legal?
- Is each transition atomic?
- What happens if the process dies halfway through it?
- Can a terminal state move backward?

## 5. Stock and transaction-handling review questions

### Question: Is stock changed atomically?

The reservation update should include the stock condition in the database query:

```js
{
  _id: productId,
  stock: { $gte: quantity }
}
```

Then decrement and add the reservation marker in the same update.

This prevents two buyers from both successfully reserving the final unit.

### Question: Is stock reservation idempotent?

Expected answer: yes.

The PaymentIntent or reservation ID should identify the reservation. Repeating the operation must detect the existing marker instead of decrementing stock again.

### Question: Is this a true transaction?

Important answer: not necessarily.

An atomic `findOneAndUpdate()` protects one product update. A sequence involving several products, an order insert, and a reconciliation update is not automatically one transaction.

If all writes must commit together, use a MongoDB transaction with a replica set. If transactions are unavailable, use:

- Idempotent reservation markers
- Explicit compensation on failure
- Recovery states
- Reconciliation jobs
- Unique indexes

### Question: What if order creation fails after stock reservation?

Expected answer: the reservation remains recoverable.

The system should either:

- Keep the reconciliation with `stockReserved: true` so a retry reuses the reservation, or
- Release the reservation and safely retry from the beginning.

The dangerous state is stock deducted, reconciliation deleted, and no order recorded.

## 6. Order deletion and status review questions

### Question: Can an order be deleted after fulfillment begins?

Expected answer: no.

The current business rule allows deletion only while the order is `processing`. Shipped and delivered orders must not be deleted because deletion could restore stock for products that have already left inventory.

### Question: Can deletion race with a status update?

Expected answer: the race must be resolved atomically.

Unsafe pattern:

```text
check status == processing
release stock
delete order
```

Safe pattern:

```text
atomically claim order where status == processing
block status updates while deletion is claimed
release stock
delete only the claimed order
```

The `deletionInProgress` marker is a concurrency claim. It is not a replacement for a database transaction, but it prevents a stale delete request from continuing after a status change.

### Question: What if stock release fails?

Expected answer: do not silently delete the order.

Keep the order and clear or preserve a retryable deletion state. An operator must be able to retry the release without creating a duplicate stock increment.

## 7. Webhook and reconciliation review questions

### Question: Is the webhook authenticated?

Expected answer: Stripe signature verification must use the raw request body and `STRIPE_WEBHOOK_SECRET`.

The webhook should not rely on a user JWT because Stripe does not have a user session.

### Question: Are duplicate webhook events safe?

Expected answer: yes.

Stripe may retry events. The handler must safely handle:

- The same event twice
- Events arriving out of order
- A webhook arriving after the browser already created the order
- A webhook arriving while another webhook is finalizing

Persisting Stripe event IDs is an additional improvement for explicit duplicate-event auditing.

### Question: What happens when a PaymentIntent is canceled or abandoned?

Expected answer: it reaches a terminal reconciliation state.

Handle `payment_intent.canceled` and `payment_intent.payment_failed`. Also run cleanup for old pending records so abandoned checkouts do not remain active forever.

## 8. How to investigate an anomaly

When a bug is reported, gather an evidence chain instead of only looking at the final UI message.

Record:

1. User ID
2. PaymentIntent ID
3. Stripe event ID and event type
4. Order ID, if present
5. Reconciliation ID and status
6. Product IDs and stock before/after
7. Request timestamps
8. Server logs and error IDs
9. Whether the request was retried or concurrent

Then compare the timeline:

```text
payment created
payment confirmed
webhook received
reconciliation claimed
stock reserved
order created
reconciliation completed
```

The missing or duplicated step usually identifies the failure boundary.

## 9. Testing strategy

### Unit tests

Mock Stripe, MongoDB models, and failure behavior. Verify:

- Tampered client totals are ignored.
- Incorrect PaymentIntent amounts are rejected.
- Recovery metadata can be encoded and decoded.
- A failed reconciliation write returns a recoverable state.
- A canceled payment releases reservations.
- Expiration marks old pending records terminal.
- A failed stock release remains retryable.

### Integration tests

Use a real test database and send HTTP requests. Verify:

- Owner can read only the owner’s order.
- Two concurrent checkouts cannot reserve the final unit twice.
- Two webhook requests create one order.
- Payment succeeds while reconciliation persistence fails, then webhook recovery creates the order.
- Concurrent deletion and status update cannot produce an invalid final state.
- Duplicate webhook delivery is harmless.

### Manual tests

For each test, capture both the HTTP response and database state. A successful response alone is not enough.

| Scenario | Expected result |
| --- | --- |
| Repeat the same order request | One order, no duplicate stock deduction |
| Change price in browser request | Server uses catalog price |
| Use a fake payment ID | Order is rejected |
| Send two success webhooks | One order, one stock deduction |
| Fail reconciliation write after payment | Webhook reconstructs the order |
| Cancel PaymentIntent | No order; reservation released |
| Delete processing order | Stock released once; order removed |
| Delete shipped order | Rejected; stock unchanged |
| Race delete versus ship | One operation wins; no invalid state |
| Expire stale reconciliation | Terminal status; no active reservation |

## 10. What to do when you find an anomaly

1. Stop destructive retries if money or stock may already have changed.
2. Identify the PaymentIntent and reconciliation record.
3. Compare Stripe state with database state.
4. Check whether stock has a reservation marker.
5. Check whether an order already exists.
6. Prefer an idempotent recovery operation over manual duplicate creation.
7. Record the repair and root cause.
8. Add a regression test before changing the implementation.

Do not “fix” a paid-but-orderless case by blindly creating another payment or another order. First determine which side effects already happened.

## 11. Review checklist

Before approving a payment/order feature, ask:

- Are prices and stock calculated on the server?
- Is payment status verified with Stripe?
- Is the operation idempotent?
- Is there a unique business key?
- Can duplicate webhooks occur safely?
- Can requests run concurrently?
- What happens after each external-service success/failure combination?
- Are stock changes atomic and retryable?
- Are order state transitions explicit?
- Can deletion race with fulfillment?
- Are canceled and abandoned payments cleaned up?
- Is there a recovery path and an operator-visible state?
- Is every discovered anomaly covered by a test?

