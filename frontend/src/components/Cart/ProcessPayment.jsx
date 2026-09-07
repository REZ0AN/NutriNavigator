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

const PAYMENT_ATTEMPT_KEY = "paymentAttemptId";
const PAYMENT_CART_FINGERPRINT_KEY = "paymentAttemptCartFingerprint";
const cartFingerprint = (items) => JSON.stringify(
  items.map(({ product, quantity }) => ({ product, quantity }))
);
const rotatePaymentAttempt = (fingerprint) => {
  sessionStorage.setItem(PAYMENT_ATTEMPT_KEY, crypto.randomUUID());
  sessionStorage.setItem(PAYMENT_CART_FINGERPRINT_KEY, fingerprint);
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
  const currentCartFingerprint = cartFingerprint(cartItems);

  useEffect(() => {
    if (cartItems.length === 0) {
      sessionStorage.removeItem(PAYMENT_ATTEMPT_KEY);
      sessionStorage.removeItem(PAYMENT_CART_FINGERPRINT_KEY);
      return;
    }
    if (sessionStorage.getItem(PAYMENT_CART_FINGERPRINT_KEY) !== currentCartFingerprint) {
      rotatePaymentAttempt(currentCartFingerprint);
    }
  }, [currentCartFingerprint, cartItems.length]);

  useEffect(() => {
    if (error) { toast.error(error, { ...toastifyOptions }); dispatch(clearNewOrderError()); }
  }, [error, dispatch]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (payBtn.current) payBtn.current.disabled = true;
    let paymentConfirmed = false;
    try {
      const paymentAttemptId = sessionStorage.getItem(PAYMENT_ATTEMPT_KEY) || crypto.randomUUID();
      sessionStorage.setItem(PAYMENT_ATTEMPT_KEY, paymentAttemptId);
      sessionStorage.setItem(PAYMENT_CART_FINGERPRINT_KEY, currentCartFingerprint);
      const { data } = await axios.post("/api/v1/payment/process", {
        orderitems: cartItems,
        shippinginfo: shippingInfo,
        idempotencyKey: paymentAttemptId,
      });
      const result = await stripe.confirmCardPayment(data.client_secret, {
        payment_method: {
          card: elements.getElement(CardNumberElement),
          billing_details: { name: user.name, email: user.email, address: { line1: shippingInfo.address, city: shippingInfo.city, postal_code: shippingInfo.pinCode, country: shippingInfo.country } },
        },
      });

      if (result.error) {
        rotatePaymentAttempt(currentCartFingerprint);
        if (payBtn.current) payBtn.current.disabled = false;
        toast.error(result.error.message, { ...toastifyOptions });
        return;
      }

      if (result.paymentIntent.status === "succeeded") {
        paymentConfirmed = true;
        const order = {
          shippinginfo: shippingInfo, orderitems: cartItems,
          // The backend recalculates these values from current catalog data.
          paymentinfo: { id: result.paymentIntent.id, status: result.paymentIntent.status },
        };
        await dispatch(createOrder(order)).unwrap();
        dispatch(clearCart());
        sessionStorage.removeItem("orderInfo");
        sessionStorage.removeItem(PAYMENT_ATTEMPT_KEY);
        sessionStorage.removeItem(PAYMENT_CART_FINGERPRINT_KEY);
        toast.success(`Payment successful! Total charged: ৳${data.pricing.totalprice}`, { ...toastifyOptions });
        navigate("/success");
      }
      else {
        rotatePaymentAttempt(currentCartFingerprint);
        if (payBtn.current) payBtn.current.disabled = false;
        toast.error("Payment was not completed. Please try again.", { ...toastifyOptions });
      }
    } catch (err) {
      // A confirmed PaymentIntent must keep its identity so order persistence
      // can be retried; earlier failures need a fresh Stripe attempt key.
      if (!paymentConfirmed) rotatePaymentAttempt(currentCartFingerprint);
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
