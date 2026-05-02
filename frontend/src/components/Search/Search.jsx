import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { MdSearch } from "react-icons/md";
import MetaData from "../layouts/Header/MetaData";
import "./Search.css";

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
      <div className="search-page">
        <form className="search-form" onSubmit={handleSearch}>
          <h2>What are you looking for?</h2>
          <div className="search-input-wrap">
            <MdSearch className="search-icon" />
            <input
              type="text" placeholder="Search products..."
              value={keyword} onChange={(e) => setKeyword(e.target.value)}
              autoFocus
            />
            <button type="submit" className="btn btn--primary">Search</button>
          </div>
        </form>
      </div>
    </>
  );
};
export default Search;
