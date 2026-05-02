import React, { useEffect, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import axios from "axios";
import { CardNumberElement, CardCvcElement, CardExpiryElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { MdCreditCard, MdEvent, MdVpnKey } from "react-icons/md";
import MetaData from "../layouts/Header/MetaData";
import CheckoutSteps from "./CheckoutSteps";
import { createOrder } from "../../store/slices/orderSlice";
import { clearCart } from "../../store/slices/cartSlice";
import { clearNewOrderError } from "../../store/slices/orderSlice";
import { toastifyOptions } from "../../utils/toastify";
import "./ProcessPayment.css";

const CARD_ELEMENT_STYLE = {
  style: { base: { fontSize: "16px", color: "var(--color-text-primary)", fontFamily: "var(--font-body)", "::placeholder": { color: "var(--color-text-muted)" } } },
};

const ProcessPayment = () => {
  const dispatch  = useDispatch();
  const navigate  = useNavigate();
  const stripe    = useStripe();
  const elements  = useElements();
  const payBtn    = useRef(null);
  const orderInfo = JSON.parse(sessionStorage.getItem("orderInfo") || "{}");
  const { shippingInfo, cartItems } = useSelector((s) => s.cartR);
  const { user }  = useSelector((s) => s.userR);
  const { error } = useSelector((s) => s.newOrderR);

  useEffect(() => {
    if (error) { toast.error(error, { ...toastifyOptions }); dispatch(clearNewOrderError()); }
  }, [error, dispatch]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (payBtn.current) payBtn.current.disabled = true;
    try {
      const { data } = await axios.post("/api/v1/payment/process", { amount: Math.round(orderInfo.totalPrice * 100) });
      const result = await stripe.confirmCardPayment(data.client_secret, {
        payment_method: {
          card: elements.getElement(CardNumberElement),
          billing_details: { name: user.name, email: user.email, address: { line1: shippingInfo.address, city: shippingInfo.city, postal_code: shippingInfo.pinCode, country: shippingInfo.country } },
        },
      });

      if (result.error) { if (payBtn.current) payBtn.current.disabled = false; toast.error(result.error.message, { ...toastifyOptions }); return; }

      if (result.paymentIntent.status === "succeeded") {
        const order = {
          shippinginfo: shippingInfo, orderitems: cartItems,
          itemsprice: orderInfo.subtotal, tax: orderInfo.tax,
          shippingcost: orderInfo.shippingCharges, totalprice: orderInfo.totalPrice,
          paymentinfo: { id: result.paymentIntent.id, status: result.paymentIntent.status },
        };
        dispatch(createOrder(order));
        dispatch(clearCart());
        sessionStorage.removeItem("orderInfo");
        toast.success("Payment successful!", { ...toastifyOptions });
        navigate("/success");
      }
    } catch (err) {
      if (payBtn.current) payBtn.current.disabled = false;
      toast.error(err.response?.data?.message || "Payment failed", { ...toastifyOptions });
    }
  };

  return (
    <>
      <MetaData title="Payment" />
      <CheckoutSteps activeStep={2} />
      <div className="payment-page">
        <div className="payment-card">
          <h2 className="payment-title">Card Details</h2>
          <form className="payment-form" onSubmit={handleSubmit}>
            <div className="payment-field">
              <label><MdCreditCard /> Card Number</label>
              <div className="payment-stripe-field"><CardNumberElement options={CARD_ELEMENT_STYLE} /></div>
            </div>
            <div className="payment-row">
              <div className="payment-field">
                <label><MdEvent /> Expiry</label>
                <div className="payment-stripe-field"><CardExpiryElement options={CARD_ELEMENT_STYLE} /></div>
              </div>
              <div className="payment-field">
                <label><MdVpnKey /> CVC</label>
                <div className="payment-stripe-field"><CardCvcElement options={CARD_ELEMENT_STYLE} /></div>
              </div>
            </div>
            <button type="submit" ref={payBtn} className="btn btn--primary payment-submit">
              Pay ৳{orderInfo.totalPrice}
            </button>
          </form>
        </div>
      </div>
    </>
  );
};
export default ProcessPayment;
