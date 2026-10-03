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

const CARD_ELEMENT_STYLE = {
  style: { base: { fontSize: "16px", color: "#242923", fontFamily: "Outfit, system-ui, sans-serif", "::placeholder": { color: "#686E67" } } },
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
      <div className="flex min-h-[70vh] items-center justify-center bg-cream-100 px-4 py-8">
        <div className="w-full max-w-[460px] rounded-card border border-admin-border bg-white p-6 shadow-xl sm:p-8">
          <h2 className="mb-6 text-center font-display text-2xl text-brand-900">Card Details</h2>
          <form className="flex flex-col gap-5" onSubmit={handleSubmit}>
            <div className="flex flex-col gap-2">
              <label className="flex items-center gap-2 font-body text-sm font-medium text-earth-600"><MdCreditCard aria-hidden="true" /> Card Number</label>
              <div className="rounded-lg border border-brand-300 bg-cream-100 px-4 py-3 focus-within:border-brand-700"><CardNumberElement options={CARD_ELEMENT_STYLE} /></div>
            </div>
            <div className="grid gap-4 min-[481px]:grid-cols-2">
              <div className="flex flex-col gap-2">
                <label className="flex items-center gap-2 font-body text-sm font-medium text-earth-600"><MdEvent aria-hidden="true" /> Expiry</label>
                <div className="rounded-lg border border-brand-300 bg-cream-100 px-4 py-3 focus-within:border-brand-700"><CardExpiryElement options={CARD_ELEMENT_STYLE} /></div>
              </div>
              <div className="flex flex-col gap-2">
                <label className="flex items-center gap-2 font-body text-sm font-medium text-earth-600"><MdVpnKey aria-hidden="true" /> CVC</label>
                <div className="rounded-lg border border-brand-300 bg-cream-100 px-4 py-3 focus-within:border-brand-700"><CardCvcElement options={CARD_ELEMENT_STYLE} /></div>
              </div>
            </div>
            <button type="submit" ref={payBtn} className="inline-flex min-h-11 items-center justify-center gap-2 whitespace-nowrap rounded-full border-2 px-6 py-2.5 font-body text-sm font-semibold tracking-wide transition-colors disabled:cursor-not-allowed disabled:opacity-50 border-transparent bg-brand-900 text-white hover:bg-brand-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-700 mt-2 w-full py-4 text-base">
              Pay ৳{orderInfo.totalPrice}
            </button>
          </form>
        </div>
      </div>
    </>
  );
};
export default ProcessPayment;
