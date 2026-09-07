import { userReducer, registerUser, loginUser } from "./userSlice";

describe("user authentication state", () => {
  test("registration does not authenticate an unverified user", () => {
    const state = userReducer(
      { loading: true, isAuthenticated: true, user: { id: "old" }, error: null },
      registerUser.fulfilled({ success: true, message: "Check your email" }, "request")
    );
    expect(state).toMatchObject({ loading: false, isAuthenticated: false, user: null });
  });

  test("login authenticates the returned user", () => {
    const user = { id: "user-1", email: "user@example.com" };
    const state = userReducer(undefined, loginUser.fulfilled({ user }, "request"));
    expect(state).toMatchObject({ loading: false, isAuthenticated: true, user });
  });
});
