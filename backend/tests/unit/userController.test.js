import { jest } from "@jest/globals";

const findOne = jest.fn();
const sendEmail = jest.fn();
const sendToken = jest.fn();
jest.unstable_mockModule("../../models/userModel.js", () => ({ default: { findOne } }));
jest.unstable_mockModule("../../utils/sendEmail.js", () => ({ default: sendEmail }));
jest.unstable_mockModule("../../utils/getJWTToken.js", () => ({ sendToken }));
jest.unstable_mockModule("cloudinary", () => ({ v2: { config: jest.fn(), uploader: { upload: jest.fn(), destroy: jest.fn() } } }));

const { forgotPassword, resetPassword } = await import("../../controllers/userController.js");

const invoke = async (controller, req) => {
  const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
  const next = jest.fn();
  await controller(req, res, next);
  return { res, next };
};

describe("password recovery", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.FRONT_END_URI = "http://localhost:3000";
  });

  test("does not reveal whether an email exists", async () => {
    findOne.mockResolvedValueOnce(null);
    const unknown = await invoke(forgotPassword, { body: { email: "unknown@example.com" } });
    expect(unknown.res.status).toHaveBeenCalledWith(200);
    expect(unknown.res.json).toHaveBeenCalledWith({ success: true, message: expect.stringContaining("If an account exists") });
    expect(sendEmail).not.toHaveBeenCalled();

    const user = { email: "known@example.com", name: "Known", getResetPasswordToken: jest.fn().mockReturnValue("raw-token"), save: jest.fn() };
    findOne.mockResolvedValueOnce(user);
    const known = await invoke(forgotPassword, { body: { email: user.email } });
    expect(known.res.json).toHaveBeenCalledWith({ success: true, message: expect.stringContaining("If an account exists") });
    expect(sendEmail).toHaveBeenCalledWith(expect.objectContaining({ email: user.email }));
  });

  test("increments token version when resetting a password", async () => {
    const user = { tokenVersion: 3, password: "old", resetPasswordToken: "hash", resetPasswordExpires: new Date(Date.now() + 1000), save: jest.fn(), getJWT: jest.fn() };
    findOne.mockResolvedValue(user);
    await invoke(resetPassword, { params: { token: "raw-token" }, body: { password: "new-password", confirmPassword: "new-password" } });
    expect(user.tokenVersion).toBe(4);
    expect(user.resetPasswordToken).toBeUndefined();
    expect(sendToken).toHaveBeenCalled();
  });
});
