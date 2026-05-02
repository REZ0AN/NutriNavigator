import React, { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link } from "react-router-dom";
import { toast } from "react-toastify";
import { MdEdit, MdDelete } from "react-icons/md";
import MetaData from "../../layouts/Header/MetaData";
import AdminLayout from "../AdminLayout";
import { fetchAllOrders, deleteOrder, resetOrderOps, clearAllOrdersError } from "../../../store/slices/orderSlice";
import { toastifyOptions } from "../../../utils/toastify";

const OrderList = () => {
  const dispatch  = useDispatch();
  const { orders, isDeleted, error } = useSelector((s) => s.allOrdersR);

useEffect(() => {
  if (error)     { toast.error(error, { ...toastifyOptions }); dispatch(clearAllOrdersError()); }
  if (isDeleted) { toast.success("Order deleted", { ...toastifyOptions }); dispatch(resetOrderOps()); }
}, [error, isDeleted, dispatch]);

useEffect(() => {
  if(orders.length === 0) {
    dispatch(fetchAllOrders());
  }
}, [dispatch, orders.length]);
  return (
    <AdminLayout>
      <MetaData title="All Orders — Admin" />
      <h1 className="admin-page-title">All Orders</h1>
      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr><th>Order ID</th><th>Items</th><th>Amount (৳)</th><th>Status</th><th>Actions</th></tr>
          </thead>
          <tbody>
            {orders?.map((o) => (
              <tr key={o._id}>
                <td style={{ fontFamily: "monospace", fontSize: "var(--text-xs)", color: "var(--color-text-muted)" }}>{o._id}</td>
                <td>{o.orderitems?.length}</td>
                <td>৳{o.totalprice?.toLocaleString()}</td>
                <td><span className={`status-badge ${o.orderstatus === "delivered" ? "status--green" : o.orderstatus === "shipped" ? "status--blue" : "status--orange"}`}>{o.orderstatus}</span></td>
                <td>
                  <div className="admin-actions-cell">
                    <Link to={`/admin/order/${o._id}`} className="admin-action-btn admin-action-btn--edit"><MdEdit /></Link>
                    <button className="admin-action-btn admin-action-btn--delete" onClick={() => dispatch(deleteOrder(o._id))}><MdDelete /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AdminLayout>
  );
};

export default OrderList;
