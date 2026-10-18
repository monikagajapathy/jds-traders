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

  // Today's Date String for display
  const todayFormatted = new Date().toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  // Daily Sales Calculations (Accurate local day match & payment breakdown)
  const todayMetrics = useMemo(() => {
    const now = new Date();
    const todayList = sales.filter((s) => {
      if (s.status === "Refunded") return false;
      const d = new Date(s.created_at);
      return !isNaN(d.getTime()) && d.toDateString() === now.toDateString();
    });

    let revenue = 0;
    let pairs = 0;
    let cash = 0;
    let upi = 0;
    let card = 0;
    let profit = 0;

    todayList.forEach((s) => {
      const tot = getSaleTotal(s);
      revenue += tot;

      // Payment Breakdown
      if (s.payment_method === "Cash") cash += tot;
      else if (s.payment_method === "UPI") upi += tot;
      else if (s.payment_method === "Card") card += tot;
      else if (s.payment_method === "Split") {
        cash += Number(s.payment_split?.cash || 0);
        upi += Number(s.payment_split?.upi || 0);
      }

      // Items & profit
      s.items?.forEach((it) => {
        const q = Number(it.quantity) || 1;
        pairs += q;
        const sell = Number(it.unit_price ?? it.unitPrice) || 0;
        const cost = Number(it.cost_price) || (sell * 0.55);
        profit += (sell - cost) * q;
      });
    });

    const avgTicket = todayList.length > 0 ? revenue / todayList.length : 0;
    const margin = revenue > 0 ? Math.round((profit / revenue) * 100) : 0;

    return {
      sales: todayList,
      count: todayList.length,
      revenue,
      pairs,
      cash,
      upi,
      card,
      profit,
      margin,
      avgTicket,
    };
  }, [sales]);

  const todayRevenue = todayMetrics.revenue;
  const totalBilledCount = todayMetrics.count;

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

      {/* DAILY SALES INFORMATION SECTION */}
      <div className="panel daily-sales-panel" style={{ marginBottom: "20px" }}>
        <div className="panel-heading" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <h2 style={{ margin: 0, fontSize: "16px", fontWeight: 800, color: "#101c35" }}>
                Today's Daily Sales Performance
              </h2>
              <span className="badge-pill completed" style={{ fontSize: "11px", fontWeight: 700 }}>
                ● LIVE COUNTER
              </span>
            </div>
            <p style={{ margin: "3px 0 0", fontSize: "11.5px", color: "#64748b" }}>
              Comprehensive counter sales, payment collections, and volume for <strong>{todayFormatted}</strong>
            </p>
          </div>
          <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
            <button
              className="btn-tiny"
              style={{ background: "#f0fdf4", color: "#15803d", borderColor: "#bbf7d0", fontWeight: 700, padding: "6px 12px", height: "auto" }}
              onClick={() => setActiveTab("billing")}
            >
              <ShoppingCart size={13} /> + New Bill
            </button>
            <button
              className="btn-tiny"
              style={{ background: "#f8fafc", color: "#475569", borderColor: "#cbd5e1", fontWeight: 600, padding: "6px 12px", height: "auto" }}
              onClick={() => setActiveTab("transactions")}
            >
              All Invoices <ArrowRight size={13} />
            </button>
          </div>
        </div>

        {/* Daily KPI Mini-Cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "12px", margin: "14px 0" }}>
          <div style={{ background: "#fcf9f2", border: "1px solid #e8dbb5", borderRadius: "8px", padding: "12px" }}>
            <span style={{ fontSize: "10.5px", fontWeight: 700, color: "#7c632e", textTransform: "uppercase" }}>Today's Revenue</span>
            <div style={{ fontSize: "20px", fontWeight: 800, color: "#101c35", marginTop: "4px" }}>
              {formatINR(todayMetrics.revenue)}
            </div>
            <span style={{ fontSize: "10px", color: "#a17c38" }}>
              {todayMetrics.count} {todayMetrics.count === 1 ? "bill" : "bills"} completed
            </span>
          </div>

          <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: "8px", padding: "12px" }}>
            <span style={{ fontSize: "10.5px", fontWeight: 700, color: "#15803d", textTransform: "uppercase" }}>Pairs Sold Today</span>
            <div style={{ fontSize: "20px", fontWeight: 800, color: "#14532d", marginTop: "4px" }}>
              {todayMetrics.pairs} <span style={{ fontSize: "13px", fontWeight: 600 }}>pairs</span>
            </div>
            <span style={{ fontSize: "10px", color: "#16a34a" }}>
              Footwear volume dispensed
            </span>
          </div>

          <div style={{ background: "#f0f9ff", border: "1px solid #bae6fd", borderRadius: "8px", padding: "12px" }}>
            <span style={{ fontSize: "10.5px", fontWeight: 700, color: "#0369a1", textTransform: "uppercase" }}>Average Ticket Size</span>
            <div style={{ fontSize: "20px", fontWeight: 800, color: "#0c4a6e", marginTop: "4px" }}>
              {formatINR(todayMetrics.avgTicket)}
            </div>
            <span style={{ fontSize: "10px", color: "#0284c7" }}>
              Per customer basket size
            </span>
          </div>

          <div style={{ background: "#faf5ff", border: "1px solid #e9d5ff", borderRadius: "8px", padding: "12px" }}>
            <span style={{ fontSize: "10.5px", fontWeight: 700, color: "#7e22ce", textTransform: "uppercase" }}>Estimated Profit</span>
            <div style={{ fontSize: "20px", fontWeight: 800, color: "#581c87", marginTop: "4px" }}>
              {formatINR(todayMetrics.profit)}
            </div>
            <span style={{ fontSize: "10px", color: "#9333ea", fontWeight: 600 }}>
              {todayMetrics.margin}% Gross Margin
            </span>
          </div>
        </div>

        {/* Today's Payment Collections Strip */}
        <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "8px", padding: "10px 14px", display: "flex", flexWrap: "wrap", gap: "16px", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
          <span style={{ fontSize: "11px", fontWeight: 700, color: "#475569" }}>
            💳 Today's Payment Collections:
          </span>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "14px", alignItems: "center" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "11.5px" }}>
              <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#16a34a" }} />
              <span style={{ color: "#64748b" }}>Cash:</span>
              <strong style={{ color: "#0f172a" }}>{formatINR(todayMetrics.cash)}</strong>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "11.5px" }}>
              <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#0284c7" }} />
              <span style={{ color: "#64748b" }}>UPI / QR:</span>
              <strong style={{ color: "#0f172a" }}>{formatINR(todayMetrics.upi)}</strong>
            </div>
            {todayMetrics.card > 0 && (
              <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "11.5px" }}>
                <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#8b5cf6" }} />
                <span style={{ color: "#64748b" }}>Card:</span>
                <strong style={{ color: "#0f172a" }}>{formatINR(todayMetrics.card)}</strong>
              </div>
            )}
          </div>
        </div>

        {/* Today's Completed Bills Table */}
        {todayMetrics.sales.length > 0 ? (
          <div className="table-responsive" style={{ maxHeight: "240px", overflowY: "auto", border: "1px solid #e2e8f0", borderRadius: "6px" }}>
            <table className="custom-table" style={{ fontSize: "11.5px" }}>
              <thead>
                <tr>
                  <th>Time & Invoice</th>
                  <th>Customer</th>
                  <th>Footwear Items</th>
                  <th style={{ textAlign: "center" }}>Cashier</th>
                  <th style={{ textAlign: "center" }}>Mode</th>
                  <th style={{ textAlign: "right" }}>Amount</th>
                  <th style={{ textAlign: "center", width: "70px" }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {todayMetrics.sales.map((s) => (
                  <tr key={s.id}>
                    <td>
                      <strong>{s.invoice_no}</strong>
                      <div style={{ fontSize: "10px", color: "#64748b" }}>
                        {new Date(s.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </div>
                    </td>
                    <td>
                      <div>{s.customer?.name || "Walk-in Customer"}</div>
                      {s.customer?.phone && (
                        <div style={{ fontSize: "10px", color: "#94a3b8" }}>{s.customer.phone}</div>
                      )}
                    </td>
                    <td>
                      <span style={{ fontWeight: 600, color: "#334155" }}>
                        {s.items?.length || 1} {s.items?.length === 1 ? "pair" : "pairs"}
                      </span>
                      <div style={{ fontSize: "10px", color: "#64748b" }}>
                        {s.items?.slice(0, 2).map((it) => `${it.product_name || "Footwear"} (Sz ${it.size})`).join(", ")}
                        {(s.items?.length || 0) > 2 ? "..." : ""}
                      </div>
                    </td>
                    <td style={{ textAlign: "center" }}>
                      <span className="badge-pill" style={{ background: "#f1f5f9", color: "#475569", fontSize: "10px" }}>
                        {s.billed_by || "Admin"}
                      </span>
                    </td>
                    <td style={{ textAlign: "center" }}>
                      <span className={`badge-pill ${s.payment_method?.toLowerCase()}`}>
                        {s.payment_method}
                      </span>
                    </td>
                    <td style={{ textAlign: "right", fontWeight: 700, color: "#0f172a" }}>
                      {formatINR(getSaleTotal(s))}
                    </td>
                    <td style={{ textAlign: "center" }}>
                      <button
                        type="button"
                        className="btn-tiny"
                        onClick={() => viewReceipt(s)}
                        title="View and Print Statement"
                        style={{ padding: "3px 8px", fontSize: "10.5px" }}
                      >
                        Receipt
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div style={{ textAlign: "center", padding: "24px 16px", background: "#f8fafc", borderRadius: "6px", border: "1px dashed #cbd5e1" }}>
            <p style={{ margin: "0 0 10px", fontSize: "12.5px", color: "#64748b" }}>
              No transactions billed yet for today ({todayFormatted}).
            </p>
            <button
              type="button"
              className="btn-primary"
              style={{ fontSize: "12px", padding: "6px 14px", margin: "0 auto" }}
              onClick={() => setActiveTab("billing")}
            >
              <ShoppingCart size={13} /> Record First Sale of Today
            </button>
          </div>
        )}
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
