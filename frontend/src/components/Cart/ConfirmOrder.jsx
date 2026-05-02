import React from "react";
import { useSelector } from "react-redux";
import { useNavigate, Link } from "react-router-dom";
import MetaData from "../layouts/Header/MetaData";
import CheckoutSteps from "./CheckoutSteps";
import "./ConfirmOrder.css";

const ConfirmOrder = () => {
  const navigate = useNavigate();
  const { shippingInfo, cartItems } = useSelector((s) => s.cartR);
  const { user } = useSelector((s) => s.userR);

  const subtotal         = cartItems.reduce((a, i) => a + i.price * i.quantity, 0);
  const shippingCharges  = subtotal > 1000 ? 0 : 200;
  const tax              = +(subtotal * 0.18).toFixed(2);
  const totalPrice       = +(subtotal + tax + shippingCharges).toFixed(2);
  const address          = `${shippingInfo.address}, ${shippingInfo.city}, ${shippingInfo.pinCode}`;

  const proceedToPayment = () => {
    sessionStorage.setItem("orderInfo", JSON.stringify({ subtotal, shippingCharges, tax, totalPrice }));
    navigate("/process/payment");
  };

  return (
    <>
      <MetaData title="Confirm Order" />
      <CheckoutSteps activeStep={1} />
      <div className="confirm-page">
        <div className="confirm-left">
          <div className="confirm-section">
            <h3>Shipping Info</h3>
            <p><b>Name:</b> {user?.name}</p>
            <p><b>Phone:</b> {shippingInfo.phoneNo}</p>
            <p><b>Address:</b> {address}</p>
          </div>
          <div className="confirm-section">
            <h3>Cart Items</h3>
            {cartItems.map((item) => (
              <div key={item.product} className="confirm-item">
                <img src={item.image?.url} alt={item.name} />
                <Link to={`/product/${item.product}`}>{item.name}</Link>
                <span>{item.quantity} × ৳{item.price} = <b>৳{item.price * item.quantity}</b></span>
              </div>
            ))}
          </div>
        </div>

        <div className="confirm-summary">
          <h3>Order Summary</h3>
          <div className="confirm-row"><span>Subtotal</span><span>৳{subtotal}</span></div>
          <div className="confirm-row"><span>Shipping</span><span>{shippingCharges === 0 ? "Free" : `৳${shippingCharges}`}</span></div>
          <div className="confirm-row"><span>Tax (18%)</span><span>৳{tax}</span></div>
          <div className="confirm-row confirm-row--total"><span>Total</span><span>৳{totalPrice}</span></div>
          <button className="btn btn--primary confirm-pay-btn" onClick={proceedToPayment}>Proceed to Payment</button>
        </div>
      </div>
    </>
  );
};
export default ConfirmOrder;
