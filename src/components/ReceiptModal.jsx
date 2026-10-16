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
              <span className="payment-pill">{recentInvoice.payment_method}</span>
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
              {recentInvoice.items.map((item, idx) => (
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
                  <td style={{ textAlign: "center" }}>{item.quantity}</td>
                  <td style={{ textAlign: "right" }}>{formatINR(item.unit_price)}</td>
                  <td style={{ textAlign: "right" }}>
                    {formatINR(item.unit_price * item.quantity)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="receipt-totals-section">
            <div className="receipt-totals-row">
              <span>Subtotal:</span>
              <span>{formatINR(recentInvoice.subtotal)}</span>
            </div>
            {recentInvoice.discount_amount > 0 && (
              <div className="receipt-totals-row discount-row">
                <span>Discount:</span>
                <span>- {formatINR(recentInvoice.discount_amount)}</span>
              </div>
            )}
            <div className="receipt-totals-row">
              <span>GST ({recentInvoice.tax_rate || settings.default_tax_rate}%):</span>
              <span>{formatINR(recentInvoice.tax_amount)}</span>
            </div>
            <div className="receipt-grand-total">
              <span>Grand Total:</span>
              <strong>{formatINR(recentInvoice.total)}</strong>
            </div>
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
