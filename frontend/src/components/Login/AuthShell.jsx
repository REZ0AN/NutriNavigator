import React from "react";

export const AuthShell = ({ children }) => (
  <div className="relative flex min-h-[calc(100vh-68px)] items-center justify-center overflow-hidden bg-brand-900 px-4 py-8">
    <img src="/loginsignupbg.jpg" alt="" className="absolute inset-0 h-full w-full object-cover" />
    <div aria-hidden="true" className="absolute inset-0 bg-brand-900/55" />
    <div className="relative z-10 w-full max-w-[420px] overflow-hidden rounded-card bg-cream-50 shadow-xl">{children}</div>
  </div>
);

export const AuthHeader = ({ title, children }) => (
  <div className="px-6 pt-8 text-center sm:px-8">
    <h2 className="font-display text-2xl text-brand-900">{title}</h2>
    {children && <p className="mt-2 font-body text-sm text-earth-600">{children}</p>}
  </div>
);

export const AuthField = ({ label, icon: Icon, children }) => (
  <label className="flex items-center gap-3 rounded-lg border border-brand-300 bg-cream-100 px-4 py-3 transition-colors focus-within:border-brand-700 focus-within:bg-white focus-within:ring-2 focus-within:ring-brand-100">
    <Icon aria-hidden="true" className="shrink-0 text-lg text-earth-600" />
    <span className="sr-only">{label}</span>
    {children}
  </label>
);

export const authInputClass = "min-w-0 flex-1 border-0 bg-transparent font-body text-sm text-earth-900 outline-none placeholder:text-earth-400";
export const authFormClass = "flex flex-col gap-4 p-6 sm:p-8";
export const authSubmitClass = "inline-flex min-h-11 items-center justify-center gap-2 whitespace-nowrap rounded-full border-2 px-6 py-2.5 font-body text-sm font-semibold tracking-wide transition-colors disabled:cursor-not-allowed disabled:opacity-50 border-transparent bg-brand-900 text-white hover:bg-brand-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-700 mt-1 w-full py-4 text-sm";
