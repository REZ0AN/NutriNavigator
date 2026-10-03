import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link } from "react-router-dom";
import { MdArrowForward } from "react-icons/md";
import axios from "axios";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from "recharts";
import MetaData from "../../layouts/Header/MetaData";
import AdminLayout from "../AdminLayout";
import AnalyticsToolbar from "./AnalyticsToolbar";
import { AnalyticsPanel, MetricCard } from "./DashboardPrimitives";
import { getAllAdminProducts } from "../../../store/slices/productSlice";
import { fetchAllOrders, fetchOrderDashboardMetrics } from "../../../store/slices/orderSlice";
import { getAllUsers } from "../../../store/slices/userSlice";

const GREEN  = "#173525";
const AMBER  = "#D4830A";
const BLUE   = "#1A5F8A";
const PIE_COLORS = { processing: AMBER, shipped: BLUE, delivered: GREEN };
const ORDER_STATUS_CLASSES = {
  processing: "bg-amber-50 text-amber-800",
  shipped: "bg-blue-50 text-blue-800",
  delivered: "bg-green-50 text-green-800",
};
const MAX_RANGE_DAYS = 366;

const pad = (value) => String(value).padStart(2, "0");
const formatDateInput = (date) => `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;
export const getPresetRange = (preset, now = new Date()) => {
  const end = new Date(now);
  const start = new Date(end);
  if (preset === "today") {
    // start already represents today.
  } else if (preset === "sevenDays") {
    start.setUTCDate(start.getUTCDate() - 6);
  } else if (preset === "thirtyDays") {
    start.setUTCDate(start.getUTCDate() - 29);
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
    .sort((a, b) => a.stock - b.stock || a.name.localeCompare(b.name))
    .slice(0, 6)
    .map((p) => ({ id: p._id, name: p.name, stock: p.stock }));

const RevenueTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg bg-brand-900 px-4 py-2 shadow-md">
      <p className="font-body text-xs text-white/70">{label}</p>
      <p className="font-body text-sm font-semibold text-white">Order value: ৳{payload[0].value.toLocaleString()}</p>
    </div>
  );
};

const Dashboard = () => {
  const dispatch = useDispatch();
  const { products, loading: productsLoading, error: productsError } = useSelector((state) => state.productsR);
  const { orders, loading } = useSelector((state) => state.allOrdersR);
  const { users, loading: usersLoading, error: usersError } = useSelector((state) => state.adminUsersR);
  const [preset, setPreset] = useState("sevenDays");
  const [customRange, setCustomRange] = useState(getPresetRange("sevenDays"));
  const [granularity, setGranularity] = useState("day");
  const [metricsView, setMetricsView] = useState({ key: "", data: null, loading: false, error: "", updatedAt: null });
  const [refreshKey, setRefreshKey] = useState(0);
  const [exporting, setExporting] = useState(false);
  const selectedRange = preset === "custom" ? customRange : getPresetRange(preset);
  const selectedRangeTooLarge = isRangeTooLarge(selectedRange);
  const rangeKey = `${selectedRange.from}:${selectedRange.to}`;
  const validRange = Boolean(selectedRange.from && selectedRange.to && !selectedRangeTooLarge && selectedRange.from <= selectedRange.to);

  useEffect(() => {
    dispatch(getAllAdminProducts());
    dispatch(fetchAllOrders());
    dispatch(getAllUsers());
  }, [dispatch]);

  useEffect(() => {
    if (!validRange) return;
    let active = true;
    setMetricsView({ key: rangeKey, data: null, loading: true, error: "", updatedAt: null });
    dispatch(fetchOrderDashboardMetrics({ from: selectedRange.from, to: selectedRange.to }))
      .unwrap()
      .then((data) => {
        if (active) setMetricsView({ key: rangeKey, data, loading: false, error: "", updatedAt: new Date() });
      })
      .catch((error) => {
        if (active) setMetricsView({ key: rangeKey, data: null, loading: false, error: String(error), updatedAt: null });
      });
    return () => { active = false; };
  }, [dispatch, selectedRange.from, selectedRange.to, validRange, rangeKey, refreshKey]);

  const currentMetrics = metricsView.key === rangeKey
    ? metricsView
    : { key: rangeKey, data: null, loading: validRange, error: "", updatedAt: null };
  const metrics = currentMetrics.data;
  const orderCount = metrics?.totalCount || 0;
  const orderValue = metrics?.totalAmount || 0;
  const averageOrderValue = orderCount ? orderValue / orderCount : null;
  const customerCount = users?.filter((user) => user.role === "user").length || 0;
  const outOfStock = products?.filter((product) => product.stock < 1).length || 0;
  const stockData = buildStockData(products);
  const statusData = metrics?.statusCounts || [];
  const orderValueData = metrics ? groupOrderValueData(metrics.dailyRevenue || [], selectedRange, granularity) : [];
  const money = (value) => `৳${value.toLocaleString("en-US", { maximumFractionDigits: 2 })}`;

  const handleCustomDate = (field, value) => {
    setCustomRange((current) => ({ ...(preset === "custom" ? current : selectedRange), [field]: value }));
    setPreset("custom");
  };

  const handleExport = async () => {
    if (!validRange) return;
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

  const metricsFallback = !validRange ? (
    <p className="py-8 text-center font-body text-sm text-admin-muted">Choose a valid UTC date range.</p>
  ) : currentMetrics.loading ? (
    <p className="py-8 text-center font-body text-sm text-admin-muted" role="status">Loading analytics…</p>
  ) : currentMetrics.error ? (
    <div className="flex flex-col items-center gap-3 py-8 text-center font-body text-sm text-red-700" role="alert">
      <p>{currentMetrics.error}</p>
      <button type="button" onClick={() => setRefreshKey((key) => key + 1)} className="rounded-lg border border-red-300 px-3 py-2 font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-700">Try again</button>
    </div>
  ) : null;

  return (
    <AdminLayout mainClassName="!overflow-visible !bg-admin-canvas !p-0">
      <MetaData title="Admin Dashboard" />
      <div className="mx-auto max-w-analytics px-4 pb-12 pt-5 sm:px-6 xl:px-8">
        <header className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="font-body text-2xl font-semibold tracking-tight text-admin-ink">Dashboard</h1>
            <p className="mt-1 font-body text-sm text-admin-muted">Store performance and operations</p>
          </div>
          <p className="font-body text-xs text-admin-muted">
            {currentMetrics.updatedAt ? `Metrics updated ${currentMetrics.updatedAt.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}` : "Metrics update when a range loads"}
          </p>
        </header>

        <AnalyticsToolbar
          preset={preset}
          onPresetChange={setPreset}
          range={selectedRange}
          validRange={validRange}
          rangeTooLarge={selectedRangeTooLarge}
          onDateChange={handleCustomDate}
          onExport={handleExport}
          exporting={exporting}
        />

        <section aria-label="Key performance indicators" className="mt-5">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard label="Order value" value={metrics ? money(orderValue) : "—"} note="Selected period · all statuses" to="/admin/orders" />
            <MetricCard label="Orders" value={metrics ? orderCount.toLocaleString() : "—"} note="Selected period" to="/admin/orders" />
            <MetricCard label="Average order value" value={metrics ? averageOrderValue === null ? "—" : money(averageOrderValue) : "—"} note="Selected period" />
            <MetricCard label="Customer accounts" value={usersLoading || usersError ? "—" : customerCount.toLocaleString()} note={usersError ? "Unable to load accounts" : "All time · buyer accounts"} to="/admin/users" />
          </div>
        </section>

        <section aria-labelledby="dashboard-performance-title" className="mt-7">
          <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
            <h2 id="dashboard-performance-title" className="font-body text-xs font-semibold uppercase tracking-widest text-admin-muted">Performance</h2>
            <p className="font-body text-xs text-admin-muted">Orders created in the selected UTC period</p>
          </div>
          <div className="grid gap-4 xl:grid-cols-12">
            <AnalyticsPanel title="Order value trend" className="xl:col-span-8" action={
              <div className="flex gap-1 rounded-lg bg-admin-canvas p-1" role="group" aria-label="Chart time grouping">
                {["day", "week", "month"].map((option) => (
                  <button key={option} type="button" aria-pressed={granularity === option} onClick={() => setGranularity(option)}
                    className={`min-h-9 rounded-md px-3 font-body text-xs font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-700 ${granularity === option ? "bg-white text-brand-900 shadow-sm" : "text-admin-muted hover:text-admin-ink"}`}>
                    {option === "day" ? "Daily" : option === "week" ? "Weekly" : "Monthly"}
                  </button>
                ))}
              </div>
            }>
              <div className="mb-3 flex flex-wrap items-baseline gap-2">
                <strong className="font-body text-2xl font-semibold text-admin-ink">{metrics ? money(orderValue) : "—"}</strong>
                <span className="font-body text-xs text-admin-muted">{selectedRange.from} – {selectedRange.to} · UTC</span>
              </div>
              {metricsFallback || (orderCount === 0 ? (
                <div className="flex min-h-40 flex-col items-center justify-center gap-3 text-center">
                  <p className="font-body text-sm text-admin-muted">No orders in this period.</p>
                  <button type="button" onClick={() => setPreset("thirtyDays")} className="font-body text-sm font-semibold text-brand-700 underline-offset-2 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-700">View previous 30 days</button>
                </div>
              ) : (
                <div role="img" aria-label={`Order value trend grouped by ${granularity}`}>
                  <ResponsiveContainer width="100%" height={270}>
                    <AreaChart data={orderValueData} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                      <defs><linearGradient id="orderValueFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={GREEN} stopOpacity={0.18} /><stop offset="100%" stopColor={GREEN} stopOpacity={0} /></linearGradient></defs>
                      <CartesianGrid stroke="#E5EAE6" vertical={false} />
                      <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#737873" }} axisLine={false} tickLine={false} minTickGap={24} />
                      <YAxis tick={{ fontSize: 11, fill: "#737873" }} axisLine={false} tickLine={false} tickFormatter={(value) => `৳${(value / 1000).toFixed(0)}k`} width={46} />
                      <Tooltip content={<RevenueTooltip />} />
                      <Area type="monotone" dataKey="revenue" stroke={GREEN} strokeWidth={2} fill="url(#orderValueFill)" activeDot={{ r: 5 }} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              ))}
            </AnalyticsPanel>

            <AnalyticsPanel title="Order status" className="xl:col-span-4">
              {metricsFallback || (orderCount === 0 ? (
                <div className="flex min-h-40 flex-col items-center justify-center gap-3 text-center">
                  <p className="font-body text-sm text-admin-muted">No orders in this period. Try another date range.</p>
                  <Link to="/admin/orders" className="font-body text-sm font-semibold text-brand-700 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-700">View all orders</Link>
                </div>
              ) : (
                <>
                  <ResponsiveContainer width="100%" height={175}>
                    <PieChart><Pie data={statusData} cx="50%" cy="50%" innerRadius={53} outerRadius={75} paddingAngle={2} dataKey="value" stroke="none">
                      {statusData.map((entry) => <Cell key={entry.name} fill={PIE_COLORS[entry.name] || "#737873"} />)}
                    </Pie><Tooltip formatter={(value, name) => [value, name]} /></PieChart>
                  </ResponsiveContainer>
                  <ul className="space-y-2 font-body text-sm">
                    {statusData.map((entry) => (
                      <li key={entry.name} className="flex items-center justify-between gap-3">
                        <span className="flex items-center gap-2 capitalize text-admin-muted"><i aria-hidden="true" className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: PIE_COLORS[entry.name] || "#737873" }} />{entry.name}</span>
                        <strong className="text-admin-ink">{entry.value}</strong>
                      </li>
                    ))}
                  </ul>
                </>
              ))}
            </AnalyticsPanel>
          </div>
        </section>

        <section aria-labelledby="dashboard-operations-title" className="mt-7">
          <h2 id="dashboard-operations-title" className="mb-3 font-body text-xs font-semibold uppercase tracking-widest text-admin-muted">Operations · all time</h2>
          <div className="grid gap-4 lg:grid-cols-2">
            <AnalyticsPanel title="Recent orders" action={<Link to="/admin/orders" className="inline-flex items-center gap-1 font-body text-xs font-semibold text-brand-700 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-700">View all <MdArrowForward aria-hidden="true" /></Link>}>
              {loading ? <p className="py-8 text-center font-body text-sm text-admin-muted">Loading orders…</p> : orders?.length ? (
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse font-body text-sm">
                    <thead><tr className="border-b border-admin-border text-left text-xs text-admin-muted"><th className="pb-3 font-medium">Order</th><th className="pb-3 font-medium">Amount</th><th className="pb-3 font-medium">Status</th></tr></thead>
                    <tbody>{orders.slice(0, 6).map((order) => (
                      <tr key={order._id} className="border-b border-admin-border last:border-0">
                        <td className="py-3 pr-3"><Link to={`/admin/order/${order._id}`} className="font-medium text-brand-700 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-700">#{order._id.slice(-8)}</Link></td>
                        <td className="py-3 pr-3 text-admin-ink">{money(order.totalprice || 0)}</td>
                        <td className="py-3"><span className={`inline-flex rounded-full px-2.5 py-1 font-body text-xs font-medium capitalize ${ORDER_STATUS_CLASSES[order.orderstatus] || "bg-admin-canvas text-admin-muted"}`}>{order.orderstatus}</span></td>
                      </tr>
                    ))}</tbody>
                  </table>
                </div>
              ) : <p className="py-8 text-center font-body text-sm text-admin-muted">No orders yet.</p>}
            </AnalyticsPanel>
            <AnalyticsPanel title="Lowest stock" action={<Link to="/admin/products" className="inline-flex items-center gap-1 font-body text-xs font-semibold text-brand-700 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-700">View products <MdArrowForward aria-hidden="true" /></Link>}>
              <p className="mb-3 font-body text-xs text-admin-muted">{productsLoading || productsError ? "Inventory unavailable" : `${products?.length || 0} products · ${outOfStock} out of stock`}</p>
              {productsLoading ? <p className="py-8 text-center font-body text-sm text-admin-muted">Loading products…</p> : productsError ? <p className="py-8 text-center font-body text-sm text-red-700" role="alert">Unable to load products.</p> : stockData.length ? (
                <ul className="divide-y divide-admin-border font-body text-sm">
                  {stockData.map((product) => (
                    <li key={product.id} className="flex items-center justify-between gap-3 py-2.5">
                      <Link to={`/admin/product/${product.id}`} className="truncate font-medium text-admin-ink hover:text-brand-700 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-700">{product.name}</Link>
                      <span className={`shrink-0 ${product.stock < 1 ? "font-semibold text-red-700" : "text-admin-muted"}`}>{product.stock} in stock</span>
                    </li>
                  ))}
                </ul>
              ) : <p className="py-8 text-center font-body text-sm text-admin-muted">No products yet.</p>}
            </AnalyticsPanel>
          </div>
        </section>
      </div>
    </AdminLayout>
  );
};

export default Dashboard;
