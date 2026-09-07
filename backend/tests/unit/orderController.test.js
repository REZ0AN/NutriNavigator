import { jest } from "@jest/globals";

const orderFindOne = jest.fn();
const orderFindById = jest.fn();
const orderDeleteOne = jest.fn();
const orderFindOneAndUpdate = jest.fn();
const productUpdateOne = jest.fn();
const productFindOne = jest.fn();

jest.unstable_mockModule("../../models/orderModel.js", () => ({
  default: { findOne: orderFindOne, findById: orderFindById, findOneAndUpdate: orderFindOneAndUpdate, deleteOne: orderDeleteOne },
}));
jest.unstable_mockModule("../../models/productModel.js", () => ({
  default: { updateOne: productUpdateOne, findOne: productFindOne },
}));
jest.unstable_mockModule("../../controllers/paymentController.js", () => ({
  calculateOrderPricing: jest.fn(),
  verifyPaymentIntent: jest.fn(),
}));

const { getSingleOrder, updateOrderStatus, deleteOrder } = await import("../../controllers/orderController.js");

const invoke = async (controller, req) => {
  const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
  const next = jest.fn();
  await controller(req, res, next);
  return { res, next };
};

describe("order controller authorization and transitions", () => {
  beforeEach(() => jest.clearAllMocks());

  test("looks up a customer's order using both order ID and authenticated user", async () => {
    const order = { _id: "order-1", user: "user-1" };
    orderFindOne.mockReturnValue({ populate: jest.fn().mockResolvedValue(order) });
    await invoke(getSingleOrder, { params: { id: "order-1" }, user: { id: "user-1" } });
    expect(orderFindOne).toHaveBeenCalledWith({ _id: "order-1", user: "user-1" });
  });

  test("allows only processing-to-shipped and shipped-to-delivered transitions", async () => {
    const save = jest.fn().mockResolvedValue(undefined);
    const order = { orderstatus: "processing", stockReserved: true, save };
    orderFindById.mockResolvedValue(order);
    const valid = await invoke(updateOrderStatus, { params: { id: "order-1" }, body: { status: "shipped" } });
    expect(valid.res.status).toHaveBeenCalledWith(200);
    expect(order.orderstatus).toBe("shipped");

    order.orderstatus = "processing";
    const invalid = await invoke(updateOrderStatus, { params: { id: "order-1" }, body: { status: "delivered" } });
    expect(invalid.next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 400 }));
    expect(save).toHaveBeenCalledTimes(1);
  });

  test("restores reserved stock when an order is deleted", async () => {
    orderFindById.mockResolvedValue({ _id: "order-1", orderstatus: "processing", stockReserved: true, paymentinfo: { id: "pi-1" }, orderitems: [{ product: "p1", quantity: 2 }] });
    productUpdateOne.mockResolvedValue({ modifiedCount: 1 });
    orderFindOneAndUpdate.mockResolvedValue({ _id: "order-1", stockReserved: false, orderitems: [{ product: "p1", quantity: 2 }] });
    orderDeleteOne.mockResolvedValue({ deletedCount: 1 });
    await invoke(deleteOrder, { params: { id: "order-1" } });
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
      .mockResolvedValueOnce({ _id: "order-1", orderstatus: "processing", stockReserved: true, orderitems: [{ product: "p1", quantity: 2 }] })
      .mockResolvedValueOnce(null);
    orderFindOneAndUpdate.mockResolvedValueOnce({ _id: "order-1", stockReserved: false, orderitems: [{ product: "p1", quantity: 2 }] });
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
    orderFindOneAndUpdate.mockResolvedValue({ _id: "order-retry", stockReserved: false });
    orderDeleteOne.mockResolvedValue({ deletedCount: 1 });

    const failed = await invoke(deleteOrder, { params: { id: "order-retry" } });
    expect(failed.next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 503 }));
    expect(orderFindOneAndUpdate).not.toHaveBeenCalled();
    expect(orderDeleteOne).not.toHaveBeenCalled();

    const retry = await invoke(deleteOrder, { params: { id: "order-retry" } });
    expect(retry.res.status).toHaveBeenCalledWith(200);
    expect(productUpdateOne).toHaveBeenCalledTimes(2);
    expect(orderFindOneAndUpdate).toHaveBeenCalledTimes(1);
  });

});
