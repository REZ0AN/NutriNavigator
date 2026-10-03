import { jest } from "@jest/globals";

const findById = jest.fn();
jest.unstable_mockModule("../../models/userModel.js", () => ({ default: { findById } }));

const { isAuthenticatedUser } = await import("../../middlewares/authMiddleware.js");

const invoke = async (token, user) => {
  findById.mockResolvedValue(user);
  const next = jest.fn();
  await isAuthenticatedUser({ cookies: { token } }, {}, next);
  return next;
};

describe("authentication failure handling", () => {
  beforeEach(() => jest.clearAllMocks());

  test("turns malformed JWTs into 401 errors", async () => {
    const next = await invoke("not-a-jwt", null);
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 401 }));
    expect(findById).not.toHaveBeenCalled();
  });

  test("rejects tokens issued before a password change", async () => {
    process.env.JWT_SECRET = "auth-test-secret";
    const jwt = (await import("jsonwebtoken")).default;
    const token = jwt.sign({ id: "user-1", tokenVersion: 1 }, process.env.JWT_SECRET);
    const next = await invoke(token, { id: "user-1", tokenVersion: 2 });
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 401 }));
  });
});
