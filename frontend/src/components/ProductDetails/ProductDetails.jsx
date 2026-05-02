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
import { getProductDetails, submitReview, clearProductDetailError, resetProductOps } from "../../store/slices/productSlice";
import { addItemsToCart } from "../../store/slices/cartSlice";
import { toastifyOptions } from "../../utils/toastify";
import "./ProductDetails.css";

const ProductDetails = () => {
  const dispatch = useDispatch();
  const { id } = useParams();
  const { loading, product, error } = useSelector((s) => s.productR);
  const { reviewSuccess } = useSelector((s) => s.productOpsR);

  const [imgIdx, setImgIdx] = useState(0);
  const [qty, setQty] = useState(1);
  const [open, setOpen] = useState(false);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");

  useEffect(() => {
    if (error) { toast.error(error, { ...toastifyOptions }); dispatch(clearProductDetailError()); }
    if (reviewSuccess) { toast.success("Review submitted!", { ...toastifyOptions }); dispatch(resetProductOps()); }
  }, [error, reviewSuccess, dispatch]);

  useEffect(() => {
    if (product?._id !== id) {
      dispatch(getProductDetails(id));
    }
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
      <div className="pd-page">
        {/* ── Left: gallery ── */}
        <div className="pd-gallery">
          <div className="pd-gallery__main">
            <img src={product.images?.[imgIdx]?.url} alt={product.name} />
          </div>
          {product.images?.length > 1 && (
            <div className="pd-gallery__thumbs">
              {product.images.map((img, i) => (
                <img
                  key={i} src={img.url} alt={`thumb-${i}`}
                  className={`pd-gallery__thumb ${i === imgIdx ? "pd-gallery__thumb--active" : ""}`}
                  onClick={() => setImgIdx(i)}
                />
              ))}
            </div>
          )}
        </div>

        {/* ── Right: details ── */}
        <div className="pd-info">
          <p className="pd-id">#{product._id}</p>
          <h1 className="pd-name">{product.name}</h1>

          <div className="pd-rating-row">
          <Rating value={product.rating || 0} precision={0.5} readOnly size="small" />
            <span className="pd-review-count">({product.reviewscount} reviews)</span>
          </div>

          <p className="pd-price">৳{product.price?.toLocaleString()}</p>

          <div className="pd-stock">
            Status:{" "}
            <strong className={product.stock < 1 ? "redColor" : "greenColor"}>
              {product.stock < 1 ? "Out of Stock" : `${product.stock} in stock`}
            </strong>
          </div>

          <div className="pd-qty-row">
            <button className="pd-qty-btn" onClick={() => setQty((q) => Math.max(1, q - 1))}>−</button>
            <span className="pd-qty-val">{qty}</span>
            <button className="pd-qty-btn" onClick={() => setQty((q) => Math.min(product.stock, q + 1))}>+</button>
            <button className="btn btn--primary pd-cart-btn" onClick={handleAddToCart} disabled={product.stock < 1}>
              Add to Cart
            </button>
          </div>

          <div className="pd-description">
            <h3>Description</h3>
            <p>{product.description}</p>
          </div>

          <button className="btn btn--secondary" onClick={() => setOpen(true)}>Write a Review</button>
        </div>
      </div>

      {/* ── Reviews ── */}
      <div className="pd-reviews-section">
        <h2 className="pd-reviews-heading">Customer Reviews</h2>
        {product.reviews?.length > 0 ? (
          <div className="pd-reviews-grid">
            {product.reviews.map((r, i) => <ReviewCard key={i} review={r} />)}
          </div>
        ) : (
          <p className="pd-no-reviews">No reviews yet. Be the first!</p>
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
            style={{ resize: "vertical", padding: "12px", borderRadius: "8px", border: "1.5px solid var(--color-border)", fontFamily: "var(--font-body)", fontSize: "var(--text-sm)", outline: "none" }}
          />
        </DialogContent>
        <DialogActions sx={{ padding: "16px 24px", gap: 1 }}>
          <button className="btn btn--secondary" onClick={() => setOpen(false)}>Cancel</button>
          <button className="btn btn--primary" onClick={handleReviewSubmit} disabled={!rating}>Submit</button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default ProductDetails;
