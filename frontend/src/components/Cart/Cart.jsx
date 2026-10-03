import React from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate, Link } from "react-router-dom";
import { toast } from "react-toastify";
import { MdRemoveShoppingCart, MdDelete } from "react-icons/md";
import { addItemsToCart, removeCartItem } from "../../store/slices/cartSlice";
import { toastifyOptions } from "../../utils/toastify";
import MetaData from "../layouts/Header/MetaData";

const quantityButtonClass = "flex h-9 w-9 items-center justify-center rounded border border-brand-300 bg-white font-body text-base text-earth-600 hover:border-brand-700 hover:text-brand-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-700";

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
    <div className="flex min-h-[calc(100vh-68px)] flex-col items-center justify-center gap-5 px-8 text-center">
      <MdRemoveShoppingCart aria-hidden="true" className="text-7xl text-brand-300" />
      <h2 className="font-display text-2xl text-earth-600">Your cart is empty</h2>
      <Link to="/products" className="inline-flex min-h-11 items-center justify-center gap-2 whitespace-nowrap rounded-full border-2 px-6 py-2.5 font-body text-sm font-semibold tracking-wide transition-colors disabled:cursor-not-allowed disabled:opacity-50 border-transparent bg-brand-900 text-white hover:bg-brand-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-700">Browse Products</Link>
    </div>
  );

  return (
    <>
      <MetaData title="Shopping Cart" />
      <div className="mx-auto max-w-content px-4 py-6 sm:px-6 sm:py-10">
        <h1 className="mb-8 font-display text-3xl text-brand-900">Shopping Cart</h1>
        <div className="grid items-start gap-8 min-[861px]:grid-cols-[minmax(0,1fr)_340px]">
          <div className="flex flex-col gap-3">
            {cartItems.map((item) => (
              <div key={item.product} className="grid grid-cols-[64px_minmax(0,1fr)] items-center gap-3 rounded-card border border-admin-border bg-white p-4 transition-shadow hover:shadow-sm min-[541px]:grid-cols-[80px_minmax(0,1fr)_auto_auto_auto] min-[541px]:gap-4">
                <img src={item.image?.url} alt={item.name} className="h-16 w-16 rounded-lg bg-cream-50 object-contain p-2 min-[541px]:h-20 min-[541px]:w-20" />
                <div className="flex min-w-0 flex-col gap-1">
                  <Link to={`/product/${item.product}`} className="font-body text-sm font-medium text-earth-900 hover:text-brand-900">{item.name}</Link>
                  <p className="font-body text-xs text-earth-600">৳{item.price.toLocaleString()}</p>
                </div>
                <div className="col-start-2 flex items-center gap-2 min-[541px]:col-auto">
                  <button type="button" aria-label={`Decrease quantity of ${item.name}`} className={quantityButtonClass} onClick={() => changeQty(item.product, item.name, item.quantity, item.stock, -1)}>−</button>
                  <span className="min-w-[22px] text-center font-body text-sm font-semibold">{item.quantity}</span>
                  <button type="button" aria-label={`Increase quantity of ${item.name}`} className={quantityButtonClass} onClick={() => changeQty(item.product, item.name, item.quantity, item.stock, 1)}>+</button>
                </div>
                <p className="col-start-2 font-body text-sm font-bold text-brand-900 min-[541px]:col-auto min-[541px]:min-w-[70px] min-[541px]:text-right">৳{(item.price * item.quantity).toLocaleString()}</p>
                <button type="button" aria-label={`Remove ${item.name}`} className="col-start-2 justify-self-start rounded p-2 text-admin-muted hover:bg-red-50 hover:text-red-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-red-700 min-[541px]:col-auto" onClick={() => removeItem(item)}><MdDelete aria-hidden="true" /></button>
              </div>
            ))}
          </div>

          <div className="rounded-card border border-admin-border bg-white p-6 shadow-sm min-[861px]:sticky min-[861px]:top-[84px]">
            <h2 className="mb-5 border-b border-admin-border pb-4 font-body text-base font-bold text-earth-900">Order Summary</h2>
            <div className="mb-5 flex flex-col gap-3">
              <div className="flex justify-between font-body text-sm text-earth-600"><span>Subtotal ({cartItems.length} items)</span><span>৳{subtotal.toLocaleString()}</span></div>
              <div className="mt-2 flex justify-between border-t-2 border-admin-border pt-4 font-body text-base font-bold text-earth-900"><span>Total</span><span>৳{subtotal.toLocaleString()}</span></div>
            </div>
            <button className="inline-flex min-h-11 items-center justify-center gap-2 whitespace-nowrap rounded-full border-2 px-6 py-2.5 font-body text-sm font-semibold tracking-wide transition-colors disabled:cursor-not-allowed disabled:opacity-50 border-transparent bg-brand-900 text-white hover:bg-brand-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-700 mt-2 w-full py-4" onClick={() => navigate("/login?redirect=/shipping")}
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
