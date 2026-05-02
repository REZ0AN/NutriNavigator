import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axios from "axios";

export const updateProfile = createAsyncThunk("profile/update", async (userData, { rejectWithValue }) => {
  try {
    const { data } = await axios.put("/api/v1/profile/update", userData);
    return data;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || "Update failed");
  }
});

export const updatePassword = createAsyncThunk("profile/updatePassword", async (passwords, { rejectWithValue }) => {
  try {
    const { data } = await axios.put("/api/v1/password/update", passwords);
    return data;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || "Password update failed");
  }
});

const profileSlice = createSlice({
  name: "profile",
  initialState: { loading: false, isUpdated: false, error: null },
  reducers: {
    resetProfileOp: (state) => { state.isUpdated = false; },
    clearProfileError: (state) => { state.error = null; },
  },
  extraReducers: (builder) => {
    builder
      .addCase(updateProfile.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(updateProfile.fulfilled, (state) => { state.loading = false; state.isUpdated = true; })
      .addCase(updateProfile.rejected, (state, { payload }) => { state.loading = false; state.error = payload; })
      .addCase(updatePassword.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(updatePassword.fulfilled, (state) => { state.loading = false; state.isUpdated = true; })
      .addCase(updatePassword.rejected, (state, { payload }) => { state.loading = false; state.error = payload; });
  },
});

export const { resetProfileOp, clearProfileError } = profileSlice.actions;
export const profileReducer = profileSlice.reducer;
