import { jest } from "@jest/globals";

const find = jest.fn();
const requestRecommendations = jest.fn();
jest.unstable_mockModule("../../models/productModel.js", () => ({ default: { find } }));
jest.unstable_mockModule("../../services/recommendationService.js", () => ({ requestRecommendations }));

const { getDietRecommendations } = await import("../../controllers/dietController.js");

test("deduplicates provider names before returning recommendation cards", async () => {
  requestRecommendations.mockResolvedValue([
    { name: " Apple ", reason: "first" },
    { name: "apple", reason: "duplicate" },
    { name: "Spinach", reason: "second" },
  ]);
  find.mockReturnValue({ select: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue([{ _id: "p1", name: "Apple" }]) }) });
  const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
  await getDietRecommendations({ body: { age: 28, height: 1.72, weight: 68, gender: 1, diseases: [] } }, res, jest.fn());
  const payload = res.json.mock.calls[0][0];
  expect(payload.recommendations).toHaveLength(2);
  expect(payload.recommendations.map(({ name }) => name)).toEqual([" Apple ", "Spinach"]);
});

test("matches whole words in product names without substring false positives", async () => {
  requestRecommendations.mockResolvedValue([
    { name: "red apple", reason: "contains fruit" },
    { name: "app", reason: "should not match pineapple" },
  ]);
  find.mockReturnValue({
    select: jest.fn().mockReturnValue({
      lean: jest.fn().mockResolvedValue([
        { _id: "p1", name: "Fresh Apple" },
        { _id: "p2", name: "Pineapple" },
      ]),
    }),
  });
  const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };

  await getDietRecommendations({ body: { age: 28, height: 1.72, weight: 68, gender: 1, diseases: [] } }, res, jest.fn());

  const payload = res.json.mock.calls[0][0];
  expect(payload.recommendations[0].product).toEqual({ id: "p1", name: "Fresh Apple", href: "/product/p1" });
  expect(payload.recommendations[1].product).toBeNull();
  expect(find).toHaveBeenCalledWith({
    $or: expect.arrayContaining([
      { name: /\bred\b/i },
      { name: /\bapple\b/i },
      { name: /\bapp\b/i },
    ]),
  });
});
