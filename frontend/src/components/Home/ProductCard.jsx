import React from "react";
import { Link } from "react-router-dom";
import ReactStars from "react-rating-stars-component";
import "./ProductCard.css";

const ProductCard = ({ product }) => {
  const starsOptions = {
    edit: false,
    color: "var(--c-stone)",
    activeColor: "var(--c-forest-mid)",
    size: 15,
    value: parseFloat(product.rating) || 0,
    isHalf: true,
  };

  return (
    <Link className="product-card" to={`/product/${product._id}`}>
      <div className="product-card__img-wrap">
        <img
          src={product.images[0]?.url}
          alt={product.name}
          className="product-card__img"
        />
        {product.stock < 1 && (
          <span className="product-card__badge">Out of Stock</span>
        )}
      </div>
      <div className="product-card__body">
        <p className="product-card__name">{product.name}</p>
        <div className="product-card__rating">
          <ReactStars {...starsOptions} />
          <span className="product-card__review-count">({product.reviewscount})</span>
        </div>
        <div className="product-card__footer">
          <p className="product-card__price">৳{product.price.toLocaleString()}</p>
          <span className="product-card__cta">View →</span>
        </div>
      </div>
    </Link>
  );
};

export default ProductCard;