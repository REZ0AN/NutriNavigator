import { jest } from "@jest/globals";

const orderFindOne = jest.fn();
const orderFindById = jest.fn();
const orderDeleteOne = jest.fn();
const orderFindOneAndUpdate = jest.fn();
const orderUpdateOne = jest.fn();
const orderAggregate = jest.fn();
const productUpdateOne = jest.fn();
const productFindOne = jest.fn();
const refundPaymentIntent = jest.fn();

jest.unstable_mockModule("../../models/orderModel.js", () => ({
  default: { findOne: orderFindOne, findById: orderFindById, findOneAndUpdate: orderFindOneAndUpdate, updateOne: orderUpdateOne, deleteOne: orderDeleteOne, aggregate: orderAggregate },
}));
jest.unstable_mockModule("../../models/productModel.js", () => ({
  default: { updateOne: productUpdateOne, findOne: productFindOne },
}));
jest.unstable_mockModule("../../controllers/paymentController.js", () => ({
  calculateOrderPricing: jest.fn(),
  verifyPaymentIntent: jest.fn(),
}));
jest.unstable_mockModule("../../services/stripeService.js", () => ({
  refundPaymentIntent,
  verifyPaymentIntent: jest.fn(),
}));

const { getSingleOrder, getAllOrders, totalAmountByDate, updateOrderStatus, deleteOrder } = await import("../../controllers/orderController.js");

const invoke = async (controller, req) => {
  const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
  const next = jest.fn();
  await controller(req, res, next);
  return { res, next };
};

describe("order controller authorization and transitions", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    refundPaymentIntent.mockResolvedValue({ id: "re_1", status: "succeeded" });
  });

  test("looks up a customer's order using both order ID and authenticated user", async () => {
    const order = { _id: "order-1", user: "user-1" };
    orderFindOne.mockReturnValue({ populate: jest.fn().mockResolvedValue(order) });
    await invoke(getSingleOrder, { params: { id: "order-1" }, user: { id: "user-1" } });
    expect(orderFindOne).toHaveBeenCalledWith({ _id: "order-1", user: "user-1" });
  });

  test("uses bounded admin pagination and an aggregate total", async () => {
    const populate = jest.fn().mockResolvedValue([{ _id: "order-1", totalprice: 10 }]);
    orderFindOne.mockReturnValue({ populate });
    const find = jest.fn();
    const orderModel = (await import("../../models/orderModel.js")).default;
    orderModel.find = find;
    find.mockReturnValue({ sort: jest.fn().mockReturnThis(), skip: jest.fn().mockReturnThis(), limit: jest.fn().mockReturnThis(), populate });
    orderAggregate.mockResolvedValue([{ totalAmount: 10, totalCount: 1 }]);

    const result = await invoke(getAllOrders, { query: { page: "2", limit: "500" } });

    expect(find).toHaveBeenCalledWith();
    expect(find().limit).toHaveBeenCalledWith(100);
    expect(orderAggregate).toHaveBeenCalled();
    expect(result.res.json).toHaveBeenCalledWith(expect.objectContaining({ totalAmount: 10, totalCount: 1, page: 2, limit: 100, hasNextPage: false }));
  });

  test("returns dashboard revenue and statuses from a bounded UTC aggregate", async () => {
    orderAggregate.mockResolvedValue([{
      dailyRevenue: [{ _id: "2026-01-02", totalAmount: 900 }],
      statuses: [{ _id: "delivered", value: 2 }],
      summary: [{ totalAmount: 900, totalCount: 2 }],
    }]);
    const result = await invoke(totalAmountByDate, { query: { from: "2026-01-01", to: "2026-01-31", timezone: "UTC" } });
    expect(orderAggregate).toHaveBeenCalledWith(expect.arrayContaining([
      expect.objectContaining({ $match: { createdAt: expect.objectContaining({ $gte: expect.any(Date), $lt: expect.any(Date) }) } }),
    ]));
    expect(result.res.json).toHaveBeenCalledWith(expect.objectContaining({
      timezone: "UTC",
      dailyRevenue: [{ _id: "2026-01-02", totalAmount: 900 }],
      statusCounts: [{ name: "delivered", value: 2 }],
    }));
  });

  test("rejects dashboard ranges longer than 366 days", async () => {
    const result = await invoke(totalAmountByDate, { query: { from: "2025-01-01", to: "2026-01-02", timezone: "UTC" } });
    expect(result.next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 400 }));
    expect(orderAggregate).not.toHaveBeenCalled();
  });

  test("allows only processing-to-shipped and shipped-to-delivered transitions", async () => {
    const order = { orderstatus: "processing", stockReserved: true };
    orderFindById.mockResolvedValue(order);
    orderFindOneAndUpdate.mockResolvedValue({ ...order, orderstatus: "shipped" });
    const valid = await invoke(updateOrderStatus, { params: { id: "order-1" }, body: { status: "shipped" } });
    expect(valid.res.status).toHaveBeenCalledWith(200);
    expect(valid.res.json).toHaveBeenCalledWith(expect.objectContaining({ order: expect.objectContaining({ orderstatus: "shipped" }) }));

    order.orderstatus = "processing";
    const invalid = await invoke(updateOrderStatus, { params: { id: "order-1" }, body: { status: "delivered" } });
    expect(invalid.next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 400 }));
    expect(orderFindOneAndUpdate).toHaveBeenCalledTimes(1);
  });

  test("restores reserved stock when an order is deleted", async () => {
    orderFindById.mockResolvedValue({ _id: "order-1", orderstatus: "processing", stockReserved: true, paymentinfo: { id: "pi-1" }, orderitems: [{ product: "p1", quantity: 2 }] });
    productUpdateOne.mockResolvedValue({ modifiedCount: 1 });
    orderFindOneAndUpdate.mockResolvedValue({ _id: "order-1", deletionInProgress: true, paymentinfo: { id: "pi-1" }, orderitems: [{ product: "p1", quantity: 2 }] });
    orderDeleteOne.mockResolvedValue({ deletedCount: 1 });
    await invoke(deleteOrder, { params: { id: "order-1" } });
    expect(refundPaymentIntent).toHaveBeenCalledWith("pi-1", "order-delete-refund-order-1");
    expect(productUpdateOne).toHaveBeenCalledWith(
      { _id: "p1", stockReservations: { $elemMatch: { reservationId: "pi-1", quantity: 2 } } },
      { $inc: { stock: 2 }, $pull: { stockReservations: { reservationId: "pi-1" } } }
    );
  });

  test.each(["shipped", "delivered"])("rejects deletion of a %s order without changing stock", async (orderstatus) => {
    orderFindById.mockResolvedValue({ _id: "order-fulfilled", orderstatus, stockReserved: true, orderitems: [{ product: "p1", quantity: 2 }] });
    const result = await invoke(deleteOrder, { params: { id: "order-fulfilled" } });
    expect(result.next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 400 }));
    expect(orderFindOneAndUpdate).not.toHaveBeenCalled();
    expect(productUpdateOne).not.toHaveBeenCalled();
    expect(orderDeleteOne).not.toHaveBeenCalled();
  });

  test("returns not found on a repeated processing-order deletion", async () => {
    orderFindById
      .mockResolvedValueOnce({ _id: "order-1", orderstatus: "processing", stockReserved: true, paymentinfo: { id: "pi-repeat-delete" }, orderitems: [{ product: "p1", quantity: 2 }] })
      .mockResolvedValueOnce(null);
    orderFindOneAndUpdate.mockResolvedValueOnce({ _id: "order-1", deletionInProgress: true, paymentinfo: { id: "pi-repeat-delete" }, orderitems: [{ product: "p1", quantity: 2 }] });
    orderDeleteOne.mockResolvedValue({ deletedCount: 1 });

    await invoke(deleteOrder, { params: { id: "order-1" } });
    const repeated = await invoke(deleteOrder, { params: { id: "order-1" } });
    expect(repeated.next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 404 }));
    expect(productUpdateOne).toHaveBeenCalledTimes(1);
  });

  test("preserves the reservation when one release fails and retries safely", async () => {
    const order = { _id: "order-retry", orderstatus: "processing", stockReserved: true, paymentinfo: { id: "pi-retry" }, orderitems: [{ product: "p1", quantity: 2 }] };
    orderFindById.mockResolvedValue(order);
    productUpdateOne
      .mockRejectedValueOnce(new Error("database unavailable"))
      .mockResolvedValueOnce({ modifiedCount: 1 });
    productFindOne.mockResolvedValue({ stockReservations: [{ reservationId: "pi-retry", quantity: 2 }] });
    orderFindOneAndUpdate.mockResolvedValue({ ...order, deletionInProgress: true });
    orderDeleteOne.mockResolvedValue({ deletedCount: 1 });

    const failed = await invoke(deleteOrder, { params: { id: "order-retry" } });
    expect(failed.next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 503 }));
    expect(orderFindOneAndUpdate).toHaveBeenCalledTimes(1);
    expect(orderDeleteOne).not.toHaveBeenCalled();

    const retry = await invoke(deleteOrder, { params: { id: "order-retry" } });
    expect(retry.res.status).toHaveBeenCalledWith(200);
    expect(productUpdateOne).toHaveBeenCalledTimes(2);
    expect(orderFindOneAndUpdate).toHaveBeenCalledTimes(2);
  });

  test("does not delete an order when Stripe refund fails", async () => {
    orderFindById.mockResolvedValue({ _id: "order-refund-failure", orderstatus: "processing", stockReserved: true, paymentinfo: { id: "pi-refund-failure" }, orderitems: [{ product: "p1", quantity: 1 }] });
    orderFindOneAndUpdate.mockResolvedValue({ _id: "order-refund-failure", deletionInProgress: true, paymentinfo: { id: "pi-refund-failure" }, orderitems: [{ product: "p1", quantity: 1 }] });
    refundPaymentIntent.mockRejectedValue(Object.assign(new Error("Stripe unavailable"), { statusCode: 503 }));

    const result = await invoke(deleteOrder, { params: { id: "order-refund-failure" } });

    expect(result.next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 503 }));
    expect(productUpdateOne).not.toHaveBeenCalled();
    expect(orderDeleteOne).not.toHaveBeenCalled();
    expect(orderUpdateOne).toHaveBeenCalledWith(
      { _id: "order-refund-failure", deletionInProgress: true },
      { $set: { deletionInProgress: false } },
    );
  });

  test("does not update status when deletion wins the atomic claim", async () => {
    orderFindById.mockResolvedValue({ _id: "order-race", orderstatus: "processing", stockReserved: true });
    orderFindOneAndUpdate.mockResolvedValueOnce(null);
    const result = await invoke(updateOrderStatus, { params: { id: "order-race" }, body: { status: "shipped" } });
    expect(result.next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 409 }));
    expect(orderFindOneAndUpdate).toHaveBeenCalledWith(
      { _id: "order-race", orderstatus: "processing", deletionInProgress: { $ne: true } },
      expect.objectContaining({ $set: expect.objectContaining({ orderstatus: "shipped" }) }),
      { new: true, runValidators: false },
    );
  });

  test("claims deletion before releasing product stock", async () => {
    const order = { _id: "order-ordering", orderstatus: "processing", stockReserved: true, paymentinfo: { id: "pi-ordering" }, orderitems: [{ product: "p1", quantity: 1 }] };
    const sequence = [];
    orderFindById.mockResolvedValue(order);
    orderFindOneAndUpdate.mockImplementation(async (...args) => { sequence.push("claim"); return { ...order, deletionInProgress: true }; });
    productUpdateOne.mockImplementation(async () => { sequence.push("release"); return { modifiedCount: 1 }; });
    orderDeleteOne.mockImplementation(async () => { sequence.push("delete"); return { deletedCount: 1 }; });
    await invoke(deleteOrder, { params: { id: "order-ordering" } });
    expect(sequence).toEqual(["claim", "release", "delete"]);
    expect(orderFindOneAndUpdate).toHaveBeenCalledWith(
      { _id: "order-ordering", orderstatus: "processing", deletionInProgress: { $ne: true } },
      { $set: { deletionInProgress: true } },
      { new: true, runValidators: false },
    );
  });

});
