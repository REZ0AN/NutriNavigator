import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axios from "axios";

export const createOrder = createAsyncThunk("orders/create", async (order, { rejectWithValue }) => {
  try {
    const { data } = await axios.post("/api/v1/order/new", order);
    if (!data.success || !data.order) {
      return rejectWithValue(data.message || "Order recovery is pending. Please retry from your order details.");
    }
    return data.order;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || "Order failed");
  }
});

export const fetchMyOrders = createAsyncThunk("orders/myOrders", async (_, { rejectWithValue }) => {
  try {
    const { data } = await axios.get("/api/v1/orders/me");
    return data.orders;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || "Failed");
  }
});

export const fetchOrderDetails = createAsyncThunk("orders/details", async (id, { rejectWithValue }) => {
  try {
    const { data } = await axios.get(`/api/v1/order/${id}`);
    return data.order;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || "Not found");
  }
});

export const fetchAdminOrderDetails = createAsyncThunk("orders/adminDetails", async (id, { rejectWithValue }) => {
  try {
    const { data } = await axios.get(`/api/v1/admin/order/${id}`);
    return data.order;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || "Not found");
  }
});

export const fetchAllOrders = createAsyncThunk("orders/getAll", async (_, { rejectWithValue }) => {
  try {
    const { data } = await axios.get("/api/v1/admin/orders");
    return { orders: data.orders, totalAmount: data.totalAmount };
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || "Failed");
  }
});

export const updateOrderStatus = createAsyncThunk("orders/updateStatus", async ({ id, status }, { rejectWithValue }) => {
  try {
    const { data } = await axios.put(`/api/v1/admin/order/${id}`, { status });
    return data;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || "Update failed");
  }
});

export const deleteOrder = createAsyncThunk("orders/delete", async (id, { rejectWithValue }) => {
  try {
    await axios.delete(`/api/v1/admin/order/${id}`);
    return id;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || "Delete failed");
  }
});

const newOrderSlice = createSlice({
  name: "newOrder",
  initialState: { loading: false, order: null, error: null },
  reducers: { clearNewOrderError: (state) => { state.error = null; } },
  extraReducers: (builder) => {
    builder
      .addCase(createOrder.pending, (state) => { state.loading = true; })
      .addCase(createOrder.fulfilled, (state, { payload }) => { state.loading = false; state.order = payload; })
      .addCase(createOrder.rejected, (state, { payload }) => { state.loading = false; state.error = payload; });
  },
});

const myOrdersSlice = createSlice({
  name: "myOrders",
  initialState: { loading: false, orders: [], error: null },
  reducers: { clearMyOrdersError: (state) => { state.error = null; } },
  extraReducers: (builder) => {
    builder
      .addCase(fetchMyOrders.pending, (state) => { state.loading = true; })
      .addCase(fetchMyOrders.fulfilled, (state, { payload }) => { state.loading = false; state.orders = payload; })
      .addCase(fetchMyOrders.rejected, (state, { payload }) => { state.loading = false; state.error = payload; });
  },
});

const orderDetailsSlice = createSlice({
  name: "orderDetails",
  initialState: { loading: false, order: {}, error: null },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchOrderDetails.pending, (state) => { state.loading = true; })
      .addCase(fetchOrderDetails.fulfilled, (state, { payload }) => { state.loading = false; state.order = payload; })
      .addCase(fetchOrderDetails.rejected, (state, { payload }) => { state.loading = false; state.error = payload; })
      .addCase(fetchAdminOrderDetails.pending, (state) => { state.loading = true; })
      .addCase(fetchAdminOrderDetails.fulfilled, (state, { payload }) => { state.loading = false; state.order = payload; })
      .addCase(fetchAdminOrderDetails.rejected, (state, { payload }) => { state.loading = false; state.error = payload; });
  },
});

const allOrdersSlice = createSlice({
  name: "allOrders",
  initialState: { loading: false, orders: [], totalAmount: 0, isDeleted: false, isUpdated: false, error: null },
  reducers: {
    resetOrderOps: (state) => { state.isDeleted = false; state.isUpdated = false; },
    clearAllOrdersError: (state) => { state.error = null; },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchAllOrders.pending, (state) => { state.loading = true; })
      .addCase(fetchAllOrders.fulfilled, (state, { payload }) => { state.loading = false; state.orders = payload.orders; state.totalAmount = payload.totalAmount; })
      .addCase(fetchAllOrders.rejected, (state, { payload }) => { state.loading = false; state.error = payload; })
      .addCase(updateOrderStatus.fulfilled, (state) => { state.isUpdated = true; })
      .addCase(updateOrderStatus.rejected, (state, { payload }) => { state.error = payload; })
      .addCase(deleteOrder.fulfilled, (state) => { state.isDeleted = true; })
      .addCase(deleteOrder.rejected, (state, { payload }) => { state.error = payload; });
  },
});

export const { clearNewOrderError } = newOrderSlice.actions;
export const { clearMyOrdersError } = myOrdersSlice.actions;
export const { resetOrderOps, clearAllOrdersError } = allOrdersSlice.actions;

export const newOrderReducer    = newOrderSlice.reducer;
export const myOrdersReducer    = myOrdersSlice.reducer;
export const orderDetailsReducer = orderDetailsSlice.reducer;
export const allOrdersReducer   = allOrdersSlice.reducer;
