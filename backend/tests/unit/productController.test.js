import { jest } from "@jest/globals";

const findById = jest.fn();
const findByIdAndUpdate = jest.fn();
const reviewFindById = jest.fn();
const reviewDeleteOne = jest.fn();
const reviewAggregate = jest.fn();
const productFind = jest.fn();
const reviewExists = jest.fn();
const reviewFind = jest.fn();
jest.unstable_mockModule("../../models/productModel.js", () => ({ default: { find: productFind, findById, findByIdAndUpdate, updateOne: jest.fn() } }));
jest.unstable_mockModule("../../models/reviewModel.js", () => ({ default: { exists: reviewExists, find: reviewFind, findById: reviewFindById, deleteOne: reviewDeleteOne, aggregate: reviewAggregate } }));
const { deleteReviews, getAllReviews } = await import("../../controllers/productController.js");

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
  beforeEach(() => { jest.clearAllMocks(); reviewFindById.mockResolvedValue(null); });

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

const invokeList = async (query) => {
  const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
  await getAllReviews({ query }, res);
  return res;
};

describe("legacy review cursor pagination", () => {
  const legacyProducts = [{
    _id: "product-1",
    name: "Apple",
    images: [{ url: "apple.jpg" }],
    reviews: [
      { _id: "review-1", user: "user-1", name: "one", rating: 5, comment: "first", createdAt: "2026-01-01T00:00:00.000Z" },
      { _id: "review-2", user: "user-2", name: "two", rating: 4, comment: "second", createdAt: "2026-01-02T00:00:00.000Z" },
      { _id: "review-3", user: "user-3", name: "three", rating: 3, comment: "third", createdAt: "2026-01-03T00:00:00.000Z" },
    ],
  }];

  beforeEach(() => {
    jest.clearAllMocks();
    reviewExists.mockResolvedValue(false);
    productFind.mockReturnValue({ select: () => ({ lean: jest.fn().mockResolvedValue(legacyProducts) }) });
  });

  test("returns a continuation cursor for embedded legacy reviews", async () => {
    const first = await invokeList({ limit: "2", sort: "newest" });
    expect(first.json).toHaveBeenCalledWith(expect.objectContaining({ hasNextPage: true, nextCursor: expect.any(String) }));
    const cursor = first.json.mock.calls[0][0].nextCursor;

    const second = await invokeList({ limit: "2", sort: "newest", cursor });
    expect(second.json).toHaveBeenCalledWith(expect.objectContaining({ hasNextPage: false, nextCursor: null }));
    expect(second.json.mock.calls[0][0].reviews).toHaveLength(1);
    expect(second.json.mock.calls[0][0].reviews[0].reviewId).toBe("review-1");
  });

  test("returns a controlled 400 for an invalid cursor", async () => {
    const response = await invokeList({ cursor: "not-a-cursor" });
    expect(response.status).toHaveBeenCalledWith(400);
    expect(response.json).toHaveBeenCalledWith({ success: false, message: "Invalid review cursor." });
  });
});
