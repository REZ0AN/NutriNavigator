import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import { toast } from "react-toastify";
import Rating from "@mui/material/Rating";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import MetaData from "../layouts/Header/MetaData";
import Loader from "../layouts/Loader/Loader";
import ReviewCard from "./ReviewCard";
import { getProductDetails, getProductReviews, submitReview, clearProductDetailError, resetProductOps } from "../../store/slices/productSlice";
import { addItemsToCart } from "../../store/slices/cartSlice";
import { toastifyOptions } from "../../utils/toastify";

const quantityButtonClass = "flex h-9 w-9 items-center justify-center rounded-lg border border-brand-300 bg-white text-lg text-earth-600 hover:border-brand-900 hover:text-brand-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-700";

const ProductDetails = () => {
  const dispatch = useDispatch();
  const { id } = useParams();
  const { loading, product, error } = useSelector((s) => s.productR);
  const { reviewSuccess, reviews } = useSelector((s) => s.productOpsR);

  const [imgIdx, setImgIdx] = useState(0);
  const [qty, setQty] = useState(1);
  const [open, setOpen] = useState(false);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");

  useEffect(() => {
    if (error) { toast.error(error, { ...toastifyOptions }); dispatch(clearProductDetailError()); }
    if (reviewSuccess) { toast.success("Review submitted!", { ...toastifyOptions }); dispatch(getProductReviews(id)); dispatch(resetProductOps()); }
  }, [error, reviewSuccess, dispatch, id]);

  useEffect(() => {
    if (product?._id !== id) {
      dispatch(getProductDetails(id));
    }
    dispatch(getProductReviews(id));
  }, [dispatch, id, product?._id]);

  const handleAddToCart = () => {
    dispatch(addItemsToCart({ id, quantity: qty }));
    toast.success(`${product.name} added to cart`, { ...toastifyOptions });
  };

  const handleReviewSubmit = () => {
    dispatch(submitReview({ rating, comment, productId: id }));
    setOpen(false); setRating(0); setComment("");
  };

  if (loading || !product._id) return <Loader />;

  return (
    <>
      <MetaData title={product.name} />
      <div className="mx-auto grid max-w-content items-start gap-6 px-4 py-6 sm:px-6 sm:py-10 md:grid-cols-2 md:gap-12">
        {/* ── Left: gallery ── */}
        <div>
          <div className="group flex aspect-square items-center justify-center overflow-hidden rounded-card border border-admin-border bg-cream-50">
            <img src={product.images?.[imgIdx]?.url} alt={product.name} className="h-full w-full object-contain transition-transform duration-300 group-hover:scale-[1.04]" />
          </div>
          {product.images?.length > 1 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {product.images.map((img, i) => (
                <button key={i} type="button" onClick={() => setImgIdx(i)} aria-label={`View image ${i + 1}`} aria-pressed={i === imgIdx} className={`h-16 w-16 overflow-hidden rounded-lg border-2 bg-cream-50 p-1 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-700 ${i === imgIdx ? "border-brand-500" : "border-admin-border hover:border-brand-300"}`}>
                  <img src={img.url} alt="" className="h-full w-full object-contain" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* ── Right: details ── */}
        <div className="flex flex-col gap-5 pt-2">
          <p className="font-mono text-xs text-admin-muted">#{product._id}</p>
          <h1 className="font-display text-3xl leading-tight text-brand-900">{product.name}</h1>

          <div className="flex items-center gap-3">
          <Rating value={product.rating || 0} precision={0.5} readOnly size="small" />
            <span className="font-body text-sm text-earth-600">({product.reviewscount} reviews)</span>
          </div>

          <p className="font-body text-3xl font-bold text-brand-900">৳{product.price?.toLocaleString()}</p>

          <div className="font-body text-sm text-earth-600">
            Status:{" "}
            <strong className={product.stock < 1 ? "font-semibold text-red-700" : "font-semibold text-green-700"}>
              {product.stock < 1 ? "Out of Stock" : `${product.stock} in stock`}
            </strong>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button type="button" aria-label="Decrease quantity" className={quantityButtonClass} onClick={() => setQty((q) => Math.max(1, q - 1))}>−</button>
            <span className="min-w-7 text-center font-body font-semibold text-earth-900">{qty}</span>
            <button type="button" aria-label="Increase quantity" className={quantityButtonClass} onClick={() => setQty((q) => Math.min(product.stock, q + 1))}>+</button>
            <button className="inline-flex min-h-11 items-center justify-center gap-2 whitespace-nowrap rounded-full border-2 px-6 py-2.5 font-body text-sm font-semibold tracking-wide transition-colors disabled:cursor-not-allowed disabled:opacity-50 border-transparent bg-brand-900 text-white hover:bg-brand-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-700 flex-1 px-6 py-3 md:max-w-[220px]" onClick={handleAddToCart} disabled={product.stock < 1}>
              Add to Cart
            </button>
          </div>

          <div>
            <h3 className="mb-2 font-body text-xs font-bold uppercase tracking-widest text-admin-muted">Description</h3>
            <p className="font-body text-sm leading-relaxed text-earth-600">{product.description}</p>
          </div>

          <button className="inline-flex min-h-11 items-center justify-center gap-2 whitespace-nowrap rounded-full border-2 px-6 py-2.5 font-body text-sm font-semibold tracking-wide transition-colors disabled:cursor-not-allowed disabled:opacity-50 border-brand-300 bg-white text-brand-900 hover:border-brand-900 hover:bg-cream-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-700" onClick={() => setOpen(true)}>Write a Review</button>
        </div>
      </div>

      {/* ── Reviews ── */}
      <div className="mx-auto max-w-content border-t border-admin-border px-4 pb-16 pt-10 sm:px-6">
        <h2 className="mb-8 font-display text-2xl text-brand-900">Customer Reviews</h2>
        {reviews?.length > 0 ? (
          <div className="grid grid-cols-1 gap-5 min-[481px]:grid-cols-[repeat(auto-fill,minmax(268px,1fr))]">
            {reviews.map((r, i) => <ReviewCard key={r._id || i} review={r} />)}
          </div>
        ) : (
          <p className="font-body text-earth-600">No reviews yet. Be the first!</p>
        )}
      </div>

      {/* ── Review dialog ── */}
      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Submit Your Review</DialogTitle>
        <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 2 }}>
          <Rating value={rating} onChange={(_, v) => setRating(v)} size="large" />
          <textarea
            rows={4} placeholder="Share your experience..."
            value={comment} onChange={(e) => setComment(e.target.value)}
            className="resize-y rounded-lg border border-brand-300 p-3 font-body text-sm text-earth-900 focus:border-brand-700 focus:outline-none"
          />
        </DialogContent>
        <DialogActions sx={{ padding: "16px 24px", gap: 1 }}>
          <button className="inline-flex min-h-11 items-center justify-center gap-2 whitespace-nowrap rounded-full border-2 px-6 py-2.5 font-body text-sm font-semibold tracking-wide transition-colors disabled:cursor-not-allowed disabled:opacity-50 border-brand-300 bg-white text-brand-900 hover:border-brand-900 hover:bg-cream-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-700" onClick={() => setOpen(false)}>Cancel</button>
          <button className="inline-flex min-h-11 items-center justify-center gap-2 whitespace-nowrap rounded-full border-2 px-6 py-2.5 font-body text-sm font-semibold tracking-wide transition-colors disabled:cursor-not-allowed disabled:opacity-50 border-transparent bg-brand-900 text-white hover:bg-brand-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-700" onClick={handleReviewSubmit} disabled={!rating}>Submit</button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default ProductDetails;
