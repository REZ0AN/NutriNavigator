import React from "react";

const base = "inline-flex min-h-11 items-center justify-center gap-2 rounded-full px-6 py-3 font-body text-sm font-semibold transition-colors duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-700 disabled:cursor-not-allowed disabled:opacity-50";

const variants = {
  primary: "bg-brand-700 text-white hover:bg-brand-900",
  secondary: "border border-brand-300 bg-cream-50 text-brand-900 hover:bg-brand-50",
  light: "bg-cream-50 text-brand-900 hover:bg-cream-100",
  "outline-light": "border border-white/70 bg-transparent text-white hover:bg-white/10",
  danger: "bg-red-700 text-white hover:bg-red-800",
};

export const buttonClasses = (variant = "primary", className = "") =>
  `${base} ${variants[variant] || variants.primary} ${className}`.trim();

const Button = ({ as: Component = "button", variant = "primary", className = "", children, ...props }) => (
  <Component className={buttonClasses(variant, className)} {...props}>
    {children}
  </Component>
);

export default Button;
