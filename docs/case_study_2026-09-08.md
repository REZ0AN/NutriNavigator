# NutriNavigator Case Study — Security, Payments, Inventory, Testing, and ML

**Date:** 2026-09-08  
**Project:** NutriNavigator  
**Scope:** Review findings and fixes implemented during this development session

## Purpose

This case study explains how the application was hardened after a code review.
It records the real-world engineering names for the problems, the reasoning
behind each solution, and the tests used to verify the behavior.

The goal was to make the server authoritative for identity, money, inventory,
and order state while making payment failures recoverable.


## Initial architecture

The application uses:

- React and Redux Toolkit on the frontend.
- Node.js and Express on the backend.
- MongoDB and Mongoose for persistence.
- Stripe for payment processing.
- Flask, scikit-learn, and a serialized random-forest model for recommendations.

The original review identified weaknesses in authorization, client-controlled
pricing, payment/order consistency, inventory transitions, frontend state,
deployment reproducibility, API documentation, and ML output quality.

## 1. Order ownership authorization

### Problem

An authenticated user could request another user's order by ID and receive
shipping information, phone data, items, and payment metadata.

### Industry terminology

This is **broken object-level authorization (BOLA)**, also known as **insecure
direct object reference (IDOR)** or **horizontal privilege escalation**.

Authentication answers “who is calling?” Authorization answers “may this caller
access this object?” The original endpoint only answered the first question.

### Fix

Customer order lookup is scoped by both order ID and authenticated user ID:

```js
const order = await Order.findOne({
  _id: req.params.id,
  user: req.user.id,
});
```

The admin endpoint uses a separate controller and remains unrestricted behind
the admin-role middleware.

### Verification

Tests cover:

- Owner can view their order.
- Non-owner receives a generic not-found response.
- Unauthenticated users cannot access the order.
- Admin can view orders through the admin route.

## 2. Server-authoritative pricing and stock

### Problem

The browser could submit arbitrary product prices, totals, quantities, tax,
shipping costs, and payment metadata.

### Industry terminology

This is **client-side price tampering**, **server-side validation bypass**, and
a **payment integrity failure**. A checkout system should use a
**server-authoritative pricing model**.

### Fix

The client sends product IDs and quantities. The backend then:

1. Loads current products.
2. Validates product IDs and quantities.
3. Checks stock.
4. Reads current catalog prices.
5. Calculates subtotal, tax, shipping, and total.
6. Uses those values for the order and Stripe amount.

Client-provided monetary fields are ignored.

```js
const pricing = await calculateOrderPricing(orderitems);

const paymentIntent = await verifyPaymentIntent(
  paymentId,
  pricing.amount,
  pricing.currency
);
```

### Verification

Tests cover tampered prices, invalid quantities, duplicate products, missing
products, insufficient stock, tax, shipping, and total calculations.

## 3. Stripe PaymentIntent verification

### Problem

The backend previously trusted payment metadata from the browser instead of
confirming that Stripe had successfully charged the calculated amount.

### Industry terminology

This is **payment verification failure** and **trusting client-controlled
payment state**.

### Fix

The backend retrieves the PaymentIntent from Stripe and verifies:

```js
if (
  paymentIntent.status !== "succeeded" ||
  paymentIntent.amount !== amount ||
  paymentIntent.currency !== currency
) {
  throw new ErrorHandler(
    "The Stripe payment does not match this order.",
    400
  );
}
```

Invalid, incomplete, incorrectly priced, or unresolvable PaymentIntents cannot
create orders.

## 4. Stripe idempotency-key isolation

### Problem

The browser supplied an idempotency key directly to Stripe. Two users using the
same key could share Stripe's idempotency namespace and potentially receive the
same PaymentIntent result.

### Industry terminology

This is **idempotency-key namespace collision** and **cross-tenant request
isolation failure**.

### Fix

The backend derives the Stripe key from both the authenticated user and the
client key:

```js
export const getScopedIdempotencyKey = (userId, clientKey) =>
  createHash("sha256")
    .update(`${userId}:${clientKey}`)
    .digest("hex");
```

```js
const scopedIdempotencyKey = idempotencyKey
  ? getScopedIdempotencyKey(req.user.id, idempotencyKey)
  : undefined;
```

Same user plus same client key remains retryable. Different users receive
different Stripe keys.

## 5. Payment/order reconciliation

### Problem

Stripe payment could succeed while MongoDB order creation failed. Clearing the
cart immediately after payment could make the UI show success even though no
order existed.

### Industry terminology

This is a **payment-order reconciliation gap**, **distributed transaction
failure**, and the **paid-but-no-order problem**.

### Fix

A `PaymentReconciliation` model stores a durable paid-checkout snapshot before
reservation and order persistence:

```js
const reconciliationRecord =
  reconciliation ||
  await PaymentReconciliation.create({
    paymentIntentId: paymentId,
    user: req.user.id,
    shippinginfo,
    orderitems: pricing.items,
    itemsprice: pricing.itemsprice,
    tax: pricing.tax,
    shippingcost: pricing.shippingcost,
    totalprice: pricing.totalprice,
    paymentStatus: paymentIntent.status,
    status: "pending",
  });
```

If the order cannot be completed immediately, the API returns a recoverable
response:

```js
res.status(202).json({
  success: false,
  reconciliationRequired: true,
  message: "Payment received; order recovery is pending.",
});
```

A retry loads the saved server-side snapshot and attempts recovery. The frontend
does not clear the cart or redirect to success unless it receives a persisted
order.

### Important limitation

Stripe is mocked in tests. A production deployment should additionally process
Stripe webhooks and run a retryable reconciliation worker.

## 6. Crash-safe stock reservation

### Problem

Stock could be decremented and then the process could crash before the order was
created or rollback completed. Retrying could decrement stock again.

### Industry terminology

This is a **crash-consistency problem**, **non-atomic distributed write**, and
**inventory reservation race**.

### Fix

Each reservation uses a stable reservation ID stored on the product:

```js
{
  $inc: { stock: -item.quantity },
  $push: {
    stockReservations: {
      reservationId,
      quantity: item.quantity,
    },
  },
}
```

Before decrementing, the server checks for the existing marker:

```js
const existing = await Product.findOne({
  _id: item.product,
  stockReservations: {
    $elemMatch: { reservationId },
  },
});

if (existing) continue;
```

After a crash, retry reuses the marker rather than decrementing stock again.
Partial reservation failures remove only the markers created by that attempt.

## 7. Inventory state transitions

### Problem

Stock was deducted every time an order was set to `shipped`, allowing repeated
admin retries to reduce inventory multiple times. Direct transitions could also
skip the deduction.

### Industry terminology

This is a **non-idempotent state transition**, **inventory double-decrement
bug**, and **state-machine invariant violation**.

### Fix

New orders reserve stock during order creation. Status changes now follow the
explicit state machine:

```text
processing → shipped → delivered
```

Status updates no longer perform another stock deduction. Invalid transitions
are rejected.

## 8. Safe order deletion and inventory release

### Problem

Deleting an order could restore stock after the order was shipped or delivered.
Also, clearing the reservation flag before all product updates succeeded could
make a failed release impossible to retry safely.

### Industry terminology

These are **fulfillment lifecycle violations**, **inventory compensation
failure**, and **non-idempotent rollback**.

### Fix

Only processing orders can be deleted:

```js
if (order.orderstatus !== "processing") {
  return next(new ErrorHandler(
    "Only processing orders can be deleted.",
    400
  ));
}
```

Inventory release is marker-aware and happens before clearing the reservation:

```js
await Product.updateOne(
  {
    _id: item.product,
    stockReservations: {
      $elemMatch: {
        reservationId,
        quantity: item.quantity,
      },
    },
  },
  {
    $inc: { stock: item.quantity },
    $pull: { stockReservations: { reservationId } },
  }
);
```

Only after every release succeeds is the order reservation cleared. A failed
release keeps the reservation active, so a retry can complete the operation
without double-restoring stock.

## 9. Review deletion authorization

### Problem

Any authenticated user could delete any review by providing a product and
review ID.

### Industry terminology

This is **broken access control**, specifically **horizontal privilege
escalation** and another BOLA/IDOR-style mutation problem.

### Fix

The controller finds the review and allows deletion only when the caller owns it
or has an administrator role:

```js
const isAdmin = ["admin", "master"].includes(req.user.role);
const isOwner = review.user.toString() === req.user.id.toString();

if (!isOwner && !isAdmin) {
  return next(new ErrorHandler(
    "You are not authorised to delete this review.",
    403
  ));
}
```

The product rating and review count are recalculated after authorized deletion.

## 10. Registration authentication state

### Problem

Registration requires email verification, but the frontend marked the user as
authenticated immediately even though the backend issued no JWT.

### Industry terminology

This is **client authentication-state desynchronization** and an **API contract
mismatch**.

### Fix

Registration now leaves the user unauthenticated:

```js
.addCase(registerUser.fulfilled, (state) => {
  state.loading = false;
  state.isAuthenticated = false;
  state.user = null;
})
```

Only verification followed by login establishes an authenticated frontend
state.

## 11. Deterministic ML deployment

### Problem

Unpinned ML dependencies could change between deployments and break the pickle
or alter inference behavior.

### Industry terminology

This is **dependency drift**, **non-reproducible build**, and an **MLOps model
artifact compatibility problem**.

### Fix

Runtime dependencies are pinned, including compatible versions of NumPy,
pandas, scikit-learn, imbalanced-learn, Flask, gunicorn, and python-dotenv.

The model runtime should be deployed as a versioned unit with its Python
version, feature order, label mapping, and model artifact metadata.

## 12. ML recommendation ranking

### Problem

The server returned every class with a probability greater than zero. Random
forests commonly assign small positive probabilities to many classes, producing
an almost complete catalog.

### Industry terminology

This is **poor ranking quality**, **low-precision inference output**, and a
**decision-threshold/calibration problem**.

### Fix

The server sorts recommendations by confidence and returns at most five:

```python
ranked_recommendations = sorted(
    (
        {"food": food, "confidence": round(confidence, 4)}
        for food, confidence in food_confidence.items()
    ),
    key=lambda item: (-item["confidence"], item["food"]),
)[:5]
```

The legacy `recommended_foods` list is retained, while clients can use the
ranked `recommendations` field with confidence values.

## 13. Developer verification command

### Problem

The backend environment verification script used an absolute path:

```json
"verify": "node /scripts/verifyEnv.js"
```

That resolved from the filesystem root.

### Fix

The script is now repository-relative:

```json
"verify": "node scripts/verifyEnv.js"
```

It is run from the `backend` directory.

## 14. API documentation contract

### Problem

Swagger documented client-supplied payment amounts and required calculated order
totals that the backend no longer accepts as authoritative.

### Fix

Payment input now documents product IDs and quantities:

```yaml
required:
  - orderitems
```

Order input now requires only:

```yaml
required:
  - shippinginfo
  - orderitems
  - paymentinfo
```

Calculated totals are documented as read-only response fields.

## Testing approach

### Mocking strategy

External services are mocked so tests are deterministic and safe:

| Dependency | Test replacement |
|---|---|
| Stripe | Jest mock client |
| MongoDB unit tests | Jest model mocks |
| MongoDB integration tests | `mongodb-memory-server` |
| Cloudinary | Mocked client |
| SMTP | Mocked sender |
| ML service | Mocked HTTP response or local service |

The application logic remains real. Only external boundaries are replaced.

### Added test structure

```text
backend/
  jest.config.js
  tests/
    setup.js
    unit/
      orderController.test.js
      paymentController.test.js
      productController.test.js
      swaggerContract.test.js
    integration/
      order.integration.test.js
      review.integration.test.js

frontend/src/
  components/Cart/ProcessPayment.test.jsx
  store/slices/userSlice.test.js
```

### Important test cases

The suite covers:

- Cross-user order access.
- Cross-user review deletion.
- Client-side price tampering.
- Invalid and mismatched Stripe payments.
- Same-user PaymentIntent retries.
- Cross-user idempotency-key isolation.
- Concurrent final-stock contention.
- Payment success followed by persistence failure.
- Payment success followed by reservation failure.
- Crash-style reservation retry.
- Reservation rollback.
- Safe processing-order deletion.
- Shipped/delivered deletion rejection.
- Inventory release retry after partial failure.
- Registration authentication state.
- Checkout cart preservation and success-only clearing.
- Swagger request/response contracts.
- Ranked ML output and confidence values.

## Commands and results

Backend unit tests:

```bash
cd backend
npm run test:unit -- --verbose
```

Result at the end of this work:

```text
4 suites passed
17 tests passed
```

Frontend tests:

```bash
cd frontend
CI=true npm test -- --watchAll=false --runInBand
```

Result:

```text
2 suites passed
7 tests passed
```

Backend integration tests:

```bash
cd backend
RUN_DB_INTEGRATION=true npm run test:integration -- --verbose
```

These tests require `mongodb-memory-server` to bind a local port. The sandbox
used during development rejected that bind with `EPERM`, so integration tests
must be run locally. Do not interpret skipped or environment-blocked tests as
proof that integration behavior is correct.

## Lessons for future projects

1. Never trust client-provided money, stock, ownership, or payment state.
2. Authentication and authorization must be tested separately.
3. Every external side effect needs an idempotency and recovery strategy.
4. Inventory changes should be tied to explicit business events and markers.
5. A successful payment is not the same thing as a persisted order.
6. Mock external systems, but keep application logic real in tests.
7. Concurrency tests must assert database invariants, not only HTTP statuses.
8. Generated API documentation is part of the application contract.
9. Model artifacts and runtime dependencies should be versioned together.
10. Intentionally failing diagnostic tests are useful only when they are clearly
    documented and converted into regression tests after the fix.

## Files changed during the work

Key implementation files include:

- `backend/controllers/orderController.js`
- `backend/controllers/paymentController.js`
- `backend/controllers/productController.js`
- `backend/models/orderModel.js`
- `backend/models/productModel.js`
- `backend/models/paymentReconciliationModel.js`
- `backend/routes/orderRoute.js`
- `backend/routes/paymentRoute.js`
- `backend/docs/swagger.js`
- `backend/package.json`
- `frontend/src/components/Cart/ProcessPayment.jsx`
- `frontend/src/store/slices/orderSlice.js`
- `frontend/src/store/slices/userSlice.js`
- `mlserver/requirements.txt`
- `mlserver/server.py`

Test and learning documentation:

- `docs/review_dump.md`
- `docs/test-guide.md`
- `docs/case_study_2026-09-08.md`
