import { jest } from "@jest/globals";

const shouldRun = process.env.RUN_DB_INTEGRATION === "true";
const describeDatabase = shouldRun ? describe : describe.skip;

const retrievePaymentIntent = jest.fn();
const createPaymentIntent = jest.fn();
const constructEvent = jest.fn();
jest.unstable_mockModule("stripe", () => ({
  default: jest.fn(() => ({
    paymentIntents: { retrieve: retrievePaymentIntent, create: createPaymentIntent },
    webhooks: { constructEvent },
  })),
}));

const { default: request } = await import("supertest");
const { default: mongoose } = await import("mongoose");
const { MongoMemoryServer } = await import("mongodb-memory-server");
const { default: jwt } = await import("jsonwebtoken");
const { default: app } = await import("../../app.js");
const { default: User } = await import("../../models/userModel.js");
const { default: Product } = await import("../../models/productModel.js");
const { default: Order } = await import("../../models/orderModel.js");
const { default: PaymentReconciliation } = await import("../../models/paymentReconciliationModel.js");
const { getScopedIdempotencyKey } = await import("../../controllers/paymentController.js");
const { expireStaleReconciliations } = await import("../../services/orderFinalizationService.js");

describeDatabase("order and review API integration", () => {
  let mongo;
  let owner;
  let other;
  let admin;
  let product;

  const cookieFor = (user) => `token=${jwt.sign({ id: user._id }, process.env.JWT_SECRET)}`;
  const shippinginfo = { address: "1 Main Street", city: "Dhaka", pinCode: 1207, phoneNo: "01700000000" };

  beforeAll(async () => {
    try {
      mongo = await MongoMemoryServer.create();
      await mongoose.connect(mongo.getUri());
    } catch (error) {
      throw new Error(`[environment] MongoMemoryServer startup failed: ${error.message}`);
    }
  });

  beforeEach(async () => {
    await Promise.all([User.deleteMany({}), Product.deleteMany({}), Order.deleteMany({}), PaymentReconciliation.deleteMany({})]);
    const userData = (email, role = "user") => ({ name: role === "user" ? email.split("@")[0] : role, email, password: "password123", role, avatar: { public_id: email, url: "avatar.jpg" }, isVerified: true });
    [owner, other, admin] = await User.create([userData("owner@example.com"), userData("other@example.com"), userData("admin@example.com", "admin")]);
    [product] = await Product.create([{ name: "Apple", description: "Fresh apple", price: 100, stock: 5, images: [{ public_id: "apple", url: "apple.jpg" }], category: "fruit", user: admin._id }]);
    retrievePaymentIntent.mockReset();
    retrievePaymentIntent.mockResolvedValue({ id: "pi_test", status: "succeeded", amount: 43600, currency: "inr" });
    createPaymentIntent.mockReset();
    constructEvent.mockReset();
  });

  afterEach(async () => { jest.clearAllMocks(); });
  afterAll(async () => { await mongoose.disconnect(); if (mongo) await mongo.stop(); });

  test("owner can read an order but another user cannot", async () => {
    const order = await Order.create({ shippinginfo, orderitems: [{ name: "Apple", price: 100, quantity: 1, image: product.images[0], product: product._id }], user: owner._id, paymentinfo: { id: "pi_owner", status: "succeeded" }, paidat: new Date(), stockReserved: true });
    await request(app).get(`/api/v1/order/${order._id}`).set("Cookie", cookieFor(owner)).expect(200);
    await request(app).get(`/api/v1/order/${order._id}`).set("Cookie", cookieFor(other)).expect(404);
    await request(app).get(`/api/v1/admin/order/${order._id}`).set("Cookie", cookieFor(admin)).expect(200);
  });

  test("recalculates tampered prices and rejects an invalid payment", async () => {
    const body = { shippinginfo, orderitems: [{ product: product._id, quantity: 2, price: 0.01 }], paymentinfo: { id: "pi_test", status: "succeeded" }, itemsprice: 0.02, tax: 0, shippingcost: 0, totalprice: 0 };
    const response = await request(app).post("/api/v1/order/new").set("Cookie", cookieFor(owner)).send(body).expect(201);
    expect(response.body.order.itemsprice).toBe(200);
    expect(response.body.order.totalprice).toBe(436);
    expect(await Product.findById(product._id).then((p) => p.stock)).toBe(3);

    retrievePaymentIntent.mockResolvedValueOnce({ id: "pi_bad", status: "succeeded", amount: 1, currency: "inr" });
    await request(app).post("/api/v1/order/new").set("Cookie", cookieFor(owner)).send({ ...body, paymentinfo: { id: "pi_bad" } }).expect(400);
  });

  test("deduplicates concurrent payment requests that use the same idempotency key", async () => {
    const payment = { id: "pi_same-key", client_secret: "secret_same-key" };
    createPaymentIntent.mockImplementation(async (_params, options) => {
      expect(options).toEqual({ idempotencyKey: getScopedIdempotencyKey(owner._id, "attempt-same") });
      return { ...payment, status: "requires_payment_method" };
    });
    const body = { orderitems: [{ product: product._id, quantity: 1 }], shippinginfo, idempotencyKey: "attempt-same" };
    const responses = await Promise.all([
      request(app).post("/api/v1/payment/process").set("Cookie", cookieFor(owner)).send(body),
      request(app).post("/api/v1/payment/process").set("Cookie", cookieFor(owner)).send(body),
    ]);
    expect(responses.map((response) => response.statusCode)).toEqual([200, 200]);
    expect(responses[0].body.client_secret).toBe(responses[1].body.client_secret);
    expect(createPaymentIntent).toHaveBeenCalledTimes(2);
  });

  test("isolates the same client idempotency key between users", async () => {
    createPaymentIntent.mockResolvedValue({ client_secret: "secret_user" });
    const body = { orderitems: [{ product: product._id, quantity: 1 }], shippinginfo, idempotencyKey: "attempt-shared" };
    await request(app).post("/api/v1/payment/process").set("Cookie", cookieFor(owner)).send(body).expect(200);
    await request(app).post("/api/v1/payment/process").set("Cookie", cookieFor(other)).send(body).expect(200);
    expect(createPaymentIntent.mock.calls[0][1]).not.toEqual(createPaymentIntent.mock.calls[1][1]);
  });

  test("webhook finalizes a matching reconciliation and duplicate events stay idempotent", async () => {
    const paymentIntentId = "pi_webhook-success";
    await PaymentReconciliation.create({
      paymentIntentId,
      user: owner._id,
      shippinginfo,
      orderitems: [{ name: "Apple", price: 100, quantity: 1, image: product.images[0], product: product._id }],
      itemsprice: 100,
      tax: 18,
      shippingcost: 200,
      totalprice: 318,
      paymentStatus: "requires_payment_method",
    });
    retrievePaymentIntent.mockResolvedValue({ id: paymentIntentId, status: "succeeded", amount: 31800, currency: "inr" });
    constructEvent.mockReturnValue({ type: "payment_intent.succeeded", data: { object: { id: paymentIntentId, status: "succeeded" } } });

    await request(app).post("/api/v1/payment/webhook").set("Stripe-Signature", "sig").send("{}").expect(200);
    await request(app).post("/api/v1/payment/webhook").set("Stripe-Signature", "sig").send("{}").expect(200);
    expect(await Order.countDocuments({ "paymentinfo.id": paymentIntentId })).toBe(1);
    expect((await Product.findById(product._id)).stock).toBe(4);
    expect(await PaymentReconciliation.countDocuments({ paymentIntentId })).toBe(0);

    await request(app).post("/api/v1/order/new").set("Cookie", cookieFor(owner)).send({ shippinginfo, orderitems: [{ product: product._id, quantity: 1 }], paymentinfo: { id: paymentIntentId } }).expect(200);
    expect(await Order.countDocuments({ "paymentinfo.id": paymentIntentId })).toBe(1);
  });

  test("serializes simultaneous webhook finalization for one PaymentIntent", async () => {
    const paymentIntentId = "pi_webhook-concurrent";
    await PaymentReconciliation.create({
      paymentIntentId,
      user: owner._id,
      shippinginfo,
      orderitems: [{ name: "Apple", price: 100, quantity: 1, image: product.images[0], product: product._id }],
      itemsprice: 100,
      tax: 18,
      shippingcost: 200,
      totalprice: 318,
      paymentStatus: "requires_payment_method",
    });
    retrievePaymentIntent.mockResolvedValue({ id: paymentIntentId, status: "succeeded", amount: 31800, currency: "inr" });
    constructEvent.mockReturnValue({ type: "payment_intent.succeeded", data: { object: { id: paymentIntentId, status: "succeeded" } } });

    const responses = await Promise.all([
      request(app).post("/api/v1/payment/webhook").set("Stripe-Signature", "sig").send("{}"),
      request(app).post("/api/v1/payment/webhook").set("Stripe-Signature", "sig").send("{}"),
    ]);
    expect(responses.map(({ statusCode }) => statusCode).sort()).toEqual([200, 200]);
    expect(await Order.countDocuments({ "paymentinfo.id": paymentIntentId })).toBe(1);
    expect((await Product.findById(product._id)).stock).toBe(4);
    expect(await PaymentReconciliation.countDocuments({ paymentIntentId })).toBe(0);
  });

  test("acknowledges a succeeded webhook without a matching reconciliation", async () => {
    constructEvent.mockReturnValue({ type: "payment_intent.succeeded", data: { object: { id: "pi_webhook-unmatched" } } });
    const response = await request(app).post("/api/v1/payment/webhook").set("Stripe-Signature", "sig").send("{}").expect(200);
    expect(response.body).toMatchObject({ success: true, received: true, recoverable: true });
    expect(await Order.countDocuments({ "paymentinfo.id": "pi_webhook-unmatched" })).toBe(0);
  });

  test("recovers a missing reconciliation from PaymentIntent metadata", async () => {
    const paymentIntentId = "pi_snapshot-write-failure";
    createPaymentIntent.mockResolvedValue({ id: paymentIntentId, client_secret: "secret_recovery", status: "requires_payment_method" });
    const snapshotWrite = jest.spyOn(PaymentReconciliation, "findOneAndUpdate")
      .mockRejectedValue(new Error("temporary database outage"));

    const paymentResponse = await request(app).post("/api/v1/payment/process")
      .set("Cookie", cookieFor(owner))
      .send({ shippinginfo, orderitems: [{ product: product._id, quantity: 1 }] })
      .expect(200);
    expect(paymentResponse.body).toMatchObject({ success: true, reconciliationRequired: true, paymentIntentId });
    const metadata = createPaymentIntent.mock.calls[0][0].metadata;
    snapshotWrite.mockRestore();

    retrievePaymentIntent.mockResolvedValue({ id: paymentIntentId, status: "succeeded", amount: 31800, currency: "inr" });
    constructEvent.mockReturnValue({
      type: "payment_intent.succeeded",
      data: { object: { id: paymentIntentId, status: "succeeded", metadata } },
    });
    await request(app).post("/api/v1/payment/webhook").set("Stripe-Signature", "sig").send("{}").expect(200);

    expect(await Order.countDocuments({ "paymentinfo.id": paymentIntentId })).toBe(1);
    expect(await PaymentReconciliation.countDocuments({ paymentIntentId })).toBe(0);
  });

  test("marks failed payments and releases an applicable reservation", async () => {
    const paymentIntentId = "pi_webhook-failed";
    await Product.findByIdAndUpdate(product._id, { $inc: { stock: -1 }, $push: { stockReservations: { reservationId: paymentIntentId, quantity: 1 } } });
    const reconciliation = await PaymentReconciliation.create({
      paymentIntentId,
      user: owner._id,
      shippinginfo,
      orderitems: [{ name: "Apple", price: 100, quantity: 1, image: product.images[0], product: product._id }],
      itemsprice: 100,
      tax: 18,
      shippingcost: 200,
      totalprice: 318,
      paymentStatus: "succeeded",
      stockReserved: true,
    });
    constructEvent.mockReturnValue({ type: "payment_intent.payment_failed", data: { object: { id: paymentIntentId } } });
    await request(app).post("/api/v1/payment/webhook").set("Stripe-Signature", "sig").send("{}").expect(200);
    const updated = await PaymentReconciliation.findById(reconciliation._id);
    expect(updated).toMatchObject({ paymentStatus: "failed", status: "failed", stockReserved: false });
    expect((await Product.findById(product._id)).stock).toBe(5);
  });

  test("marks canceled payments terminal and releases an applicable reservation", async () => {
    const paymentIntentId = "pi_webhook-canceled";
    await Product.findByIdAndUpdate(product._id, { $inc: { stock: -1 }, $push: { stockReservations: { reservationId: paymentIntentId, quantity: 1 } } });
    const reconciliation = await PaymentReconciliation.create({
      paymentIntentId,
      user: owner._id,
      shippinginfo,
      orderitems: [{ name: "Apple", price: 100, quantity: 1, image: product.images[0], product: product._id }],
      itemsprice: 100,
      tax: 18,
      shippingcost: 200,
      totalprice: 318,
      paymentStatus: "requires_payment_method",
      stockReserved: true,
    });
    constructEvent.mockReturnValue({ type: "payment_intent.canceled", data: { object: { id: paymentIntentId, status: "canceled" } } });

    await request(app).post("/api/v1/payment/webhook").set("Stripe-Signature", "sig").send("{}").expect(200);

    const updated = await PaymentReconciliation.findById(reconciliation._id);
    expect(updated).toMatchObject({ paymentStatus: "canceled", status: "canceled", stockReserved: false });
    expect((await Product.findById(product._id)).stock).toBe(5);
    expect((await Product.findById(product._id)).stockReservations).toHaveLength(0);
  });

  test("expires stale pending reconciliations and releases their reservations", async () => {
    const paymentIntentId = "pi_stale-reconciliation";
    await Product.findByIdAndUpdate(product._id, { $inc: { stock: -1 }, $push: { stockReservations: { reservationId: paymentIntentId, quantity: 1 } } });
    const reconciliation = await PaymentReconciliation.create({
      paymentIntentId,
      user: owner._id,
      shippinginfo,
      orderitems: [{ name: "Apple", price: 100, quantity: 1, image: product.images[0], product: product._id }],
      itemsprice: 100,
      tax: 18,
      shippingcost: 200,
      totalprice: 318,
      paymentStatus: "requires_payment_method",
      stockReserved: true,
      createdAt: new Date("2026-09-01T00:00:00Z"),
    });

    await expect(expireStaleReconciliations({ now: new Date("2026-09-08T00:00:00Z"), maxAgeMs: 24 * 60 * 60 * 1000 })).resolves.toBe(1);

    const updated = await PaymentReconciliation.findById(reconciliation._id);
    expect(updated).toMatchObject({ paymentStatus: "expired", status: "expired", stockReserved: false });
    expect((await Product.findById(product._id)).stock).toBe(5);
    expect((await Product.findById(product._id)).stockReservations).toHaveLength(0);
  });

  test("allows only one simultaneous order to reserve the final unit", async () => {
    await Product.findByIdAndUpdate(product._id, { stock: 1 });
    retrievePaymentIntent.mockImplementation(async (paymentId) => ({ id: paymentId, status: "succeeded", amount: 31800, currency: "inr" }));
    const makeRequest = (paymentId) => request(app).post("/api/v1/order/new").set("Cookie", cookieFor(owner)).send({ shippinginfo, orderitems: [{ product: product._id, quantity: 1 }], paymentinfo: { id: paymentId } });
    const responses = await Promise.all([makeRequest("pi_race_1"), makeRequest("pi_race_2")]);
    expect(responses.map((response) => response.statusCode).sort()).toEqual([201, 202]);
    expect(await Order.countDocuments()).toBe(1);
    expect((await Product.findById(product._id)).stock).toBe(0);
    const losingPaymentId = responses.find((response) => response.statusCode === 202)
      ? ["pi_race_1", "pi_race_2"][responses.findIndex((response) => response.statusCode === 202)]
      : null;
    expect(losingPaymentId).toBeTruthy();
    expect(await PaymentReconciliation.countDocuments({ paymentIntentId: losingPaymentId, user: owner._id })).toBe(1);
  });

  test("retries the same order request idempotently", async () => {
    const body = { shippinginfo, orderitems: [{ product: product._id, quantity: 1 }], paymentinfo: { id: "pi_retry" } };
    retrievePaymentIntent.mockResolvedValue({ id: "pi_retry", status: "succeeded", amount: 31800, currency: "inr" });
    const first = await request(app).post("/api/v1/order/new").set("Cookie", cookieFor(owner)).send(body).expect(201);
    const second = await request(app).post("/api/v1/order/new").set("Cookie", cookieFor(owner)).send(body).expect(200);
    expect(second.body.order._id).toBe(first.body.order._id);
    expect(await Order.countDocuments()).toBe(1);
    expect((await Product.findById(product._id)).stock).toBe(4);
  });

  test("exposes and recovers a reconciliation state after payment succeeds but order persistence fails", async () => {
    const createSpy = jest.spyOn(Order, "create").mockRejectedValueOnce(new Error("database unavailable"));
    retrievePaymentIntent.mockResolvedValue({ id: "pi_persist-failure", status: "succeeded", amount: 31800, currency: "inr" });
    try {
      const response = await request(app).post("/api/v1/order/new").set("Cookie", cookieFor(owner)).send({ shippinginfo, orderitems: [{ product: product._id, quantity: 1 }], paymentinfo: { id: "pi_persist-failure" } });
      expect(response.statusCode).toBe(202);
      expect(response.body).toMatchObject({ success: false, reconciliationRequired: true });
      expect(await Order.countDocuments()).toBe(0);
      expect(await PaymentReconciliation.countDocuments({ paymentIntentId: "pi_persist-failure", user: owner._id })).toBe(1);
    } finally {
      createSpy.mockRestore();
    }
    const retry = await request(app).post("/api/v1/order/new").set("Cookie", cookieFor(owner)).send({ shippinginfo, orderitems: [{ product: product._id, quantity: 1 }], paymentinfo: { id: "pi_persist-failure" } }).expect(201);
    expect(retry.body.order.paymentinfo.id).toBe("pi_persist-failure");
    expect(await PaymentReconciliation.countDocuments()).toBe(0);
  });

  test("reuses stock reserved before a process crash during order persistence", async () => {
    const reservationId = "pi_crash-after-reservation";
    await Product.findByIdAndUpdate(product._id, {
      $inc: { stock: -1 },
      $push: { stockReservations: { reservationId, quantity: 1 } },
    });
    await PaymentReconciliation.create({
      paymentIntentId: reservationId,
      user: owner._id,
      shippinginfo,
      orderitems: [{ name: "Apple", price: 100, quantity: 1, image: product.images[0], product: product._id }],
      itemsprice: 100,
      tax: 18,
      shippingcost: 200,
      totalprice: 318,
      paymentStatus: "succeeded",
      stockReserved: false,
    });
    retrievePaymentIntent.mockResolvedValue({ id: reservationId, status: "succeeded", amount: 31800, currency: "inr" });

    const retry = await request(app).post("/api/v1/order/new").set("Cookie", cookieFor(owner)).send({ shippinginfo, orderitems: [{ product: product._id, quantity: 1 }], paymentinfo: { id: reservationId } }).expect(201);
    expect(retry.body.order.paymentinfo.id).toBe(reservationId);
    expect((await Product.findById(product._id)).stock).toBe(4);
    expect((await Product.findById(product._id)).stockReservations.filter(({ reservationId: id }) => id === reservationId)).toHaveLength(1);
  });

  test("retains reconciliation when reservation fails after payment succeeds", async () => {
    const secondProduct = await Product.create({ name: "Pear", description: "Fresh pear", price: 100, stock: 5, images: [{ public_id: "pear", url: "pear.jpg" }], category: "fruit", user: admin._id });
    const originalFindOneAndUpdate = Product.findOneAndUpdate.bind(Product);
    const reservationSpy = jest.spyOn(Product, "findOneAndUpdate")
      .mockImplementationOnce((...args) => originalFindOneAndUpdate(...args))
      .mockResolvedValueOnce(null);
    retrievePaymentIntent.mockResolvedValue({ id: "pi_rollback", status: "succeeded", amount: 43600, currency: "inr" });
    try {
      await request(app).post("/api/v1/order/new").set("Cookie", cookieFor(owner)).send({ shippinginfo, orderitems: [{ product: product._id, quantity: 1 }, { product: secondProduct._id, quantity: 1 }], paymentinfo: { id: "pi_rollback" } }).expect(202);
      expect((await Product.findById(product._id)).stock).toBe(5);
      expect(await Order.countDocuments()).toBe(0);
      expect(await PaymentReconciliation.countDocuments({ paymentIntentId: "pi_rollback", user: owner._id })).toBe(1);
    } finally {
      reservationSpy.mockRestore();
    }
  });

  test("does not disclose an existing PaymentIntent order to another user", async () => {
    const order = await Order.create({ shippinginfo, orderitems: [{ name: "Apple", price: 100, quantity: 1, image: product.images[0], product: owner._id }], user: owner._id, paymentinfo: { id: "pi_shared", status: "succeeded" }, paidat: new Date() });
    await request(app).post("/api/v1/order/new").set("Cookie", cookieFor(other)).send({ shippinginfo, orderitems: [{ product: product._id, quantity: 1 }], paymentinfo: { id: "pi_shared" } }).expect(404);
    expect(order).toBeDefined();
  });

  test("releases reserved inventory when an admin deletes an order", async () => {
    const order = await Order.create({ shippinginfo, orderitems: [{ name: "Apple", price: 100, quantity: 1, image: product.images[0], product: product._id }], user: owner._id, paymentinfo: { id: "pi_delete", status: "succeeded" }, paidat: new Date(), stockReserved: true });
    await Product.findByIdAndUpdate(product._id, { $inc: { stock: -1 }, $push: { stockReservations: { reservationId: "pi_delete", quantity: 1 } } });
    await request(app).delete(`/api/v1/admin/order/${order._id}`).set("Cookie", cookieFor(admin)).expect(200);
    expect((await Product.findById(product._id)).stock).toBe(5);
    await request(app).delete(`/api/v1/admin/order/${order._id}`).set("Cookie", cookieFor(admin)).expect(404);
  });

  test("rejects a stale deletion after the order has shipped and preserves inventory", async () => {
    const order = await Order.create({ shippinginfo, orderitems: [{ name: "Apple", price: 100, quantity: 1, image: product.images[0], product: product._id }], user: owner._id, paymentinfo: { id: "pi_stale_delete", status: "succeeded" }, paidat: new Date(), stockReserved: true });
    await Product.findByIdAndUpdate(product._id, { $inc: { stock: -1 }, $push: { stockReservations: { reservationId: "pi_stale_delete", quantity: 1 } } });

    await request(app).put(`/api/v1/admin/order/${order._id}`).set("Cookie", cookieFor(admin)).send({ status: "shipped" }).expect(200);
    await request(app).delete(`/api/v1/admin/order/${order._id}`).set("Cookie", cookieFor(admin)).expect(400);
    expect(await Order.exists({ _id: order._id })).toBeTruthy();
    expect((await Product.findById(product._id)).stock).toBe(4);
  });

  test("rejects status changes after deletion claims the order", async () => {
    const order = await Order.create({ shippinginfo, orderitems: [{ name: "Apple", price: 100, quantity: 1, image: product.images[0], product: product._id }], user: owner._id, paymentinfo: { id: "pi_claimed_delete", status: "succeeded" }, paidat: new Date(), stockReserved: true, deletionInProgress: true });
    await request(app).put(`/api/v1/admin/order/${order._id}`).set("Cookie", cookieFor(admin)).send({ status: "shipped" }).expect(409);
    expect((await Order.findById(order._id)).orderstatus).toBe("processing");
  });

  test.each(["shipped", "delivered"])("rejects deletion of a %s order without restoring inventory", async (orderstatus) => {
    const order = await Order.create({ shippinginfo, orderitems: [{ name: "Apple", price: 100, quantity: 1, image: product.images[0], product: product._id }], user: owner._id, paymentinfo: { id: `pi_${orderstatus}`, status: "succeeded" }, paidat: new Date(), stockReserved: true, orderstatus });
    await Product.findByIdAndUpdate(product._id, { $inc: { stock: -1 } });
    await request(app).delete(`/api/v1/admin/order/${order._id}`).set("Cookie", cookieFor(admin)).expect(400);
    expect(await Order.exists({ _id: order._id })).toBeTruthy();
    expect((await Product.findById(product._id)).stock).toBe(4);
  });

  test("enforces the order status state machine", async () => {
    const order = await Order.create({ shippinginfo, orderitems: [{ name: "Apple", price: 100, quantity: 1, image: product.images[0], product: product._id }], user: owner._id, paymentinfo: { id: "pi_status", status: "succeeded" }, paidat: new Date(), stockReserved: true });
    await request(app).put(`/api/v1/admin/order/${order._id}`).set("Cookie", cookieFor(admin)).send({ status: "delivered" }).expect(400);
    await request(app).put(`/api/v1/admin/order/${order._id}`).set("Cookie", cookieFor(admin)).send({ status: "shipped" }).expect(200);
    await request(app).put(`/api/v1/admin/order/${order._id}`).set("Cookie", cookieFor(admin)).send({ status: "shipped" }).expect(400);
  });

});
