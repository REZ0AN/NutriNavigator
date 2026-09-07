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
import "./OrderUpdate.css";

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
      <h1 className="admin-page-title">Process Order</h1>
      <div className="order-update-grid">
        {/* ── Order detail summary ── */}
        <div className="order-update-info">
          <div className="confirm-section">
            <h3>Shipping Info</h3>
            <p><b>Name:</b> {order.user?.name}</p>
            <p><b>Phone:</b> {order.shippinginfo?.phoneNo}</p>
            <p><b>Address:</b> {order.shippinginfo?.address}, {order.shippinginfo?.pinCode}</p>
          </div>
          <div className="confirm-section">
            <h3>Payment</h3>
            <p><span className={order.paymentinfo?.status === "succeeded" ? "greenColor" : "redColor"}>{order.paymentinfo?.status === "succeeded" ? "PAID" : "NOT PAID"}</span></p>
            <p><b>Amount:</b> ৳{order.totalprice?.toLocaleString()}</p>
          </div>
          <div className="confirm-section">
            <h3>Order Status</h3>
            <p><span className={delivered ? "greenColor" : "redColor"}>{order.orderstatus}</span></p>
          </div>
          <div className="confirm-section">
            <h3>Items</h3>
            {order.orderitems?.map((item) => (
              <div key={item.product} className="confirm-item">
                <img src={item.image?.url || item.image} alt={item.name} />
                <Link to={`/product/${item.product}`}>{item.name}</Link>
                <span>{item.quantity} × ৳{item.price}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ── Update form ── */}
        {!delivered && (
          <div className="admin-form-card order-update-form-card">
            <h2 className="order-update-form-title">Update Status</h2>
            <form className="admin-form" onSubmit={handleSubmit}>
              <div className="admin-field">
                <div className="admin-input-wrap">
                  <MdAccountTree />
                  <select required value={status} onChange={(e) => setStatus(e.target.value)}>
                    <option value="">Select new status</option>
                    {order.orderstatus === "processing" && <option value="shipped">Shipped</option>}
                    {order.orderstatus === "shipped"    && <option value="delivered">Delivered</option>}
                  </select>
                </div>
              </div>
              <button type="submit" className="btn btn--primary" disabled={!status}>Update Order</button>
            </form>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default OrderUpdate;
