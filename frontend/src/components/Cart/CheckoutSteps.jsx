import React from "react";
import { MdLocalShipping, MdLibraryAddCheck, MdAccountBalance } from "react-icons/md";
import "./CheckoutSteps.css";

const steps = [
  { label: "Shipping",        icon: MdLocalShipping },
  { label: "Confirm Order",   icon: MdLibraryAddCheck },
  { label: "Payment",         icon: MdAccountBalance },
];

const CheckoutSteps = ({ activeStep }) => (
  <div className="checkout-steps">
    {steps.map(({ label, icon: Icon }, i) => (
      <React.Fragment key={label}>
        <div className={`checkout-step ${i <= activeStep ? "checkout-step--done" : ""} ${i === activeStep ? "checkout-step--active" : ""}`}>
          <div className="checkout-step__circle"><Icon /></div>
          <span className="checkout-step__label">{label}</span>
        </div>
        {i < steps.length - 1 && <div className={`checkout-step-line ${i < activeStep ? "checkout-step-line--done" : ""}`} />}
      </React.Fragment>
    ))}
  </div>
);

export default CheckoutSteps;
