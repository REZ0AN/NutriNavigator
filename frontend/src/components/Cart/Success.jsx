import React, { useEffect } from "react";
import { Link } from "react-router-dom";
import { MdCheckCircle } from "react-icons/md";
import MetaData from "../layouts/Header/MetaData";
import "./Success.css";

const Success = () => {
  useEffect(() => {
    localStorage.removeItem("cartItems");
    localStorage.removeItem("shippingInfo");
    sessionStorage.removeItem("orderInfo");
  }, []);

  return (
    <>
      <MetaData title="Order Placed" />
      <div className="success-page">
        <MdCheckCircle className="success-icon" />
        <h1>Order Placed Successfully!</h1>
        <p>Thank you for your purchase. You'll receive a confirmation soon.</p>
        <div className="success-actions">
          <Link to="/orders/me" className="btn btn--primary">View My Orders</Link>
          <Link to="/products"  className="btn btn--secondary">Continue Shopping</Link>
        </div>
      </div>
    </>
  );
};
export default Success;
