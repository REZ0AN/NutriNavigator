# Review Findings — Current Implementation

## Findings

[P1] Recover payments when reconciliation snapshot creation fails — `backend/controllers/paymentController.js:71`

The PaymentIntent is created before `createReconciliationSnapshot()`. If MongoDB fails afterward, Stripe has a valid payment but no reconciliation record. The webhook acknowledges `payment_intent.succeeded` without creating an order, leaving the customer paid but orderless.

[P1] Serialize finalization for the same PaymentIntent — `backend/services/orderFinalizationService.js:89`

Two concurrent webhook deliveries, or a webhook and browser retry, can finalize the same reconciliation simultaneously. One process may release stock after the other process has already created the order. Add a per-reconciliation lock, atomic state transition, or MongoDB transaction.

[P1] Make order deletion and status validation atomic — `backend/controllers/orderController.js:118`

Deletion checks that an order is `processing`, then releases stock and deletes later. A concurrent admin status update could change the order to `shipped` between those steps, allowing a fulfilled order to be deleted and its stock restored.

[P2] Reconcile abandoned or canceled PaymentIntents — `backend/models/paymentReconciliationModel.js:35`

Every PaymentIntent creates a pending reconciliation record, but canceled or expired PaymentIntents are not cleaned up. Handle `payment_intent.canceled` or add an expiration/cleanup policy.

## Overall assessment

Signature validation, server-side pricing, ownership checks, and basic webhook finalization are solid. The remaining high-risk areas are payment recovery after snapshot failure and concurrent finalization/deletion races.

## Test gaps

- No PaymentIntent-success plus reconciliation-write-failure test.
- No same-PaymentIntent concurrent webhook/browser-finalization test.
- No concurrent delete/status-update test.
- No MongoDB replica-set transaction/process-crash test.
- Webhook event IDs are not persisted for explicit duplicate-event tracking.
