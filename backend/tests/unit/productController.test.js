import { jest } from "@jest/globals";

const findById = jest.fn();
const findByIdAndUpdate = jest.fn();
jest.unstable_mockModule("../../models/productModel.js", () => ({ default: { findById, findByIdAndUpdate } }));
const { deleteReviews } = await import("../../controllers/productController.js");

const invoke = async (req) => {
  const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
  const next = jest.fn();
  await deleteReviews(req, res, next);
  return { res, next };
};

const reviewsWithId = (...reviews) => {
  const list = reviews;
  list.id = (reviewId) => list.find((review) => review._id === reviewId);
  return list;
};

describe("review deletion authorization", () => {
  beforeEach(() => jest.clearAllMocks());

  test("rejects a non-owner who is not an administrator", async () => {
    findById.mockResolvedValue({ reviews: reviewsWithId({ _id: "review-1", user: "owner-1", rating: 5 }) });
    const { next } = await invoke({ query: { productId: "p1", id: "review-1" }, user: { id: "other-1", role: "user" } });
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 403 }));
    expect(findByIdAndUpdate).not.toHaveBeenCalled();
  });

  test("allows the review owner and recalculates the product rating", async () => {
    findById.mockResolvedValue({ reviews: reviewsWithId({ _id: "review-1", user: "owner-1", rating: 5 }) });
    findByIdAndUpdate.mockResolvedValue({});
    const { res } = await invoke({ query: { productId: "p1", id: "review-1" }, user: { id: "owner-1", role: "user" } });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(findByIdAndUpdate).toHaveBeenCalledWith("p1", { reviews: [], rating: 0, reviewscount: 0 }, expect.any(Object));
  });
});
