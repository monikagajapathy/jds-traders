import React, { useState, useMemo } from "react";
import {
  Search,
  ShoppingCart,
  Trash2,
  Plus,
  Minus,
  User,
  CreditCard,
  Banknote,
  QrCode,
  Tag,
  Check,
  Package,
  Layers,
} from "lucide-react";
import { useStore } from "../context/StoreContext.jsx";
import { formatINR } from "../utils/calculations.js";

const categories = ["All", "Men", "Women", "Kids", "Formal", "Sports", "Casual"];

export default function BillingView() {
  const {
    products,
    cart,
    addToCart,
    updateCartQty,
    removeFromCart,
    clearCart,
    completeCheckout,
    settings,
  } = useStore();

  const [selectedCategory, setSelectedCategory] = useState("All");
  const [query, setQuery] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [billDiscount, setBillDiscount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState("UPI");
  const [splitCash, setSplitCash] = useState(0);
  const [splitUpi, setSplitUpi] = useState(0);
  const [taxRate, setTaxRate] = useState(settings.default_tax_rate || 5);

  // Filter products by search and category
  const filteredProducts = useMemo(() => {
    return products.filter((prod) => {
      const matchCat =
        selectedCategory === "All" ||
        prod.category === selectedCategory ||
        prod.sub_category === selectedCategory;

      if (!matchCat) return false;

      if (!query.trim()) return true;
      const q = query.toLowerCase().trim();
      const matchName = prod.name.toLowerCase().includes(q);
      const matchArt = prod.article_no?.toLowerCase().includes(q);
      const matchBrand = prod.brand?.toLowerCase().includes(q);
      const matchVariant = prod.variants.some(
        (v) =>
          v.barcode?.includes(q) ||
          v.sku?.toLowerCase().includes(q) ||
          v.size?.toString() === q
      );

      return matchName || matchArt || matchBrand || matchVariant;
    });
  }, [products, selectedCategory, query]);

  // Compute Cart Calculations
  const subtotal = cart.reduce(
    (sum, item) => sum + (Number(item.unit_price ?? item.unitPrice) || 0) * item.quantity,
    0
  );
  const totalDiscount = Math.min(subtotal, Math.max(0, Number(billDiscount) || 0));
  const taxableAmount = Math.max(0, subtotal - totalDiscount);
  const taxAmount = (taxableAmount * Number(taxRate)) / 100;
  const grandTotal = Math.round((taxableAmount + taxAmount) * 100) / 100;
  const totalItemsCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  // When switching to Split payment, initialize split amounts
  const handleSelectPaymentMethod = (method) => {
    setPaymentMethod(method);
    if (method === "Split") {
      const half = Math.round(grandTotal / 2);
      setSplitCash(half);
      setSplitUpi(grandTotal - half);
    }
  };

  const handleCashChange = (val) => {
    const cashVal = Math.max(0, Number(val) || 0);
    setSplitCash(cashVal);
    setSplitUpi(Math.max(0, Math.round((grandTotal - cashVal) * 100) / 100));
  };

  const handleUpiChange = (val) => {
    const upiVal = Math.max(0, Number(val) || 0);
    setSplitUpi(upiVal);
    setSplitCash(Math.max(0, Math.round((grandTotal - upiVal) * 100) / 100));
  };

  const handleCheckout = () => {
    if (cart.length === 0) return;

    let splitData = null;
    if (paymentMethod === "Split") {
      const finalCash = Number(splitCash) || 0;
      const finalUpi = Number(splitUpi) || 0;
      splitData = {
        cash: finalCash,
        upi: finalUpi,
      };
    }

    completeCheckout({
      customer: {
        name: customerName.trim() || "Walk-in Customer",
        phone: customerPhone.trim(),
      },
      billDiscount: totalDiscount,
      taxRate: Number(taxRate),
      paymentMethod,
      paymentSplit: splitData,
    });

    // Reset customer fields
    setCustomerName("");
    setCustomerPhone("");
    setBillDiscount(0);
    setSplitCash(0);
    setSplitUpi(0);
  };

  return (
    <section className="billing-layout">
      {/* LEFT PANEL: PRODUCT CATALOGUE */}
      <div className="panel catalog-panel">
        <div className="panel-heading">
          <div>
            <h2>Product catalogue</h2>
            <p>Select footwear model and tap a size to add to bill</p>
          </div>
          <span className="small-tag">
            {filteredProducts.length} ARTICLES AVAILABLE
          </span>
        </div>

        {/* Category Filter Pills */}
        <div className="category-scroll">
          {categories.map((cat) => (
            <button
              key={cat}
              className={`cat-pill ${selectedCategory === cat ? "active" : ""}`}
              onClick={() => setSelectedCategory(cat)}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Search Bar */}
        <div className="search-row">
          <Search size={18} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search footwear, article code (e.g. ART-101), brand or barcode..."
          />
          {query && (
            <button className="search-clear-btn" onClick={() => setQuery("")}>
              ✕
            </button>
          )}
          <kbd>Enter</kbd>
        </div>

        {/* Product Cards Grid */}
        <div className="catalog-grid-container">
          {filteredProducts.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">
                <Package size={26} />
              </div>
              <h3>No footwear found</h3>
              <p>
                {query
                  ? `No matching footwear for "${query}". Try searching by brand, size, or article code.`
                  : "No products available in this category."}
              </p>
            </div>
          ) : (
            <div className="footwear-card-grid">
              {filteredProducts.map((prod) => (
                <div key={prod.id} className="footwear-card">
                  <div className="footwear-card-header">
                    <span className="art-pill">{prod.article_no}</span>
                    <span className="brand-label">{prod.brand}</span>
                  </div>

                  <h4 className="footwear-name" title={prod.name}>
                    {prod.name}
                  </h4>

                  <div className="footwear-category-label">
                    {prod.category} • {prod.sub_category}
                  </div>

                  <div className="footwear-card-price">
                    <strong>
                      {formatINR(prod.variants[0]?.selling_price || 0)}
                    </strong>
                    <span className="tax-hint">incl. {prod.tax_rate}% GST</span>
                  </div>

                  <div className="sizes-section">
                    <span className="sizes-caption">Select Size (Stock):</span>
                    <div className="size-chips-row">
                      {prod.variants.map((v) => {
                        const inStock = (v.stock || 0) > 0;
                        const cartItem = cart.find((c) => c.variant_id === v.id);
                        const isSelected = !!cartItem;

                        return (
                          <button
                            key={v.id}
                            type="button"
                            disabled={!inStock}
                            className={`size-btn ${isSelected ? "in-cart" : ""} ${
                              !inStock ? "out-of-stock" : ""
                            }`}
                            onClick={() => addToCart(v, prod)}
                            title={`Size ${v.size} (${v.color}) - Stock: ${v.stock} pairs`}
                          >
                            <span className="size-num">{v.size}</span>
                            <span className="size-stock">
                              {inStock ? `(${v.stock})` : "0"}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* RIGHT PANEL: CURRENT BILL */}
      <div className="panel cart-panel">
        <div className="panel-heading">
          <div>
            <h2>Current bill</h2>
            <p>Quick checkout & invoice generation</p>
          </div>
          <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
            <span className="cart-count">
              {totalItemsCount} {totalItemsCount === 1 ? "pair" : "pairs"}
            </span>
            {cart.length > 0 && (
              <button
                className="cart-clear-icon-btn"
                onClick={clearCart}
                title="Clear Bill"
              >
                <Trash2 size={13} />
              </button>
            )}
          </div>
        </div>

        {/* Customer Details Row */}
        <div className="customer-strip">
          <div className="customer-input-box">
            <User size={14} className="input-icon" />
            <input
              type="text"
              placeholder="Customer Name (optional)"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
            />
          </div>
          <div className="customer-input-box phone-box">
            <input
              type="tel"
              placeholder="Mobile Number"
              value={customerPhone}
              onChange={(e) => setCustomerPhone(e.target.value)}
            />
          </div>
        </div>

        {/* Cart Items List */}
        <div className="cart-items-wrapper">
          {cart.length === 0 ? (
            <div className="cart-empty">
              <ShoppingCart size={32} />
              <strong>Your cart is empty</strong>
              <span>Click any in-stock size from the catalogue to begin billing.</span>
            </div>
          ) : (
            <div className="cart-list">
              {cart.map((item) => (
                <div key={item.variant_id} className="cart-item-row">
                  <div className="cart-item-info">
                    <div className="cart-item-title">{item.product_name}</div>
                    <div className="cart-item-meta">
                      <span className="cart-badge-size">Size {item.size}</span>
                      <span>{item.brand}</span>
                      <span>•</span>
                      <span>{item.color}</span>
                    </div>
                    <div className="cart-item-rate">
                      {formatINR(item.unit_price)} each
                    </div>
                  </div>

                  <div className="cart-item-controls">
                    <div className="qty-picker">
                      <button
                        type="button"
                        onClick={() => updateCartQty(item.variant_id, -1)}
                      >
                        <Minus size={11} />
                      </button>
                      <span className="qty-display">{item.quantity}</span>
                      <button
                        type="button"
                        disabled={item.quantity >= item.max_stock}
                        onClick={() => updateCartQty(item.variant_id, 1)}
                      >
                        <Plus size={11} />
                      </button>
                    </div>

                    <div className="cart-item-line-total">
                      {formatINR(item.unit_price * item.quantity)}
                    </div>

                    <button
                      type="button"
                      className="cart-remove-btn"
                      onClick={() => removeFromCart(item.variant_id)}
                      title="Remove Item"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Bill Calculations & Payment */}
        <div className="totals">
          <div className="subtotal-row">
            <span>Subtotal ({totalItemsCount} pairs)</span>
            <strong>{formatINR(subtotal)}</strong>
          </div>

          <div className="discount-input-row">
            <span>
              <Tag size={12} style={{ marginRight: "4px" }} /> Discount (₹)
            </span>
            <input
              type="number"
              min="0"
              max={subtotal}
              value={billDiscount || ""}
              onChange={(e) => setBillDiscount(Math.max(0, Number(e.target.value)))}
              placeholder="0"
              className="discount-input"
            />
          </div>

          <div className="tax-row">
            <span>GST Slab</span>
            <select
              value={taxRate}
              onChange={(e) => setTaxRate(Number(e.target.value))}
              className="tax-selector"
            >
              <option value="0">0% Exempt</option>
              <option value="5">5% Footwear &lt; ₹1,000</option>
              <option value="12">12% Footwear &ge; ₹1,000</option>
              <option value="18">18% Standard</option>
            </select>
          </div>

          <div className="tax-row">
            <span>Tax Amount</span>
            <strong>{formatINR(taxAmount)}</strong>
          </div>

          <div className="grand-total">
            <span>Grand total</span>
            <strong>{formatINR(grandTotal)}</strong>
          </div>

          {/* Payment Method Selector */}
          <div className="payment-options">
            {[
              { id: "UPI", label: "UPI / QR", icon: QrCode },
              { id: "Cash", label: "Cash", icon: Banknote },
              { id: "Card", label: "Card", icon: CreditCard },
              { id: "Split", label: "Split (Cash + UPI)", icon: Layers },
            ].map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                className={`payment-pill-btn ${paymentMethod === id ? "active" : ""}`}
                onClick={() => handleSelectPaymentMethod(id)}
              >
                <Icon size={13} />
                <span>{label}</span>
                {paymentMethod === id && <Check size={11} className="check-icon" />}
              </button>
            ))}
          </div>

          {/* Split Payment Controls */}
          {paymentMethod === "Split" && (
            <div className="split-payment-card">
              <div className="split-header">
                <span className="split-title">Split Bill Breakdown:</span>
                <span
                  className={`split-status-badge ${
                    Math.abs(splitCash + splitUpi - grandTotal) < 0.01
                      ? "balanced"
                      : "unbalanced"
                  }`}
                >
                  {Math.abs(splitCash + splitUpi - grandTotal) < 0.01
                    ? "✓ Balanced"
                    : `Diff: ₹${Math.abs(Math.round((grandTotal - (splitCash + splitUpi)) * 100) / 100)}`}
                </span>
              </div>

              <div className="split-inputs-grid">
                <div className="split-field">
                  <label>
                    <Banknote size={12} /> Cash Amount (₹)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max={grandTotal}
                    step="any"
                    value={splitCash || ""}
                    onChange={(e) => handleCashChange(e.target.value)}
                    placeholder="0"
                  />
                </div>

                <div className="split-field">
                  <label>
                    <QrCode size={12} /> UPI Amount (₹)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max={grandTotal}
                    step="any"
                    value={splitUpi || ""}
                    onChange={(e) => handleUpiChange(e.target.value)}
                    placeholder="0"
                  />
                </div>
              </div>

              <div className="split-presets-row">
                <button
                  type="button"
                  className="btn-chip"
                  onClick={() => {
                    const half = Math.round((grandTotal / 2) * 100) / 100;
                    setSplitCash(half);
                    setSplitUpi(Math.round((grandTotal - half) * 100) / 100);
                  }}
                >
                  50% Cash / 50% UPI
                </button>
                <button
                  type="button"
                  className="btn-chip"
                  onClick={() => {
                    const roundedCash = Math.min(grandTotal, Math.floor(grandTotal / 500) * 500 || 500);
                    handleCashChange(roundedCash);
                  }}
                >
                  Round Cash ₹500
                </button>
              </div>
            </div>
          )}

          <button
            className="checkout-button"
            disabled={cart.length === 0}
            onClick={handleCheckout}
          >
            Checkout · {formatINR(grandTotal)}
          </button>
          <p className="checkout-note">
            Instant invoice generation with real-time stock deduction
          </p>
        </div>
      </div>
    </section>
  );
}
