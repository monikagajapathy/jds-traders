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
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { useStore } from "../context/StoreContext.jsx";
import { formatINR } from "../utils/calculations.js";

const COLORS = ["#c5a15c", "#101c35", "#2a6f97", "#38b000", "#e76f51"];

export default function ReportsView() {
  const { sales, products, settings } = useStore();
  const [timeRange, setTimeRange] = useState("30"); // days

  // Compute Overall Financials
  const financials = useMemo(() => {
    let totalRevenue = 0;
    let totalCost = 0;
    let totalDiscount = 0;
    let totalTax = 0;
    let pairsSold = 0;

    sales.forEach((s) => {
      if (s.status === "Refunded") return;
      totalRevenue += s.total || 0;
      totalDiscount += s.discount_amount || 0;
      totalTax += s.tax_amount || 0;

      s.items?.forEach((it) => {
        pairsSold += it.quantity || 1;
        totalCost += (it.cost_price || it.unit_price * 0.55) * (it.quantity || 1);
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

  // Size Popularity Data (Footwear Specific Insight!)
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

  // Category Pie Data
  const categoryData = useMemo(() => {
    const map = {};
    sales.forEach((s) => {
      if (s.status === "Refunded") return;
      s.items?.forEach((it) => {
        const prod = products.find((p) => p.id === it.product_id);
        const cat = prod?.category || "Men";
        map[cat] = (map[cat] || 0) + (it.unit_price * it.quantity || 0);
      });
    });

    return Object.entries(map).map(([name, value]) => ({
      name: `${name}'s Footwear`,
      value,
    }));
  }, [sales, products]);

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

  // Export CSV Function
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

  return (
    <div className="reports-container">
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
              <h2>Revenue vs Estimated Profit</h2>
              <p>Daily store billing performance</p>
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
                <Tooltip
                  formatter={(val, name) => [
                    formatINR(val),
                    name === "revenue" ? "Revenue" : "Profit",
                  ]}
                  contentStyle={{
                    backgroundColor: "#101c35",
                    borderColor: "#c5a15c",
                    color: "#fff",
                    borderRadius: "8px",
                  }}
                />
                <Legend />
                <Bar dataKey="revenue" name="Revenue" fill="#c5a15c" radius={[4, 4, 0, 0]} />
                <Bar dataKey="profit" name="Gross Profit" fill="#2a6f97" radius={[4, 4, 0, 0]} />
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
    </div>
  );
}
