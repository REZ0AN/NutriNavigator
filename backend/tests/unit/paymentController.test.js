import { jest } from "@jest/globals";

const productFind = jest.fn();
const retrievePaymentIntent = jest.fn();
const constructEvent = jest.fn();
const reconciliationFindOne = jest.fn();
const reconciliationUpdate = jest.fn();
const reconciliationDelete = jest.fn();
const finalizeReconciliation = jest.fn();
const recoverReconciliationSnapshot = jest.fn();
const releaseReservationSnapshot = jest.fn();
const terminalizeReconciliation = jest.fn();
const Stripe = jest.fn(() => ({
  paymentIntents: { retrieve: retrievePaymentIntent },
  webhooks: { constructEvent },
}));

jest.unstable_mockModule("../../models/productModel.js", () => ({
  default: { find: productFind },
}));
jest.unstable_mockModule("stripe", () => ({ default: Stripe }));
jest.unstable_mockModule("../../models/paymentReconciliationModel.js", () => ({
  default: { findOne: reconciliationFindOne, findOneAndUpdate: reconciliationUpdate, updateOne: reconciliationUpdate, deleteOne: reconciliationDelete },
}));
jest.unstable_mockModule("../../models/orderModel.js", () => ({
  default: { findOne: jest.fn() },
}));
jest.unstable_mockModule("../../services/orderFinalizationService.js", () => ({
  createReconciliationSnapshot: jest.fn(),
  buildReconciliationRecoveryMetadata: jest.fn(() => ({ reconciliation_recovery_version: "1" })),
  recoverReconciliationSnapshot,
  finalizeReconciliation,
  releaseReservationSnapshot,
  terminalizeReconciliation,
}));

const {
  calculateOrderPricing,
  verifyPaymentIntent,
  getScopedIdempotencyKey,
  handleStripeWebhook,
} = await import("../../controllers/paymentController.js");

const id = "507f1f77bcf86cd799439011";
const product = (overrides = {}) => ({
  _id: id,
  name: "Apple",
  price: 100,
  stock: 10,
  images: [{ public_id: "apple", url: "apple.jpg" }],
  ...overrides,
});

describe("order pricing", () => {
  beforeEach(() => productFind.mockReset());

  test("uses catalog prices and calculates the complete total", async () => {
    productFind.mockResolvedValue([product()]);

    const result = await calculateOrderPricing([{ product: id, quantity: 2, price: 0.01, totalprice: 0 }]);

    expect(result.items[0].price).toBe(100);
    expect(result.itemsprice).toBe(200);
    expect(result.tax).toBe(36);
    expect(result.shippingcost).toBe(200);
    expect(result.totalprice).toBe(436);
    expect(result.amount).toBe(43600);
  });

  test("rejects duplicate products, invalid quantities, and insufficient stock", async () => {
    productFind.mockResolvedValue([product({ stock: 1 })]);
    await expect(calculateOrderPricing([{ product: id, quantity: 2 }])).rejects.toMatchObject({ statusCode: 400 });
    await expect(calculateOrderPricing([{ product: id, quantity: 1 }, { product: id, quantity: 1 }])).rejects.toMatchObject({ statusCode: 400 });
    await expect(calculateOrderPricing([{ product: id, quantity: 0 }])).rejects.toMatchObject({ statusCode: 400 });
  });
});

describe("Stripe PaymentIntent verification", () => {
  beforeEach(() => retrievePaymentIntent.mockReset());

  test("accepts only a succeeded intent with matching amount and currency", async () => {
    retrievePaymentIntent.mockResolvedValue({ id: "pi_123", status: "succeeded", amount: 43600, currency: "inr" });
    await expect(verifyPaymentIntent("pi_123", 43600, "inr")).resolves.toMatchObject({ id: "pi_123" });
    await expect(verifyPaymentIntent("pi_123", 43500, "inr")).rejects.toMatchObject({ statusCode: 400 });
  });

  test("rejects missing, failed, and unresolvable payment intents", async () => {
    await expect(verifyPaymentIntent(undefined, 100, "inr")).rejects.toMatchObject({ statusCode: 400 });
    retrievePaymentIntent.mockResolvedValue({ id: "pi_123", status: "requires_payment_method", amount: 100, currency: "inr" });
    await expect(verifyPaymentIntent("pi_123", 100, "inr")).rejects.toMatchObject({ statusCode: 400 });
    retrievePaymentIntent.mockRejectedValue(new Error("network"));
    await expect(verifyPaymentIntent("pi_123", 100, "inr")).rejects.toMatchObject({ statusCode: 400 });
  });
});

describe("Stripe idempotency ownership namespace", () => {
  test("reuses the same namespace for same-user retries", () => {
    expect(getScopedIdempotencyKey("user-1", "attempt-123"))
      .toBe(getScopedIdempotencyKey("user-1", "attempt-123"));
  });

  test("isolates identical client keys across users", () => {
    const first = getScopedIdempotencyKey("user-1", "attempt-123");
    const second = getScopedIdempotencyKey("user-2", "attempt-123");
    expect(first).not.toBe(second);
    expect(first).toMatch(/^[a-f0-9]{64}$/);
    expect(second).toMatch(/^[a-f0-9]{64}$/);
  });
});

describe("Stripe webhook endpoint", () => {
  const invoke = async (req) => {
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    const next = jest.fn();
    await handleStripeWebhook(req, res, next);
    return { res, next };
  };

  beforeEach(() => {
    process.env.STRIPE_WEBHOOK_SECRET = "whsec_test";
    constructEvent.mockReset();
    reconciliationFindOne.mockReset();
    reconciliationUpdate.mockReset();
    reconciliationDelete.mockReset();
    finalizeReconciliation.mockReset();
    recoverReconciliationSnapshot.mockReset();
    releaseReservationSnapshot.mockReset();
    terminalizeReconciliation.mockReset();
  });

  test("verifies the signature and finalizes a matching reconciliation", async () => {
    const reconciliation = { _id: "rec-1", paymentIntentId: "pi_success" };
    constructEvent.mockReturnValue({
      type: "payment_intent.succeeded",
      data: { object: { id: "pi_success", amount: 31800, currency: "inr", status: "succeeded" } },
    });
    reconciliationFindOne.mockResolvedValue(reconciliation);
    finalizeReconciliation.mockResolvedValue({ _id: "order-1" });

    const { res } = await invoke({ body: Buffer.from("{}"), headers: { "stripe-signature": "sig" } });

    expect(constructEvent).toHaveBeenCalledWith(Buffer.from("{}"), "sig", "whsec_test");
    expect(finalizeReconciliation).toHaveBeenCalledWith(reconciliation);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ success: true, received: true });
  });

  test("acknowledges duplicate success events when the order already exists", async () => {
    constructEvent.mockReturnValue({ type: "payment_intent.succeeded", data: { object: { id: "pi_duplicate" } } });
    reconciliationFindOne.mockResolvedValue(null);

    const { res } = await invoke({ body: Buffer.from("{}"), headers: { "stripe-signature": "sig" } });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(finalizeReconciliation).not.toHaveBeenCalled();
  });

  test("recreates a missing reconciliation from the succeeded PaymentIntent", async () => {
    const recovered = { _id: "rec-recovered", paymentIntentId: "pi_recover" };
    constructEvent.mockReturnValue({
      type: "payment_intent.succeeded",
      data: { object: { id: "pi_recover", status: "succeeded", metadata: { reconciliation_recovery_version: "1" } } },
    });
    reconciliationFindOne.mockResolvedValue(null);
    recoverReconciliationSnapshot.mockResolvedValue(recovered);

    const { res } = await invoke({ body: Buffer.from("{}"), headers: { "stripe-signature": "sig" } });

    expect(recoverReconciliationSnapshot).toHaveBeenCalledWith(expect.objectContaining({ id: "pi_recover" }));
    expect(finalizeReconciliation).toHaveBeenCalledWith(recovered);
    expect(res.status).toHaveBeenCalledWith(200);
  });

  test("marks a failed payment and releases any reservation", async () => {
    const reconciliation = { _id: "rec-failed", paymentIntentId: "pi_failed", stockReserved: false };
    constructEvent.mockReturnValue({ type: "payment_intent.payment_failed", data: { object: { id: "pi_failed" } } });
    reconciliationFindOne.mockResolvedValue(reconciliation);

    const { res } = await invoke({ body: Buffer.from("{}"), headers: { "stripe-signature": "sig" } });
    expect(terminalizeReconciliation).toHaveBeenCalledWith(reconciliation, { status: "failed", paymentStatus: "failed" });
    expect(res.status).toHaveBeenCalledWith(200);
  });

  test("terminalizes a canceled payment and releases its reservation", async () => {
    const reconciliation = { _id: "rec-canceled", paymentIntentId: "pi_canceled" };
    constructEvent.mockReturnValue({ type: "payment_intent.canceled", data: { object: { id: "pi_canceled" } } });
    reconciliationFindOne.mockResolvedValue(reconciliation);

    const { res } = await invoke({ body: Buffer.from("{}"), headers: { "stripe-signature": "sig" } });

    expect(terminalizeReconciliation).toHaveBeenCalledWith(reconciliation, { status: "canceled", paymentStatus: "canceled" });
    expect(res.status).toHaveBeenCalledWith(200);
  });

  test("rejects an invalid signature", async () => {
    constructEvent.mockImplementation(() => { throw new Error("invalid signature"); });

    const { res } = await invoke({ body: Buffer.from("{}"), headers: { "stripe-signature": "bad" } });

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ success: false, message: "Invalid Stripe webhook signature." });
    expect(reconciliationUpdate).not.toHaveBeenCalled();
  });
});
