import React, { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useParams, useNavigate, Link } from "react-router-dom";
import { toast } from "react-toastify";
import { MdAccountTree } from "react-icons/md";
import MetaData from "../../layouts/Header/MetaData";
import Loader from "../../layouts/Loader/Loader";
import AdminLayout from "../AdminLayout";
import { fetchAdminOrderDetails, updateOrderStatus, resetOrderOps, clearAllOrdersError } from "../../../store/slices/orderSlice";
import { toastifyOptions } from "../../../utils/toastify";

const sectionClass = "rounded-card border border-admin-border bg-white px-6 py-5";
const sectionTitleClass = "mb-4 border-b border-admin-border pb-3 font-body text-xs font-bold uppercase tracking-widest text-admin-muted";
const sectionTextClass = "mb-2 font-body text-sm leading-relaxed text-earth-600";

const OrderUpdate = () => {
  const dispatch  = useDispatch();
  const navigate  = useNavigate();
  const { id }    = useParams();
  const { order, loading, error: detailError } = useSelector((s) => s.orderDetailsR);
  const { isUpdated, error } = useSelector((s) => s.allOrdersR);
  const [status, setStatus] = useState("");

useEffect(() => {
  if (error || detailError) { toast.error(error || detailError, { ...toastifyOptions }); dispatch(clearAllOrdersError()); }
  if (isUpdated) { toast.success("Order updated!", { ...toastifyOptions }); dispatch(resetOrderOps()); navigate("/admin/orders"); }
}, [error, detailError, isUpdated, dispatch, navigate]);

useEffect(() => {
  dispatch(fetchAdminOrderDetails(id));
}, [dispatch, id]);

  const handleSubmit = (e) => {
    e.preventDefault();
    dispatch(updateOrderStatus({ id, status }));
  };

  if (loading || !order._id) return <Loader />;

  const delivered = order.orderstatus === "delivered";

  return (
    <AdminLayout>
      <MetaData title="Process Order — Admin" />
      <h1 className="mb-6 font-body text-2xl font-bold text-brand-900">Process Order</h1>
      <div className="grid items-start gap-8 min-[901px]:grid-cols-[minmax(0,1fr)_320px]">
        {/* ── Order detail summary ── */}
        <div className="flex flex-col gap-5">
          <div className={sectionClass}>
            <h3 className={sectionTitleClass}>Shipping Info</h3>
            <p className={sectionTextClass}><b>Name:</b> {order.user?.name}</p>
            <p className={sectionTextClass}><b>Phone:</b> {order.shippinginfo?.phoneNo}</p>
            <p className={sectionTextClass}><b>Address:</b> {order.shippinginfo?.address}, {order.shippinginfo?.pinCode}</p>
          </div>
          <div className={sectionClass}>
            <h3 className={sectionTitleClass}>Payment</h3>
            <p className={sectionTextClass}><span className={order.paymentinfo?.status === "succeeded" ? "font-semibold text-green-700" : "font-semibold text-red-700"}>{order.paymentinfo?.status === "succeeded" ? "PAID" : "NOT PAID"}</span></p>
            <p className={sectionTextClass}><b>Amount:</b> ৳{order.totalprice?.toLocaleString()}</p>
          </div>
          <div className={sectionClass}>
            <h3 className={sectionTitleClass}>Order Status</h3>
            <p className={sectionTextClass}><span className={delivered ? "font-semibold text-green-700" : "font-semibold text-red-700"}>{order.orderstatus}</span></p>
          </div>
          <div className={sectionClass}>
            <h3 className={sectionTitleClass}>Items</h3>
            {order.orderitems?.map((item) => (
              <div key={item.product} className="flex items-center gap-4 border-b border-admin-border py-3 last:border-0 last:pb-0">
                <img src={item.image?.url || item.image} alt={item.name} className="h-12 w-12 shrink-0 rounded bg-cream-50 object-contain" />
                <Link to={`/product/${item.product}`} className="flex-1 font-body text-sm text-brand-900 hover:underline">{item.name}</Link>
                <span className="whitespace-nowrap font-body text-sm text-earth-600">{item.quantity} × ৳{item.price}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ── Update form ── */}
        {!delivered && (
          <div className="h-fit max-w-[600px] rounded-card border border-admin-border bg-white p-5 shadow-sm sm:p-8">
            <h2 className="mb-5 font-body text-lg font-semibold text-earth-900">Update Status</h2>
            <form className="flex flex-col gap-5" onSubmit={handleSubmit}>
              <div className="flex flex-col gap-2 [&_label]:font-body [&_label]:text-sm [&_label]:font-medium [&_label]:text-earth-600">
                <div className="flex items-center gap-3 rounded-lg border border-brand-300 bg-admin-canvas px-4 py-3 focus-within:border-brand-700 focus-within:bg-white [&_svg]:shrink-0 [&_svg]:text-lg [&_svg]:text-admin-muted [&_input]:min-w-0 [&_input]:flex-1 [&_input]:border-0 [&_input]:bg-transparent [&_input]:font-body [&_input]:text-sm [&_input]:text-earth-900 [&_input]:outline-none [&_select]:min-w-0 [&_select]:flex-1 [&_select]:bg-transparent [&_select]:font-body [&_select]:text-sm [&_select]:text-earth-900 [&_textarea]:min-w-0 [&_textarea]:flex-1 [&_textarea]:bg-transparent [&_textarea]:font-body [&_textarea]:text-sm [&_textarea]:text-earth-900">
                  <MdAccountTree />
                  <select required value={status} onChange={(e) => setStatus(e.target.value)}>
                    <option value="">Select new status</option>
                    {order.orderstatus === "processing" && <option value="shipped">Shipped</option>}
                    {order.orderstatus === "shipped"    && <option value="delivered">Delivered</option>}
                  </select>
                </div>
              </div>
              <button type="submit" className="inline-flex min-h-11 items-center justify-center gap-2 whitespace-nowrap rounded-full border-2 px-6 py-2.5 font-body text-sm font-semibold tracking-wide transition-colors disabled:cursor-not-allowed disabled:opacity-50 border-transparent bg-brand-900 text-white hover:bg-brand-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-700" disabled={!status}>Update Order</button>
            </form>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default OrderUpdate;
