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
      <h1 className="mb-6 font-body text-2xl font-bold text-brand-900">All Orders</h1>
      <div className="overflow-x-auto rounded-card border border-admin-border bg-white shadow-sm">
        <table className="w-full border-collapse font-body [&_th]:whitespace-nowrap [&_th]:bg-brand-900 [&_th]:px-5 [&_th]:py-4 [&_th]:text-left [&_th]:text-xs [&_th]:font-semibold [&_th]:uppercase [&_th]:tracking-wider [&_th]:text-white [&_td]:border-b [&_td]:border-admin-border [&_td]:px-5 [&_td]:py-4 [&_td]:align-middle [&_td]:text-sm [&_td]:text-earth-600">
          <thead>
            <tr><th>Order ID</th><th>Items</th><th>Amount (৳)</th><th>Status</th><th>Actions</th></tr>
          </thead>
          <tbody>
            {orders?.map((o) => (
              <tr key={o._id}>
                <td className="font-mono text-xs text-admin-muted">{o._id}</td>
                <td>{o.orderitems?.length}</td>
                <td>৳{o.totalprice?.toLocaleString()}</td>
                <td><span className={`inline-flex rounded-full px-3 py-1 font-body text-xs font-semibold capitalize ${o.orderstatus === "delivered" ? "bg-green-50 text-green-800" : o.orderstatus === "shipped" ? "bg-blue-50 text-blue-800" : "bg-amber-50 text-amber-800"}`}>{o.orderstatus}</span></td>
                <td>
                  <div className="flex items-center gap-2">
                    <Link to={`/admin/order/${o._id}`} className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-lg text-blue-700 hover:bg-blue-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-700"><MdEdit /></Link>
                    <button className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-lg text-red-700 hover:bg-red-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-red-700" onClick={() => dispatch(deleteOrder(o._id))}><MdDelete /></button>
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
