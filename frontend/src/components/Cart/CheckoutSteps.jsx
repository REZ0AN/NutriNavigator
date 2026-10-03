import React from "react";
import { MdLocalShipping, MdLibraryAddCheck, MdAccountBalance } from "react-icons/md";

const steps = [
  { label: "Shipping",        icon: MdLocalShipping },
  { label: "Confirm Order",   icon: MdLibraryAddCheck },
  { label: "Payment",         icon: MdAccountBalance },
];

const CheckoutSteps = ({ activeStep }) => (
  <div className="mx-auto flex max-w-[560px] items-center justify-center px-4 pb-4 pt-6 font-body">
    {steps.map(({ label, icon: Icon }, i) => (
      <React.Fragment key={label}>
        <div className="flex flex-col items-center gap-2">
          <div className={`flex h-[42px] w-[42px] items-center justify-center rounded-full border-2 text-lg transition-colors ${i === activeStep ? "border-brand-900 bg-brand-900 text-white" : i < activeStep ? "border-brand-300 bg-brand-50 text-brand-700" : "border-brand-100 bg-white text-admin-muted"}`}><Icon aria-hidden="true" /></div>
          <span className={`whitespace-nowrap text-xs font-medium ${i <= activeStep ? "text-brand-900" : "text-admin-muted"}`}>{label}</span>
        </div>
        {i < steps.length - 1 && <div aria-hidden="true" className={`mx-3 mb-5 h-0.5 flex-1 rounded-sm transition-colors ${i < activeStep ? "bg-brand-300" : "bg-admin-border"}`} />}
      </React.Fragment>
    ))}
  </div>
);

export default CheckoutSteps;
