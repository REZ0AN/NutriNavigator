import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link } from "react-router-dom";
import {
  MdInventory, MdShoppingBag, MdPeople,
  MdWallet, MdDownload,
} from "react-icons/md";
import axios from "axios";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
  BarChart, Bar,
} from "recharts";
import MetaData from "../../layouts/Header/MetaData";
import Loader from "../../layouts/Loader/Loader";
import AdminLayout from "../AdminLayout";
import { getAllAdminProducts } from "../../../store/slices/productSlice";
import { fetchAllOrders, fetchOrderDashboardMetrics } from "../../../store/slices/orderSlice";
import { getAllUsers } from "../../../store/slices/userSlice";
import "./Dashboard.css";

const GREEN  = "#1A3C2E";
const LIME   = "#8EBE28";
const AMBER  = "#D4830A";
const BLUE   = "#1A5F8A";
const PURPLE = "#7B3F9E";
const PIE_COLORS = { processing: AMBER, shipped: BLUE, delivered: GREEN };
const PRESET_LABELS = { today: "Today", week: "This Week", month: "This Month", year: "This Year", custom: "Custom Range" };
const MAX_RANGE_DAYS = 366;

const pad = (value) => String(value).padStart(2, "0");
const formatDateInput = (date) => `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;
const getPresetRange = (preset) => {
  const end = new Date();
  const start = new Date(end);
  if (preset === "today") {
    // start already represents today.
  } else if (preset === "week") {
    const day = start.getUTCDay() || 7;
    start.setUTCDate(start.getUTCDate() - day + 1);
  } else if (preset === "month") {
    start.setUTCDate(1);
  } else if (preset === "year") {
    start.setUTCMonth(0, 1);
  }
  return { from: formatDateInput(start), to: formatDateInput(end) };
};

const csvValue = (value) => `"${String(value ?? "").replaceAll('"', '""')}"`;
const downloadDeliveredOrders = (orders, range) => {
  const headers = ["Order ID", "Customer", "Email", "Delivered At", "Status", "Total"];
  const rows = orders.map((order) => [
    order._id,
    order.user?.name,
    order.user?.email,
    order.deliveredat ? new Date(order.deliveredat).toISOString() : "",
    order.orderstatus,
    order.totalprice,
  ]);
  const csv = [headers, ...rows].map((row) => row.map(csvValue).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `delivered-orders-${range.from}-to-${range.to}.csv`;
  link.click();
  URL.revokeObjectURL(url);
};

export const buildRevenueData = (orders = [], range) => {
  if (!range?.from || !range?.to || range.from > range.to) return [];
  const start = new Date(`${range.from}T00:00:00.000Z`);
  const end = new Date(`${range.to}T00:00:00.000Z`);
  const days = [];
  const revenueByDate = new Map();
  for (const d = new Date(start); d <= end; d.setUTCDate(d.getUTCDate() + 1)) {
    const dateStr = formatDateInput(d);
    days.push({
      label: d.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" }),
      dateStr,
      revenue: 0,
    });
    revenueByDate.set(dateStr, days[days.length - 1]);
  }
  orders.forEach((o) => {
    const date = formatDateInput(new Date(o.createdAt));
    const slot = revenueByDate.get(date);
    if (slot) slot.revenue += o.totalprice || 0;
  });
  return days.map(({ label, revenue }) => ({ label, revenue }));
};

export const buildRevenueDataFromMetrics = (dailyRevenue = [], range) => {
  const byDate = new Map(dailyRevenue.map(({ _id: date, totalAmount }) => [date, totalAmount]));
  if (!range?.from || !range?.to || range.from > range.to) return [];
  const start = new Date(`${range.from}T00:00:00.000Z`);
  const end = new Date(`${range.to}T00:00:00.000Z`);
  const result = [];
  for (const date = new Date(start); date <= end; date.setUTCDate(date.getUTCDate() + 1)) {
    const dateKey = `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;
    result.push({
      label: date.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" }),
      revenue: byDate.get(dateKey) || 0,
    });
  }
  return result;
};

export const isRangeTooLarge = (range, maxDays = MAX_RANGE_DAYS) => {
  if (!range?.from || !range?.to || range.from > range.to) return false;
  return ((new Date(`${range.to}T00:00:00.000Z`) - new Date(`${range.from}T00:00:00.000Z`)) / 86400000 + 1) > maxDays;
};

export const groupOrderValueData = (dailyRevenue = [], range, granularity = "day") => {
  if (granularity === "day") return buildRevenueDataFromMetrics(dailyRevenue, range);
  if (!range?.from || !range?.to || range.from > range.to) return [];

  const amounts = new Map(dailyRevenue.map(({ _id, totalAmount }) => [_id, totalAmount]));
  const buckets = new Map();
  const start = new Date(`${range.from}T00:00:00.000Z`);
  const end = new Date(`${range.to}T00:00:00.000Z`);
  for (const date = new Date(start); date <= end; date.setUTCDate(date.getUTCDate() + 1)) {
    const dateKey = formatDateInput(date);
    const bucketStart = new Date(date);
    if (granularity === "week") {
      bucketStart.setUTCDate(bucketStart.getUTCDate() - ((bucketStart.getUTCDay() + 6) % 7));
    } else {
      bucketStart.setUTCDate(1);
    }
    const bucketKey = formatDateInput(bucketStart);
    if (!buckets.has(bucketKey)) {
      buckets.set(bucketKey, {
        label: granularity === "week"
          ? `Week of ${bucketStart.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" })}`
          : bucketStart.toLocaleDateString("en-US", { month: "short", year: "numeric", timeZone: "UTC" }),
        revenue: 0,
      });
    }
    buckets.get(bucketKey).revenue += amounts.get(dateKey) || 0;
  }
  return [...buckets.values()];
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
      <p className="chart-tooltip__value">Order value: ৳{payload[0].value.toLocaleString()}</p>
    </div>
  );
};

const Dashboard = () => {
  const dispatch = useDispatch();
  const { products } = useSelector((s) => s.productsR);
  const { orders, totalAmount, totalCount, loading } = useSelector((s) => s.allOrdersR);
  const { users } = useSelector((s) => s.adminUsersR);
  const [preset, setPreset] = useState("week");
  const [customRange, setCustomRange] = useState({ from: "", to: "" });
  const [granularity, setGranularity] = useState("day");
  const [metricsView, setMetricsView] = useState({ key: "", data: null, loading: false, error: "" });
  const [refreshKey, setRefreshKey] = useState(0);
  const [exporting, setExporting] = useState(false);
  const selectedRange = preset === "custom" ? customRange : getPresetRange(preset);
  const selectedRangeTooLarge = isRangeTooLarge(selectedRange);
  const rangeKey = `${selectedRange.from}:${selectedRange.to}`;
  const validRange = selectedRange.from && selectedRange.to && !selectedRangeTooLarge && selectedRange.from <= selectedRange.to;

useEffect(() => {
  dispatch(getAllAdminProducts());
  dispatch(fetchAllOrders());
  dispatch(getAllUsers());
}, [dispatch]);

useEffect(() => {
  if (!validRange) return;
  let active = true;
  setMetricsView({ key: rangeKey, data: null, loading: true, error: "" });
  dispatch(fetchOrderDashboardMetrics({ from: selectedRange.from, to: selectedRange.to }))
    .unwrap()
    .then((data) => {
      if (active) setMetricsView({ key: rangeKey, data, loading: false, error: "" });
    })
    .catch((error) => {
      if (active) setMetricsView({ key: rangeKey, data: null, loading: false, error: String(error) });
    });
  return () => { active = false; };
}, [dispatch, selectedRange.from, selectedRange.to, validRange, rangeKey, refreshKey]);

  const outOfStock  = products?.filter((p) => p.stock < 1).length || 0;
  const currentMetrics = metricsView.key === rangeKey ? metricsView : { key: rangeKey, data: null, loading: Boolean(validRange), error: "" };
  const revenueData = currentMetrics.data
    ? groupOrderValueData(currentMetrics.data.dailyRevenue || [], selectedRange, granularity)
    : [];
  const statusData = currentMetrics.data?.statusCounts || [];
  const stockData   = buildStockData(products);

  const handleCustomDate = (field, value) => {
    setPreset("custom");
    setCustomRange((current) => ({ ...current, [field]: value }));
  };

  const handleExport = async () => {
    if (!selectedRange.from || !selectedRange.to || selectedRange.from > selectedRange.to || selectedRangeTooLarge) return;
    setExporting(true);
    try {
      const { data } = await axios.get("/api/v1/admin/orders/export", { params: selectedRange });
      downloadDeliveredOrders(data.orders || [], selectedRange);
    } catch (error) {
      window.alert(error.response?.data?.message || "Unable to export delivered orders.");
    } finally {
      setExporting(false);
    }
  };

  const stats = [
    { label: "Total Order Value", value: `৳${(totalAmount || 0).toLocaleString()}`, icon: MdWallet, color: GREEN,  bg: "#EBF7EF", link: "/admin/orders" },
    { label: "Products",      value: products?.length || 0,                      icon: MdInventory,     color: BLUE,   bg: "#E8F2FA", link: "/admin/products" },
    { label: "Orders",        value: totalCount ?? orders?.length ?? 0,          icon: MdShoppingBag,   color: AMBER,  bg: "#FEF3E2", link: "/admin/orders" },
    { label: "Users",         value: users?.length || 0,                         icon: MdPeople,        color: PURPLE, bg: "#F3EBF9", link: "/admin/users" },
  ];

  if (loading) return <Loader />;

  return (
    <AdminLayout>
      <MetaData title="Admin Dashboard" />
      <h1 className="admin-page-title">Dashboard</h1>
      <p className="dashboard-overview-label">All-time overview</p>

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

      <section className="dashboard-range-summary" aria-label="Selected date range summary">
        <div>
          <p className="dashboard-range-summary__eyebrow">Selected range · UTC</p>
          <h2>{validRange ? `${selectedRange.from} to ${selectedRange.to}` : "Choose a valid date range"}</h2>
        </div>
        <div className="dashboard-range-summary__metrics">
          <div><span>Order value</span><strong>{currentMetrics.data ? `৳${currentMetrics.data.totalAmount.toLocaleString()}` : "—"}</strong></div>
          <div><span>Orders</span><strong>{currentMetrics.data ? currentMetrics.data.totalCount.toLocaleString() : "—"}</strong></div>
        </div>
      </section>

      <div className="dashboard-charts-row">
        <div className="chart-card ">
          <div className="chart-card__header">
            <div>
              <h3 className="chart-card__title">Order Value — {PRESET_LABELS[preset]}</h3>
              <div className="chart-filter-presets" role="group" aria-label="Order value date presets">
                {["today", "week", "month", "year"].map((option) => (
                  <button key={option} type="button" className={preset === option ? "is-active" : ""} onClick={() => setPreset(option)}>
                    {option === "today" ? "Today" : option === "week" ? "This Week" : option === "month" ? "This Month" : "This Year"}
                  </button>
                ))}
              </div>
              <div className="chart-filter-presets chart-granularity" role="group" aria-label="Chart time grouping">
                {["day", "week", "month"].map((option) => (
                  <button key={option} type="button" className={granularity === option ? "is-active" : ""} aria-pressed={granularity === option} onClick={() => setGranularity(option)}>
                    {option === "day" ? "Daily" : option === "week" ? "Weekly" : "Monthly"}
                  </button>
                ))}
              </div>
            </div>
            <div className="chart-date-controls">
              <label>From<input type="date" value={customRange.from} onChange={(event) => handleCustomDate("from", event.target.value)} /></label>
              <label>To<input type="date" value={customRange.to} onChange={(event) => handleCustomDate("to", event.target.value)} /></label>
              <button type="button" className="chart-export-button" onClick={handleExport} disabled={exporting || !selectedRange.from || !selectedRange.to || selectedRange.from > selectedRange.to || selectedRangeTooLarge}>
                <MdDownload /> {exporting ? "Exporting…" : "Export Delivered"}
              </button>
              {selectedRangeTooLarge && <small className="chart-range-error">Select a range of {MAX_RANGE_DAYS} days or less.</small>}
              <small>Dates use UTC. Order value includes all order statuses.</small>
            </div>
          </div>
          {!validRange ? <p className="chart-empty">Choose a valid date range.</p>
            : currentMetrics.loading ? <p className="chart-empty">Loading analytics…</p>
            : currentMetrics.error ? <div className="chart-error" role="alert"><p>{currentMetrics.error}</p><button type="button" onClick={() => setRefreshKey((key) => key + 1)}>Try again</button></div>
            : <ResponsiveContainer width="100%" height={240}>
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
          </ResponsiveContainer>}
        </div>

        <div className="chart-card ">
          <h3 className="chart-card__title">Order Status</h3>
          {currentMetrics.loading ? <p className="chart-empty">Loading analytics…</p> : currentMetrics.error || !validRange ? <p className="chart-empty">Status data unavailable</p> : statusData.length > 0 ? (
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
