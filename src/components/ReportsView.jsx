import React, { useState, useMemo } from "react";
import {
  TrendingUp,
  Download,
  Calendar,
  PieChart as PieIcon,
  BarChart3,
  DollarSign,
  Footprints,
  Sparkles,
  Boxes,
  Search,
  Filter,
  CheckCircle,
  AlertTriangle,
  ArrowUpDown,
  Tag,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from "recharts";
import { useStore } from "../context/StoreContext.jsx";
import { formatINR } from "../utils/calculations.js";
// Custom Tooltip component: Clearly labels Sales Revenue vs Gross Profit (Issue 2)
function CustomDailyReportTooltip({ active, payload, label }) {
  if (!active || !payload || !payload.length) return null;

  const revObj = payload.find((p) => p.dataKey === "revenue");
  const profitObj = payload.find((p) => p.dataKey === "profit");

  const revenueVal = revObj ? Number(revObj.value) || 0 : 0;
  const profitVal = profitObj ? Number(profitObj.value) || 0 : 0;
  const marginPct = revenueVal > 0 ? Math.round((profitVal / revenueVal) * 100) : 0;

  return (
    <div
      style={{
        backgroundColor: "#101c35",
        border: "1px solid #c5a15c",
        borderRadius: "8px",
        padding: "10px 14px",
        color: "#ffffff",
        boxShadow: "0 8px 24px rgba(0,0,0,0.35)",
        fontSize: "12px",
        minWidth: "220px",
      }}
    >
      <div style={{ fontWeight: 800, color: "#f1d99d", marginBottom: "8px", borderBottom: "1px solid rgba(197,161,92,0.3)", paddingBottom: "4px" }}>
        📅 {label}
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "5px" }}>
        <span style={{ display: "flex", alignItems: "center", gap: "6px", color: "#e2e8f0" }}>
          <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#c5a15c", display: "inline-block" }} />
          Total Sales Revenue:
        </span>
        <strong style={{ color: "#f1d99d", marginLeft: "10px" }}>{formatINR(revenueVal)}</strong>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
        <span style={{ display: "flex", alignItems: "center", gap: "6px", color: "#e2e8f0" }}>
          <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#38bdf8", display: "inline-block" }} />
          Estimated Gross Profit:
        </span>
        <strong style={{ color: "#38bdf8", marginLeft: "10px" }}>{formatINR(profitVal)}</strong>
      </div>
      {revenueVal > 0 && (
        <div style={{ marginTop: "6px", paddingTop: "5px", borderTop: "1px dashed rgba(255,255,255,0.15)", fontSize: "11px", color: "#94a3b8", display: "flex", justifyContent: "space-between" }}>
          <span>Gross Margin:</span>
          <span style={{ color: "#4ade80", fontWeight: 700 }}>{marginPct}% of Revenue</span>
        </div>
      )}
    </div>
  );
}

export default function ReportsView() {
  const { sales, products, settings } = useStore();
  const [activeReportTab, setActiveReportTab] = useState("overview"); // "overview" | "itemwise"
  const [timeRange, setTimeRange] = useState("30"); // days

  // Item-wise filters & state
  const [itemQuery, setItemQuery] = useState("");
  const [itemCategory, setItemCategory] = useState("All");
  const [itemBrand, setItemBrand] = useState("All");
  const [itemStockFilter, setItemStockFilter] = useState("All");
  const [itemSortBy, setItemSortBy] = useState("revenue"); // "revenue" | "units" | "profit" | "stock"

  // Compute Overall Financials
  const financials = useMemo(() => {
    let totalRevenue = 0;
    let totalCost = 0;
    let totalDiscount = 0;
    let totalTax = 0;
    let pairsSold = 0;

    sales.forEach((s) => {
      if (s.status === "Refunded") return;
      const sTotal =
        Number(s.total) > 0
          ? Number(s.total)
          : (s.items?.reduce(
              (sum, it) =>
                sum +
                (Number(it.unit_price ?? it.unitPrice) || 0) *
                  (Number(it.quantity) || 1),
              0
            ) || 0);
      totalRevenue += sTotal;
      totalDiscount += Number(s.discount_amount) || 0;
      totalTax += Number(s.tax_amount) || 0;

      s.items?.forEach((it) => {
        pairsSold += Number(it.quantity) || 1;
        totalCost +=
          ((Number(it.cost_price) || (Number(it.unit_price ?? it.unitPrice) || 0) * 0.55)) *
          (Number(it.quantity) || 1);
      });
    });

    const grossProfit = Math.max(0, totalRevenue - totalCost - totalTax);
    const profitMargin =
      totalRevenue > 0 ? Math.round((grossProfit / totalRevenue) * 100) : 0;

    return {
      totalRevenue,
      totalCost,
      grossProfit,
      profitMargin,
      pairsSold,
    };
  }, [sales]);

  // Size Popularity Data (Footwear Specific Insight)
  const sizeData = useMemo(() => {
    const sizeMap = {};
    sales.forEach((s) => {
      if (s.status === "Refunded") return;
      s.items?.forEach((it) => {
        const sz = String(it.size || "Free");
        sizeMap[sz] = (sizeMap[sz] || 0) + (it.quantity || 1);
      });
    });

    return Object.entries(sizeMap)
      .map(([size, pairs]) => ({ size: `Size ${size}`, pairs }))
      .sort((a, b) => b.pairs - a.pairs);
  }, [sales]);

  // Daily Trend Data
  const dailyData = useMemo(() => {
    const daysCount = Number(timeRange) || 14;
    const result = [];

    for (let i = daysCount - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateKey = d.toISOString().slice(0, 10);
      const label = d.toLocaleDateString("en-IN", {
        month: "short",
        day: "numeric",
      });

      const daySales = sales.filter(
        (s) => s.created_at?.slice(0, 10) === dateKey && s.status !== "Refunded"
      );

      const rev = daySales.reduce((sum, s) => sum + (s.total || 0), 0);
      const cost = daySales.reduce(
        (sum, s) =>
          sum +
          (s.items?.reduce(
            (iSum, it) =>
              iSum + (it.cost_price || it.unit_price * 0.55) * (it.quantity || 1),
            0
          ) || 0),
        0
      );

      result.push({
        date: label,
        revenue: Math.round(rev),
        profit: Math.max(0, Math.round(rev - cost)),
      });
    }

    return result;
  }, [sales, timeRange]);

  // Top Selling Footwear
  const topArticles = useMemo(() => {
    const map = {};
    sales.forEach((s) => {
      if (s.status === "Refunded") return;
      s.items?.forEach((it) => {
        const key = it.article_no || it.product_name;
        if (!map[key]) {
          map[key] = {
            article_no: it.article_no,
            name: it.product_name,
            brand: it.brand,
            units: 0,
            revenue: 0,
          };
        }
        map[key].units += it.quantity || 1;
        map[key].revenue += (it.unit_price || 0) * (it.quantity || 1);
      });
    });

    return Object.values(map)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 6);
  }, [sales]);

  // Comprehensive Item-Wise Report Calculations
  const uniqueBrands = useMemo(() => {
    const set = new Set(products.map((p) => p.brand).filter(Boolean));
    return Array.from(set);
  }, [products]);

  const itemWiseData = useMemo(() => {
    return products.map((prod) => {
      const totalStock = prod.variants.reduce((sum, v) => sum + (v.stock || 0), 0);
      const totalCostVal = prod.variants.reduce(
        (sum, v) => sum + (v.stock || 0) * (v.cost_price || 0),
        0
      );
      const totalRetailVal = prod.variants.reduce(
        (sum, v) => sum + (v.stock || 0) * (v.selling_price || 0),
        0
      );

      let unitsSold = 0;
      let revenue = 0;
      let cogs = 0;
      const sizeBreakdown = {};

      sales.forEach((s) => {
        if (s.status === "Refunded") return;
        s.items?.forEach((it) => {
          if (
            it.product_id === prod.id ||
            it.article_no === prod.article_no ||
            it.product_name === prod.name
          ) {
            const qty = Number(it.quantity) || 1;
            const rate = Number(it.unit_price ?? it.unitPrice) || 0;
            const cost = Number(it.cost_price) || rate * 0.55;

            unitsSold += qty;
            revenue += rate * qty;
            cogs += cost * qty;

            const sz = String(it.size || "Standard");
            sizeBreakdown[sz] = (sizeBreakdown[sz] || 0) + qty;
          }
        });
      });

      const grossProfit = Math.max(0, revenue - cogs);
      const marginPct = revenue > 0 ? Math.round((grossProfit / revenue) * 100) : 0;

      // Best selling size
      const sizeEntries = Object.entries(sizeBreakdown);
      let bestSize = "N/A";
      if (sizeEntries.length > 0) {
        sizeEntries.sort((a, b) => b[1] - a[1]);
        bestSize = `Size ${sizeEntries[0][0]} (${sizeEntries[0][1]} pairs)`;
      }

      // Stock status
      const hasLowStockVariant = prod.variants.some(
        (v) => (v.stock || 0) <= (v.reorder_level || 3)
      );
      let stockStatus = "In Stock";
      if (totalStock === 0) stockStatus = "Out of Stock";
      else if (hasLowStockVariant) stockStatus = "Low Stock";

      return {
        id: prod.id,
        name: prod.name,
        article_no: prod.article_no,
        brand: prod.brand,
        category: prod.category,
        totalStock,
        totalCostVal,
        totalRetailVal,
        variants: prod.variants,
        unitsSold,
        revenue,
        cogs,
        grossProfit,
        marginPct,
        bestSize,
        stockStatus,
      };
    });
  }, [products, sales]);

  // Filter & Sort Item-Wise Data
  const filteredItemWise = useMemo(() => {
    return itemWiseData
      .filter((item) => {
        if (itemCategory !== "All" && item.category !== itemCategory) return false;
        if (itemBrand !== "All" && item.brand !== itemBrand) return false;
        if (itemStockFilter !== "All" && item.stockStatus !== itemStockFilter) return false;

        if (itemQuery.trim()) {
          const q = itemQuery.toLowerCase().trim();
          return (
            item.name.toLowerCase().includes(q) ||
            item.article_no.toLowerCase().includes(q) ||
            item.brand.toLowerCase().includes(q)
          );
        }
        return true;
      })
      .sort((a, b) => {
        if (itemSortBy === "revenue") return b.revenue - a.revenue;
        if (itemSortBy === "units") return b.unitsSold - a.unitsSold;
        if (itemSortBy === "profit") return b.grossProfit - a.grossProfit;
        if (itemSortBy === "stock") return b.totalStock - a.totalStock;
        return 0;
      });
  }, [itemWiseData, itemCategory, itemBrand, itemStockFilter, itemQuery, itemSortBy]);

  // Export Overall Sales CSV
  const handleExportCSV = () => {
    const headers = [
      "Invoice No",
      "Date",
      "Customer Name",
      "Customer Phone",
      "Payment Method",
      "Status",
      "Items Count",
      "Subtotal (INR)",
      "Discount (INR)",
      "Tax (INR)",
      "Grand Total (INR)",
    ];

    const rows = sales.map((s) => [
      s.invoice_no,
      new Date(s.created_at).toISOString().slice(0, 10),
      `"${s.customer?.name || "Walk-in"}"`,
      `"${s.customer?.phone || ""}"`,
      s.payment_method,
      s.status,
      s.items?.length || 0,
      s.subtotal,
      s.discount_amount,
      s.tax_amount,
      s.total,
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `JDS_Traders_Sales_Report_${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Export Item-Wise Performance CSV
  const handleExportItemWiseCSV = () => {
    const headers = [
      "Article No",
      "Footwear Model Name",
      "Brand",
      "Category",
      "Current Stock (Pairs)",
      "Stock Status",
      "Best Selling Size",
      "Units Sold (Pairs)",
      "Gross Revenue (INR)",
      "COGS (INR)",
      "Gross Profit (INR)",
      "Margin (%)",
      "Stock Cost Value (INR)",
      "Stock Retail Value (INR)",
    ];

    const rows = filteredItemWise.map((item) => [
      `"${item.article_no}"`,
      `"${item.name}"`,
      `"${item.brand}"`,
      `"${item.category}"`,
      item.totalStock,
      `"${item.stockStatus}"`,
      `"${item.bestSize}"`,
      item.unitsSold,
      Math.round(item.revenue),
      Math.round(item.cogs),
      Math.round(item.grossProfit),
      `${item.marginPct}%`,
      Math.round(item.totalCostVal),
      Math.round(item.totalRetailVal),
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `JDS_Traders_Item_Wise_Report_${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="reports-container">
      {/* SUB-NAVIGATION TABS */}
      <div className="report-tabs-bar">
        <button
          className={`report-tab-btn ${activeReportTab === "overview" ? "active" : ""}`}
          onClick={() => setActiveReportTab("overview")}
        >
          <BarChart3 size={15} /> Store Overview & Financials
        </button>
        <button
          className={`report-tab-btn ${activeReportTab === "itemwise" ? "active" : ""}`}
          onClick={() => setActiveReportTab("itemwise")}
        >
          <Boxes size={15} /> Item-Wise Performance Reports
        </button>
      </div>

      {/* ===================================================================== */}
      {/* VIEW 1: OVERVIEW & STORE FINANCIALS */}
      {/* ===================================================================== */}
      {activeReportTab === "overview" && (
        <>
          {/* FINANCIAL METRIC CARDS */}
          <div className="metrics-grid">
            <div className="metric-card">
              <div className="metric-header">
                <span className="metric-title">Gross Footwear Revenue</span>
                <div className="metric-icon-wrap gold">
                  <TrendingUp size={18} />
                </div>
              </div>
              <div className="metric-value">{formatINR(financials.totalRevenue)}</div>
              <div className="metric-footer positive">
                <span>{financials.pairsSold} pairs sold</span>
              </div>
            </div>

            <div className="metric-card">
              <div className="metric-header">
                <span className="metric-title">Cost of Goods Sold (COGS)</span>
                <div className="metric-icon-wrap navy">
                  <DollarSign size={18} />
                </div>
              </div>
              <div className="metric-value">{formatINR(financials.totalCost)}</div>
              <div className="metric-footer">
                <span>Wholesale acquisition cost</span>
              </div>
            </div>

            <div className="metric-card">
              <div className="metric-header">
                <span className="metric-title">Estimated Gross Profit</span>
                <div className="metric-icon-wrap green">
                  <Sparkles size={18} />
                </div>
              </div>
              <div className="metric-value">{formatINR(financials.grossProfit)}</div>
              <div className="metric-footer positive">
                <span>Net of merchandise costs & tax</span>
              </div>
            </div>

            <div className="metric-card">
              <div className="metric-header">
                <span className="metric-title">Gross Margin</span>
                <div className="metric-icon-wrap teal">
                  <BarChart3 size={18} />
                </div>
              </div>
              <div className="metric-value">{financials.profitMargin}%</div>
              <div className="metric-footer">
                <span>Average footwear markup</span>
              </div>
            </div>
          </div>

          {/* CONTROLS HEADER */}
          <div className="panel" style={{ padding: "14px 20px", marginBottom: "18px" }}>
            <div className="inventory-controls-row">
              <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                <Calendar size={16} style={{ color: "#c5a15c" }} />
                <span style={{ fontSize: "12px", fontWeight: 600 }}>Trend Interval:</span>
                <select
                  value={timeRange}
                  onChange={(e) => setTimeRange(e.target.value)}
                  className="select-filter"
                >
                  <option value="7">Last 7 Days</option>
                  <option value="14">Last 14 Days</option>
                  <option value="30">Last 30 Days</option>
                </select>
              </div>

              <button
                className="btn-secondary"
                onClick={handleExportCSV}
                style={{ padding: "8px 16px" }}
              >
                <Download size={15} /> Export Sales CSV
              </button>
            </div>
          </div>

          {/* CHARTS GRID */}
          <div className="dashboard-charts-grid">
            {/* Revenue vs Profit Chart */}
            <div className="panel chart-panel">
              <div className="panel-heading">
                <div>
                  <h2>Sales Revenue vs Estimated Profit</h2>
                  <p>Daily Sales Revenue (total billed) vs Estimated Gross Profit (sales minus shoe cost)</p>
                </div>
                <span className="small-tag">REVENUE & PROFIT</span>
              </div>
              <div className="chart-wrapper" style={{ height: "260px", marginTop: "15px" }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dailyData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#eef2f6" />
                    <XAxis dataKey="date" stroke="#8c97a8" fontSize={11} tickLine={false} />
                    <YAxis
                      stroke="#8c97a8"
                      fontSize={11}
                      tickLine={false}
                      tickFormatter={(v) => `₹${v}`}
                    />
                    <Tooltip content={<CustomDailyReportTooltip />} />
                    <Legend />
                    <Bar
                      dataKey="revenue"
                      name="Total Sales Revenue (₹)"
                      fill="#c5a15c"
                      radius={[4, 4, 0, 0]}
                    />
                    <Bar
                      dataKey="profit"
                      name="Estimated Gross Profit (₹)"
                      fill="#38bdf8"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Size Popularity Bar Chart */}
            <div className="panel category-panel">
              <div className="panel-heading">
                <div>
                  <h2>Footwear Size Demand</h2>
                  <p>Top moving shoe sizes (volume in pairs)</p>
                </div>
                <span className="small-tag">SIZE VELOCITY</span>
              </div>
              <div className="chart-wrapper" style={{ height: "260px", marginTop: "15px" }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={sizeData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#eef2f6" />
                    <XAxis type="number" stroke="#8c97a8" fontSize={11} />
                    <YAxis
                      dataKey="size"
                      type="category"
                      stroke="#8c97a8"
                      fontSize={11}
                      tickLine={false}
                    />
                    <Tooltip
                      formatter={(val) => [`${val} pairs sold`, "Volume"]}
                      contentStyle={{
                        backgroundColor: "#101c35",
                        borderColor: "#c5a15c",
                        color: "#fff",
                        borderRadius: "8px",
                      }}
                    />
                    <Bar dataKey="pairs" fill="#101c35" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* TOP SELLING ARTICLES TABLE */}
          <div className="panel table-panel" style={{ marginTop: "18px" }}>
            <div className="panel-heading" style={{ padding: "18px 20px" }}>
              <div>
                <h2>Best Performing Footwear Articles</h2>
                <p>Highest revenue models ranked by transaction sales</p>
              </div>
              <span className="small-tag">TOP ARTICLES</span>
            </div>
            <div className="table-responsive">
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>Rank</th>
                    <th>Article & Model</th>
                    <th>Brand</th>
                    <th style={{ textAlign: "center" }}>Pairs Sold</th>
                    <th style={{ textAlign: "right" }}>Total Revenue Generated</th>
                    <th style={{ textAlign: "center" }}>Performance</th>
                  </tr>
                </thead>
                <tbody>
                  {topArticles.map((art, idx) => (
                    <tr key={idx}>
                      <td>
                        <span className="rank-badge">#{idx + 1}</span>
                      </td>
                      <td>
                        <strong>{art.name}</strong>
                        <div className="sub-text">{art.article_no}</div>
                      </td>
                      <td>{art.brand || "JDS"}</td>
                      <td style={{ textAlign: "center", fontWeight: 700 }}>
                        {art.units} pairs
                      </td>
                      <td style={{ textAlign: "right", fontWeight: 700 }}>
                        {formatINR(art.revenue)}
                      </td>
                      <td style={{ textAlign: "center" }}>
                        <span className="badge-pill cash">High Velocity</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* ===================================================================== */}
      {/* VIEW 2: ITEM-WISE PERFORMANCE REPORT */}
      {/* ===================================================================== */}
      {activeReportTab === "itemwise" && (
        <>
          {/* ITEM-WISE METRICS SUMMARY */}
          <div className="metrics-grid">
            <div className="metric-card">
              <div className="metric-header">
                <span className="metric-title">Active Models (SKUs)</span>
                <div className="metric-icon-wrap navy">
                  <Boxes size={18} />
                </div>
              </div>
              <div className="metric-value">{products.length} Models</div>
              <div className="metric-footer">
                <span>
                  {itemWiseData.reduce((sum, it) => sum + it.totalStock, 0)} total pairs in stock
                </span>
              </div>
            </div>

            <div className="metric-card">
              <div className="metric-header">
                <span className="metric-title">Inventory Capital (At Cost)</span>
                <div className="metric-icon-wrap teal">
                  <DollarSign size={18} />
                </div>
              </div>
              <div className="metric-value">
                {formatINR(itemWiseData.reduce((sum, it) => sum + it.totalCostVal, 0))}
              </div>
              <div className="metric-footer">
                <span>Cost basis of current stock</span>
              </div>
            </div>

            <div className="metric-card">
              <div className="metric-header">
                <span className="metric-title">Estimated Retail Worth</span>
                <div className="metric-icon-wrap gold">
                  <TrendingUp size={18} />
                </div>
              </div>
              <div className="metric-value">
                {formatINR(itemWiseData.reduce((sum, it) => sum + it.totalRetailVal, 0))}
              </div>
              <div className="metric-footer positive">
                <span>Expected retail value when sold</span>
              </div>
            </div>

            <div className="metric-card">
              <div className="metric-header">
                <span className="metric-title">Top Revenue Generator</span>
                <div className="metric-icon-wrap green">
                  <Sparkles size={18} />
                </div>
              </div>
              <div className="metric-value" style={{ fontSize: "15px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {topArticles[0]?.name || "N/A"}
              </div>
              <div className="metric-footer positive">
                <span>{formatINR(topArticles[0]?.revenue || 0)} billed</span>
              </div>
            </div>
          </div>

          {/* ITEM-WISE CONTROLS & FILTERS */}
          <div className="panel" style={{ padding: "16px 20px", marginBottom: "18px" }}>
            <div className="inventory-controls-row">
              <div className="search-row" style={{ marginTop: 0, flex: 1, minWidth: "240px" }}>
                <Search size={16} />
                <input
                  type="text"
                  placeholder="Filter by article #, model name, brand..."
                  value={itemQuery}
                  onChange={(e) => setItemQuery(e.target.value)}
                />
                {itemQuery && (
                  <button className="search-clear-btn" onClick={() => setItemQuery("")}>
                    ✕
                  </button>
                )}
              </div>

              <div className="filter-group">
                <select
                  value={itemCategory}
                  onChange={(e) => setItemCategory(e.target.value)}
                  className="select-filter"
                >
                  <option value="All">All Categories</option>
                  <option value="Men">Men's Footwear</option>
                  <option value="Women">Women's Footwear</option>
                  <option value="Kids">Kids' Footwear</option>
                </select>

                <select
                  value={itemBrand}
                  onChange={(e) => setItemBrand(e.target.value)}
                  className="select-filter"
                >
                  <option value="All">All Brands</option>
                  {uniqueBrands.map((b) => (
                    <option key={b} value={b}>
                      {b}
                    </option>
                  ))}
                </select>

                <select
                  value={itemStockFilter}
                  onChange={(e) => setItemStockFilter(e.target.value)}
                  className="select-filter"
                >
                  <option value="All">All Stock Levels</option>
                  <option value="In Stock">In Stock (&gt; 0)</option>
                  <option value="Low Stock">Low Stock Alert</option>
                  <option value="Out of Stock">Out of Stock (0)</option>
                </select>

                <select
                  value={itemSortBy}
                  onChange={(e) => setItemSortBy(e.target.value)}
                  className="select-filter"
                  style={{ fontWeight: 600, color: "#101c35" }}
                >
                  <option value="revenue">Sort by Revenue (Highest)</option>
                  <option value="units">Sort by Units Sold (Volume)</option>
                  <option value="profit">Sort by Gross Profit</option>
                  <option value="stock">Sort by Stock On Hand</option>
                </select>

                <button
                  className="btn-primary"
                  onClick={handleExportItemWiseCSV}
                  style={{ padding: "0 16px", height: "40px" }}
                >
                  <Download size={15} /> Export Item CSV
                </button>
              </div>
            </div>
          </div>

          {/* ITEM-WISE TABLE */}
          <div className="panel table-panel">
            <div className="table-responsive">
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>Article & Model</th>
                    <th>Brand & Category</th>
                    <th style={{ textAlign: "center" }}>Stock On Hand</th>
                    <th style={{ textAlign: "center" }}>Stock Status</th>
                    <th style={{ textAlign: "center" }}>Best Size</th>
                    <th style={{ textAlign: "center" }}>Pairs Sold</th>
                    <th style={{ textAlign: "right" }}>Total Revenue</th>
                    <th style={{ textAlign: "right" }}>COGS</th>
                    <th style={{ textAlign: "right" }}>Gross Profit</th>
                    <th style={{ textAlign: "center" }}>Margin</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredItemWise.length === 0 ? (
                    <tr>
                      <td colSpan="10" style={{ textAlign: "center", padding: "40px 20px" }}>
                        <Boxes size={32} style={{ color: "#a0aec0", margin: "0 auto 10px" }} />
                        <div style={{ fontWeight: 600, color: "#4a5568" }}>
                          No footwear models match your filter criteria
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredItemWise.map((item) => (
                      <tr key={item.id}>
                        <td>
                          <div className="prod-cell">
                            <span className="art-pill">{item.article_no}</span>
                            <div>
                              <strong>{item.name}</strong>
                              <div className="sub-text">
                                {item.variants.length} sizes (
                                {item.variants.map((v) => `${v.size}:${v.stock}`).join(", ")}
                                )
                              </div>
                            </div>
                          </div>
                        </td>

                        <td>
                          <div style={{ fontWeight: 600 }}>{item.brand}</div>
                          <span className="sub-tag">{item.category}</span>
                        </td>

                        <td style={{ textAlign: "center", fontWeight: 700 }}>
                          {item.totalStock} pairs
                        </td>

                        <td style={{ textAlign: "center" }}>
                          <span
                            className={`stock-badge ${
                              item.totalStock === 0
                                ? "out"
                                : item.stockStatus === "Low Stock"
                                ? "low"
                                : "ok"
                            }`}
                          >
                            {item.stockStatus}
                          </span>
                        </td>

                        <td style={{ textAlign: "center" }}>
                          <span className="item-pill-small" style={{ fontSize: "10px" }}>
                            {item.bestSize}
                          </span>
                        </td>

                        <td style={{ textAlign: "center", fontWeight: 700, color: "#101c35" }}>
                          {item.unitsSold} pairs
                        </td>

                        <td style={{ textAlign: "right", fontWeight: 700, color: "#101c35" }}>
                          {formatINR(item.revenue)}
                        </td>

                        <td style={{ textAlign: "right", color: "#64748b" }}>
                          {formatINR(item.cogs)}
                        </td>

                        <td style={{ textAlign: "right", fontWeight: 700, color: "#16a34a" }}>
                          {formatINR(item.grossProfit)}
                        </td>

                        <td style={{ textAlign: "center" }}>
                          <span
                            className="margin-hint"
                            style={{
                              fontSize: "11px",
                              padding: "2px 6px",
                              borderRadius: "4px",
                              background: item.marginPct >= 40 ? "#dcfce7" : "#f1f5f9",
                              color: item.marginPct >= 40 ? "#15803d" : "#475569",
                              fontWeight: 700,
                            }}
                          >
                            {item.marginPct}%
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
