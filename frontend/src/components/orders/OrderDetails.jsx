import React, { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useParams, Link } from "react-router-dom";
import { toast } from "react-toastify";
import MetaData from "../layouts/Header/MetaData";
import Loader from "../layouts/Loader/Loader";
import { fetchOrderDetails } from "../../store/slices/orderSlice";
import { toastifyOptions } from "../../utils/toastify";
import "./Orders.css";

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
      <div className="order-details-page">
        <h1 className="orders-title">Order <span className="order-id-span">#{order._id}</span></h1>
        <div className="order-details-grid">
          <div className="order-details-col">
            <div className="confirm-section">
              <h3>Shipping Info</h3>
              <p><b>Name:</b> {order.user?.name}</p>
              <p><b>Phone:</b> {order.shippinginfo?.phoneNo}</p>
              <p><b>Address:</b> {order.shippinginfo?.address}, {order.shippinginfo?.city} — {order.shippinginfo?.pinCode}</p>
            </div>
            <div className="confirm-section">
              <h3>Payment</h3>
              <p><span className={paid ? "greenColor" : "redColor"}>{paid ? "PAID" : "NOT PAID"}</span></p>
              <p><b>Amount:</b> ৳{order.totalprice?.toLocaleString()}</p>
            </div>
            <div className="confirm-section">
              <h3>Order Status</h3>
              <p><span className={order.orderstatus === "delivered" ? "greenColor" : "redColor"}>{order.orderstatus}</span></p>
            </div>
          </div>
          <div className="confirm-section">
            <h3>Order Items</h3>
            {order.orderitems?.map((item) => (
              <div key={item.product} className="confirm-item">
                <img src={item.image?.url || item.image} alt={item.name} />
                <Link to={`/product/${item.product}`}>{item.name}</Link>
                <span>{item.quantity} × ৳{item.price} = <b>৳{item.price * item.quantity}</b></span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
};
export default OrderDetails;
