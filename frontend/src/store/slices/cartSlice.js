import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axios from "axios";

export const addItemsToCart = createAsyncThunk("cart/addItem", async ({ id, quantity }, { rejectWithValue }) => {
  try {
    const { data } = await axios.get(`/api/v1/product/${id}`);
    return {
      product:  data.product._id,
      name:     data.product.name,
      price:    data.product.price,
      image:    data.product.images[0],
      stock:    data.product.stock,
      quantity,
    };
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || "Failed to add item");
  }
});

const cartSlice = createSlice({
  name: "cart",
  initialState: {
    cartItems: localStorage.getItem("cartItems") ? JSON.parse(localStorage.getItem("cartItems")) : [],
    shippingInfo: localStorage.getItem("shippingInfo") ? JSON.parse(localStorage.getItem("shippingInfo")) : {},
  },
  reducers: {
    removeCartItem: (state, { payload }) => {
      state.cartItems = state.cartItems.filter((i) => i.product !== payload);
      localStorage.setItem("cartItems", JSON.stringify(state.cartItems));
    },
    saveShippingInfo: (state, { payload }) => {
      state.shippingInfo = payload;
      localStorage.setItem("shippingInfo", JSON.stringify(payload));
    },
    clearCart: (state) => {
      state.cartItems = [];
      localStorage.removeItem("cartItems");
    },
  },
  extraReducers: (builder) => {
    builder.addCase(addItemsToCart.fulfilled, (state, { payload }) => {
      const exists = state.cartItems.find((i) => i.product === payload.product);
      if (exists) {
        state.cartItems = state.cartItems.map((i) => i.product === payload.product ? payload : i);
      } else {
        state.cartItems.push(payload);
      }
      localStorage.setItem("cartItems", JSON.stringify(state.cartItems));
    });
  },
});

export const { removeCartItem, saveShippingInfo, clearCart } = cartSlice.actions;
export const cartReducer = cartSlice.reducer;
