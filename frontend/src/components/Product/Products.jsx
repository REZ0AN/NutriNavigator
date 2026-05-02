import React, { useEffect, useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import { useParams } from "react-router-dom";
import { toast } from "react-toastify";
import Slider from "@mui/material/Slider";
import MetaData from "../layouts/Header/MetaData";
import Loader from "../layouts/Loader/Loader";
import ProductCard from "../Home/ProductCard";
import { getProducts, clearProductsError } from "../../store/slices/productSlice";
import { toastifyOptions } from "../../utils/toastify";
import "./Products.css";

const useDebounce = (value, delay = 500) => {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
};

const Products = () => {
  const dispatch = useDispatch();
  const { keyword } = useParams();
  const { loading, error, products, productsCount, resultPerPage, filteredProductsCount, uniqueCategories } =
    useSelector((s) => s.productsR);

  const [currentPage, setCurrentPage] = useState(1);
  const [category, setCategory] = useState("");
  const [price, setPrice] = useState([0, 4000]);
  const [ratings, setRatings] = useState(0);

  const debouncedPrice = useDebounce(price, 1000);
  const debouncedRatings = useDebounce(ratings, 1000);

  useEffect(() => {
    if (error) {
      toast.error(error, { ...toastifyOptions });
      dispatch(clearProductsError());
    }
  }, [error, dispatch]);

  useEffect(() => {
    dispatch(getProducts({ keyword: keyword || "", page: currentPage, price: debouncedPrice, category, ratings: debouncedRatings }));
  }, [dispatch, keyword, currentPage, debouncedPrice, category, debouncedRatings]);

  const totalPages = Math.ceil((category || ratings ? filteredProductsCount : productsCount) / resultPerPage);

  if (loading) return <Loader />;

  return (
    <>
      <MetaData title="Products" />
      <div className="products-page">
        {/* ── Filters ── */}
        <aside className="products-filters">
          <h3 className="filters-heading">Filters</h3>

          <div className="filter-group">
            <label className="filter-label">Price Range (৳)</label>
            <div className="filter-price-labels">
              <span>৳{price[0]}</span><span>৳{price[1]}</span>
            </div>
            <Slider
              value={price} onChange={(_, v) => { setPrice(v); setCurrentPage(1); }}
              valueLabelDisplay="auto" step={50} min={0} max={4000}
              sx={{ color: "var(--color-accent)" }}
            />
          </div>

          <div className="filter-group">
            <label className="filter-label">Category</label>
            <button
              className={`filter-category-item ${category === "" ? "filter-category-item--active" : ""}`}
              onClick={() => { setCategory(""); setCurrentPage(1); }}
            >All</button>
            {uniqueCategories?.map((cat) => (
              <button
                key={cat}
                className={`filter-category-item ${category === cat ? "filter-category-item--active" : ""}`}
                onClick={() => { setCategory(cat); setCurrentPage(1); }}
              >{cat}</button>
            ))}
          </div>

          <div className="filter-group">
            <label className="filter-label">Min Rating ({ratings}★)</label>
            <Slider
              value={ratings} onChange={(_, v) => { setRatings(v); setCurrentPage(1); }}
              valueLabelDisplay="auto" step={0.5} min={0} max={5}
              sx={{ color: "var(--color-accent)" }}
            />
          </div>
        </aside>

        {/* ── Products ── */}
        <main className="products-main">
          <div className="products-header">
            <h2 className="products-title">Products</h2>
            <p className="products-count">{filteredProductsCount || productsCount} results</p>
          </div>

          {products?.length > 0 ? (
            <div className="products-grid">
              {products.map((p) => <ProductCard key={p._id} product={p} />)}
            </div>
          ) : (
            <div className="products-empty">
              <p>No products found. Try adjusting your filters.</p>
            </div>
          )}

          {totalPages > 1 && (
            <div className="pagination">
              <button className="pagination-btn" disabled={currentPage === 1} onClick={() => setCurrentPage(1)}>«</button>
              <button className="pagination-btn" disabled={currentPage === 1} onClick={() => setCurrentPage((p) => p - 1)}>‹</button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
                <button
                  key={n}
                  className={`pagination-btn ${currentPage === n ? "pagination-btn--active" : ""}`}
                  onClick={() => setCurrentPage(n)}
                >{n}</button>
              ))}
              <button className="pagination-btn" disabled={currentPage === totalPages} onClick={() => setCurrentPage((p) => p + 1)}>›</button>
              <button className="pagination-btn" disabled={currentPage === totalPages} onClick={() => setCurrentPage(totalPages)}>»</button>
            </div>
          )}
        </main>
      </div>
    </>
  );
};

export default Products;