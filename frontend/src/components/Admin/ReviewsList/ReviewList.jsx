import React, { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "react-toastify";
import { MdSearch, MdDelete } from "react-icons/md";
import Rating from "@mui/material/Rating";
import MetaData from "../../layouts/Header/MetaData";
import AdminLayout from "../AdminLayout";
import { getAllReviews, deleteReview, resetProductOps, clearProductOpsError } from "../../../store/slices/productSlice";
import { toastifyOptions } from "../../../utils/toastify";

const ReviewList = () => {
  const dispatch  = useDispatch();
  const { reviews, reviewDeleted, error } = useSelector((s) => s.productOpsR);

  const [productId, setProductId] = useState("");

useEffect(() => {
  if (error)         { toast.error(error, { ...toastifyOptions }); dispatch(clearProductOpsError()); }
  if (reviewDeleted) { toast.success("Review deleted", { ...toastifyOptions }); dispatch(resetProductOps()); }
}, [error, reviewDeleted, dispatch]);

  const handleSearch = (e) => {
    e.preventDefault();
    if (productId.trim().length === 24) {
      dispatch(getAllReviews(productId.trim()));
    } else {
      toast.error("Please enter a valid 24-character Product ID", { ...toastifyOptions });
    }
  };

  return (
    <AdminLayout>
      <MetaData title="All Reviews — Admin" />
      <h1 className="admin-page-title">Reviews</h1>

      <div className="admin-form-card" style={{ marginBottom: "var(--space-6)" }}>
        <form className="admin-form" onSubmit={handleSearch} style={{ flexDirection: "row", gap: "var(--space-4)" }}>
          <div className="admin-input-wrap" style={{ flex: 1 }}>
            <MdSearch />
            <input
              type="text" placeholder="Enter Product ID (24 chars)" value={productId}
              onChange={(e) => setProductId(e.target.value)}
            />
          </div>
          <button type="submit" className="btn btn--primary" disabled={productId.length !== 24}>Search</button>
        </form>
      </div>

      {reviews?.length > 0 ? (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead><tr><th>Review ID</th><th>User</th><th>Rating</th><th>Comment</th><th>Actions</th></tr></thead>
            <tbody>
              {reviews.map((r) => (
                <tr key={r._id}>
                  <td style={{ fontFamily: "monospace", fontSize: "var(--text-xs)", color: "var(--color-text-muted)" }}>{r._id}</td>
                  <td>{r.name}</td>
                  <td><Rating value={r.rating} precision={0.5} readOnly size="small" /></td>
                  <td style={{ maxWidth: 260, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.comment}</td>
                  <td>
                    <button className="admin-action-btn admin-action-btn--delete" onClick={() => dispatch(deleteReview({ reviewId: r._id, productId }))}>
                      <MdDelete />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div style={{ textAlign: "center", padding: "var(--space-20)", color: "var(--color-text-muted)" }}>
          {productId ? "No reviews found for this product." : "Enter a Product ID to search reviews."}
        </div>
      )}
    </AdminLayout>
  );
};

export default ReviewList;
