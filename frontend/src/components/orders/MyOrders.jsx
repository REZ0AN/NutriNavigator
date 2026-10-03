import React, { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link } from "react-router-dom";
import { toast } from "react-toastify";
import { MdLaunch } from "react-icons/md";
import MetaData from "../layouts/Header/MetaData";
import Loader from "../layouts/Loader/Loader";
import { fetchMyOrders, clearMyOrdersError } from "../../store/slices/orderSlice";
import { toastifyOptions } from "../../utils/toastify";

const STATUS_CLASS = { delivered: "bg-green-50 text-green-800", shipped: "bg-blue-50 text-blue-800", processing: "bg-amber-50 text-amber-800" };
const headingClass = "bg-brand-900 px-6 py-4 text-left font-body text-xs font-semibold uppercase tracking-widest text-white";
const cellClass = "border-b border-admin-border px-6 py-5 font-body text-sm text-earth-600 group-hover:bg-cream-50";

const MyOrders = () => {
  const dispatch = useDispatch();
  const { loading, orders, error } = useSelector((s) => s.myOrderR);
  const { user } = useSelector((s) => s.userR);

useEffect(() => {
  if (error) { toast.error(error, { ...toastifyOptions }); dispatch(clearMyOrdersError()); }
}, [error, dispatch]);

useEffect(() => {
  dispatch(fetchMyOrders());
}, [dispatch]);

  if (loading) return <Loader />;

  return (
    <>
      <MetaData title="My Orders" />
      <div className="mx-auto min-h-[calc(100vh-408px)] max-w-content px-4 py-6 sm:px-6 sm:py-10">
        <h1 className="mb-8 font-display text-3xl text-brand-900">{user?.name}'s Orders</h1>
        {orders?.length > 0 ? (
          <div className="overflow-x-auto rounded-card border border-admin-border bg-white shadow-sm">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className={headingClass}>Order ID</th>
                  <th className={headingClass}>Items</th>
                  <th className={headingClass}>Amount</th>
                  <th className={headingClass}>Status</th>
                  <th className={headingClass}>Details</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <tr key={order._id} className="group">
                    <td className={`${cellClass} max-w-[200px] truncate font-mono text-xs`}>{order._id}</td>
                    <td className={cellClass}>{order.orderitems.length}</td>
                    <td className={cellClass}>৳{order.totalprice.toLocaleString()}</td>
                    <td className={cellClass}><span className={`inline-flex rounded-full px-4 py-1 font-body text-xs font-semibold capitalize ${STATUS_CLASS[order.orderstatus] || "bg-admin-canvas text-admin-muted"}`}>{order.orderstatus}</span></td>
                    <td className={cellClass}><Link to={`/order/${order._id}`} aria-label={`View order ${order._id}`} className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-brand-50 text-lg text-brand-900 hover:bg-brand-900 hover:text-white"><MdLaunch aria-hidden="true" /></Link></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="flex min-h-[300px] flex-col items-center justify-center gap-5 px-4 py-20 text-center font-body text-earth-600">
            <p>You haven't placed any orders yet.</p>
            <Link to="/products" className="inline-flex min-h-11 items-center justify-center gap-2 whitespace-nowrap rounded-full border-2 px-6 py-2.5 font-body text-sm font-semibold tracking-wide transition-colors disabled:cursor-not-allowed disabled:opacity-50 border-transparent bg-brand-900 text-white hover:bg-brand-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-700">Shop Now</Link>
          </div>
        )}
      </div>
    </>
  );
};
export default MyOrders;
