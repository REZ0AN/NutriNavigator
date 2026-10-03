import React from "react";
const Loader = () => (
  <div className="fixed inset-0 z-[9999] grid place-items-center bg-cream-100" role="status" aria-label="Loading">
    <div className="h-14 w-14 animate-spin rounded-full border-[3px] border-brand-100 border-t-brand-500 motion-reduce:animate-none" />
  </div>
);

export default Loader;
