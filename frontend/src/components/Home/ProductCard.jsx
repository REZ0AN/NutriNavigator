import React from "react";
import { Link } from "react-router-dom";
import ReactStars from "react-rating-stars-component";

const ProductCard = ({ product }) => {
  const starsOptions = {
    edit: false,
    color: "#D8D9D1",
    activeColor: "#52785A",
    size: 15,
    value: parseFloat(product.rating) || 0,
    isHalf: true,
  };

  return (
    <Link
      className="group flex min-w-0 flex-col overflow-hidden rounded-card border border-brand-100 bg-cream-50 text-earth-900 transition-colors hover:border-brand-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-700"
      to={`/product/${product._id}`}
    >
      <div className="relative aspect-[3/4] overflow-hidden bg-white">
        <img
          src={product.images[0]?.url}
          alt={product.name}
          className="h-full w-full object-contain p-4 transition-transform duration-300 group-hover:scale-[1.03] sm:p-5"
        />
        {product.stock < 1 && (
          <span className="absolute left-3 top-3 rounded-full border border-red-200 bg-white px-3 py-1 font-body text-xs font-semibold text-red-700">
            Out of Stock
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-2.5 p-3 font-body sm:p-5">
        <p className="min-h-10 overflow-hidden text-sm font-semibold leading-5 text-earth-900 sm:text-base" style={{ display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>
          {product.name}
        </p>
        <div className="flex items-center gap-2">
          <ReactStars {...starsOptions} />
          <span className="text-xs text-earth-400">({product.reviewscount})</span>
        </div>
        <div className="mt-auto flex flex-wrap items-center justify-between gap-2 border-t border-brand-100 pt-3">
          <p className="text-lg font-bold text-brand-900">৳{product.price.toLocaleString()}</p>
          <span className="text-xs font-semibold text-brand-700">View <span aria-hidden="true">→</span></span>
        </div>
      </div>
    </Link>
  );
};

export default ProductCard;
