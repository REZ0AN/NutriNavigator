# NutriNavigator 

> A focused breakdown of the current architectural problems in the application and the possible solutions for each.

---

## Table of Contents

1. [Blocking Email on Auth Flows](#1-blocking-email-on-auth-flows)
2. [Synchronous Image Uploads](#2-synchronous-image-uploads)
3. [No Caching on Product Queries](#3-no-caching-on-product-queries)
4. [Synchronous ML Inference](#4-synchronous-ml-inference)
5. [Fragile Order State Mutation](#5-fragile-order-state-mutation)
6. [Monolithic Scaling](#6-monolithic-scaling)

---

## 1. Blocking Email on Auth Flows

### Current Problem

`sendEmail()` is called with `await` directly inside the register and forgot-password controllers. The HTTP response is held open until the SMTP handshake completes. If Gmail is slow, throttled, or down, the user's registration request hangs — or fails entirely.

```js
// Current — response blocks on external SMTP
const registerUser = async (req, res) => {
  const user = await User.create({ ... });
  await sendEmail({ to: user.email, ... }); // ← blocks here
  res.status(201).json({ success: true });
};
```

### Possible Solutions

**Option A — Fire and forget (no new dependencies)**

Drop the `await`. The email sends in the background. If it fails, it logs an error. The user gets their 201 immediately.

```js
const registerUser = async (req, res) => {
  const user = await User.create({ ... });

  sendEmail({ to: user.email, ... }).catch((err) =>
    logger.error("Verification email failed for %s: %s", user.email, err.message)
  );

  res.status(201).json({ success: true, message: "Check your inbox." });
};
```

Pros: Zero dependencies, one-line change, immediate improvement.  
Cons: No retry on failure. User must manually trigger "resend verification."

---

**Option B — BullMQ job queue (Redis-backed)**

Push the email as a job. A background worker picks it up, renders the template, sends via SMTP, and retries on failure with exponential backoff.

```
POST /register
  → User.create()                          (fast)
  → emailQueue.add({ type: "verify", userId })
  → res.status(201).json(...)              (immediate)

Email Worker (separate process)
  → picks up job
  → renders template
  → sends via nodemailer
  → retries up to 3× on failure
```

Pros: Retry logic, dead letter queue, full visibility into job state.  
Cons: Requires Redis as a new infrastructure dependency.

---

## 2. Synchronous Image Uploads

### Current Problem

`cloudinary.uploader.upload(base64)` runs synchronously inside the product create and update request handlers. A 4MB image takes 3–8 seconds on a standard network. The admin's browser is blocked waiting for the response, and the server holds the connection open for the duration of every upload.

```js
// Current — upload blocks the request
const createProduct = async (req, res) => {
  const images = [];
  for (const img of req.body.images) {
    const result = await cloudinary.uploader.upload(img); // ← 3–8s per image
    images.push({ url: result.secure_url, public_id: result.public_id });
  }
  await Product.create({ ...req.body, images });
  res.status(201).json({ success: true });
};
```

### Possible Solutions

**Option A — Accept immediately, process in background**

Return a 202 with a `productId` and status `"processing"`. A BullMQ worker uploads to Cloudinary and updates the product record when done. The admin panel polls or receives a push update.

```
POST /admin/product/new
  → validate fields
  → Product.create({ ...data, status: "processing" })
  → uploadQueue.add({ images: req.body.images, productId })
  → res.status(202).json({ productId, status: "processing" })

Upload Worker
  → uploads each image to Cloudinary
  → updates product.images[]
  → sets product.status = "active"
```

Pros: Admin gets an immediate response. Upload failures are retryable.  
Cons: Product is briefly in a "processing" state. Requires queue infrastructure.

---

**Option B — Upload to temporary store, swap async**

Accept base64 images, store them temporarily in Redis or S3, return 201. A separate process handles the Cloudinary transfer and URL swap.

Pros: Separates concerns cleanly. Cloudinary can be swapped for another CDN without touching the API.  
Cons: More moving parts. Two storage systems involved.

---

## 3. No Caching on Product Queries

### Current Problem

Every product listing request — including paginated, filtered, and keyword-searched requests — hits MongoDB directly. There is no caching layer. Under normal browsing patterns this means repeated identical queries are re-executed on every page load, including full collection scans when no indexed fields are used.

```js
// Current — DB hit on every request
const getProducts = async (req, res) => {
  const products = await Product.find(buildQuery(req.query))
    .limit(req.query.limit)
    .skip(req.query.page * req.query.limit);
  res.json({ products });
};
```

### Possible Solutions

**Option A — Redis response caching with TTL**

Cache the serialized response keyed by query parameters. Serve from cache on cache hit. Set a short TTL (5 minutes) to avoid stale data.

```js
const getProducts = async (req, res) => {
  const cacheKey = `products:${JSON.stringify(req.query)}`;

  const cached = await redis.get(cacheKey);
  if (cached) return res.json(JSON.parse(cached));

  const products = await Product.find(buildQuery(req.query))
    .limit(req.query.limit)
    .skip(req.query.page * req.query.limit);

  await redis.setex(cacheKey, 300, JSON.stringify({ products }));
  res.json({ products });
};
```

Cache invalidation: flush keys matching `products:*` on any product create, update, or delete.

Pros: Massive read performance improvement. No changes to the MongoDB schema.  
Cons: Requires Redis. Cache invalidation logic must be consistent across all write paths.

---

**Option B — MongoDB indexes + query optimization**

Add compound indexes on the fields most commonly filtered: `category`, `ratings`, `price`.

```js
// In Product model
ProductSchema.index({ category: 1, ratings: -1, price: 1 });
ProductSchema.index({ name: "text", description: "text" }); // for keyword search
```

Pros: Zero new infrastructure. Improves all queries immediately.  
Cons: Does not eliminate repeated DB hits. Indexes help with speed, not volume.

> **Best approach:** Do Option B first (always), then add Option A when traffic justifies it.

---

## 4. Synchronous ML Inference

### Current Problem

The diet recommendation flow is fully synchronous end-to-end. Express calls Flask, Flask runs the RandomForest model, and the result travels back through the chain before Express can respond. If inference takes 2 seconds, the user waits 2+ seconds with a spinner and the server holds the connection open.

```
Browser
  → POST /diet/recommend
      → Express calls Flask (awaits)
          → Flask runs RandomForest (2–4s)
      → Express receives result
  → Browser receives response
```

### Possible Solutions

**Option A — Job queue with polling**

The POST endpoint enqueues the inference job and returns a `jobId` immediately. The client polls `GET /diet/result/:jobId` until the result is ready.

```
POST /diet/recommend
  → validate input
  → mlQueue.add({ input: req.body, jobId: uuid() })
  → res.status(202).json({ jobId })

GET /diet/result/:jobId
  → check Redis for result
  → return { status: "pending" } or { status: "done", foods: [...] }

ML Worker
  → picks up job
  → calls Flask with input
  → stores result in Redis with jobId as key
  → marks job complete
```

Pros: Express connection freed immediately. Worker can retry failed inferences.  
Cons: Client needs polling logic. Result latency is slightly higher due to queue overhead.

---

**Option B — WebSocket push**

The client opens a WebSocket connection. The ML worker pushes the result back to the client when inference completes — no polling needed.

```
Client connects via WebSocket (ws://api/diet/ws)
Client sends { input: { ... } }
Server enqueues job, stores socketId
ML Worker completes → pushes result to socketId
Client receives { foods: [...] }
```

Pros: Real-time push, no polling overhead, cleaner UX.  
Cons: WebSocket connections require a stateful server or a pub-sub layer (Redis pub-sub) to route results to the correct client.

---

## 5. Fragile Order State Mutation

### Current Problem

Order status is updated via a single `PUT /admin/orders/:id` request that directly mutates the `status` field in MongoDB. There is no audit trail, no event log, and no side-effect handling. If Stripe confirms a payment but the subsequent MongoDB write fails, the order ends up in an inconsistent state — paid but not marked as paid.

```js
// Current — direct mutation, no side effects
const updateOrder = async (req, res) => {
  const order = await Order.findByIdAndUpdate(
    req.params.id,
    { status: req.body.status },
    { new: true }
  );
  res.json({ order });
};
```

### Possible Solutions

**Option A — Event log + derived state**

Model each order status transition as an immutable event. State is derived by reading the event log — never mutated directly.

```js
// Events stored as an append-only log
const events = [
  { type: "OrderCreated",      at: "...", payload: { ... } },
  { type: "PaymentSucceeded",  at: "...", payload: { chargeId: "..." } },
  { type: "OrderShipped",      at: "...", payload: { trackingId: "..." } },
];

// Transition function
const transition = async (orderId, event) => {
  await OrderEvent.create({ orderId, ...event });
  await handleSideEffects(event); // send email, update stock, etc.
  await Order.findByIdAndUpdate(orderId, { status: deriveStatus(event.type) });
};
```

Events to handle:

| Event | Side Effects |
|---|---|
| `OrderCreated` | Reserve stock |
| `PaymentSucceeded` | Send fulfillment email, release stock hold |
| `PaymentFailed` | Release stock, notify customer |
| `OrderShipped` | Send tracking email |
| `OrderDelivered` | Unlock review capability |
| `OrderCancelled` | Refund Stripe charge, restore stock |

Pros: Full audit trail. Replay events to recover from failures. Side effects are handled consistently.  
Cons: More code to write upfront. Requires rethinking how the admin UI triggers transitions.

---

**Option B — Transactional writes with session**

Use MongoDB sessions to wrap the Stripe confirmation + order update in a transaction. If the DB write fails, the session rolls back.

```js
const session = await mongoose.startSession();
session.startTransaction();

try {
  const charge = await stripe.paymentIntents.confirm(paymentIntentId);
  await Order.findByIdAndUpdate(id, { status: "paid" }, { session });
  await session.commitTransaction();
} catch (err) {
  await session.abortTransaction();
  throw err;
}
```

Pros: Atomic writes. No partial state on failure.  
Cons: Does not provide an audit trail. Side effects (emails, stock) still need separate handling.

---

## 6. Monolithic Scaling

### Current Problem

The entire application — auth, products, orders, payments, email, and ML proxy — runs as a single Node.js process. Scaling any one concern requires scaling everything. If the ML inference load spikes, the API server must scale up even though auth and product browsing are fine.

```
[ Single Express Process ]
  auth + products + orders + payments + email + ML proxy
          ↕ one connection pool to MongoDB
          ↕ one Cloudinary config
          ↕ one Stripe instance
```

### Possible Solutions

**Option A — Modular monolith (recommended first step)**

Restructure the codebase into domain modules with clear boundaries. One deployable unit, but each domain owns its own models, routes, and business logic. Easy to extract into a true service later.

```
backend/
  modules/
    auth/         ← User model, JWT, email verification
    products/     ← Product model, Cloudinary, reviews
    orders/       ← Order model, Stripe, cart
    diet/         ← ML proxy, recommendation logic
  shared/
    queue/        ← BullMQ setup
    cache/        ← Redis client
    middleware/   ← Auth guard, rate limiter, error handler
```

Pros: No operational change. One deploy, one debug surface. Modules can be extracted to services when the team and traffic justify it.  
Cons: Does not enable independent scaling yet.

---

**Option B — Service decomposition (future)**

Extract each module into an independently deployable service behind an API gateway. Each service owns its database connection and can be scaled, deployed, and monitored independently.

```
[ API Gateway (nginx / Express) ]
  → Auth Service    (users, JWT, email)
  → Product Service (CRUD, Cloudinary, reviews)
  → Order Service   (cart, checkout, Stripe)
  → ML Service      (Flask, RandomForest)

[ Message Queue — BullMQ / Redis ]
  → Email Worker
  → Upload Worker
  → ML Worker

[ Cache — Redis ]
[ Database — MongoDB Atlas (replica set) ]
```

Pros: Independent scaling. Fault isolation. Team autonomy at larger team sizes.  
Cons: Significant operational complexity. Distributed debugging. Eventual consistency challenges. Only justified once real scaling pain exists.

---