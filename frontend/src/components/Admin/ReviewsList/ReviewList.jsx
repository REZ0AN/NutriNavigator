import React, { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import Rating from "@mui/material/Rating";
import { MdDelete, MdSearch, MdClose, MdChevronRight } from "react-icons/md";
import MetaData from "../../layouts/Header/MetaData";
import Loader from "../../layouts/Loader/Loader";
import AdminLayout from "../AdminLayout";
import { toastifyOptions } from "../../../utils/toastify";
import "./ReviewList.css";

const PAGE_SIZE = 25;

const ReviewList = () => {
  const [reviews, setReviews] = useState([]);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [rating, setRating] = useState("");
  const [sort, setSort] = useState("newest");
  const [nextCursor, setNextCursor] = useState(null);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [selectedReview, setSelectedReview] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  const loadReviews = useCallback(async ({ append = false, pageCursor = "" } = {}) => {
    append ? setLoadingMore(true) : setLoading(true);
    setError("");
    try {
      const { data } = await axios.get("/api/v1/admin/reviews", {
        params: { limit: PAGE_SIZE, cursor: pageCursor || undefined, search: search || undefined, rating: rating || undefined, sort },
      });
      setReviews((current) => append ? [...current, ...(data.reviews || [])] : (data.reviews || []));
      setNextCursor(data.nextCursor);
      setHasNextPage(Boolean(data.hasNextPage));
    } catch (requestError) {
      const message = requestError.response?.data?.message || "Unable to load reviews.";
      setError(message);
      toast.error(message, toastifyOptions);
    } finally {
      append ? setLoadingMore(false) : setLoading(false);
    }
  }, [rating, search, sort]);

  useEffect(() => { loadReviews(); }, [loadReviews]);

  const averageRating = useMemo(() => reviews.length ? reviews.reduce((total, review) => total + review.rating, 0) / reviews.length : 0, [reviews]);

  const submitSearch = (event) => {
    event.preventDefault();
    setSearch(searchInput.trim());
  };

  const clearFilters = () => {
    setSearchInput("");
    setSearch("");
    setRating("");
    setSort("newest");
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await axios.delete(`/api/v1/reviews?id=${deleteTarget.reviewId}&productId=${deleteTarget.productId}`);
      setReviews((current) => current.filter((review) => review.reviewId !== deleteTarget.reviewId));
      if (selectedReview?.reviewId === deleteTarget.reviewId) setSelectedReview(null);
      setDeleteTarget(null);
      toast.success("Review deleted and product rating recalculated.", toastifyOptions);
    } catch (requestError) {
      toast.error(requestError.response?.data?.message || "Unable to delete review.", toastifyOptions);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <AdminLayout>
      <MetaData title="Reviews — Admin" />
      <div className="reviews-page-heading">
        <div><h1 className="admin-page-title">Reviews</h1><p>Moderate customer feedback and monitor product sentiment.</p></div>
        <div className="reviews-summary"><strong>{reviews.length}{hasNextPage ? "+" : ""}</strong><span>loaded</span><Rating value={averageRating} precision={0.1} readOnly size="small" /></div>
      </div>

      <section className="reviews-toolbar" aria-label="Review filters">
        <form onSubmit={submitSearch} className="reviews-search">
          <div className="admin-input-wrap"><MdSearch /><input value={searchInput} onChange={(event) => setSearchInput(event.target.value)} placeholder="Search product, reviewer, or comment" aria-label="Search reviews" /><button type="submit">Search</button></div>
        </form>
        <label>Rating<select value={rating} onChange={(event) => setRating(event.target.value)}><option value="">All ratings</option>{[5, 4, 3, 2, 1].map((value) => <option key={value} value={value}>{value} stars</option>)}</select></label>
        <label>Sort<select value={sort} onChange={(event) => setSort(event.target.value)}><option value="newest">Newest</option><option value="oldest">Oldest</option><option value="highest">Highest rated</option><option value="lowest">Lowest rated</option></select></label>
        {(search || rating) && <button type="button" className="reviews-clear-button" onClick={clearFilters}>Clear filters</button>}
      </section>

      {loading ? <Loader /> : error ? <div className="reviews-empty"><strong>Could not load reviews</strong><p>{error}</p><button className="btn btn--primary" onClick={() => loadReviews()}>Try again</button></div> : reviews.length === 0 ? <div className="reviews-empty"><strong>No reviews found</strong><p>Try changing your search or filters.</p></div> : (
        <section className="reviews-grid" aria-label="Customer reviews">
          {reviews.map((review) => <article key={review.reviewId} className="review-admin-card" onClick={() => setSelectedReview(review)}>
            <div className="review-admin-card__product">
              {review.productImage ? <img src={review.productImage} alt="" /> : <div className="review-admin-card__image-placeholder">NN</div>}
              <div><strong>{review.productName}</strong><small>{new Date(review.createdAt).toLocaleDateString()}</small></div>
              <MdChevronRight className="review-admin-card__chevron" />
            </div>
            <div className="review-admin-card__body"><div className="review-admin-card__user"><span>{review.userName?.charAt(0).toUpperCase()}</span><strong>{review.userName}</strong></div><Rating value={review.rating} precision={0.5} readOnly size="small" /><p>{review.comment}</p></div>
            <button type="button" className="admin-action-btn admin-action-btn--delete" aria-label={`Delete review by ${review.userName}`} onClick={(event) => { event.stopPropagation(); setDeleteTarget(review); }}><MdDelete /></button>
          </article>)}
        </section>
      )}

      {!loading && hasNextPage && <div className="reviews-load-more"><button className="btn btn--secondary" disabled={loadingMore} onClick={() => loadReviews({ append: true, pageCursor: nextCursor })}>{loadingMore ? "Loading…" : "Load more reviews"}</button></div>}

      {selectedReview && <div className="review-modal-backdrop" role="presentation" onClick={() => setSelectedReview(null)}><div className="review-modal" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}><button className="review-modal__close" onClick={() => setSelectedReview(null)} aria-label="Close review"><MdClose /></button><h2>{selectedReview.productName}</h2><p className="review-modal__meta">Reviewed by {selectedReview.userName} on {new Date(selectedReview.createdAt).toLocaleString()}</p><Rating value={selectedReview.rating} precision={0.5} readOnly /><p className="review-modal__comment">{selectedReview.comment}</p><button className="btn btn--primary review-modal__delete" onClick={() => { setDeleteTarget(selectedReview); setSelectedReview(null); }}><MdDelete /> Delete review</button></div></div>}

      {deleteTarget && <div className="review-modal-backdrop" role="presentation"><div className="review-modal review-confirm-modal" role="dialog" aria-modal="true"><h2>Delete this review?</h2><p>This will remove the review by <strong>{deleteTarget.userName}</strong> and recalculate <strong>{deleteTarget.productName}</strong>’s rating.</p><div className="review-modal__actions"><button className="btn btn--secondary" onClick={() => setDeleteTarget(null)} disabled={deleting}>Cancel</button><button className="btn btn--danger" onClick={confirmDelete} disabled={deleting}>{deleting ? "Deleting…" : "Delete review"}</button></div></div></div>}
    </AdminLayout>
  );
};

export default ReviewList;
