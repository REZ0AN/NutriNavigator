import { configureStore } from "@reduxjs/toolkit";
import { userReducer, forgotPasswordReducer, adminUsersReducer } from "./slices/userSlice";
import { profileReducer } from "./slices/profileSlice";
import { cartReducer } from "./slices/cartSlice";
import { productsListReducer, productDetailsReducer, productOpsReducer } from "./slices/productSlice";
import { newOrderReducer, myOrdersReducer, orderDetailsReducer, allOrdersReducer } from "./slices/orderSlice";

export const store = configureStore({
  reducer: {
    // Auth & users
    userR:          userReducer,
    forgotPasswordR: forgotPasswordReducer,
    profileR:       profileReducer,
    adminUsersR:    adminUsersReducer,
    // Products
    productsR:      productsListReducer,
    productR:       productDetailsReducer,
    productOpsR:    productOpsReducer,
    // Cart
    cartR:          cartReducer,
    // Orders
    newOrderR:      newOrderReducer,
    myOrderR:       myOrdersReducer,
    orderDetailsR:  orderDetailsReducer,
    allOrdersR:     allOrdersReducer,
  },
});
