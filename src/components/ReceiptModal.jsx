import React from "react";
import { Printer, X, CheckCircle, ShieldCheck } from "lucide-react";
import { useStore } from "../context/StoreContext.jsx";
import { formatINR } from "../utils/calculations.js";

// Number to Words converter for formal Indian GST Tax Invoice Statements
function numberToWordsINR(num) {
  const n = Math.round(Number(num) || 0);
  if (n <= 0) return "Zero Rupees Only";

  const a = [
    "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
    "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen",
    "Seventeen", "Eighteen", "Nineteen"
  ];
  const b = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

  function convert(val) {
    if (val < 20) return a[val];
    if (val < 100) return b[Math.floor(val / 10)] + (val % 10 !== 0 ? " " + a[val % 10] : "");
    if (val < 1000) return a[Math.floor(val / 100)] + " Hundred" + (val % 100 !== 0 ? " " + convert(val % 100) : "");
    if (val < 100000) return convert(Math.floor(val / 1000)) + " Thousand" + (val % 1000 !== 0 ? " " + convert(val % 1000) : "");
    if (val < 10000000) return convert(Math.floor(val / 100000)) + " Lakh" + (val % 100000 !== 0 ? " " + convert(val % 100000) : "");
    return convert(Math.floor(val / 10000000)) + " Crore" + (val % 10000000 !== 0 ? " " + convert(val % 10000000) : "");
  }

  return `Indian Rupees ${convert(n)} Only`;
}

export default function ReceiptModal() {
  const { recentInvoice, isReceiptOpen, setIsReceiptOpen, settings, isAdmin } = useStore();

  if (!isReceiptOpen || !recentInvoice) return null;

  const handlePrint = () => {
    window.print();
  };

  const invoiceSubtotal =
    Number(recentInvoice.subtotal) > 0
      ? Number(recentInvoice.subtotal)
      : recentInvoice.items?.reduce(
          (sum, it) =>
            sum +
            (Number(it.unit_price ?? it.unitPrice) || 0) * (Number(it.quantity) || 1),
          0
        ) || 0;

  const discountAmount = Number(recentInvoice.discount_amount) || 0;
  const taxableAmount =
    Number(recentInvoice.taxable_amount) > 0
      ? Number(recentInvoice.taxable_amount)
      : Math.max(0, invoiceSubtotal - discountAmount);

  const taxAmount =
    Number(recentInvoice.tax_amount) > 0
      ? Number(recentInvoice.tax_amount)
      : (taxableAmount * (Number(recentInvoice.tax_rate) || settings.default_tax_rate || 5)) / 100;

  const grandTotal =
    Number(recentInvoice.total) > 0
      ? Number(recentInvoice.total)
      : Math.round((taxableAmount + taxAmount) * 100) / 100;

  // Build GST Tax Slabs Breakdown (Issue 10)
  const gstBreakdown = (() => {
    if (Array.isArray(recentInvoice.gst_breakdown) && recentInvoice.gst_breakdown.length > 0) {
      return recentInvoice.gst_breakdown;
    }

    // Synthesize from items if not already present
    const map = new Map();
    recentInvoice.items?.forEach((item) => {
      const rate = Number(item.tax_rate ?? recentInvoice.tax_rate ?? 5);
      const itemTaxable =
        Number(item.taxable_amount) ||
        (Number(item.unit_price ?? item.unitPrice) || 0) * (Number(item.quantity) || 1);
      const itemTax = Number(item.tax_amount) || (itemTaxable * rate) / 100;
      const cgst = itemTax / 2;
      const sgst = itemTax / 2;

      const key = `${rate}%`;
      if (!map.has(key)) {
        map.set(key, {
          rate,
          taxable: 0,
          cgstRate: rate / 2,
          cgstAmt: 0,
          sgstRate: rate / 2,
          sgstAmt: 0,
          totalTax: 0,
        });
      }
      const slab = map.get(key);
      slab.taxable += itemTaxable;
      slab.cgstAmt += cgst;
      slab.sgstAmt += sgst;
      slab.totalTax += itemTax;
    });

    return Array.from(map.values()).map((s) => ({
      ...s,
      taxable: Math.round(s.taxable * 100) / 100,
      cgstAmt: Math.round(s.cgstAmt * 100) / 100,
      sgstAmt: Math.round(s.sgstAmt * 100) / 100,
      totalTax: Math.round(s.totalTax * 100) / 100,
    }));
  })();

  const totalCgst = gstBreakdown.reduce((sum, g) => sum + g.cgstAmt, 0);
  const totalSgst = gstBreakdown.reduce((sum, g) => sum + g.sgstAmt, 0);

  return (
    <div className="modal-backdrop" onClick={() => setIsReceiptOpen(false)}>
      <div className="modal-content receipt-modal statement-modal" onClick={(e) => e.stopPropagation()}>
        <div className="receipt-actions no-print">
          <div className="receipt-success-badge">
            <CheckCircle size={16} /> Sale Completed · Tax Invoice Statement Ready
          </div>
          <div className="action-buttons">
            <button className="btn-primary" onClick={handlePrint}>
              <Printer size={15} /> Print Invoice Statement
            </button>
            <button className="btn-close" onClick={() => setIsReceiptOpen(false)}>
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Printable Formal GST Tax Statement Container (Issue 7 & 10) */}
        <div className="printable-receipt statement-document">
          {/* Strictly Centered Watermark (Issue 7) */}
          <div className="receipt-watermark" aria-hidden="true">
            <img src="/logo.png" alt="" />
          </div>

          {/* Statement Header */}
          <div className="statement-header-top">
            <div className="statement-brand-left">
              <img src="/logo.png" alt="JDS Traders Logo" className="statement-logo-img" />
              <div>
                <h1 className="statement-shop-title">{settings.shop_name}</h1>
                <div className="statement-tagline">{settings.tagline}</div>
                <div className="statement-shop-address">{settings.address}</div>
                <div className="statement-shop-contact">
                  <strong>Phone:</strong> {settings.phone} | <strong>Email:</strong> {settings.email}
                </div>
              </div>
            </div>

            <div className="statement-gst-badge-box">
              <div className="gst-badge-title">GST REGISTERED ENTITY</div>
              <div className="gst-number-display">{settings.gstin}</div>
              <div className="gst-state-sub">State: 33 - Tamil Nadu</div>
            </div>
          </div>

          {/* Formal Banner */}
          <div className="statement-title-banner">
            <span>TAX INVOICE / CASH MEMO STATEMENT</span>
          </div>

          {/* Two-Column Statement Particulars */}
          <div className="statement-meta-two-column">
            {/* Left: Customer Statement Details */}
            <div className="statement-meta-box left">
              <div className="meta-box-header">BILLED TO (CUSTOMER DETAILS)</div>
              <div className="meta-row">
                <span className="m-label">Name:</span>
                <strong className="m-val">{recentInvoice.customer?.name || "Walk-in Customer"}</strong>
              </div>
              <div className="meta-row">
                <span className="m-label">Mobile:</span>
                <span className="m-val">{recentInvoice.customer?.phone || "—"}</span>
              </div>
              <div className="meta-row">
                <span className="m-label">Place of Supply:</span>
                <span className="m-val">33 - Tamil Nadu</span>
              </div>
              <div className="meta-row">
                <span className="m-label">Reverse Charge:</span>
                <span className="m-val">No</span>
              </div>
            </div>

            {/* Right: Invoice Particulars */}
            <div className="statement-meta-box right">
              <div className="meta-box-header">INVOICE PARTICULARS</div>
              <div className="meta-row">
                <span className="m-label">Invoice No:</span>
                <strong className="m-val highlight">{recentInvoice.invoice_no}</strong>
              </div>
              <div className="meta-row">
                <span className="m-label">Date & Time:</span>
                <span className="m-val">
                  {new Date(recentInvoice.created_at).toLocaleString("en-IN", {
                    dateStyle: "medium",
                    timeStyle: "short",
                  })}
                </span>
              </div>
              <div className="meta-row">
                <span className="m-label">Payment Mode:</span>
                <span className="m-val payment-chip">
                  {recentInvoice.payment_method === "Split"
                    ? "Split (Cash + UPI)"
                    : recentInvoice.payment_method}
                </span>
              </div>
              <div className="meta-row">
                <span className="m-label">Billed By:</span>
                <span className="m-val">
                  {isAdmin
                    ? `${recentInvoice.billed_by || "Moni"} (Admin Audit)`
                    : "Main POS Counter #1"}
                </span>
              </div>
            </div>
          </div>

          {/* Itemized Footwear Statement Table with Product-wise GST (Issue 10) */}
          <div className="statement-table-wrapper">
            <table className="statement-items-table">
              <thead>
                <tr>
                  <th style={{ width: "28px", textAlign: "center" }}>#</th>
                  <th>Description of Footwear Goods</th>
                  <th style={{ textAlign: "center" }}>HSN</th>
                  <th style={{ textAlign: "center" }}>Size</th>
                  <th style={{ textAlign: "center" }}>Qty</th>
                  <th style={{ textAlign: "right" }}>Rate (₹)</th>
                  <th style={{ textAlign: "right" }}>Taxable (₹)</th>
                  <th style={{ textAlign: "center" }}>GST %</th>
                  <th style={{ textAlign: "right" }}>GST Amt (₹)</th>
                  <th style={{ textAlign: "right" }}>Total (₹)</th>
                </tr>
              </thead>
              <tbody>
                {recentInvoice.items?.map((item, idx) => {
                  const itemRate = Number(item.unit_price ?? item.unitPrice) || 0;
                  const itemQty = Number(item.quantity) || 1;
                  const rawTotal = itemRate * itemQty;
                  const itemDisc = Number(item.discount_amount) || 0;
                  const itemTaxable =
                    Number(item.taxable_amount) || Math.max(0, rawTotal - itemDisc);
                  const gstPct = Number(item.tax_rate ?? recentInvoice.tax_rate ?? 5);
                  const itemTax =
                    Number(item.tax_amount) || (itemTaxable * gstPct) / 100;
                  const lineTotal =
                    Number(item.total_with_tax) || Math.round((itemTaxable + itemTax) * 100) / 100;

                  return (
                    <tr key={idx}>
                      <td style={{ textAlign: "center", color: "#64748b" }}>{idx + 1}</td>
                      <td>
                        <strong>{item.product_name}</strong>
                        <div className="statement-sub-desc">
                          Brand: {item.brand} | Art: {item.article_no} | Color: {item.color}
                        </div>
                      </td>
                      <td style={{ textAlign: "center", fontFamily: "monospace" }}>
                        {item.hsn_code || "6403"}
                      </td>
                      <td style={{ textAlign: "center" }}>
                        <span className="statement-size-pill">{item.size}</span>
                      </td>
                      <td style={{ textAlign: "center", fontWeight: 700 }}>{itemQty}</td>
                      <td style={{ textAlign: "right" }}>{formatINR(itemRate)}</td>
                      <td style={{ textAlign: "right" }}>{formatINR(itemTaxable)}</td>
                      <td style={{ textAlign: "center" }}>
                        <span className="statement-gst-rate-tag">{gstPct}%</span>
                      </td>
                      <td style={{ textAlign: "right" }}>{formatINR(itemTax)}</td>
                      <td style={{ textAlign: "right", fontWeight: 700 }}>
                        {formatINR(lineTotal)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Bottom Statement Section: GST Summary Box + Invoice Totals */}
          <div className="statement-bottom-grid">
            {/* Left: Invoice Amount in Words (GST breakup table removed as requested) */}
            <div className="statement-words-card">
              <span className="words-caption">INVOICE AMOUNT IN WORDS</span>
              <div className="words-text">{numberToWordsINR(grandTotal)}</div>
              <div className="words-subnote">Official retail footwear tax invoice memo.</div>
            </div>

            {/* Right: Net Financial Totals */}
            <div className="statement-financial-totals-box">
              <div className="stat-tot-row">
                <span className="tot-lbl">Total Items / Pairs:</span>
                <strong className="tot-val">
                  {recentInvoice.items?.reduce((s, it) => s + (Number(it.quantity) || 1), 0) || 1} pairs
                </strong>
              </div>
              <div className="stat-tot-row">
                <span className="tot-lbl">Gross Subtotal:</span>
                <span className="tot-val">{formatINR(invoiceSubtotal)}</span>
              </div>
              {discountAmount > 0 && (
                <div className="stat-tot-row discount">
                  <span className="tot-lbl">Bill Discount:</span>
                  <span className="tot-val">- {formatINR(discountAmount)}</span>
                </div>
              )}
              <div className="stat-tot-row">
                <span className="tot-lbl">Total Taxable Value:</span>
                <span className="tot-val">{formatINR(taxableAmount)}</span>
              </div>
              <div className="stat-tot-row">
                <span className="tot-lbl">Total GST (CGST + SGST):</span>
                <span className="tot-val">{formatINR(taxAmount)}</span>
              </div>

              <div className="stat-grand-total-row">
                <div className="stat-total-label">NET PAYABLE AMOUNT:</div>
                <div className="stat-total-val">{formatINR(grandTotal)}</div>
              </div>

              {/* Split Payment Breakdown */}
              {recentInvoice.payment_method === "Split" && recentInvoice.payment_split && (
                <div className="stat-split-card">
                  <div className="stat-split-row">
                    <span className="split-lbl">Cash Received:</span>
                    <strong className="split-val">{formatINR(recentInvoice.payment_split.cash || 0)}</strong>
                  </div>
                  <div className="stat-split-row">
                    <span className="split-lbl">UPI Received:</span>
                    <strong className="split-val">{formatINR(recentInvoice.payment_split.upi || 0)}</strong>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Statement Footer with Terms and Signatory Box */}
          <div className="statement-footer-section">
            <div className="statement-terms-box">
              <strong>Terms & Conditions / Return Policy:</strong>
              <p>{settings.footer_note}</p>
              <div className="statement-jurisdiction">
                Subject to Salem, Tamil Nadu jurisdiction. Goods once sold can be exchanged within 7 days in unworn condition.
              </div>
            </div>

            <div className="statement-signatory-box">
              <div className="for-shop-text">For {settings.shop_name}</div>
              <div className="sign-space" />
              <div className="auth-sign-label">Authorized Signatory</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
