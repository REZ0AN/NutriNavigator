import React, { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link } from "react-router-dom";
import {
  MdInventory, MdShoppingBag, MdPeople,
  MdWallet,
} from "react-icons/md";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
  BarChart, Bar,
} from "recharts";
import MetaData from "../../layouts/Header/MetaData";
import Loader from "../../layouts/Loader/Loader";
import AdminLayout from "../AdminLayout";
import { getAllAdminProducts } from "../../../store/slices/productSlice";
import { fetchAllOrders } from "../../../store/slices/orderSlice";
import { getAllUsers } from "../../../store/slices/userSlice";
import "./Dashboard.css";

const GREEN  = "#1A3C2E";
const LIME   = "#8EBE28";
const AMBER  = "#D4830A";
const BLUE   = "#1A5F8A";
const PURPLE = "#7B3F9E";
const PIE_COLORS = { processing: AMBER, shipped: BLUE, delivered: GREEN };

const buildRevenueData = (orders = []) => {
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return {
      label: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      dateStr: d.toISOString().slice(0, 10),
      revenue: 0,
    };
  });
  orders.forEach((o) => {
    const date = new Date(o.createdAt).toISOString().slice(0, 10);
    const slot = days.find((d) => d.dateStr === date);
    if (slot) slot.revenue += o.totalprice || 0;
  });
  return days.map(({ label, revenue }) => ({ label, revenue }));
};

const buildStatusData = (orders = []) => {
  const counts = orders.reduce((acc, o) => {
    const s = o.orderstatus || "processing";
    acc[s] = (acc[s] || 0) + 1;
    return acc;
  }, {});
  return Object.entries(counts).map(([name, value]) => ({ name, value }));
};

const buildStockData = (products = []) =>
  [...products]
    .sort((a, b) => b.stock - a.stock)
    .slice(0, 6)
    .map((p) => ({
      name: p.name.length > 14 ? p.name.slice(0, 14) + "…" : p.name,
      stock: p.stock,
    }));

const RevenueTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="chart-tooltip">
      <p className="chart-tooltip__label">{label}</p>
      <p className="chart-tooltip__value">৳{payload[0].value.toLocaleString()}</p>
    </div>
  );
};

const Dashboard = () => {
  const dispatch = useDispatch();
  const { products } = useSelector((s) => s.productsR);
  const { orders, totalAmount, loading } = useSelector((s) => s.allOrdersR);
  const { users } = useSelector((s) => s.adminUsersR);

useEffect(() => {
  dispatch(getAllAdminProducts());
  dispatch(fetchAllOrders());
  dispatch(getAllUsers());
}, [dispatch]);

  const outOfStock  = products?.filter((p) => p.stock < 1).length || 0;
  const revenueData = buildRevenueData(orders);
  const statusData  = buildStatusData(orders);
  const stockData   = buildStockData(products);

  const stats = [
    { label: "Total Revenue", value: `৳${(totalAmount || 0).toLocaleString()}`, icon: MdWallet, color: GREEN,  bg: "#EBF7EF", link: "/admin/orders" },
    { label: "Products",      value: products?.length || 0,                      icon: MdInventory,     color: BLUE,   bg: "#E8F2FA", link: "/admin/products" },
    { label: "Orders",        value: orders?.length || 0,                        icon: MdShoppingBag,   color: AMBER,  bg: "#FEF3E2", link: "/admin/orders" },
    { label: "Users",         value: users?.length || 0,                         icon: MdPeople,        color: PURPLE, bg: "#F3EBF9", link: "/admin/users" },
  ];

  if (loading) return <Loader />;

  return (
    <AdminLayout>
      <MetaData title="Admin Dashboard" />
      <h1 className="admin-page-title">Dashboard</h1>

      <div className="dashboard-stats">
        {stats.map(({ label, value, icon: Icon, color, bg, link }) => (
          <Link key={label} to={link} className="stat-card" style={{ "--stat-color": color, "--stat-bg": bg }}>
            <div className="stat-card__icon"><Icon /></div>
            <div className="stat-card__body">
              <p className="stat-card__label">{label}</p>
              <p className="stat-card__value">{value}</p>
            </div>
          </Link>
        ))}
      </div>

      {outOfStock > 0 && (
        <div className="dashboard-alert">
          <strong>{outOfStock}</strong> product{outOfStock > 1 ? "s are" : " is"} out of stock.{" "}
          <Link to="/admin/products">View Products →</Link>
        </div>
      )}

      <div className="dashboard-charts-row">
        <div className="chart-card ">
          <h3 className="chart-card__title">Revenue — Last 7 Days</h3>
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={revenueData} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E2D9CC" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#8A8A8A" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "#8A8A8A" }} axisLine={false} tickLine={false}
                tickFormatter={(v) => `৳${(v / 1000).toFixed(0)}k`} width={44} />
              <Tooltip content={<RevenueTooltip />} />
              <Line type="monotone" dataKey="revenue" stroke={LIME} strokeWidth={2.5}
                dot={{ fill: LIME, r: 4, strokeWidth: 0 }}
                activeDot={{ r: 6, fill: GREEN }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-card ">
          <h3 className="chart-card__title">Order Status</h3>
          {statusData.length > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie data={statusData} cx="50%" cy="42%" innerRadius={58} outerRadius={86}
                  paddingAngle={3} dataKey="value">
                  {statusData.map((entry) => (
                    <Cell key={entry.name} fill={PIE_COLORS[entry.name] || "#ccc"} />
                  ))}
                </Pie>
                <Tooltip formatter={(v, n) => [v, n.charAt(0).toUpperCase() + n.slice(1)]} />
                <Legend iconType="circle" iconSize={8}
                  formatter={(v) => v.charAt(0).toUpperCase() + v.slice(1)}
                  wrapperStyle={{ fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p className="chart-empty">No orders yet</p>
          )}
        </div>
      </div>

      <div className="dashboard-charts-row">
               <div className="chart-card ">
          <h3 className="chart-card__title">Recent Orders</h3>
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr><th>Order ID</th><th>Amount</th><th>Status</th></tr>
              </thead>
              <tbody>
                {orders?.length > 0 ? orders.slice(0, 6).map((o) => (
                  <tr key={o._id}>
                    <td className="orders-id">{o._id}</td>
                    <td>৳{o.totalprice?.toLocaleString()}</td>
                    <td>
                      <span className={`status-badge ${
                        o.orderstatus === "delivered" ? "status--green"
                        : o.orderstatus === "shipped"  ? "status--blue"
                        : "status--orange"
                      }`}>{o.orderstatus}</span>
                    </td>
                  </tr>
                )) : (
                  <tr><td colSpan={3} style={{ textAlign: "center", color: "#A0A0A0", padding: "2rem" }}>No orders yet</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
        <div className="chart-card ">
          <h3 className="chart-card__title">Stock Levels (Top 6)</h3>
          {stockData.length > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={stockData} layout="vertical" margin={{ top: 0, right: 12, left: 4, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2D9CC" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11, fill: "#8A8A8A" }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: "#4A4A4A" }}
                  axisLine={false} tickLine={false} width={90} />
                <Tooltip formatter={(v) => [v, "In stock"]} />
                <Bar dataKey="stock" fill={LIME} radius={[0, 4, 4, 0]} maxBarSize={18} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="chart-empty">No products yet</p>
          )}
        </div>
 

      </div>
    </AdminLayout>
  );
};

export default Dashboard;