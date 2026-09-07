import { jest } from "@jest/globals";

const reconciliationFindOneAndUpdate = jest.fn();
const reconciliationFind = jest.fn();
const reconciliationUpdateOne = jest.fn();
const reconciliationDeleteOne = jest.fn();
const orderFindOne = jest.fn();
const orderCreate = jest.fn();
const productFindOne = jest.fn();
const productFindOneAndUpdate = jest.fn();
const productUpdateOne = jest.fn();
const verifyPaymentIntent = jest.fn();

jest.unstable_mockModule("../../models/paymentReconciliationModel.js", () => ({
  default: { find: reconciliationFind, findOneAndUpdate: reconciliationFindOneAndUpdate, updateOne: reconciliationUpdateOne, deleteOne: reconciliationDeleteOne },
}));
jest.unstable_mockModule("../../models/orderModel.js", () => ({
  default: { findOne: orderFindOne, create: orderCreate },
}));
jest.unstable_mockModule("../../models/productModel.js", () => ({
  default: { findOne: productFindOne, findOneAndUpdate: productFindOneAndUpdate, updateOne: productUpdateOne },
}));
jest.unstable_mockModule("../../services/stripeService.js", () => ({ verifyPaymentIntent }));

const { claimReconciliation, finalizeReconciliation, terminalizeReconciliation, expireStaleReconciliations } = await import("../../services/orderFinalizationService.js");

describe("reconciliation finalization concurrency", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    reconciliationUpdateOne.mockResolvedValue({ modifiedCount: 1 });
    reconciliationDeleteOne.mockResolvedValue({ deletedCount: 1 });
    reconciliationFind.mockReset();
    verifyPaymentIntent.mockResolvedValue({ id: "pi_concurrent", status: "succeeded" });
  });

  test("uses an atomic pending-to-finalizing claim", async () => {
    const reconciliation = { _id: "rec-1", status: "pending" };
    reconciliationFindOneAndUpdate.mockResolvedValueOnce({ ...reconciliation, status: "finalizing" }).mockResolvedValueOnce(null);

    await expect(claimReconciliation(reconciliation)).resolves.toMatchObject({ status: "finalizing" });
    await expect(claimReconciliation(reconciliation)).resolves.toBeNull();
    expect(reconciliationFindOneAndUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ _id: "rec-1", $or: expect.any(Array) }),
      { $set: { status: "finalizing", finalizingAt: expect.any(Date) } },
      { new: true },
    );
  });

  test("only the claim winner creates an order and reserves stock", async () => {
    const reconciliation = {
      _id: "rec-2", paymentIntentId: "pi_concurrent", user: "user-1", totalprice: 318,
      shippinginfo: {}, orderitems: [{ product: "product-1", quantity: 1, name: "Apple" }],
      itemsprice: 100, tax: 18, shippingcost: 200,
    };
    reconciliationFindOneAndUpdate.mockResolvedValueOnce({ ...reconciliation, status: "finalizing" }).mockResolvedValueOnce(null);
    let finalizedOrder = null;
    orderFindOne.mockImplementation(async () => finalizedOrder);
    productFindOne.mockResolvedValue(null);
    productFindOneAndUpdate.mockResolvedValue({});
    orderCreate.mockImplementation(async () => {
      finalizedOrder = { _id: "order-1" };
      return finalizedOrder;
    });

    const [winner, loser] = await Promise.all([
      finalizeReconciliation(reconciliation),
      finalizeReconciliation(reconciliation),
    ]);

    expect(winner).toEqual({ _id: "order-1" });
    expect(loser).toEqual({ _id: "order-1" });
    expect(orderCreate).toHaveBeenCalledTimes(1);
    expect(productFindOneAndUpdate).toHaveBeenCalledTimes(1);
  });

  test("atomically claims cancellation before releasing reservation", async () => {
    const reconciliation = { _id: "rec-cancel", paymentIntentId: "pi-cancel", orderitems: [] };
    reconciliationFindOneAndUpdate.mockResolvedValue({ ...reconciliation, status: "canceling" });

    await expect(terminalizeReconciliation(reconciliation)).resolves.toBe(true);

    expect(reconciliationFindOneAndUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ _id: "rec-cancel", $or: expect.any(Array) }),
      { $set: { status: "canceling", paymentStatus: "canceled", finalizingAt: null } },
      { new: true },
    );
    expect(reconciliationUpdateOne).toHaveBeenCalledWith(
      { _id: "rec-cancel", status: "canceling" },
      { $set: { status: "canceled", paymentStatus: "canceled", stockReserved: false, finalizingAt: null } },
    );
  });

  test("expires stale pending and recovered reconciliations", async () => {
    const stale = [
      { _id: "rec-old-1", paymentIntentId: "pi-old-1", orderitems: [] },
      { _id: "rec-old-2", paymentIntentId: "pi-old-2", orderitems: [] },
    ];
    reconciliationFind.mockResolvedValue(stale);
    reconciliationFindOneAndUpdate
      .mockResolvedValueOnce({ ...stale[0], status: "canceling" })
      .mockResolvedValueOnce({ ...stale[1], status: "canceling" });

    await expect(expireStaleReconciliations({ now: new Date("2026-09-08T00:00:00Z"), maxAgeMs: 60_000 })).resolves.toBe(2);
    expect(reconciliationFind).toHaveBeenCalledWith({
      status: { $in: ["pending", "recovered"] },
      createdAt: { $lt: new Date("2026-09-07T23:59:00Z") },
    });
    expect(reconciliationUpdateOne).toHaveBeenCalledTimes(2);
  });
});
