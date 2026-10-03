import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { MdSearch } from "react-icons/md";
import MetaData from "../layouts/Header/MetaData";

const Search = () => {
  const navigate = useNavigate();
  const [keyword, setKeyword] = useState("");

  const handleSearch = (e) => {
    e.preventDefault();
    navigate(keyword.trim() ? `/products/${keyword.trim()}` : "/products");
  };

  return (
    <>
      <MetaData title="Search" />
      <div className="relative flex min-h-[calc(100vh-68px)] items-center justify-center overflow-hidden bg-cream-100 px-4 py-8">
        <img src="/searchA.png" alt="" className="absolute inset-0 h-full w-full object-cover" />
        <div aria-hidden="true" className="absolute inset-0 bg-cream-50/60" />
        <form className="relative z-10 flex w-full max-w-[580px] flex-col items-center gap-6 text-center" onSubmit={handleSearch}>
          <h2 className="font-display text-3xl text-brand-900 sm:text-4xl">What are you looking for?</h2>
          <div className="flex w-full flex-col items-center gap-3 rounded-card border border-brand-300 bg-white p-4 shadow-lg focus-within:border-brand-700 min-[481px]:flex-row min-[481px]:rounded-full min-[481px]:py-2 min-[481px]:pl-4 min-[481px]:pr-2">
            <MdSearch aria-hidden="true" className="shrink-0 text-xl text-admin-muted" />
            <input
              type="text" placeholder="Search products..." aria-label="Search products"
              value={keyword} onChange={(e) => setKeyword(e.target.value)}
              autoFocus className="min-w-0 flex-1 border-0 bg-transparent font-body text-base text-earth-900 outline-none placeholder:text-admin-muted max-[480px]:w-full"
            />
            <button type="submit" className="inline-flex min-h-11 items-center justify-center gap-2 whitespace-nowrap rounded-full border-2 px-6 py-2.5 font-body text-sm font-semibold tracking-wide transition-colors disabled:cursor-not-allowed disabled:opacity-50 border-transparent bg-brand-900 text-white hover:bg-brand-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-700 w-full min-[481px]:w-auto">Search</button>
          </div>
        </form>
      </div>
    </>
  );
};
export default Search;
