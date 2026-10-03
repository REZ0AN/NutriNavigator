import React, { useEffect } from "react";
import { Link } from "react-router-dom";
import { MdCheckCircle } from "react-icons/md";
import MetaData from "../layouts/Header/MetaData";

const Success = () => {
  useEffect(() => {
    localStorage.removeItem("cartItems");
    localStorage.removeItem("shippingInfo");
    sessionStorage.removeItem("orderInfo");
  }, []);

  return (
    <>
      <MetaData title="Order Placed" />
      <div className="flex min-h-[calc(100vh-68px)] flex-col items-center justify-center gap-5 bg-cream-100 px-4 py-12 text-center">
        <MdCheckCircle aria-hidden="true" className="text-[5.5rem] text-green-700" />
        <h1 className="font-display text-3xl text-brand-900 sm:text-4xl">Order Placed Successfully!</h1>
        <p className="max-w-[360px] font-body text-base leading-relaxed text-earth-600">Thank you for your purchase. You'll receive a confirmation soon.</p>
        <div className="mt-4 flex flex-col flex-wrap items-center justify-center gap-3 min-[481px]:flex-row">
          <Link to="/orders/me" className="inline-flex min-h-11 items-center justify-center gap-2 whitespace-nowrap rounded-full border-2 px-6 py-2.5 font-body text-sm font-semibold tracking-wide transition-colors disabled:cursor-not-allowed disabled:opacity-50 border-transparent bg-brand-900 text-white hover:bg-brand-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-700 w-full max-w-[280px] min-[481px]:w-auto">View My Orders</Link>
          <Link to="/products"  className="inline-flex min-h-11 items-center justify-center gap-2 whitespace-nowrap rounded-full border-2 px-6 py-2.5 font-body text-sm font-semibold tracking-wide transition-colors disabled:cursor-not-allowed disabled:opacity-50 border-brand-300 bg-white text-brand-900 hover:border-brand-900 hover:bg-cream-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-700 w-full max-w-[280px] min-[481px]:w-auto">Continue Shopping</Link>
        </div>
      </div>
    </>
  );
};
export default Success;
