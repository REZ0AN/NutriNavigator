import React, { useEffect, useState } from "react";
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
  const { orders, isDeleted, error, page, hasNextPage, loading } = useSelector((s) => s.allOrdersR);
  const [requestedPage, setRequestedPage] = useState(1);

useEffect(() => {
  if (error)     { toast.error(error, { ...toastifyOptions }); dispatch(clearAllOrdersError()); }
  if (isDeleted) {
    toast.success("Order deleted", { ...toastifyOptions });
    dispatch(resetOrderOps());
    // The delete response contains only the ID, so reload the page to keep
    // aggregate totals and pagination metadata consistent with the server.
    dispatch(fetchAllOrders(requestedPage));
  }
}, [error, isDeleted, dispatch, requestedPage]);

useEffect(() => { dispatch(fetchAllOrders(requestedPage)); }, [dispatch, requestedPage]);
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
      <div style={{ display: "flex", gap: "0.75rem", alignItems: "center", justifyContent: "center", marginTop: "1rem" }}>
        <button type="button" disabled={loading || page <= 1} onClick={() => setRequestedPage((current) => current - 1)}>Previous</button>
        <span>Page {page}</span>
        <button type="button" disabled={loading || !hasNextPage} onClick={() => setRequestedPage((current) => current + 1)}>Next</button>
      </div>
    </AdminLayout>
  );
};

export default OrderList;
