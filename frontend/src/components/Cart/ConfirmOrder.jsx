import React from "react";
import { useSelector } from "react-redux";
import { useNavigate, Link } from "react-router-dom";
import MetaData from "../layouts/Header/MetaData";
import CheckoutSteps from "./CheckoutSteps";

const sectionTitleClass = "mb-4 border-b border-admin-border pb-3 font-body text-xs font-bold uppercase tracking-widest text-admin-muted";
const summaryRowClass = "flex justify-between py-2 font-body text-sm text-earth-600";

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
      <div className="mx-auto grid min-h-[calc(100vh-408px)] max-w-content items-start gap-8 px-4 py-5 md:grid-cols-[minmax(0,1fr)_320px] md:px-6 md:py-8">
        <div className="flex flex-col gap-5">
          <div className="rounded-card border border-admin-border bg-white px-6 py-5">
            <h3 className={sectionTitleClass}>Shipping Info</h3>
            <p className="mb-2 font-body text-sm leading-relaxed text-earth-600"><b>Name:</b> {user?.name}</p>
            <p className="mb-2 font-body text-sm leading-relaxed text-earth-600"><b>Phone:</b> {shippingInfo.phoneNo}</p>
            <p className="mb-2 font-body text-sm leading-relaxed text-earth-600"><b>Address:</b> {address}</p>
          </div>
          <div className="rounded-card border border-admin-border bg-white px-6 py-5">
            <h3 className={sectionTitleClass}>Cart Items</h3>
            {cartItems.map((item) => (
              <div key={item.product} className="flex items-center gap-4 border-b border-admin-border py-3 last:border-0 last:pb-0">
                <img src={item.image?.url} alt={item.name} className="h-12 w-12 shrink-0 rounded bg-cream-50 object-contain" />
                <Link to={`/product/${item.product}`} className="flex-1 font-body text-sm text-brand-900 hover:underline">{item.name}</Link>
                <span className="whitespace-nowrap font-body text-sm text-earth-600">{item.quantity} × ৳{item.price} = <b>৳{item.price * item.quantity}</b></span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-card border border-admin-border bg-white p-6 shadow-sm md:sticky md:top-[84px]">
          <h3 className="mb-5 font-body text-base font-bold text-earth-900">Order Summary</h3>
          <div className={summaryRowClass}><span>Subtotal</span><span>৳{subtotal}</span></div>
          <div className={summaryRowClass}><span>Shipping</span><span>{shippingCharges === 0 ? "Free" : `৳${shippingCharges}`}</span></div>
          <div className={summaryRowClass}><span>Tax (18%)</span><span>৳{tax}</span></div>
          <div className="mt-2 flex justify-between border-t-2 border-admin-border pt-4 font-body text-lg font-bold text-earth-900"><span>Total</span><span>৳{totalPrice}</span></div>
          <button className="inline-flex min-h-11 items-center justify-center gap-2 whitespace-nowrap rounded-full border-2 px-6 py-2.5 font-body text-sm font-semibold tracking-wide transition-colors disabled:cursor-not-allowed disabled:opacity-50 border-transparent bg-brand-900 text-white hover:bg-brand-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-700 mt-5 w-full py-4 text-base" onClick={proceedToPayment}>Proceed to Payment</button>
        </div>
      </div>
    </>
  );
};
export default ConfirmOrder;
