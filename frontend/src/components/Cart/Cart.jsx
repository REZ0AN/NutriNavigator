import React from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate, Link } from "react-router-dom";
import { toast } from "react-toastify";
import { MdRemoveShoppingCart, MdDelete } from "react-icons/md";
import { addItemsToCart, removeCartItem } from "../../store/slices/cartSlice";
import { toastifyOptions } from "../../utils/toastify";
import MetaData from "../layouts/Header/MetaData";
import "./Cart.css";

const Cart = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { cartItems } = useSelector((s) => s.cartR);

  const changeQty = (id, name, qty, stock, delta) => {
    const newQty = qty + delta;
    if (newQty < 1) return;
    if (newQty > stock) { toast.error(`Only ${stock} in stock`, { ...toastifyOptions }); return; }
    dispatch(addItemsToCart({ id, quantity: newQty }));
  };

  const removeItem = (item) => {
    dispatch(removeCartItem(item.product));
    toast.warning(`${item.name} removed from cart`, { ...toastifyOptions });
  };

  const subtotal = cartItems.reduce((s, i) => s + i.price * i.quantity, 0);

  if (cartItems.length === 0) return (
    <div className="cart-empty">
      <MdRemoveShoppingCart className="cart-empty__icon" />
      <h2>Your cart is empty</h2>
      <Link to="/products" className="btn btn--primary">Browse Products</Link>
    </div>
  );

  return (
    <>
      <MetaData title="Shopping Cart" />
      <div className="cart-page">
        <h1 className="cart-title">Shopping Cart</h1>
        <div className="cart-layout">
          <div className="cart-items">
            {cartItems.map((item) => (
              <div key={item.product} className="cart-item">
                <img src={item.image?.url} alt={item.name} className="cart-item__img" />
                <div className="cart-item__info">
                  <Link to={`/product/${item.product}`} className="cart-item__name">{item.name}</Link>
                  <p className="cart-item__price">৳{item.price.toLocaleString()}</p>
                </div>
                <div className="cart-item__qty">
                  <button className="qty-btn" onClick={() => changeQty(item.product, item.name, item.quantity, item.stock, -1)}>−</button>
                  <span>{item.quantity}</span>
                  <button className="qty-btn" onClick={() => changeQty(item.product, item.name, item.quantity, item.stock, 1)}>+</button>
                </div>
                <p className="cart-item__subtotal">৳{(item.price * item.quantity).toLocaleString()}</p>
                <button className="cart-item__remove" onClick={() => removeItem(item)}><MdDelete /></button>
              </div>
            ))}
          </div>

          <div className="cart-summary">
            <h2 className="cart-summary__title">Order Summary</h2>
            <div className="cart-summary__rows">
              <div className="cart-summary__row"><span>Subtotal ({cartItems.length} items)</span><span>৳{subtotal.toLocaleString()}</span></div>
              <div className="cart-summary__row cart-summary__row--total"><span>Total</span><span>৳{subtotal.toLocaleString()}</span></div>
            </div>
            <button className="btn btn--primary cart-checkout-btn" onClick={() => navigate("/login?redirect=/shipping")}
>
              Proceed to Checkout
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default Cart;
