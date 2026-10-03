import React, { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useParams, Link } from "react-router-dom";
import { toast } from "react-toastify";
import MetaData from "../layouts/Header/MetaData";
import Loader from "../layouts/Loader/Loader";
import { fetchOrderDetails } from "../../store/slices/orderSlice";
import { toastifyOptions } from "../../utils/toastify";

const sectionClass = "rounded-card border border-admin-border bg-white px-6 py-5";
const titleClass = "mb-4 border-b border-admin-border pb-3 font-body text-xs font-bold uppercase tracking-widest text-admin-muted";
const textClass = "mb-2 font-body text-sm leading-relaxed text-earth-600";

const OrderDetails = () => {
  const dispatch = useDispatch();
  const { id } = useParams();
  const { loading, order, error } = useSelector((s) => s.orderDetailsR);

useEffect(() => {
  if (error) { toast.error(error, { ...toastifyOptions }); }
}, [error]);

useEffect(() => {
  dispatch(fetchOrderDetails(id));
}, [dispatch, id]);
  if (loading || !order._id) return <Loader />;

  const paid = order.paymentinfo?.status === "succeeded";

  return (
    <>
      <MetaData title={`Order #${order._id}`} />
      <div className="mx-auto min-h-[calc(100vh-408px)] max-w-content px-4 py-6 sm:px-6 sm:py-10">
        <h1 className="mb-8 font-display text-3xl text-brand-900">Order <span className="font-mono text-lg text-admin-muted">#{order._id}</span></h1>
        <div className="mt-8 grid gap-6 md:grid-cols-2">
          <div className="flex flex-col gap-5">
            <div className={sectionClass}>
              <h3 className={titleClass}>Shipping Info</h3>
              <p className={textClass}><b>Name:</b> {order.user?.name}</p>
              <p className={textClass}><b>Phone:</b> {order.shippinginfo?.phoneNo}</p>
              <p className={textClass}><b>Address:</b> {order.shippinginfo?.address}, {order.shippinginfo?.city} — {order.shippinginfo?.pinCode}</p>
            </div>
            <div className={sectionClass}>
              <h3 className={titleClass}>Payment</h3>
              <p className={textClass}><span className={paid ? "font-semibold text-green-700" : "font-semibold text-red-700"}>{paid ? "PAID" : "NOT PAID"}</span></p>
              <p className={textClass}><b>Amount:</b> ৳{order.totalprice?.toLocaleString()}</p>
            </div>
            <div className={sectionClass}>
              <h3 className={titleClass}>Order Status</h3>
              <p className={textClass}><span className={order.orderstatus === "delivered" ? "font-semibold text-green-700" : "font-semibold text-red-700"}>{order.orderstatus}</span></p>
            </div>
          </div>
          <div className={sectionClass}>
            <h3 className={titleClass}>Order Items</h3>
            {order.orderitems?.map((item) => (
              <div key={item.product} className="flex items-center gap-4 border-b border-admin-border py-3 last:border-0 last:pb-0">
                <img src={item.image?.url || item.image} alt={item.name} className="h-12 w-12 shrink-0 rounded bg-cream-50 object-contain" />
                <Link to={`/product/${item.product}`} className="flex-1 font-body text-sm text-brand-900 hover:underline">{item.name}</Link>
                <span className="whitespace-nowrap font-body text-sm text-earth-600">{item.quantity} × ৳{item.price} = <b>৳{item.price * item.quantity}</b></span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
};
export default OrderDetails;
