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

const categoryButtonClass = "mb-0.5 flex w-full items-center rounded-lg px-3 py-2 text-left font-body text-sm transition-colors hover:bg-cream-50 hover:text-brand-900";
const pageButtonClass = "h-10 min-w-10 rounded-lg border border-brand-300 bg-white px-3 font-body text-sm text-earth-600 hover:border-brand-900 hover:bg-brand-900 hover:text-white disabled:cursor-not-allowed disabled:opacity-35";

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
      <div className="mx-auto grid min-h-[calc(100vh-68px)] max-w-content gap-5 px-4 py-5 sm:px-6 sm:py-8 min-[901px]:grid-cols-[256px_minmax(0,1fr)] min-[901px]:gap-8">
        {/* ── Filters ── */}
        <aside className="grid h-fit gap-4 rounded-card border border-admin-border bg-white p-6 shadow-sm max-[380px]:grid-cols-1 min-[381px]:grid-cols-2 min-[601px]:grid-cols-3 min-[901px]:sticky min-[901px]:top-[84px] min-[901px]:grid-cols-1">
          <h3 className="mb-2 hidden font-body text-xs font-bold uppercase tracking-widest text-admin-muted min-[901px]:block">Filters</h3>

          <div className="border-b border-admin-border pb-5">
            <label className="mb-3 block font-body text-sm font-semibold text-earth-600">Price Range (৳)</label>
            <div className="mb-2 flex justify-between font-body text-xs text-admin-muted">
              <span>৳{price[0]}</span><span>৳{price[1]}</span>
            </div>
            <Slider
              value={price} onChange={(_, v) => { setPrice(v); setCurrentPage(1); }}
              valueLabelDisplay="auto" step={50} min={0} max={4000}
              sx={{ color: "#52785A" }}
            />
          </div>

          <div className="border-b border-admin-border pb-5">
            <p className="mb-3 font-body text-sm font-semibold text-earth-600">Category</p>
            <button
              className={`${categoryButtonClass} ${category === "" ? "bg-brand-50 font-semibold text-brand-900" : "text-earth-600"}`}
              onClick={() => { setCategory(""); setCurrentPage(1); }}
            >All</button>
            {uniqueCategories?.map((cat) => (
              <button
                key={cat}
                className={`${categoryButtonClass} ${category === cat ? "bg-brand-50 font-semibold text-brand-900" : "text-earth-600"}`}
                onClick={() => { setCategory(cat); setCurrentPage(1); }}
              >{cat}</button>
            ))}
          </div>

          <div>
            <label className="mb-3 block font-body text-sm font-semibold text-earth-600">Min Rating ({ratings}★)</label>
            <Slider
              value={ratings} onChange={(_, v) => { setRatings(v); setCurrentPage(1); }}
              valueLabelDisplay="auto" step={0.5} min={0} max={5}
              sx={{ color: "#52785A" }}
            />
          </div>
        </aside>

        {/* ── Products ── */}
        <main className="flex min-w-0 flex-col gap-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-display text-3xl text-brand-900">Products</h2>
            <p className="font-body text-sm text-earth-600">{filteredProductsCount || productsCount} results</p>
          </div>

          {products?.length > 0 ? (
            <div className="grid grid-cols-2 gap-3 min-[601px]:grid-cols-[repeat(auto-fill,minmax(220px,1fr))] min-[601px]:gap-5">
              {products.map((p) => <ProductCard key={p._id} product={p} />)}
            </div>
          ) : (
            <div className="px-4 py-20 text-center font-body text-earth-600">
              <p>No products found. Try adjusting your filters.</p>
            </div>
          )}

          {totalPages > 1 && (
            <div className="mt-8 flex flex-wrap justify-center gap-1 border-t border-admin-border pt-6">
              <button className={pageButtonClass} disabled={currentPage === 1} onClick={() => setCurrentPage(1)}>«</button>
              <button className={pageButtonClass} disabled={currentPage === 1} onClick={() => setCurrentPage((p) => p - 1)}>‹</button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
                <button
                  key={n}
                  className={`${pageButtonClass} ${currentPage === n ? "border-brand-900 bg-brand-900 font-semibold text-white" : ""}`}
                  onClick={() => setCurrentPage(n)}
                >{n}</button>
              ))}
              <button className={pageButtonClass} disabled={currentPage === totalPages} onClick={() => setCurrentPage((p) => p + 1)}>›</button>
              <button className={pageButtonClass} disabled={currentPage === totalPages} onClick={() => setCurrentPage(totalPages)}>»</button>
            </div>
          )}
        </main>
      </div>
    </>
  );
};

export default Products;
