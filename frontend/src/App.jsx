import React, { useEffect, useMemo, useState } from "react";
import { BrowserRouter as Router, Routes, Route, useLocation } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { Elements } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import axios from "axios";

import Header         from "./components/layouts/Header/Header";
import Footer         from "./components/layouts/Footer/Footer";
import Loader         from "./components/layouts/Loader/Loader";

import Home           from "./components/Home/Home";
import Products       from "./components/Product/Products";
import ProductDetails from "./components/ProductDetails/ProductDetails";
import Search         from "./components/Search/Search";
import Login          from "./components/Login/Login";
import DietRecommend  from "./components/DietRecommend/DietRecommend";

import Profile        from "./components/Profile/Profile";
import UpdateProfile  from "./components/Profile/UpdateProfile";
import UpdatePassword from "./components/Profile/UpdatePassword";

import ForgotPassword     from "./components/ForgotPassword/ForgotPassword";
import ResetPassword      from "./components/ResetPassword/ResetPassword";
import VerifyEmail        from "./components/VerifyEmail/VerifyEmail";
import ResendVerification from "./components/ResendVerification/ResendVerification";

import Cart           from "./components/Cart/Cart";
import ShippingInfo   from "./components/Cart/ShippingInfo";
import ConfirmOrder   from "./components/Cart/ConfirmOrder";
import Success        from "./components/Cart/Success";
import ProcessPayment from "./components/Cart/ProcessPayment";

import MyOrders     from "./components/orders/MyOrders";
import OrderDetails from "./components/orders/OrderDetails";

import Dashboard     from "./components/Admin/Dashboard/Dashboard";
import ProductList   from "./components/Admin/ProductList/ProductList";
import NewProduct    from "./components/Admin/NewProduct/NewProduct";
import UpdateProduct from "./components/Admin/UpdateProduct/UpdateProduct";
import OrderList     from "./components/Admin/OrderList/OrderList";
import OrderUpdate   from "./components/Admin/OrderUpdate/OrderUpdate";
import UsersList     from "./components/Admin/UsersList/UsersList";
import UpdateUser    from "./components/Admin/UpdateUser/UpdateUser";
import ReviewList    from "./components/Admin/ReviewsList/ReviewList";

import ProtectedRoute from "./utils/routes/ProtectedRoute";
import AdminRoute     from "./utils/routes/AdminRoute";

import { loadUser } from "./store/slices/userSlice";

// ─── Payment route ────────────────────────────────────────────────────────────
// loadStripe is called HERE — only when user navigates to /process/payment
// This prevents Stripe beaconing on every other page
const PaymentRoute = ({ stripeApiKey }) => {
  const stripePromise = useMemo(
    () => (stripeApiKey ? loadStripe(stripeApiKey) : null),
    [stripeApiKey]
  );

  if (!stripePromise) return <Loader />;

  return (
    <Elements stripe={stripePromise}>
      <ProcessPayment />
    </Elements>
  );
};

// ─── Inner app ────────────────────────────────────────────────────────────────
function AppContent() {
  const location = useLocation();
  const dispatch = useDispatch();
  const { isAuthenticated, user } = useSelector((s) => s.userR);
  const isAdmin = location.pathname.startsWith("/admin");

  // Load user once on mount only
  useEffect(() => {
  if (!user) {
    dispatch(loadUser());
  }
}, [dispatch]);

  // Stripe publishable key — fetched once when authenticated
  // Persisted in sessionStorage so page refresh doesn't re-fetch
  const [stripeApiKey, setStripeApiKey] = useState(
    () => sessionStorage.getItem("stripeKey") || ""
  );

  useEffect(() => {
    if (isAuthenticated && !stripeApiKey) {
      axios
        .get("/api/v1/stripeapikey")
        .then(({ data }) => {
          setStripeApiKey(data.stripeApiKey);
          sessionStorage.setItem("stripeKey", data.stripeApiKey);
        })
        .catch(() => {});
    }
  }, [isAuthenticated, stripeApiKey]);

  return (
    <>
      {!isAdmin && <Header />}

      <Routes>
        {/* ── Public ── */}
        <Route path="/"                      element={<Home />} />
        <Route path="/products"              element={<Products />} />
        <Route path="/products/:keyword"     element={<Products />} />
        <Route path="/product/:id"           element={<ProductDetails />} />
        <Route path="/search"                element={<Search />} />
        <Route path="/login"                 element={<Login />} />
        <Route path="/dietrecommend"         element={<DietRecommend />} />
        <Route path="/password/forgot"       element={<ForgotPassword />} />
        <Route path="/password/reset/:token" element={<ResetPassword />} />
        <Route path="/cart"                  element={<Cart />} />
        <Route path="/verify-email/:token"   element={<VerifyEmail />} />
        <Route path="/resend-verification"   element={<ResendVerification />} />

        {/* ── Protected ── */}
        <Route element={<ProtectedRoute />}>
          <Route path="/profile"         element={<Profile />} />
          <Route path="/profile/update"  element={<UpdateProfile />} />
          <Route path="/password/update" element={<UpdatePassword />} />
          <Route path="/shipping"        element={<ShippingInfo />} />
          <Route path="/order/confirm"   element={<ConfirmOrder />} />
          <Route path="/success"         element={<Success />} />
          <Route path="/orders/me"       element={<MyOrders />} />
          <Route path="/order/:id"       element={<OrderDetails />} />
          {/* Stripe only initializes when this route is visited */}
          <Route
            path="/process/payment"
            element={<PaymentRoute stripeApiKey={stripeApiKey} />}
          />
        </Route>

        {/* ── Admin ── */}
        <Route element={<AdminRoute />}>
          <Route path="/admin/dashboard"   element={<Dashboard />} />
          <Route path="/admin/products"    element={<ProductList />} />
          <Route path="/admin/product"     element={<NewProduct />} />
          <Route path="/admin/product/:id" element={<UpdateProduct />} />
          <Route path="/admin/orders"      element={<OrderList />} />
          <Route path="/admin/order/:id"   element={<OrderUpdate />} />
          <Route path="/admin/users"       element={<UsersList />} />
          <Route path="/admin/user/:id"    element={<UpdateUser />} />
          <Route path="/admin/reviews"     element={<ReviewList />} />
        </Route>
      </Routes>

      {!isAdmin && <Footer />}
      <ToastContainer position="top-center" autoClose={3000} theme="colored" />
    </>
  );
}

// ─── Root ─────────────────────────────────────────────────────────────────────
function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}

export default App;