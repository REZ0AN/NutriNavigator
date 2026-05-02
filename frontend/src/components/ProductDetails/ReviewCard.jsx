import React from "react";
import Rating from "@mui/material/Rating";
import "./ProductDetails.css";

const ReviewCard = ({ review }) => (
  <div className="review-card">
    <div className="review-card__header">
      <div className="review-card__avatar">{review.name?.charAt(0).toUpperCase()}</div>
      <div>
        <p className="review-card__name">{review.name}</p>
       <Rating value={review.rating} precision={0.5} readOnly size="small" />
      </div>
    </div>
    <p className="review-card__comment">{review.comment}</p>
  </div>
);

export default ReviewCard;
