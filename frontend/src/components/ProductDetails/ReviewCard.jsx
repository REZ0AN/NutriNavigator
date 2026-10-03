import React from "react";
import Rating from "@mui/material/Rating";

const ReviewCard = ({ review }) => (
  <div className="flex flex-col gap-3 rounded-card border border-admin-border bg-white p-5">
    <div className="flex items-center gap-3">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-900 font-body font-bold text-white">{review.name?.charAt(0).toUpperCase()}</div>
      <div>
        <p className="font-body text-sm font-semibold text-earth-900">{review.name}</p>
       <Rating value={review.rating} precision={0.5} readOnly size="small" />
      </div>
    </div>
    <p className="font-body text-sm leading-relaxed text-earth-600">{review.comment}</p>
  </div>
);

export default ReviewCard;
