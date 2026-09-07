import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axios from "axios";

// ─── Thunks ───────────────────────────────────────────────────────────────────

export const getProducts = createAsyncThunk("products/getAll", async ({ keyword = "", page = 1, price = [0, 4000], category = "", ratings = 0 } = {}, { rejectWithValue }) => {
  try {
    const base = `/api/v1/products?keyword=${keyword}&page=${page}&price[gte]=${price[0]}&price[lte]=${price[1]}&rating[gte]=${ratings}`;
    const url  = category ? `${base}&category=${category}` : base;
    const { data } = await axios.get(url);
    return data;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || "Failed to fetch products");
  }
});

export const getProductDetails = createAsyncThunk("products/getDetails", async (id, { rejectWithValue }) => {
  try {
    const { data } = await axios.get(`/api/v1/product/${id}`);
    return data.product;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || "Product not found");
  }
});

export const getAllAdminProducts = createAsyncThunk("products/getAllAdmin", async (_, { rejectWithValue }) => {
  try {
    const { data } = await axios.get("/api/v1/admin/products");
    return data.products;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || "Failed");
  }
});

export const createProduct = createAsyncThunk("products/create", async (productData, { rejectWithValue }) => {
  try {
    const { data } = await axios.post("/api/v1/admin/product/new", productData, {
      headers: { "Content-Type": "application/json" },
    });
    return data;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || "Create failed");
  }
});

export const updateProduct = createAsyncThunk("products/update", async ({ id, productData }, { rejectWithValue }) => {
  try {
    const { data } = await axios.put(`/api/v1/admin/product/${id}`, productData, {
      headers: { "Content-Type": "application/json" },
    });
    return data;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || "Update failed");
  }
});

export const deleteProduct = createAsyncThunk("products/delete", async (id, { rejectWithValue }) => {
  try {
    await axios.delete(`/api/v1/admin/product/${id}`);
    return id;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || "Delete failed");
  }
});

export const submitReview = createAsyncThunk("products/review", async (reviewData, { rejectWithValue }) => {
  try {
    const { data } = await axios.put("/api/v1/review", reviewData);
    return data;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || "Review failed");
  }
});

export const getAllReviews = createAsyncThunk("products/getAllReviews", async ({ limit = 25, cursor = "", search = "", rating = "", productId = "", sort = "newest" } = {}, { rejectWithValue }) => {
  try {
    const { data } = await axios.get("/api/v1/admin/reviews", { params: { limit, cursor: cursor || undefined, search: search || undefined, rating: rating || undefined, productId: productId || undefined, sort } });
    return data;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || "Failed");
  }
});

export const getProductReviews = createAsyncThunk("products/getProductReviews", async (id, { rejectWithValue }) => {
  try {
    const { data } = await axios.get(`/api/v1/reviews?id=${id}`);
    return data.reviews;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || "Failed");
  }
});

export const deleteReview = createAsyncThunk("products/deleteReview", async ({ reviewId, productId }, { rejectWithValue }) => {
  try {
    await axios.delete(`/api/v1/reviews?id=${reviewId}&productId=${productId}`);
    return reviewId;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || "Delete failed");
  }
});

// ─── Slices ───────────────────────────────────────────────────────────────────

const productsListSlice = createSlice({
  name: "productsList",
  initialState: { loading: false, products: [], productsCount: 0, resultPerPage: 8, filteredProductsCount: 0, uniqueCategories: [], error: null },
  reducers: { clearProductsError: (state) => { state.error = null; } },
  extraReducers: (builder) => {
    builder
      .addCase(getProducts.pending, (state) => { state.loading = true; })
      .addCase(getProducts.fulfilled, (state, { payload }) => {
        state.loading = false;
        state.products = payload.products;
        state.productsCount = payload.productsCount;
        state.resultPerPage = payload.resultPerPage;
        state.filteredProductsCount = payload.filteredProductsCount;
        state.uniqueCategories = payload.uniqueCategories;
      })
      .addCase(getProducts.rejected, (state, { payload }) => { state.loading = false; state.error = payload; })
      .addCase(getAllAdminProducts.pending, (state) => { state.loading = true; })
      .addCase(getAllAdminProducts.fulfilled, (state, { payload }) => { state.loading = false; state.products = payload; })
      .addCase(getAllAdminProducts.rejected, (state, { payload }) => { state.loading = false; state.error = payload; });
  },
});

const productDetailsSlice = createSlice({
  name: "productDetails",
  initialState: { loading: false, product: {}, error: null },
  reducers: { clearProductDetailError: (state) => { state.error = null; } },
  extraReducers: (builder) => {
    builder
      .addCase(getProductDetails.pending, (state) => { state.loading = true; })
      .addCase(getProductDetails.fulfilled, (state, { payload }) => { state.loading = false; state.product = payload; })
      .addCase(getProductDetails.rejected, (state, { payload }) => { state.loading = false; state.error = payload; });
  },
});

const productOpsSlice = createSlice({
  name: "productOps",
  initialState: { loading: false, success: false, isDeleted: false, isUpdated: false, reviewSuccess: false, reviewDeleted: false, reviews: [], error: null },
  reducers: {
    resetProductOps: (state) => { state.success = false; state.isDeleted = false; state.isUpdated = false; state.reviewSuccess = false; state.reviewDeleted = false; },
    clearProductOpsError: (state) => { state.error = null; },
  },
extraReducers: (builder) => {
  builder
    .addCase(createProduct.pending,   (state) => { state.loading = true;  state.error = null; })
    .addCase(createProduct.fulfilled, (state) => { state.loading = false; state.success = true; })
    .addCase(createProduct.rejected,  (state, { payload }) => { state.loading = false; state.error = payload; })

    .addCase(updateProduct.pending,   (state) => { state.loading = true;  state.error = null; })
    .addCase(updateProduct.fulfilled, (state) => { state.loading = false; state.isUpdated = true; })
    .addCase(updateProduct.rejected,  (state, { payload }) => { state.loading = false; state.error = payload; })

    .addCase(deleteProduct.fulfilled, (state) => { state.isDeleted = true; })
    .addCase(deleteProduct.rejected,  (state, { payload }) => { state.error = payload; })

    .addCase(submitReview.fulfilled,  (state) => { state.reviewSuccess = true; })
    .addCase(submitReview.rejected,   (state, { payload }) => { state.error = payload; })

    .addCase(getAllReviews.fulfilled,  (state, { payload }) => { state.reviews = payload.reviews; })
    .addCase(getAllReviews.rejected,   (state, { payload }) => { state.error = payload; })
    .addCase(getProductReviews.fulfilled, (state, { payload }) => { state.reviews = payload; })
    .addCase(getProductReviews.rejected, (state, { payload }) => { state.error = payload; })

    .addCase(deleteReview.fulfilled,  (state) => { state.reviewDeleted = true; })
    .addCase(deleteReview.rejected,   (state, { payload }) => { state.error = payload; });
},
});

export const { clearProductsError } = productsListSlice.actions;
export const { clearProductDetailError } = productDetailsSlice.actions;
export const { resetProductOps, clearProductOpsError } = productOpsSlice.actions;

export const productsListReducer  = productsListSlice.reducer;
export const productDetailsReducer = productDetailsSlice.reducer;
export const productOpsReducer    = productOpsSlice.reducer;
