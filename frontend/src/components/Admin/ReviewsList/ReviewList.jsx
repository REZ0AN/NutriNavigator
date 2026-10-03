import React, { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import Rating from "@mui/material/Rating";
import { MdDelete, MdSearch } from "react-icons/md";
import MetaData from "../../layouts/Header/MetaData";
import Loader from "../../layouts/Loader/Loader";
import AdminLayout from "../AdminLayout";
import { toastifyOptions } from "../../../utils/toastify";

const filterLabelClass = "flex min-w-[130px] flex-1 flex-col gap-1 font-body text-xs font-semibold text-admin-muted [&_select]:min-h-[42px] [&_select]:rounded-lg [&_select]:border [&_select]:border-brand-300 [&_select]:bg-admin-canvas [&_select]:px-3 [&_select]:text-earth-900";
const emptyClass = "rounded-card border border-admin-border bg-white p-12 text-center font-body text-admin-muted [&_strong]:mb-2 [&_strong]:block [&_strong]:text-lg [&_strong]:text-brand-900";

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
      <div className="mb-6 flex flex-col items-start justify-between gap-5 min-[651px]:flex-row">
        <div><h1 className="mb-2 font-body text-2xl font-bold text-brand-900">Reviews</h1><p className="font-body text-sm text-admin-muted">Moderate customer feedback and monitor product sentiment.</p></div>
        <div className="mb-2 flex items-center gap-2 whitespace-nowrap rounded-card border border-admin-border bg-white px-4 py-3 font-body text-xs text-admin-muted min-[651px]:mb-0"><strong className="text-xl leading-none text-brand-900">{reviews.length}{hasNextPage ? "+" : ""}</strong><span>loaded</span><Rating value={averageRating} precision={0.1} readOnly size="small" /></div>
      </div>

      <section className="mb-5 flex flex-wrap items-end gap-3 rounded-card border border-admin-border bg-white p-4 shadow-sm max-[650px]:items-stretch" aria-label="Review filters">
        <form onSubmit={submitSearch} className="min-w-0 flex-[1_1_360px] max-[650px]:basis-full">
          <div className="flex min-h-[42px] items-center overflow-hidden rounded-lg border border-brand-300 bg-admin-canvas pl-3 focus-within:border-brand-700 [&_svg]:shrink-0 [&_svg]:text-lg [&_svg]:text-admin-muted"><MdSearch /><input className="min-w-0 flex-1 bg-transparent px-3 font-body text-sm text-earth-900 outline-none" value={searchInput} onChange={(event) => setSearchInput(event.target.value)} placeholder="Search product, reviewer, or comment" aria-label="Search reviews" /><button type="submit" className="self-stretch bg-brand-900 px-5 font-body text-sm font-semibold text-white hover:bg-brand-700">Search</button></div>
        </form>
        <label className={filterLabelClass}>Rating<select value={rating} onChange={(event) => setRating(event.target.value)}><option value="">All ratings</option>{[5, 4, 3, 2, 1].map((value) => <option key={value} value={value}>{value} stars</option>)}</select></label>
        <label className={filterLabelClass}>Sort<select value={sort} onChange={(event) => setSort(event.target.value)}><option value="newest">Newest</option><option value="oldest">Oldest</option><option value="highest">Highest rated</option><option value="lowest">Lowest rated</option></select></label>
        {(search || rating) && <button type="button" className="min-h-[42px] self-end rounded-lg bg-red-50 px-3 font-body text-sm text-red-700" onClick={clearFilters}>Clear filters</button>}
      </section>

      {loading ? <Loader /> : error ? <div className={emptyClass}><strong>Could not load reviews</strong><p>{error}</p><button className="inline-flex min-h-11 items-center justify-center gap-2 whitespace-nowrap rounded-full border-2 px-6 py-2.5 font-body text-sm font-semibold tracking-wide transition-colors disabled:cursor-not-allowed disabled:opacity-50 border-transparent bg-brand-900 text-white hover:bg-brand-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-700" onClick={() => loadReviews()}>Try again</button></div> : reviews.length === 0 ? <div className={emptyClass}><strong>No reviews found</strong><p>Try changing your search or filters.</p></div> : (
        <section className="grid grid-cols-1 gap-5 min-[651px]:grid-cols-[repeat(auto-fill,minmax(min(100%,360px),1fr))]" aria-label="Customer reviews">
          {reviews.map((review) => <article key={review.reviewId} className="relative flex min-h-[220px] flex-col rounded-card border border-admin-border bg-white p-5 shadow-sm">
            <div className="flex min-w-0 items-center gap-3 border-b border-admin-border pb-4">
              {review.productImage ? <img src={review.productImage} alt="" className="h-11 w-11 rounded-lg object-cover" /> : <div className="grid h-11 w-11 place-items-center rounded-lg bg-green-50 font-body font-bold text-brand-900">NN</div>}
              <div className="min-w-0"><strong className="block truncate">{review.productName}</strong><small className="mt-0.5 block truncate text-admin-muted">{new Date(review.createdAt).toLocaleDateString()}</small></div>
            </div>
            <div className="flex-1 pb-2 pt-4"><div className="mb-2 flex items-center gap-2"><span className="grid h-7 w-7 place-items-center rounded-full bg-brand-900 font-body text-xs text-white">{review.userName?.charAt(0).toUpperCase()}</span><strong>{review.userName}</strong></div><Rating value={review.rating} precision={0.5} readOnly size="small" /><p className="mt-3 overflow-hidden font-body text-sm leading-normal text-earth-600 [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:3]">{review.comment}</p></div>
            <button type="button" className="absolute bottom-4 right-4 inline-flex h-9 w-9 items-center justify-center rounded-lg bg-red-50 text-lg text-red-700 hover:bg-red-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-red-700" aria-label={`Delete review by ${review.userName}`} onClick={(event) => { event.stopPropagation(); setDeleteTarget(review); }}><MdDelete /></button>
          </article>)}
        </section>
      )}

      {!loading && hasNextPage && <div className="flex justify-center p-6"><button className="inline-flex min-h-11 items-center justify-center gap-2 whitespace-nowrap rounded-full border-2 px-6 py-2.5 font-body text-sm font-semibold tracking-wide transition-colors disabled:cursor-not-allowed disabled:opacity-50 border-brand-300 bg-white text-brand-900 hover:border-brand-900 hover:bg-cream-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-700" disabled={loadingMore} onClick={() => loadReviews({ append: true, pageCursor: nextCursor })}>{loadingMore ? "Loading…" : "Load more reviews"}</button></div>}

      {deleteTarget && <div className="fixed inset-0 z-[200] grid place-items-center bg-brand-900/55 p-5" role="presentation" onClick={() => !deleting && setDeleteTarget(null)}><div className="relative w-full max-w-[440px] rounded-card bg-white p-5 text-center shadow-lg sm:p-10" role="dialog" aria-modal="true" aria-labelledby="delete-review-title" onClick={(event) => event.stopPropagation()}><div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-full bg-red-50 text-2xl text-red-700"><MdDelete /></div><h2 id="delete-review-title" className="mb-3 font-display text-2xl text-brand-900">Delete this review?</h2><p className="font-body leading-relaxed text-earth-600">This permanently removes the review by <strong>{deleteTarget.userName}</strong> and recalculates the rating for <strong>{deleteTarget.productName}</strong>.</p><div className="mt-6 flex flex-col-reverse justify-center gap-3 min-[651px]:flex-row"><button className="inline-flex min-h-11 items-center justify-center gap-2 whitespace-nowrap rounded-full border-2 px-6 py-2.5 font-body text-sm font-semibold tracking-wide transition-colors disabled:cursor-not-allowed disabled:opacity-50 border-brand-300 bg-white text-brand-900 hover:border-brand-900 hover:bg-cream-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-700 w-full min-[651px]:w-auto" onClick={() => setDeleteTarget(null)} disabled={deleting}>Keep review</button><button className="inline-flex min-h-11 items-center justify-center gap-2 whitespace-nowrap rounded-full border-2 px-6 py-2.5 font-body text-sm font-semibold tracking-wide transition-colors disabled:cursor-not-allowed disabled:opacity-50 border-transparent bg-red-700 text-white hover:bg-red-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-700 w-full min-[651px]:w-auto" onClick={confirmDelete} disabled={deleting}>{deleting ? "Deleting…" : "Delete review"}</button></div></div></div>}
    </AdminLayout>
  );
};

export default ReviewList;
