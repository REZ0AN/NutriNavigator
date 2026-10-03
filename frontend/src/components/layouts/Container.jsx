import React from "react";

const Container = ({ as: Component = "div", className = "", children, ...props }) => (
  <Component className={`mx-auto w-full max-w-content px-4 sm:px-6 lg:px-8 ${className}`.trim()} {...props}>
    {children}
  </Component>
);

export default Container;
