import React, { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link } from "react-router-dom";
import { toast } from "react-toastify";
import { MdLaunch } from "react-icons/md";
import MetaData from "../layouts/Header/MetaData";
import Loader from "../layouts/Loader/Loader";
import { fetchMyOrders, clearMyOrdersError } from "../../store/slices/orderSlice";
import { toastifyOptions } from "../../utils/toastify";
import "./Orders.css";

const STATUS_CLASS = { delivered: "status--green", shipped: "status--blue", processing: "status--orange" };

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
      <div className="orders-page">
        <h1 className="orders-title">{user?.name}'s Orders</h1>
        {orders?.length > 0 ? (
          <div className="orders-table-wrap">
            <table className="orders-table">
              <thead>
                <tr>
                  <th>Order ID</th>
                  <th>Items</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>Details</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <tr key={order._id}>
                    <td className="orders-id">{order._id}</td>
                    <td>{order.orderitems.length}</td>
                    <td>৳{order.totalprice.toLocaleString()}</td>
                    <td><span className={`status-badge ${STATUS_CLASS[order.orderstatus] || ""}`}>{order.orderstatus}</span></td>
                    <td><Link to={`/order/${order._id}`} className="orders-view-link"><MdLaunch /></Link></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="orders-empty">
            <p>You haven't placed any orders yet.</p>
            <Link to="/products" className="btn btn--primary">Shop Now</Link>
          </div>
        )}
      </div>
    </>
  );
};
export default MyOrders;
