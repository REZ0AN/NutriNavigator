# Current Codebase Review

## Findings

### [P1] Preserve the order when reconciliation cleanup fails

`backend/services/orderFinalizationService.js:211-229`

If `Order.create()` succeeds but deleting the reconciliation record at line 223 fails, execution enters the catch block. The catch block releases the reserved stock and resets the reconciliation record, even though the order already exists. The result is a paid order in the database with inventory returned to stock, allowing later orders to oversell the product. Finalization needs an idempotent post-order cleanup path that checks for the existing order before releasing inventory.

### [P1] Reserve or otherwise resolve stock before charging a concurrent buyer

`backend/controllers/paymentController.js:75-105`

Stock is checked while calculating the price, but it is not atomically reserved until after the PaymentIntent has been created and successfully paid. Two buyers can therefore both be charged for the last unit. One finalization can reserve the unit while the other remains in `pending` reconciliation forever until a retry succeeds; there is no automatic refund, cancellation, or customer-facing resolution when stock remains unavailable. Payment creation needs a reservation strategy, or the failure path must reliably refund/cancel the losing payment and close its reconciliation record.

### [P1] Return a controlled response for an invalid review cursor

`backend/controllers/productController.js:199-205`

`getAllReviews` calls `next(...)` for an invalid cursor, but `next` is not in the controller's function parameters. Supplying a malformed `cursor` therefore throws `ReferenceError: next is not defined` and produces a 500 response instead of the intended 400 validation error. Add `next` to the handler signature or return the error directly.

### [P2] Make legacy review pagination produce a real continuation cursor

`backend/controllers/productController.js:215-233`

When only embedded legacy reviews exist, the endpoint can return `hasNextPage: true` with `nextCursor: null`. The admin UI then renders “Load more reviews”, but the next request has no cursor and returns the first page again. This causes duplicate cards and makes the remaining legacy reviews unreachable. Either migrate/remove the fallback or provide a cursor that can continue through the legacy result set.

### [P2] Bound the dashboard's custom date range

`frontend/src/components/Admin/Dashboard/Dashboard.jsx:69-86`

The chart creates one JavaScript entry for every day between the selected dates, with no maximum range. A very large range can allocate a huge array, perform repeated `find()` calls for every order, and freeze the admin browser. The UI should cap the range or aggregate data server-side at an appropriate interval. The export endpoint should apply a matching maximum or streaming strategy for large exports.

### [P2] Treat malformed or expired JWTs as authentication failures

`backend/middlewares/authMiddleware.js:10-18`

`jwt.verify()` is allowed to throw, and the global error handler assigns such errors the default status 500. A stale, malformed, or tampered cookie therefore looks like a server failure rather than a 401 response. Catch JWT errors and clear/reject the session consistently so protected routes remain predictable.

### [P2] Prevent password-reset requests from revealing account existence

`backend/controllers/userController.js:173-192`

The forgot-password endpoint returns 404 for an unknown email but a success message containing the email for an existing account. An attacker can use this as an account-enumeration oracle. Return the same generic response for both cases while still sending mail for valid accounts.

### [P2] Revoke existing sessions after a password reset

`backend/controllers/userController.js:202-218`

Resetting the password creates a new JWT but does not invalidate previously issued JWTs. A stolen old cookie remains usable until its normal expiration. Add a token version or password-change timestamp to the user record and check it during authentication, then update it when the password is reset.

### [P2] Avoid loading every order for the dashboard

`backend/controllers/orderController.js:81-85`

The admin order endpoint returns the complete order collection and calculates revenue in application memory. The dashboard also receives all orders even though it only displays summaries, recent rows, and a selected date range. As order volume grows, response size and memory use grow linearly. Use server-side aggregates for totals/chart data and paginate the order list.

## Overall assessment

The earlier ownership, server-side pricing, Stripe signature verification, order state-transition, review authorization, and frontend order-await fixes are present. The remaining P1 items affect payment, inventory, and recovery correctness and should be addressed before treating the flow as reliable.

## Verification performed

- Backend unit tests: 29 passed.
- Backend integration tests: skipped because `RUN_DB_INTEGRATION=true` was not enabled in the review environment.
- Frontend production build was previously verified, with the existing `App.jsx` hook-dependency warning still reported.

The skipped integration suites leave concurrency, Stripe webhook delivery, and MongoDB persistence-failure behavior insufficiently verified in this review.

## Resolution status

The findings above were addressed in the current working tree:

- Order finalization now preserves stock when order creation succeeds but reconciliation cleanup fails.
- Stock is reserved before payment confirmation, and a losing concurrent checkout is canceled and terminalized.
- Invalid review cursors return 400, and legacy embedded reviews provide continuation cursors.
- Dashboard charts use bounded UTC MongoDB aggregation; admin order lists are paginated.
- Invalid JWTs return 401, password-reset requests use a generic response, and password changes invalidate older sessions.
- Empty recommendation results return 200 with an empty array, and duplicate recommendation names are removed before frontend rendering.

## Verification after fixes

- Backend unit tests: 40 passed.
- Backend integration tests: 28 passed with `RUN_DB_INTEGRATION=true`.
- Recommendation-service tests: 4 passed.
- Frontend tests: 11 passed.
- Frontend production build: passed.

The frontend build still reports the pre-existing `App.jsx` hook-dependency warning and an outdated Browserslist database notice.
