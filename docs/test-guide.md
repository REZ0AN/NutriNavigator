# NutriNavigator test guide

This suite is diagnostic: it records the behavior the application should provide and makes unresolved defects visible. A red test is not a reason to weaken the assertion; it identifies the behavior to fix and then protect with a regression test.

## Commands

Backend unit tests (no live services):

```bash
cd backend
npm run test:unit
```

Backend integration tests use Express, real routes/middleware, and `mongodb-memory-server`. They are opt-in because the first run may download a MongoDB binary:

```bash
cd backend
RUN_DB_INTEGRATION=true npm run test:integration
```

Run the complete backend suite and coverage:

```bash
cd backend
npm test
npm run test:coverage
```

Frontend Jest/React Testing Library tests:

```bash
cd frontend
npm test -- --watchAll=false
```

The normal tests do not call MongoDB, Stripe, Cloudinary, SMTP, or the ML service. Stripe and browser APIs are mocked; integration tests use an isolated in-memory database.

## What each suite checks

- `backend/tests/unit/paymentController.test.js`: catalog pricing, client-price tampering, quantity/stock validation, and Stripe status/amount/currency verification.
- `backend/tests/unit/paymentController.test.js`: signed webhook verification, reconciliation finalization delegation, duplicate-event acknowledgement, and failed-payment handling.
- `backend/tests/unit/orderController.test.js`: owner-scoped order lookup, valid status transitions, and idempotent reservation release.
- `backend/tests/unit/productController.test.js`: review ownership/admin authorization and rating recalculation.
- `backend/tests/integration/order.integration.test.js`: real route authentication, owner/non-owner/admin order access, server-side totals, invalid payments, duplicate PaymentIntent exposure, stock reservation, status transitions, and cancellable-order deletion rules.
- The same order integration suite also covers concurrent same-key payment requests, final-stock contention, same-PaymentIntent retry idempotency, persistence-failure reconciliation, reservation rollback, and crash recovery after a stock decrement but before order persistence.
- `backend/tests/integration/review.integration.test.js`: real review deletion authorization and rating/count updates.
- `frontend/src/store/slices/userSlice.test.js`: registration remains unauthenticated until verification/login.
- `frontend/src/components/Cart/ProcessPayment.test.jsx`: idempotency key usage, awaited order persistence, cart preservation on failure, and success-only clearing/redirect.

## Reading results

For each test, record:

1. The command and date.
2. The test file and test name.
3. Expected behavior.
4. Actual status/body/database side effect.
5. Whether the result is a confirmed defect, an environment limitation, or a passing regression guard.

Expected green results include server-side pricing, invalid-payment rejection, owner restrictions, review authorization, registration state, checkout sequencing, payment reconciliation, and idempotent reservation release. The reconciliation test deliberately forces the first order write to fail, then verifies that a retry recovers the paid checkout. Existing orders should be manually cleared before testing the new reservation policy.

Concurrency evidence should be collected from the verbose integration output and the database assertions in the test report. For final-stock contention, record both HTTP statuses, persisted order count, final stock, and reconciliation count; the expected contract is one `201` order, one recoverable paid `202`, one persisted order, zero stock, and one reconciliation record for the losing PaymentIntent. This is consistent with the reservation-failure policy: a succeeded payment is retained for later recovery even when stock reservation fails. For same-key payment requests, record both client secrets and the Stripe mock call count; the expected contract is one logical PaymentIntent/result even when two requests arrive together. The current test uses a deterministic mock, so it validates the application contract without claiming Stripe network concurrency was exercised.

Persistence-failure recovery, reservation-failure recovery, reservation rollback, crash-recovery, and cancellable-order deletion cases are regression tests. Only `processing` orders may be deleted; shipped and delivered orders return `400` and retain their inventory. If one inventory release fails, the order remains reserved and deletion returns `503`; a retry releases only incomplete markers and then deletes the order without double release. A repeated completed deletion returns `404`. A succeeded payment followed by insufficient stock returns `202` and retains a reconciliation record for later retry. A retry with an existing product reservation marker must create the order without decrementing stock again. Same-owner duplicate-order retry and final-stock contention are also expected to pass.

If integration tests are skipped, confirm the output says the suite was skipped and rerun with `RUN_DB_INTEGRATION=true`. If MongoDB binary download is unavailable, record that exact error and do not treat skipped integration coverage as proof of correctness.

## Current limitations

- Webhook finalization and signature tests are covered with mocked Stripe; live Stripe CLI verification is documented in `docs/stripe_webhook_learning.md`. The end-to-end invariant is one reconciliation snapshot before confirmation, one order after `payment_intent.succeeded`, one stock reservation, and safe duplicate delivery.
- Concurrency and transaction behavior need a replica-set-backed integration environment after the order lifecycle policy is finalized.
- The frontend suite uses the existing CRA Jest environment and does not replace browser-level manual checkout testing.
- Coverage percentages are indicators, not proof that authorization and payment paths are safe.
