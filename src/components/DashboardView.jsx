import React, { useMemo } from "react";
import {
  TrendingUp,
  Receipt,
  Boxes,
  AlertTriangle,
  PlusCircle,
  ShoppingCart,
  ArrowRight,
  Clock,
  Sparkles,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { useStore } from "../context/StoreContext.jsx";
import { formatINR } from "../utils/calculations.js";

export default function DashboardView() {
  const {
    products,
    sales,
    setActiveTab,
    setRecentInvoice,
    setIsReceiptOpen,
  } = useStore();

  // Helper to ensure accurate non-zero total
  const getSaleTotal = (s) =>
    Number(s.total) > 0
      ? Number(s.total)
      : (s.items?.reduce(
          (sum, it) =>
            sum +
            (Number(it.unit_price ?? it.unitPrice) || 0) *
              (Number(it.quantity) || 1),
          0
        ) || 0);

  // Metrics Calculations
  const todayStr = new Date().toISOString().slice(0, 10);
  const todaySales = sales.filter(
    (s) => s.created_at?.slice(0, 10) === todayStr && s.status !== "Refunded"
  );
  const todayRevenue = todaySales.reduce((sum, s) => sum + getSaleTotal(s), 0);
  const totalBilledCount = todaySales.length;

  // Inventory Totals
  const { totalPairsInStock, lowStockVariants } = useMemo(() => {
    let pairs = 0;
    const lowStock = [];

    products.forEach((prod) => {
      prod.variants.forEach((v) => {
        const qty = v.stock || 0;
        pairs += qty;
        if (qty <= (v.reorder_level || 3)) {
          lowStock.push({
            productId: prod.id,
            variantId: v.id,
            name: prod.name,
            brand: prod.brand,
            article_no: prod.article_no,
            size: v.size,
            color: v.color,
            stock: qty,
            reorder: v.reorder_level || 3,
          });
        }
      });
    });

    return { totalPairsInStock: pairs, lowStockVariants: lowStock };
  }, [products]);

  // 7-Day Sales Trend Data
  const trendData = useMemo(() => {
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateString = d.toISOString().slice(0, 10);
      const dayName = d.toLocaleDateString("en-IN", { weekday: "short" });

      const dayTotal = sales
        .filter(
          (s) => s.created_at?.slice(0, 10) === dateString && s.status !== "Refunded"
        )
        .reduce((sum, s) => sum + getSaleTotal(s), 0);

      days.push({
        day: dayName,
        date: dateString,
        revenue: Math.round(dayTotal),
      });
    }
    return days;
  }, [sales]);

  // Category Breakdown
  const categoryBreakdown = useMemo(() => {
    const counts = {};
    let totalItems = 0;

    sales.forEach((s) => {
      if (s.status === "Refunded") return;
      s.items?.forEach((item) => {
        const prod = products.find((p) => p.id === item.product_id);
        const cat = prod?.category || "Men";
        counts[cat] = (counts[cat] || 0) + (item.quantity || 1);
        totalItems += item.quantity || 1;
      });
    });

    const categories = ["Men", "Women", "Kids"];
    return categories.map((cat) => {
      const qty = counts[cat] || 0;
      const pct = totalItems > 0 ? Math.round((qty / totalItems) * 100) : 0;
      return { category: cat, quantity: qty, percentage: pct };
    });
  }, [sales, products]);

  const recentTransactions = sales.slice(0, 5);

  const viewReceipt = (sale) => {
    setRecentInvoice(sale);
    setIsReceiptOpen(true);
  };

  return (
    <div className="dashboard-content">
      {/* TOP KPI CARDS */}
      <div className="metrics-grid">
        <div className="metric-card">
          <div className="metric-header">
            <span className="metric-title">Today's Revenue</span>
            <div className="metric-icon-wrap gold">
              <TrendingUp size={18} />
            </div>
          </div>
          <div className="metric-value">{formatINR(todayRevenue)}</div>
          <div className="metric-footer positive">
            <Sparkles size={12} />
            <span>{totalBilledCount} bills completed today</span>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-header">
            <span className="metric-title">Total Invoices</span>
            <div className="metric-icon-wrap navy">
              <Receipt size={18} />
            </div>
          </div>
          <div className="metric-value">{sales.length}</div>
          <div className="metric-footer">
            <Clock size={12} />
            <span>Lifetime transactions</span>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-header">
            <span className="metric-title">Footwear in Stock</span>
            <div className="metric-icon-wrap teal">
              <Boxes size={18} />
            </div>
          </div>
          <div className="metric-value">{totalPairsInStock}</div>
          <div className="metric-footer">
            <span>Pairs across {products.length} models</span>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-header">
            <span className="metric-title">Low Stock Alerts</span>
            <div
              className={`metric-icon-wrap ${
                lowStockVariants.length > 0 ? "warning" : "green"
              }`}
            >
              <AlertTriangle size={18} />
            </div>
          </div>
          <div className="metric-value">{lowStockVariants.length}</div>
          <div className="metric-footer">
            <span>Sizes requiring restock</span>
          </div>
        </div>
      </div>

      {/* QUICK ACTIONS BANNER */}
      <div className="quick-actions-bar">
        <span className="quick-actions-label">QUICK WORKSPACE ACTIONS:</span>
        <div className="quick-actions-buttons">
          <button
            className="action-pill-btn primary"
            onClick={() => setActiveTab("billing")}
          >
            <ShoppingCart size={14} /> Start New POS Bill
          </button>
          <button
            className="action-pill-btn"
            onClick={() => setActiveTab("inventory")}
          >
            <PlusCircle size={14} /> Manage Footwear & Stock
          </button>
          <button
            className="action-pill-btn"
            onClick={() => setActiveTab("transactions")}
          >
            <Receipt size={14} /> Sales History
          </button>
          <button
            className="action-pill-btn"
            onClick={() => setActiveTab("reports")}
          >
            <TrendingUp size={14} /> Full Analytics
          </button>
        </div>
      </div>

      {/* CHARTS & BREAKDOWN ROW */}
      <div className="dashboard-charts-grid">
        {/* 7-Day Revenue Trend */}
        <div className="panel chart-panel">
          <div className="panel-heading">
            <div>
              <h2>7-Day Revenue Overview</h2>
              <p>Daily sales pattern across all payment methods</p>
            </div>
            <span className="small-tag">PAST WEEK</span>
          </div>
          <div className="chart-wrapper" style={{ height: "230px", marginTop: "15px" }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendData}>
                <defs>
                  <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#c5a15c" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#c5a15c" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#eef2f6" />
                <XAxis dataKey="day" stroke="#8c97a8" fontSize={11} tickLine={false} />
                <YAxis
                  stroke="#8c97a8"
                  fontSize={11}
                  tickLine={false}
                  tickFormatter={(val) => `₹${val}`}
                />
                <Tooltip
                  formatter={(value) => [formatINR(value), "Revenue"]}
                  contentStyle={{
                    backgroundColor: "#101c35",
                    borderColor: "#c5a15c",
                    color: "#fff",
                    borderRadius: "8px",
                    fontSize: "12px",
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="#c5a15c"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#revenueGrad)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Sales by Category */}
        <div className="panel category-panel">
          <div className="panel-heading">
            <div>
              <h2>Sales by Segment</h2>
              <p>Footwear volume distribution</p>
            </div>
            <span className="small-tag">LIVE VOLUME</span>
          </div>
          <div className="category-bars-list">
            {categoryBreakdown.map((item) => (
              <div key={item.category} className="cat-progress-item">
                <div className="cat-progress-labels">
                  <span className="cat-title">{item.category}'s Footwear</span>
                  <span className="cat-stats">
                    {item.quantity} pairs ({item.percentage}%)
                  </span>
                </div>
                <div className="progress-track">
                  <div
                    className={`progress-fill ${item.category.toLowerCase()}`}
                    style={{ width: `${Math.max(item.percentage, 5)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
          <div className="pos-hint-box">
            <strong>POS Tip:</strong> Size 7, 8, and 9 account for over 65% of all
            footwear volume. Maintain reorder levels ahead of weekends.
          </div>
        </div>
      </div>

      {/* RECENT SALES & LOW STOCK DUAL SECTION */}
      <div className="dashboard-bottom-grid">
        {/* Recent Invoices */}
        <div className="panel recent-panel">
          <div className="panel-heading">
            <div>
              <h2>Recent Bills</h2>
              <p>Latest over-the-counter sales transactions</p>
            </div>
            <button
              className="link-button"
              onClick={() => setActiveTab("transactions")}
            >
              View all <ArrowRight size={13} />
            </button>
          </div>
          <div className="table-responsive">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Invoice</th>
                  <th>Customer</th>
                  <th>Method</th>
                  <th style={{ textAlign: "right" }}>Amount</th>
                  <th style={{ textAlign: "center" }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {recentTransactions.map((s) => (
                  <tr key={s.id}>
                    <td>
                      <strong>{s.invoice_no}</strong>
                      <div className="text-muted" style={{ fontSize: "10px" }}>
                        {new Date(s.created_at).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </div>
                    </td>
                    <td>{s.customer?.name || "Walk-in"}</td>
                    <td>
                      <span className={`badge-pill ${s.payment_method.toLowerCase()}`}>
                        {s.payment_method}
                      </span>
                    </td>
                    <td style={{ textAlign: "right", fontWeight: 700 }}>
                      {formatINR(getSaleTotal(s))}
                    </td>
                    <td style={{ textAlign: "center" }}>
                      <button
                        className="btn-tiny"
                        onClick={() => viewReceipt(s)}
                        title="View & Print Bill"
                      >
                        Bill
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Low Stock Watch */}
        <div className="panel stock-panel">
          <div className="panel-heading">
            <div>
              <h2>Stock Watch</h2>
              <p>Sizes nearing reorder threshold</p>
            </div>
            <button
              className="link-button"
              onClick={() => setActiveTab("inventory")}
            >
              Inventory <ArrowRight size={13} />
            </button>
          </div>
          <div className="stock-alerts-list">
            {lowStockVariants.length === 0 ? (
              <div className="all-stocked-msg">
                ✓ All footwear sizes are adequately stocked!
              </div>
            ) : (
              lowStockVariants.slice(0, 5).map((v) => (
                <div key={v.variantId} className="stock-alert-item">
                  <div className="stock-alert-info">
                    <strong>{v.name}</strong>
                    <div className="stock-alert-sub">
                      Size: <span className="highlight-size">{v.size}</span> • {v.brand}{" "}
                      • {v.article_no}
                    </div>
                  </div>
                  <div className="stock-alert-badge danger">
                    {v.stock} left
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
