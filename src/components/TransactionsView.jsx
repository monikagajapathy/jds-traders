import React, { useState, useMemo } from "react";
import {
  Receipt,
  Search,
  Filter,
  Printer,
  RotateCcw,
  Calendar,
  CreditCard,
  Banknote,
  QrCode,
  CheckCircle,
  AlertCircle,
  FileText,
} from "lucide-react";
import { useStore } from "../context/StoreContext.jsx";
import { formatINR } from "../utils/calculations.js";

export default function TransactionsView() {
  const { sales, refundSale, setRecentInvoice, setIsReceiptOpen } = useStore();

  const [query, setQuery] = useState("");
  const [paymentFilter, setPaymentFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [dateFilter, setDateFilter] = useState("All");

  // Summary Metrics
  const summary = useMemo(() => {
    const completed = sales.filter((s) => s.status !== "Refunded");
    const totalRev = completed.reduce((sum, s) => sum + (s.total || 0), 0);
    const avgBill = completed.length > 0 ? totalRev / completed.length : 0;

    let upiRev = 0;
    let cashRev = 0;
    let cardRev = 0;

    completed.forEach((s) => {
      const sTotal = Number(s.total) > 0 ? Number(s.total) : (s.items?.reduce((sum, it) => sum + (Number(it.unit_price ?? it.unitPrice) || 0) * (Number(it.quantity) || 1), 0) || 0);
      if (s.payment_method === "UPI") upiRev += sTotal;
      else if (s.payment_method === "Cash") cashRev += sTotal;
      else if (s.payment_method === "Card") cardRev += sTotal;
      else if (s.payment_method === "Split") {
        cashRev += Number(s.payment_split?.cash) || 0;
        upiRev += Number(s.payment_split?.upi) || 0;
      }
    });

    return {
      totalRev,
      count: completed.length,
      avgBill,
      upiRev,
      cashRev,
      cardRev,
    };
  }, [sales]);

  // Filter Sales
  const filteredSales = useMemo(() => {
    return sales.filter((s) => {
      // Payment Filter
      if (paymentFilter !== "All") {
        if (paymentFilter === "Split" && s.payment_method !== "Split") return false;
        if (paymentFilter === "Cash" && s.payment_method !== "Cash" && !(s.payment_method === "Split" && (s.payment_split?.cash || 0) > 0)) return false;
        if (paymentFilter === "UPI" && s.payment_method !== "UPI" && !(s.payment_method === "Split" && (s.payment_split?.upi || 0) > 0)) return false;
        if (paymentFilter === "Card" && s.payment_method !== "Card") return false;
      }

      // Status Filter
      if (statusFilter !== "All" && s.status !== statusFilter) {
        return false;
      }

      // Date Filter
      if (dateFilter !== "All") {
        const saleDate = new Date(s.created_at);
        const now = new Date();
        if (dateFilter === "Today") {
          if (saleDate.toDateString() !== now.toDateString()) return false;
        } else if (dateFilter === "Week") {
          const sevenDaysAgo = new Date();
          sevenDaysAgo.setDate(now.getDate() - 7);
          if (saleDate < sevenDaysAgo) return false;
        } else if (dateFilter === "Month") {
          if (
            saleDate.getMonth() !== now.getMonth() ||
            saleDate.getFullYear() !== now.getFullYear()
          ) {
            return false;
          }
        }
      }

      // Query Search
      if (!query.trim()) return true;
      const q = query.toLowerCase().trim();
      return (
        s.invoice_no?.toLowerCase().includes(q) ||
        s.customer?.name?.toLowerCase().includes(q) ||
        s.customer?.phone?.includes(q) ||
        s.items?.some(
          (item) =>
            item.product_name?.toLowerCase().includes(q) ||
            item.article_no?.toLowerCase().includes(q) ||
            item.brand?.toLowerCase().includes(q)
        )
      );
    });
  }, [sales, paymentFilter, statusFilter, dateFilter, query]);

  const handleViewReceipt = (sale) => {
    setRecentInvoice(sale);
    setIsReceiptOpen(true);
  };

  const handleRefund = (sale) => {
    if (sale.status === "Refunded") return;
    if (
      confirm(
        `Are you sure you want to process a return/refund for invoice ${sale.invoice_no}? This will restore ${sale.items?.length || 0} footwear items back to inventory stock.`
      )
    ) {
      refundSale(sale.id);
    }
  };

  return (
    <div className="transactions-container">
      {/* SUMMARY STATS */}
      <div className="metrics-grid">
        <div className="metric-card">
          <div className="metric-header">
            <span className="metric-title">Total Completed Sales</span>
            <div className="metric-icon-wrap gold">
              <Receipt size={18} />
            </div>
          </div>
          <div className="metric-value">{formatINR(summary.totalRev)}</div>
          <div className="metric-footer positive">
            <span>{summary.count} valid tax invoices</span>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-header">
            <span className="metric-title">Average Bill Value (AOV)</span>
            <div className="metric-icon-wrap navy">
              <CreditCard size={18} />
            </div>
          </div>
          <div className="metric-value">{formatINR(summary.avgBill)}</div>
          <div className="metric-footer">
            <span>Per customer basket size</span>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-header">
            <span className="metric-title">Digital Payments (UPI)</span>
            <div className="metric-icon-wrap teal">
              <QrCode size={18} />
            </div>
          </div>
          <div className="metric-value">{formatINR(summary.upiRev)}</div>
          <div className="metric-footer">
            <span>
              {summary.totalRev > 0
                ? Math.round((summary.upiRev / summary.totalRev) * 100)
                : 0}
              % of total store revenue
            </span>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-header">
            <span className="metric-title">Cash Collections</span>
            <div className="metric-icon-wrap green">
              <Banknote size={18} />
            </div>
          </div>
          <div className="metric-value">{formatINR(summary.cashRev)}</div>
          <div className="metric-footer">
            <span>Drawer cash sales</span>
          </div>
        </div>
      </div>

      {/* FILTER & SEARCH BAR */}
      <div className="panel" style={{ padding: "16px 20px", marginBottom: "18px" }}>
        <div className="inventory-controls-row">
          <div className="search-row" style={{ marginTop: 0, flex: 1, minWidth: "250px" }}>
            <Search size={16} />
            <input
              type="text"
              placeholder="Search by invoice #, customer name, mobile or footwear..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            {query && (
              <button className="search-clear-btn" onClick={() => setQuery("")}>
                ✕
              </button>
            )}
          </div>

          <div className="filter-group">
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="select-filter"
            >
              <option value="All">All Time</option>
              <option value="Today">Today Only</option>
              <option value="Week">Past 7 Days</option>
              <option value="Month">This Month</option>
            </select>

            <select
              value={paymentFilter}
              onChange={(e) => setPaymentFilter(e.target.value)}
              className="select-filter"
            >
              <option value="All">All Payment Modes</option>
              <option value="UPI">UPI / QR</option>
              <option value="Cash">Cash</option>
              <option value="Card">Card</option>
              <option value="Split">Split (Cash + UPI)</option>
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="select-filter"
            >
              <option value="All">All Statuses</option>
              <option value="Completed">Completed</option>
              <option value="Refunded">Refunded</option>
            </select>
          </div>
        </div>
      </div>

      {/* INVOICES TABLE */}
      <div className="panel table-panel">
        <div className="table-responsive">
          <table className="custom-table">
            <thead>
              <tr>
                <th>Invoice Details</th>
                <th>Customer</th>
                <th>Footwear Items</th>
                <th style={{ textAlign: "center" }}>Payment Mode</th>
                <th style={{ textAlign: "center" }}>Status</th>
                <th style={{ textAlign: "right" }}>Total Amount</th>
                <th style={{ textAlign: "center" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredSales.length === 0 ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: "center", padding: "40px 20px" }}>
                    <FileText size={32} style={{ color: "#a0aec0", margin: "0 auto 10px" }} />
                    <div style={{ fontWeight: 600, color: "#4a5568" }}>
                      No transactions match your search criteria
                    </div>
                  </td>
                </tr>
              ) : (
                filteredSales.map((sale) => {
                  const saleFinalTotal =
                    Number(sale.total) > 0
                      ? Number(sale.total)
                      : (sale.items?.reduce(
                          (sum, it) =>
                            sum +
                            (Number(it.unit_price ?? it.unitPrice) || 0) *
                              (Number(it.quantity) || 1),
                          0
                        ) || 0);

                  return (
                    <tr key={sale.id}>
                      <td>
                        <div style={{ display: "flex", flexDirection: "column" }}>
                          <strong style={{ color: "#101c35", letterSpacing: "0.2px" }}>
                            {sale.invoice_no}
                          </strong>
                          <span className="sub-text">
                            {new Date(sale.created_at).toLocaleString("en-IN", {
                              dateStyle: "medium",
                              timeStyle: "short",
                            })}
                          </span>
                        </div>
                      </td>

                      <td>
                        <div>
                          <strong>{sale.customer?.name || "Walk-in Customer"}</strong>
                          {sale.customer?.phone && (
                            <div className="sub-text">{sale.customer.phone}</div>
                          )}
                        </div>
                      </td>

                      <td>
                        <div className="items-summary-list">
                          {sale.items?.map((it, idx) => (
                            <div key={idx} className="item-pill-small">
                              {it.product_name} • <strong>Size {it.size}</strong> ({it.quantity})
                            </div>
                          ))}
                        </div>
                      </td>

                      <td style={{ textAlign: "center" }}>
                        {sale.payment_method === "Split" ? (
                          <div>
                            <span className="badge-pill split">Split</span>
                            {sale.payment_split && (
                              <div className="sub-text" style={{ fontSize: "9px", marginTop: "2px" }}>
                                Cash: {formatINR(sale.payment_split.cash)} | UPI: {formatINR(sale.payment_split.upi)}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className={`badge-pill ${sale.payment_method?.toLowerCase()}`}>
                            {sale.payment_method}
                          </span>
                        )}
                      </td>

                      <td style={{ textAlign: "center" }}>
                        <span
                          className={`status-chip ${
                            sale.status === "Refunded" ? "refunded" : "paid"
                          }`}
                        >
                          {sale.status === "Refunded" ? (
                            <>
                              <AlertCircle size={11} /> Refunded
                            </>
                          ) : (
                            <>
                              <CheckCircle size={11} /> Paid
                            </>
                          )}
                        </span>
                      </td>

                      <td style={{ textAlign: "right", fontWeight: 700, fontSize: "14px" }}>
                        <span
                          style={{
                            textDecoration:
                              sale.status === "Refunded" ? "line-through" : "none",
                            color: sale.status === "Refunded" ? "#94a3b8" : "#101c35",
                          }}
                        >
                          {formatINR(saleFinalTotal)}
                        </span>
                      </td>

                    <td style={{ textAlign: "center" }}>
                      <div style={{ display: "flex", gap: "6px", justifyContent: "center" }}>
                        <button
                          className="btn-tiny"
                          onClick={() => handleViewReceipt(sale)}
                          title="View & Print Bill"
                        >
                          <Printer size={12} /> Receipt
                        </button>
                        {sale.status !== "Refunded" && (
                          <button
                            className="btn-tiny-danger"
                            onClick={() => handleRefund(sale)}
                            title="Process Return / Refund (Restores Stock)"
                          >
                            <RotateCcw size={12} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
