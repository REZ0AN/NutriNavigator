# NutriNavigator Case Study — Closing Review Findings

## Purpose

This case study explains how the latest review findings failed in real
execution, what invariant each failure violated, how the code was changed, and
why the fixes work.

## Verification

- Backend unit tests: 40 passed.
- Backend integration tests: 28 passed.
- Recommendation-service tests: 4 passed.
- Frontend tests: 11 passed.
- Frontend production build: passed.

## 1. Order creation succeeded, but inventory was returned

### Failure

Finalization reserved stock, created an order, and then deleted the payment
reconciliation record. If order creation succeeded but reconciliation deletion
failed, the generic catch block released stock. The database then contained a
paid order while the product was available for sale again.

### Real-world name

This is a **partial-commit compensation bug** in a multi-step workflow.

### Fix and reason

The failure path now checks for an existing order before releasing stock:

```js
const existingOrder = createdOrder || await findExistingOrder(reconciliation);
if (existingOrder) return existingOrder;

await releaseStock(newlyReservedItems, reconciliation.paymentIntentId);
```

Once an order exists for the PaymentIntent, the purchase has committed. Cleanup
can be retried, but inventory must not be restored. This makes finalization
idempotent and prevents overselling.

## 2. Two buyers competed for the last unit

### Failure

The system checked stock while calculating the price but reserved it only after
the PaymentIntent was created. Two requests could both observe the final unit.

### Real-world name

This is a **time-of-check/time-of-use (TOCTOU) race** and a
**payment/inventory consistency failure**.

### Fix and reason

Reservation now uses an atomic conditional update before payment confirmation:

```js
Product.findOneAndUpdate(
  { _id: productId, stock: { $gte: quantity },
    stockReservations: { $not: { $elemMatch: { reservationId } } } },
  { $inc: { stock: -quantity },
    $push: { stockReservations: { reservationId, quantity } } },
  { new: true },
);
```

The PaymentIntent ID is the reservation ID. Retries reuse the marker instead of
decrementing stock twice. A losing checkout is canceled and its reconciliation
is terminalized. MongoDB evaluates the condition and update atomically, so only
one request can reserve the last unit.

## 3. Invalid review cursors caused HTTP 500

### Failure

The review controller called `next(...)` without receiving `next` as a
parameter. A malformed cursor therefore caused a `ReferenceError`.

### Real-world name

This is an **input-validation error-handling defect**.

### Fix and reason

Cursor decoding and value validation now happen before querying MongoDB, and
invalid cursors return 400:

```js
if (req.query.cursor && !validCursor) {
  return res.status(400).json({
    success: false,
    message: "Invalid review cursor.",
  });
}
```

Malformed client input is now distinguished from an internal server failure.

## 4. Legacy review pagination repeated the first page

### Failure

Legacy embedded reviews could return `hasNextPage: true` with
`nextCursor: null`. The UI then requested the first page again.

### Real-world name

This is a **broken pagination continuation contract**.

### Fix and reason

The fallback now encodes the last review's sort value and ID:

```js
nextCursor: hasNextPage
  ? encodeCursor({ value: last.createdAt, id: last.reviewId })
  : null
```

The ID is a deterministic tie-breaker when timestamps or ratings are equal.
Every response that claims another page exists now contains a usable position.

## 5. Dashboard data was unbounded and then became incomplete

### Failure

The dashboard originally loaded every order and calculated revenue in the
browser. After the order list was paginated, calculating charts from page 1
would have silently omitted older orders.

### Real-world names

These are an **unbounded collection query** and a
**pagination-induced data correctness bug**.

### Fix and reason

The order list is paginated, while dashboard metrics use a bounded UTC MongoDB
aggregation with `$facet`:

```js
{
  $facet: {
    dailyRevenue: [...],
    statuses: [...],
    summary: [...],
  },
}
```

Custom ranges and export ranges are limited to 366 days. The browser uses page
1 only for recent rows and gets complete chart metrics from the aggregation
endpoint. This keeps payloads bounded without making charts incomplete.

## 6. Malformed JWTs became HTTP 500

### Failure

`jwt.verify()` throws for expired, malformed, or tampered tokens. Without local
handling, the error middleware classified the failure as a server error.

### Real-world name

This is an **authentication error classification bug**.

### Fix and reason

```js
try {
  decoded = jwt.verify(token, process.env.JWT_SECRET);
} catch {
  return next(new ErrorHandler("Please log in to access this resource.", 401));
}
```

Invalid credentials now fail closed and clients can consistently redirect to
login.

## 7. Password reset leaked account existence

### Failure

Unknown email addresses returned 404 while known addresses returned success.
This allowed account enumeration.

### Real-world name

This is an **account-enumeration vulnerability**.

### Fix and reason

Known and unknown addresses now receive the same generic response. Reset mail
is sent only when a matching account exists. The observable response no longer
reveals registration status.

## 8. Password reset left stolen sessions valid

### Failure

A password reset issued a new JWT but did not invalidate older cookies. A
stolen token remained usable until expiration.

### Real-world name

This is a **session revocation failure**.

### Fix and reason

Users now have a `tokenVersion`; JWTs carry the version and password changes
increment it:

```js
if ((decoded.tokenVersion ?? 0) !== (req.user.tokenVersion ?? 0)) {
  return next(new ErrorHandler("Please log in to access this resource.", 401));
}
```

All older sessions become invalid without maintaining a token blacklist.

## 9. Recommendation results had incorrect edge cases

### Failure

The provider could legitimately return no suitable foods, but Pydantic required
at least one recommendation and the service returned 503. The LLM could also
repeat a food name, producing duplicate frontend cards and React keys.

### Real-world names

These are **incorrect empty-result semantics** and a **provider-output
normalization defect**.

### Fix and reason

The response schema now permits an empty list. The backend deduplicates normalized
names before returning cards:

```js
const seen = new Set();
const unique = modelRecommendations.filter(({ name }) => {
  const key = normalizeFoodName(name);
  if (seen.has(key)) return false;
  seen.add(key);
  return true;
});
```

No result is a successful business outcome, not a provider outage. Backend
normalization protects the frontend even when the LLM ignores the prompt.

## Review method learned from these failures

For every multi-step workflow, ask:

1. What if the first operation succeeds and the next operation fails?
2. What if two requests observe the same stock or session state?
3. Is client input distinguished from infrastructure failure?
4. Does retrying repeat a side effect or reuse an idempotency marker?
5. Can a query or response grow with the entire database?
6. Can status codes or messages reveal protected information?
7. Is provider output validated and normalized before reaching the UI?

The recurring solution patterns are atomic conditional updates, durable
reconciliation state, idempotent retries, bounded queries, fail-closed
authorization, and regression tests for both success and failure paths.
