# NutriNavigator Engineering and Architecture Guide

This document is the working contract for contributors and coding agents
refactoring NutriNavigator. Act as a solution architect: understand the
business invariant first, make the smallest safe change, and verify the
failure paths before optimizing or adding features.

## 1. Repository map

NutriNavigator is a small e-commerce system with three independently run
processes:

```text
frontend (React + Redux)
        |
        v
backend (Express + MongoDB + Stripe + Cloudinary + SMTP)
        |
        v
recommendation_service (FastAPI + LangGraph + Gemini OpenAI-compatible API)
```

- `backend/` owns authentication, catalog data, reviews, orders, payment
  verification, Stripe webhooks, and administrative APIs.
- `frontend/` owns presentation, browser state, checkout interaction, and
  admin workflows. It must never be treated as the source of truth for price,
  stock, authorization, or payment status.
- `recommendation_service/` owns LLM calls and structured recommendation
  output. It does not access MongoDB; the backend owns catalog matching and
  product links.
- `docs/` contains operational notes, test guides, case studies, and review
  findings. Update documentation when a behavior or recovery procedure changes.

Before changing a path, inspect its route, controller/service, model, client
caller, and tests. Keep domain logic out of React components and keep external
provider calls behind backend services where practical.

## 2. Non-negotiable domain invariants

### Authentication and authorization

- Every protected request must pass `isAuthenticatedUser` before role checks.
- Ownership is part of the database query, not only a controller-side check.
  For example, a user order lookup must constrain both `_id` and `user`.
- Admin and master access must be explicit on every administrative route.
- Never trust user-supplied role, user ID, order owner, payment status, price,
  tax, shipping cost, stock, or review ownership.
- Passwords and reset/verification tokens must never be logged or returned.
- Invalid or expired JWTs are authentication failures (401), not generic server
  failures (500).
- Password reset and email flows must not disclose whether an account exists.

### Catalog and reviews

- Product prices and stock are read from MongoDB on the server.
- Product update payloads must be allowlisted; do not pass arbitrary request
  bodies into `findByIdAndUpdate` when fields such as ratings, reviews, owner,
  or reservations are protected.
- Review writes must validate product existence, rating range, comment length,
  and the authenticated user.
- Review deletion must verify ownership or an explicit admin/master role.
- Whenever a review is created, updated, or deleted, product rating and count
  must remain consistent with the authoritative review collection.
- Large admin review lists use cursor pagination. A cursor is valid only for
  the filter and sort that created it, and sorting needs a deterministic `_id`
  tie-breaker.

### Orders, stock, and money

- The server calculates line prices, tax, shipping, total, and Stripe amount.
- Money comparisons use integer minor units where possible; round only at a
  documented boundary and use one currency consistently.
- A PaymentIntent can produce at most one order. Enforce this with a database
  uniqueness constraint and idempotent retry behavior.
- A payment is not an order until the server has verified the PaymentIntent and
  successfully persisted the order.
- Stock reservation/deduction is atomic and idempotent. A repeated transition
  must not decrement stock twice; every failure must either compensate safely
  or leave an explicit recoverable reconciliation state.
- Order status transitions are a state machine. Current valid progression is
  `processing -> shipped -> delivered`; do not permit arbitrary jumps without
  updating the invariant and tests.
- Order deletion and status updates must use atomic claims/conditional updates
  when they can race. Never rely on a stale document read as a concurrency lock.
- A successful charge followed by persistence failure is a first-class failure
  path. It needs durable recovery, webhook retry handling, and a clear customer
  outcome (order, cancellation, or refund), not a false success response.

### Stripe webhooks

- Register the webhook route before `express.json()` and verify the untouched
  raw request body with `Stripe-Signature`.
- Do not authenticate Stripe callbacks with the user JWT; authenticate them
  with the Stripe signing secret.
- Webhook handlers must be idempotent because Stripe retries and may deliver
  events more than once or out of order.
- Treat Stripe as the payment authority, but validate that metadata and the
  locally stored reconciliation snapshot belong to the intended user and
  order.
- Do not acknowledge an event as successfully processed if the work is lost.
  Return a retryable failure or persist a durable recovery state.
- Any new webhook event must have tests for valid signature, invalid signature,
  duplicate delivery, missing local snapshot, and persistence failure.

## 3. Backend design rules

Use this request flow:

```text
route -> authentication/authorization -> controller validation
      -> domain service -> model/provider calls -> response
```

- Routes define transport and access policy.
- Controllers translate HTTP input/output and delegate complex workflows.
- Services own multi-step workflows, retries, idempotency, compensation, and
  external integrations.
- Models define schema validation and indexes, not business orchestration.
- `catchAsyncErrors` should pass failures to the final error middleware.
- Client errors should be deliberate 4xx responses. Provider/database failures
  should be classified as retryable or terminal rather than flattened into a
  misleading success response.
- Validate object IDs and structured query parameters before passing them to
  Mongoose.
- Escape user-controlled text before constructing regular expressions, and
  bound search length and computational work.
- Add indexes based on actual query shapes. Use `explain()` for large-query
  decisions instead of assuming an index is being used.
- Avoid unbounded `find()` responses for admin collections. Paginate lists and
  use aggregation for dashboard totals and charts.
- External calls (Stripe, Cloudinary, SMTP, recommendation service) need
  timeouts, bounded retries,
  and a defined behavior when the provider is unavailable.

## 4. Frontend design rules

- Redux state reflects server state; it does not authorize actions.
- Await order/payment thunks before clearing cart/session state or navigating to
  a success page.
- Keep a confirmed PaymentIntent ID available for retrying order persistence.
- Never display a successful order result merely because card confirmation
  succeeded; the order API or webhook reconciliation must complete.
- Reset cursor pagination when search, filter, or sort changes. Append pages
  only when the cursor belongs to the same query.
- Use accessible labels, keyboard-operable buttons, visible loading/error
  states, and non-destructive confirmation dialogs for admin actions.
- Avoid putting secrets in `REACT_APP_*` variables. A publishable Stripe key is
  public; secret keys and recommendation-service secrets belong only on the
  backend/server.
- Keep date and currency behavior explicit. Document whether a date range is
  interpreted in UTC or the administrator's local timezone.
- Prefer existing design tokens and component conventions before adding new
  one-off CSS values.

## 5. Recommendation service rules

- Validate request shape, numeric bounds, disease-code bounds, and list size at
  the FastAPI boundary.
- Keep the recommendation-service secret configured in both backend and
  Python service. Never expose the Gemini API key to the frontend or backend.
- Use timing-safe secret comparison and return a generic provider failure to
  callers; do not leak provider errors or prompts.
- Use LangChain's Gemini-compatible `ChatOpenAI` integration with
  `with_structured_output` and a strict, bounded Pydantic schema. The LLM returns
  food names and short reasons only; it must not return product IDs or links.
- The backend is the authority for catalog matching. Match names safely and
  attach a product link only after a MongoDB lookup.
- Keep the model/provider configurable through GEMINI_BASE_URL and GEMINI_MODEL
  and add tests
  for malformed JSON, missing fields, invalid ranges, unauthorized requests,
  provider failures, empty recommendations, and catalog matches/misses.

## 6. Testing strategy

Every defect fix should have a regression test at the lowest useful level.

### Unit tests

Use mocks for Stripe, Cloudinary, SMTP, recommendation-service HTTP calls, and
provider
failures. Unit tests should prove:

- pricing ignores tampered client prices and totals;
- ownership and role checks reject unauthorized access;
- state transitions accept only valid next states;
- stock reservation/release is idempotent;
- payment and order retries return the same order;
- reconciliation claims prevent duplicate side effects;
- invalid cursors, dates, IDs, and payloads return controlled errors.

### Integration tests

Use MongoDB Memory Server and Supertest for real route/middleware/model paths.
Run with the integration flag enabled:

```bash
cd backend
RUN_DB_INTEGRATION=true npm run test:integration
```

The suite must cover both success and failure races:

- two buyers competing for the final unit;
- duplicate payment/order requests;
- duplicate and out-of-order Stripe webhooks;
- payment succeeds while order persistence fails;
- reservation fails after payment succeeds;
- status update racing with deletion;
- review owner versus another user versus admin;
- cursor continuation, equal sort keys, and invalid cursor input.

If an integration suite is skipped, report that prominently; a green skipped
test is not evidence that the workflow passed.

### Frontend verification

Run:

```bash
cd frontend
npm test -- --watchAll=false
npm run build
```

For checkout and admin flows, manually verify loading, retry, failure, refresh,
mobile layout, keyboard access, and browser back/forward behavior.

## 7. Refactoring workflow

1. Read the relevant route, controller/service, model, client caller, and tests.
2. State the invariant and the failure scenario before editing.
3. Add or update a failing regression test when practical.
4. Implement the smallest cohesive change at the correct layer.
5. Run focused unit tests, then integration tests, then the frontend build if
   client code changed.
6. Review the diff for authorization, data leakage, race windows, retries,
   and accidental changes to environment or generated files.
7. Update docs and API comments when behavior changes.
8. Commit one coherent feature or fix per branch. Never include `.env`,
   `node_modules`, build output, `.DS_Store`, or model artifacts unless the
   task explicitly requires them.

Use `git diff --check` before committing. Prefer `git push --force-with-lease`
only when rewriting a branch is intentional and coordinated; never rewrite
shared `master` history.

## 8. Review checklist

Before calling work complete, ask:

- Can a different user read, update, delete, or infer this resource?
- Can two requests charge, reserve, release, or create the same thing at once?
- What happens after each external call succeeds but the next database write
  fails?
- Is retrying the request safe and deterministic?
- Is every client-calculated value rechecked on the server?
- Can the response or query grow without a bound?
- Are timezones, currency units, and date boundaries explicit?
- Are tests actually running, or merely being skipped?
- Are API docs, environment examples, and learning docs consistent with the
  implementation?

When uncertain, preserve data and money, fail closed on authorization, make
recovery durable, and surface the ambiguity rather than silently guessing.
