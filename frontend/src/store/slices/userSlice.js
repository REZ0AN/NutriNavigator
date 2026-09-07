import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axios from "axios";

// ─── Thunks ───────────────────────────────────────────────────────────────────

export const loginUser = createAsyncThunk("user/login", async ({ email, password }, { rejectWithValue }) => {
  try {
    const { data } = await axios.post("/api/v1/login", { email, password });
    return data;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || "Login failed");
  }
});

export const registerUser = createAsyncThunk("user/register", async (formData, { rejectWithValue }) => {
  try {
    const { data } = await axios.post("/api/v1/register", formData);
    return data;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || "Registration failed");
  }
});

export const loadUser = createAsyncThunk("user/load", async (_, { rejectWithValue }) => {
  try {
    const { data } = await axios.get("/api/v1/profile");
    return data;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || "Failed to load user");
  }
});

export const logoutUser = createAsyncThunk("user/logout", async (_, { rejectWithValue }) => {
  try {
    await axios.get("/api/v1/logout");
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || "Logout failed");
  }
});

export const forgotPassword = createAsyncThunk("user/forgotPassword", async (email, { rejectWithValue }) => {
  try {
    const { data } = await axios.post("/api/v1/password/forgot", { email });
    return data.message;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || "Request failed");
  }
});

export const resetPassword = createAsyncThunk("user/resetPassword", async ({ token, password, confirmPassword }, { rejectWithValue }) => {
  try {
    const { data } = await axios.put(`/api/v1/password/reset/${token}`, { password, confirmPassword });
    return data;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || "Reset failed");
  }
});

export const getAllUsers = createAsyncThunk("user/getAll", async (_, { rejectWithValue }) => {
  try {
    const { data } = await axios.get("/api/v1/admin/userprofiles");
    return data.users;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || "Failed to fetch users");
  }
});

export const getUserDetails = createAsyncThunk("user/getDetails", async (id, { rejectWithValue }) => {
  try {
    const { data } = await axios.get(`/api/v1/admin/userprofile/${id}`);
    return data.user;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || "Failed to fetch user");
  }
});

export const updateUserAdmin = createAsyncThunk("user/updateAdmin", async ({ id, userData }, { rejectWithValue }) => {
  try {
    const { data } = await axios.put(`/api/v1/admin/userprofile/${id}`, userData);
    return data;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || "Update failed");
  }
});

export const deleteUser = createAsyncThunk("user/delete", async (id, { rejectWithValue }) => {
  try {
    await axios.delete(`/api/v1/admin/userprofile/${id}`);
    return id;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || "Delete failed");
  }
});

export const verifyEmail = createAsyncThunk("user/verifyEmail", async (token, { rejectWithValue }) => {
  try {
    const { data } = await axios.get(`/api/v1/verify-email/${token}`);
    return data;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || "Verification failed");
  }
});

export const resendVerification = createAsyncThunk("user/resendVerification", async (email, { rejectWithValue }) => {
  try {
    const { data } = await axios.post("/api/v1/resend-verification", { email });
    return data.message;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || "Failed to resend");
  }
});

// ─── Auth slice ───────────────────────────────────────────────────────────────

const userSlice = createSlice({
  name: "user",
  initialState: { loading: false, isAuthenticated: false, user: null, error: null },
  reducers: { clearUserError: (state) => { state.error = null; } },
  extraReducers: (builder) => {
    const pending  = (state) => { state.loading = true; state.error = null; };
    const rejected = (state, action) => { state.loading = false; state.error = action.payload; };

    builder
      .addCase(loginUser.pending, pending)
      .addCase(loginUser.fulfilled, (state, { payload }) => {
        state.loading = false; state.isAuthenticated = true; state.user = payload.user;
      })
      .addCase(loginUser.rejected, rejected)

      .addCase(registerUser.pending, pending)
      .addCase(registerUser.fulfilled, (state) => {
        // Registration only starts email verification. The backend does not
        // issue a session until the user verifies the address and logs in.
        state.loading = false; state.isAuthenticated = false; state.user = null;
      })
      .addCase(registerUser.rejected, rejected)

      .addCase(loadUser.pending, pending)
      .addCase(loadUser.fulfilled, (state, { payload }) => {
        state.loading = false; state.isAuthenticated = true; state.user = payload.user;
      })
      .addCase(loadUser.rejected, (state) => {
        state.loading = false; state.isAuthenticated = false; state.user = null;
      })

      .addCase(logoutUser.fulfilled, (state) => {
        state.isAuthenticated = false;
        state.user = null;
        sessionStorage.removeItem("stripeKey"); // clear on logout
      })
      .addCase(logoutUser.rejected, rejected)
      .addCase(verifyEmail.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(verifyEmail.fulfilled, (state, { payload }) => {
        state.loading = false;
        state.isAuthenticated = true;
        state.user = payload.user;
      })
      .addCase(verifyEmail.rejected, (state, { payload }) => {
        state.loading = false;
        state.error = payload;
      });
  },
});

// ─── Forgot/reset password slice ─────────────────────────────────────────────

const forgotPasswordSlice = createSlice({
  name: "forgotPassword",
  initialState: { loading: false, message: null, success: false, error: null },
  reducers: { clearForgotError: (state) => { state.error = null; state.message = null; } },
  extraReducers: (builder) => {
    builder
      .addCase(forgotPassword.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(forgotPassword.fulfilled, (state, { payload }) => { state.loading = false; state.message = payload; })
      .addCase(forgotPassword.rejected, (state, { payload }) => { state.loading = false; state.error = payload; })
      .addCase(resetPassword.pending, (state) => { state.loading = true; })
      .addCase(resetPassword.fulfilled, (state) => { state.loading = false; state.success = true; })
      .addCase(resetPassword.rejected, (state, { payload }) => { state.loading = false; state.error = payload; });
  },
});


// ─── Admin users slice ────────────────────────────────────────────────────────

const adminUsersSlice = createSlice({
  name: "adminUsers",
  initialState: { loading: false, users: [], user: null, isDeleted: false, isUpdated: false, error: null },
  reducers: {
    resetAdminUserOp: (state) => { state.isDeleted = false; state.isUpdated = false; },
    clearAdminUserError: (state) => { state.error = null; },
  },
  extraReducers: (builder) => {
    builder
      .addCase(getAllUsers.pending, (state) => { state.loading = true; })
      .addCase(getAllUsers.fulfilled, (state, { payload }) => { state.loading = false; state.users = payload; })
      .addCase(getAllUsers.rejected, (state, { payload }) => { state.loading = false; state.error = payload; })
      .addCase(getUserDetails.pending, (state) => { state.loading = true; })
      .addCase(getUserDetails.fulfilled, (state, { payload }) => { state.loading = false; state.user = payload; })
      .addCase(getUserDetails.rejected, (state, { payload }) => { state.loading = false; state.error = payload; })
      .addCase(updateUserAdmin.fulfilled, (state) => { state.isUpdated = true; })
      .addCase(updateUserAdmin.rejected, (state, { payload }) => { state.error = payload; })
      .addCase(deleteUser.fulfilled, (state) => { state.isDeleted = true; })
      .addCase(deleteUser.rejected, (state, { payload }) => { state.error = payload; });
  },
});

export const { clearUserError } = userSlice.actions;
export const { clearForgotError } = forgotPasswordSlice.actions;
export const { resetAdminUserOp, clearAdminUserError } = adminUsersSlice.actions;

export const userReducer        = userSlice.reducer;
export const forgotPasswordReducer = forgotPasswordSlice.reducer;
export const adminUsersReducer  = adminUsersSlice.reducer;
