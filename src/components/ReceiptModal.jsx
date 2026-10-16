import React from "react";
import { Printer, X, CheckCircle, Footprints } from "lucide-react";
import { useStore } from "../context/StoreContext.jsx";
import { formatINR } from "../utils/calculations.js";

export default function ReceiptModal() {
  const { recentInvoice, isReceiptOpen, setIsReceiptOpen, settings } = useStore();

  if (!isReceiptOpen || !recentInvoice) return null;

  const handlePrint = () => {
    window.print();
  };

  const invoiceSubtotal =
    Number(recentInvoice.subtotal) > 0
      ? Number(recentInvoice.subtotal)
      : (recentInvoice.items?.reduce(
          (sum, it) =>
            sum +
            (Number(it.unit_price ?? it.unitPrice) || 0) *
              (Number(it.quantity) || 1),
          0
        ) || 0);

  const discountAmount = Number(recentInvoice.discount_amount) || 0;
  const taxRate = Number(recentInvoice.tax_rate) || settings.default_tax_rate || 5;
  const taxableAmount = Math.max(0, invoiceSubtotal - discountAmount);
  const taxAmount =
    Number(recentInvoice.tax_amount) > 0
      ? Number(recentInvoice.tax_amount)
      : (taxableAmount * taxRate) / 100;

  const grandTotal =
    Number(recentInvoice.total) > 0
      ? Number(recentInvoice.total)
      : Math.round((taxableAmount + taxAmount) * 100) / 100;

  return (
    <div className="modal-backdrop" onClick={() => setIsReceiptOpen(false)}>
      <div className="modal-content receipt-modal" onClick={(e) => e.stopPropagation()}>
        <div className="receipt-actions no-print">
          <div className="receipt-success-badge">
            <CheckCircle size={16} /> Sale Completed Successfully
          </div>
          <div className="action-buttons">
            <button className="btn-secondary" onClick={handlePrint}>
              <Printer size={15} /> Print Invoice
            </button>
            <button className="btn-close" onClick={() => setIsReceiptOpen(false)}>
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Printable Invoice Container */}
        <div className="printable-receipt">
          <div className="receipt-header">
            <div className="receipt-brand-mark">
              <Footprints size={26} />
            </div>
            <h2>{settings.shop_name}</h2>
            <div className="receipt-tagline">{settings.tagline}</div>
            <div className="receipt-address">{settings.address}</div>
            <div className="receipt-contact">
              Phone: {settings.phone} | GSTIN: {settings.gstin}
            </div>
          </div>

          <div className="receipt-divider" />

          <div className="receipt-meta-grid">
            <div>
              <span className="meta-label">INVOICE NO:</span>
              <strong>{recentInvoice.invoice_no}</strong>
            </div>
            <div style={{ textAlign: "right" }}>
              <span className="meta-label">DATE & TIME:</span>
              <strong>{new Date(recentInvoice.created_at).toLocaleString("en-IN")}</strong>
            </div>
            <div>
              <span className="meta-label">CUSTOMER:</span>
              <strong>{recentInvoice.customer?.name || "Walk-in Customer"}</strong>
              {recentInvoice.customer?.phone && (
                <span className="meta-sub"> ({recentInvoice.customer.phone})</span>
              )}
            </div>
            <div style={{ textAlign: "right" }}>
              <span className="meta-label">PAYMENT MODE:</span>
              <span className="payment-pill">
                {recentInvoice.payment_method === "Split"
                  ? "Split (Cash + UPI)"
                  : recentInvoice.payment_method}
              </span>
            </div>
            <div>
              <span className="meta-label">BILLED BY:</span>
              <strong style={{ color: "#7c632e" }}>{recentInvoice.billed_by || "JDS Cashier"}</strong>
            </div>
            <div style={{ textAlign: "right" }}>
              <span className="meta-label">STATUS:</span>
              <strong style={{ color: "#16a34a" }}>{recentInvoice.status || "Paid"}</strong>
            </div>
          </div>

          <table className="receipt-table">
            <thead>
              <tr>
                <th style={{ width: "32px" }}>#</th>
                <th>Item & Details</th>
                <th style={{ textAlign: "center" }}>Size</th>
                <th style={{ textAlign: "center" }}>Qty</th>
                <th style={{ textAlign: "right" }}>Price</th>
                <th style={{ textAlign: "right" }}>Total</th>
              </tr>
            </thead>
            <tbody>
              {recentInvoice.items?.map((item, idx) => {
                const itemRate = Number(item.unit_price ?? item.unitPrice) || 0;
                const itemQty = Number(item.quantity) || 1;
                return (
                  <tr key={idx}>
                    <td>{idx + 1}</td>
                    <td>
                      <strong>{item.product_name}</strong>
                      <div className="item-sub">
                        {item.brand} • {item.article_no}
                      </div>
                    </td>
                    <td style={{ textAlign: "center" }}>
                      <span className="receipt-size-badge">{item.size}</span>
                    </td>
                    <td style={{ textAlign: "center" }}>{itemQty}</td>
                    <td style={{ textAlign: "right" }}>{formatINR(itemRate)}</td>
                    <td style={{ textAlign: "right" }}>
                      {formatINR(itemRate * itemQty)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          <div className="receipt-totals-section">
            <div className="receipt-totals-row">
              <span>Subtotal:</span>
              <span>{formatINR(invoiceSubtotal)}</span>
            </div>
            {discountAmount > 0 && (
              <div className="receipt-totals-row discount-row">
                <span>Discount:</span>
                <span>- {formatINR(discountAmount)}</span>
              </div>
            )}
            <div className="receipt-totals-row">
              <span>GST ({taxRate}%):</span>
              <span>{formatINR(taxAmount)}</span>
            </div>
            <div className="receipt-grand-total">
              <span>Grand Total:</span>
              <strong>{formatINR(grandTotal)}</strong>
            </div>

            {/* Split Payment Details */}
            {recentInvoice.payment_method === "Split" && recentInvoice.payment_split && (
              <div className="receipt-split-breakdown">
                <div className="receipt-totals-row" style={{ marginTop: "6px" }}>
                  <span>Paid by Cash:</span>
                  <strong>{formatINR(recentInvoice.payment_split.cash || 0)}</strong>
                </div>
                <div className="receipt-totals-row">
                  <span>Paid by UPI:</span>
                  <strong>{formatINR(recentInvoice.payment_split.upi || 0)}</strong>
                </div>
              </div>
            )}
          </div>

          <div className="receipt-footer">
            <p className="footer-note">{settings.footer_note}</p>
            <div className="barcode-mock">
              ||| | ||||| |||| | |||| |||| ||| |||
              <div className="barcode-text">{recentInvoice.invoice_no}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
