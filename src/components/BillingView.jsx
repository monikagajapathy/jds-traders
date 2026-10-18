import React, { useState, useMemo, useRef, useEffect } from "react";
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
  Barcode,
  ScanLine,
  Filter,
  SlidersHorizontal,
  RotateCcw,
  AlertCircle,
  CheckCircle2,
  Volume2,
  X,
} from "lucide-react";
import { useStore } from "../context/StoreContext.jsx";
import { formatINR } from "../utils/calculations.js";

const categories = [
  { id: "All", label: "All Items" },
  { id: "Gents", label: "Gents (Men)" },
  { id: "Ladies", label: "Ladies (Women)" },
  { id: "Boys", label: "Boys / Kids" },
  { id: "Girls", label: "Girls / Kids" },
  { id: "Formal", label: "Formal" },
  { id: "Casual", label: "Casual" },
  { id: "Sports", label: "Sports" },
  { id: "Sandals", label: "Sandals" },
];

export default function BillingView() {
  const {
    products,
    cart,
    addToCart,
    updateCartQty,
    updateCartItemDiscount,
    updateCartItemTaxRate,
    removeFromCart,
    clearCart,
    completeCheckout,
    settings,
  } = useStore();

  // Filters State (Issue 1 & 4)
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [selectedBrand, setSelectedBrand] = useState("All");
  const [selectedSize, setSelectedSize] = useState("All");
  const [selectedColor, setSelectedColor] = useState("All");
  const [query, setQuery] = useState("");

  // Size Selection State for Catalogue Cards (Issue 6)
  const [selectedSizes, setSelectedSizes] = useState({});

  // Customer Details State (Issue 2)
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [isCustomerRequired, setIsCustomerRequired] = useState(
    settings.require_customer_phone || false
  );
  const [customerError, setCustomerError] = useState("");

  // Payment & Bill Discount State
  const [billDiscount, setBillDiscount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState("UPI");
  const [splitCash, setSplitCash] = useState(0);
  const [splitUpi, setSplitUpi] = useState(0);

  // Barcode Scanner State (Issue 8)
  const [barcodeInput, setBarcodeInput] = useState("");
  const [scanToast, setScanToast] = useState(null);
  const [isBarcodeModalOpen, setIsBarcodeModalOpen] = useState(false);
  const barcodeInputRef = useRef(null);

  // Synthesize audible beep on successful barcode scan
  const playBeep = () => {
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.type = "sine";
      osc.frequency.setValueAtTime(880, audioCtx.currentTime);
      gain.gain.setValueAtTime(0.12, audioCtx.currentTime);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.08);
    } catch {}
  };

  // Derive unique filter options from active products
  const availableBrands = useMemo(() => {
    const set = new Set();
    products.forEach((p) => {
      if (p.brand) set.add(p.brand);
    });
    return ["All", ...Array.from(set).sort()];
  }, [products]);

  const availableSizes = useMemo(() => {
    const set = new Set();
    products.forEach((p) => {
      p.variants?.forEach((v) => {
        if (v.size) set.add(String(v.size));
      });
    });
    return [
      "All",
      ...Array.from(set).sort((a, b) => (parseFloat(a) || 0) - (parseFloat(b) || 0)),
    ];
  }, [products]);

  const availableColors = useMemo(() => {
    const set = new Set();
    products.forEach((p) => {
      p.variants?.forEach((v) => {
        if (v.color) set.add(v.color);
      });
    });
    return ["All", ...Array.from(set).sort()];
  }, [products]);

  // Filter products strictly based on category, brand, size, color, and instant search (Issue 1 & 4)
  const filteredProducts = useMemo(() => {
    return products.filter((prod) => {
      // Category filter (flexible matching for Gents/Men, Ladies/Women, Boys/Kids, etc.)
      if (selectedCategory !== "All") {
        const c = String(prod.category || "").toLowerCase();
        const sub = String(prod.sub_category || "").toLowerCase();
        const sc = selectedCategory.toLowerCase();
        const matchCat =
          (sc === "gents" && (c.includes("men") || c === "gents")) ||
          (sc === "ladies" && (c.includes("women") || c === "ladies")) ||
          (sc === "boys" && (c.includes("boy") || c.includes("kid"))) ||
          (sc === "girls" && (c.includes("girl") || c.includes("kid"))) ||
          c === sc ||
          sub === sc;
        if (!matchCat) return false;
      }

      // Brand filter
      if (selectedBrand !== "All" && prod.brand !== selectedBrand) {
        return false;
      }

      // Size filter (checks if product has this size in stock)
      if (selectedSize !== "All") {
        const hasSize = prod.variants?.some(
          (v) => String(v.size) === String(selectedSize) && (v.stock || 0) > 0
        );
        if (!hasSize) return false;
      }

      // Color filter
      if (selectedColor !== "All") {
        const hasColor = prod.variants?.some(
          (v) => v.color?.toLowerCase() === selectedColor.toLowerCase()
        );
        if (!hasColor) return false;
      }

      // Instant live search while typing (Issue 4 - works without pressing Enter)
      if (!query.trim()) return true;
      const q = query.toLowerCase().trim();
      const matchName = prod.name.toLowerCase().includes(q);
      const matchArt = prod.article_no?.toLowerCase().includes(q);
      const matchBrand = prod.brand?.toLowerCase().includes(q);
      const matchCat =
        prod.category?.toLowerCase().includes(q) ||
        prod.sub_category?.toLowerCase().includes(q);
      const matchVariant = prod.variants?.some(
        (v) =>
          v.barcode?.toLowerCase().includes(q) ||
          v.sku?.toLowerCase().includes(q) ||
          v.color?.toLowerCase().includes(q) ||
          String(v.size).toLowerCase() === q
      );

      return matchName || matchArt || matchBrand || matchCat || matchVariant;
    });
  }, [products, selectedCategory, selectedBrand, selectedSize, selectedColor, query]);

  // Barcode Lookup & Auto-Add (Issue 8)
  const handleBarcodeProcess = (rawCode) => {
    if (!rawCode || !rawCode.trim()) return;
    const code = rawCode.trim().toLowerCase();

    for (const prod of products) {
      const match = prod.variants.find(
        (v) =>
          v.barcode?.toLowerCase() === code ||
          v.sku?.toLowerCase() === code ||
          (v.barcode && v.barcode.endsWith(code)) ||
          prod.article_no?.toLowerCase() === code
      );
      if (match) {
        if ((match.stock || 0) <= 0) {
          alert(`Warning: ${prod.name} (Size ${match.size}) is Out of Stock.`);
          return;
        }
        addToCart(match, prod);
        playBeep();
        setScanToast({
          name: prod.name,
          size: match.size,
          color: match.color,
          price: match.selling_price,
          barcode: match.barcode,
        });
        setTimeout(() => setScanToast(null), 3500);
        setBarcodeInput("");
        setQuery("");
        return;
      }
    }

    alert(`No footwear variant found matching barcode / code: "${rawCode}"`);
  };

  // Keyboard Enter handler on barcode scanner input
  const handleBarcodeKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleBarcodeProcess(barcodeInput || query);
    }
  };

  // Size selection and toggle logic (Issue 6 - clicking same size deselects it)
  const handleSizeClick = (variant, prod) => {
    if (selectedSizes[prod.id] === variant.id) {
      // Clicking the same size again deselects it!
      setSelectedSizes((prev) => {
        const next = { ...prev };
        delete next[prod.id];
        return next;
      });
    } else {
      // Select this size
      setSelectedSizes((prev) => ({ ...prev, [prod.id]: variant.id }));
    }
  };

  // Product-wise GST and Cart Calculations (Issue 3)
  const subtotal = cart.reduce(
    (sum, item) => sum + (Number(item.unit_price ?? item.unitPrice) || 0) * item.quantity,
    0
  );
  const totalDiscount = Math.min(subtotal, Math.max(0, Number(billDiscount) || 0));

  // Compute itemized GST sum based on each product's saved GST rate or custom rate
  let calculatedTaxAmount = 0;
  let calculatedTaxableAmount = 0;

  cart.forEach((item) => {
    const itemPrice = Number(item.unit_price ?? item.unitPrice) || 0;
    const grossLine = itemPrice * item.quantity;
    const itemDisc = Number(item.discount_amount || 0) * item.quantity;
    const propBillDisc = subtotal > 0 ? (grossLine / subtotal) * totalDiscount : 0;
    const netTaxable = Math.max(0, grossLine - (itemDisc + propBillDisc));
    const rate = Number(item.tax_rate ?? 5);
    const tax = (netTaxable * rate) / 100;

    calculatedTaxableAmount += netTaxable;
    calculatedTaxAmount += tax;
  });

  const taxAmount = Math.round(calculatedTaxAmount * 100) / 100;
  const taxableAmount = Math.round(calculatedTaxableAmount * 100) / 100;
  const grandTotal = Math.round((taxableAmount + taxAmount) * 100) / 100;
  const totalItemsCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  // Split payment helpers
  const handleSelectPaymentMethod = (method) => {
    setPaymentMethod(method);
    if (method === "Split") {
      const half = Math.round((grandTotal / 2) * 100) / 100;
      setSplitCash(half);
      setSplitUpi(Math.round((grandTotal - half) * 100) / 100);
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

  // Checkout with validation for Required / Optional Customer Details (Issue 2)
  const handleCheckout = () => {
    if (cart.length === 0) return;

    if (isCustomerRequired) {
      if (!customerPhone.trim() || customerPhone.trim().replace(/\D/g, "").length < 10) {
        setCustomerError(
          "Customer 10-digit mobile number is required before billing (or uncheck 'Mandatory Phone')."
        );
        return;
      }
      if (!customerName.trim()) {
        setCustomerError("Customer Name is required before billing.");
        return;
      }
    }

    setCustomerError("");

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
      paymentMethod,
      paymentSplit: splitData,
    });

    // Reset form
    setCustomerName("");
    setCustomerPhone("");
    setBillDiscount(0);
    setSplitCash(0);
    setSplitUpi(0);
    setSelectedSizes({});
  };

  const resetAllFilters = () => {
    setSelectedCategory("All");
    setSelectedBrand("All");
    setSelectedSize("All");
    setSelectedColor("All");
    setQuery("");
  };

  const hasActiveFilters =
    selectedCategory !== "All" ||
    selectedBrand !== "All" ||
    selectedSize !== "All" ||
    selectedColor !== "All" ||
    query.trim().length > 0;

  return (
    <section className="billing-layout">
      {/* SCAN SUCCESS FLOATING BANNER */}
      {scanToast && (
        <div className="barcode-scan-banner" role="alert">
          <CheckCircle2 size={18} style={{ color: "#22c55e" }} />
          <div>
            <strong>✓ Scanned to Bill: {scanToast.name}</strong>
            <span>
              Size: {scanToast.size} | {formatINR(scanToast.price)} | Barcode: {scanToast.barcode}
            </span>
          </div>
          <button
            type="button"
            className="btn-toast-dismiss"
            onClick={() => setScanToast(null)}
          >
            ✕
          </button>
        </div>
      )}

      {/* LEFT PANEL: PRODUCT CATALOGUE */}
      <div className="panel catalog-panel">
        <div className="panel-heading">
          <div>
            <h2>Product catalogue</h2>
            <p>Select footwear model, tap a size to view its price, and click Add</p>
          </div>
          <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
            <button
              type="button"
              className="btn-barcode-scan-pill"
              onClick={() => setIsBarcodeModalOpen(true)}
              title="Open Barcode Quick Lookup Directory"
            >
              <Barcode size={14} /> Barcode Directory
            </button>
            <span className="small-tag">
              {filteredProducts.length} ARTICLES AVAILABLE
            </span>
          </div>
        </div>

        {/* Category Filter Pills (Issue 1) */}
        <div className="category-scroll">
          {categories.map((cat) => (
            <button
              key={cat.id}
              className={`cat-pill ${selectedCategory === cat.id ? "active" : ""}`}
              onClick={() => setSelectedCategory(cat.id)}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Secondary Filter Strip: Brand, Size, Color (Issue 1) */}
        <div className="catalogue-filter-bar">
          <div className="catalogue-filter-item">
            <label>Brand:</label>
            <select
              value={selectedBrand}
              onChange={(e) => setSelectedBrand(e.target.value)}
              className="catalogue-filter-select"
            >
              {availableBrands.map((b) => (
                <option key={b} value={b}>
                  {b === "All" ? "All Brands" : b}
                </option>
              ))}
            </select>
          </div>

          <div className="catalogue-filter-item">
            <label>Size:</label>
            <select
              value={selectedSize}
              onChange={(e) => setSelectedSize(e.target.value)}
              className="catalogue-filter-select"
            >
              {availableSizes.map((s) => (
                <option key={s} value={s}>
                  {s === "All" ? "All Sizes" : `Size ${s}`}
                </option>
              ))}
            </select>
          </div>

          <div className="catalogue-filter-item">
            <label>Color:</label>
            <select
              value={selectedColor}
              onChange={(e) => setSelectedColor(e.target.value)}
              className="catalogue-filter-select"
            >
              {availableColors.map((c) => (
                <option key={c} value={c}>
                  {c === "All" ? "All Colors" : c}
                </option>
              ))}
            </select>
          </div>

          {hasActiveFilters && (
            <button
              type="button"
              className="btn-reset-filters"
              onClick={resetAllFilters}
              title="Reset all search and filter conditions"
            >
              <RotateCcw size={12} /> Reset
            </button>
          )}
        </div>

        {/* Dual Input Strip: Barcode Quick Scan + Auto-Search on Typing (Issue 4 & 8) */}
        <div className="search-and-scan-strip">
          {/* Real-time search input (Issue 4: searches automatically while typing) */}
          <div className="search-row-instant">
            <Search size={16} />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Live search by name, article code, brand, color, size..."
            />
            {query && (
              <button
                type="button"
                className="search-clear-btn"
                onClick={() => setQuery("")}
              >
                ✕
              </button>
            )}
            <span className="live-filter-badge">
              {filteredProducts.length} found
            </span>
          </div>

          {/* Dedicated Barcode Scanner Input (Issue 8) */}
          <div className="barcode-scan-input-box" title="Auto-detects USB / Bluetooth Barcode Scanners">
            <ScanLine size={16} className="barcode-icon" />
            <input
              ref={barcodeInputRef}
              type="text"
              value={barcodeInput}
              onChange={(e) => setBarcodeInput(e.target.value)}
              onKeyDown={handleBarcodeKeyDown}
              placeholder="Scan Barcode (Auto-Add)..."
            />
            {barcodeInput && (
              <button
                type="button"
                className="btn-quick-scan-submit"
                onClick={() => handleBarcodeProcess(barcodeInput)}
              >
                Add
              </button>
            )}
          </div>
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
                {query || selectedBrand !== "All" || selectedSize !== "All"
                  ? "No footwear matching your search and filter criteria. Try clearing some filters."
                  : "No products available in this category."}
              </p>
              {hasActiveFilters && (
                <button
                  type="button"
                  className="btn-secondary"
                  style={{ marginTop: "12px" }}
                  onClick={resetAllFilters}
                >
                  <RotateCcw size={13} /> Reset All Filters
                </button>
              )}
            </div>
          ) : (
            <div className="footwear-card-grid">
              {filteredProducts.map((prod) => {
                const selectedVariantId = selectedSizes[prod.id];
                const activeVariant =
                  prod.variants?.find((v) => v.id === selectedVariantId) || null;
                const displayPrice = activeVariant
                  ? activeVariant.selling_price
                  : prod.variants[0]?.selling_price || 0;

                return (
                  <div
                    key={prod.id}
                    className={`footwear-card ${activeVariant ? "has-selected-size" : ""}`}
                  >
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

                    {/* Dynamic Price Display for Selected Size (Issue 6) */}
                    <div className="footwear-card-price">
                      <div style={{ display: "flex", alignItems: "baseline", gap: "6px" }}>
                        <strong>{formatINR(displayPrice)}</strong>
                        {activeVariant ? (
                          <span className="selected-size-chip">
                            Size {activeVariant.size}
                          </span>
                        ) : (
                          <span className="unselected-size-hint">
                            (Base Size {prod.variants[0]?.size || "—"})
                          </span>
                        )}
                      </div>
                      <span className="tax-hint">
                        GST: {prod.tax_rate ?? 5}% saved
                      </span>
                    </div>

                    {/* Size Chips Section (Issue 6: Clicking same size deselects it) */}
                    <div className="sizes-section">
                      <div className="sizes-caption-row">
                        <span className="sizes-caption">
                          {activeVariant
                            ? `Selected: Size ${activeVariant.size} (${activeVariant.stock} pairs)`
                            : "Select Size to View Price:"}
                        </span>
                        {activeVariant && (
                          <span className="deselect-hint">Click again to deselect</span>
                        )}
                      </div>

                      <div className="size-chips-row">
                        {prod.variants?.map((v) => {
                          const inStock = (v.stock || 0) > 0;
                          const isCurrentSelected = selectedVariantId === v.id;
                          const inCartItem = cart.find((c) => c.variant_id === v.id);

                          return (
                            <button
                              key={v.id}
                              type="button"
                              disabled={!inStock}
                              className={`size-btn ${isCurrentSelected ? "selected-active" : ""} ${
                                inCartItem ? "in-cart" : ""
                              } ${!inStock ? "out-of-stock" : ""}`}
                              onClick={() => handleSizeClick(v, prod)}
                              title={`Size ${v.size} (${v.color}) - Stock: ${v.stock} pairs - Price: ₹${v.selling_price}`}
                            >
                              <span className="size-num">{v.size}</span>
                              <span className="size-stock">
                                {inStock ? `(${v.stock})` : "0"}
                              </span>
                            </button>
                          );
                        })}
                      </div>

                      {/* Card Action Button: Add Selected Size to Bill */}
                      <div className="card-add-action-wrap">
                        {activeVariant ? (
                          <button
                            type="button"
                            className="btn-add-active-variant"
                            onClick={() => addToCart(activeVariant, prod)}
                          >
                            <Plus size={13} /> Add Size {activeVariant.size} ·{" "}
                            {formatINR(activeVariant.selling_price)}
                          </button>
                        ) : (
                          <button
                            type="button"
                            className="btn-add-active-variant outline"
                            onClick={() => {
                              const firstAvailable = prod.variants?.find((v) => (v.stock || 0) > 0);
                              if (firstAvailable) {
                                setSelectedSizes((prev) => ({
                                  ...prev,
                                  [prod.id]: firstAvailable.id,
                                }));
                              }
                            }}
                          >
                            Tap Any Size to Select
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* RIGHT PANEL: CURRENT BILL */}
      <div className="panel cart-panel">
        <div className="panel-heading">
          <div>
            <h2>Current bill</h2>
            <p>Customer details & product-wise GST invoice</p>
          </div>
          <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
            <span className="cart-count">
              {totalItemsCount} {totalItemsCount === 1 ? "pair" : "pairs"}
            </span>
            {cart.length > 0 && (
              <button
                className="cart-clear-icon-btn"
                onClick={clearCart}
                title="Clear All Bill Items"
              >
                <Trash2 size={13} />
              </button>
            )}
          </div>
        </div>

        {/* Customer Details Strip (Issue 2: Required & Optional with validation) */}
        <div className="customer-strip">
          <div className="customer-strip-header">
            <div className="customer-strip-title">
              <User size={13} />
              <span>Customer Details</span>
            </div>
            <div className="customer-toggle-group">
              <label
                className="customer-mandatory-toggle"
                title="When checked, customer phone number is required before billing"
              >
                <input
                  type="checkbox"
                  checked={isCustomerRequired}
                  onChange={(e) => {
                    setIsCustomerRequired(e.target.checked);
                    setCustomerError("");
                  }}
                />
                <span>Mandatory Phone</span>
              </label>
              <button
                type="button"
                className="btn-chip-walkin"
                onClick={() => {
                  setCustomerName("Walk-in Customer");
                  setCustomerPhone("");
                  setCustomerError("");
                }}
                title="Fill default Walk-in Customer"
              >
                Walk-in
              </button>
            </div>
          </div>

          <div className="customer-inputs-grid">
            <div className="customer-input-box">
              <input
                type="text"
                placeholder={isCustomerRequired ? "Customer Name *" : "Customer Name (optional)"}
                value={customerName}
                onChange={(e) => {
                  setCustomerName(e.target.value);
                  if (customerError) setCustomerError("");
                }}
              />
            </div>
            <div className="customer-input-box phone-box">
              <input
                type="tel"
                maxLength={10}
                placeholder={isCustomerRequired ? "Mobile (10 digits) *" : "Mobile (optional)"}
                value={customerPhone}
                onChange={(e) => {
                  setCustomerPhone(e.target.value.replace(/\D/g, ""));
                  if (customerError) setCustomerError("");
                }}
              />
            </div>
          </div>

          {customerError && (
            <div className="customer-error-banner">
              <AlertCircle size={13} />
              <span>{customerError}</span>
            </div>
          )}
        </div>

        {/* Cart Items List with Item-Wise GST & Custom GST Option (Issue 3) */}
        <div className="cart-items-wrapper">
          {cart.length === 0 ? (
            <div className="cart-empty">
              <ShoppingCart size={32} />
              <strong>Your bill is empty</strong>
              <span>Select footwear sizes or scan barcodes to begin billing.</span>
            </div>
          ) : (
            <div className="cart-list">
              {cart.map((item) => {
                const unitPrice = Number(item.unit_price ?? item.unitPrice) || 0;
                const lineTotal = unitPrice * item.quantity;
                const currentTaxRate = Number(item.tax_rate ?? 5);
                const lineTax = Math.round(((lineTotal * currentTaxRate) / 100) * 100) / 100;

                return (
                  <div key={item.variant_id} className="cart-item-row">
                    <div className="cart-item-info">
                      <div className="cart-item-title">{item.product_name}</div>
                      <div className="cart-item-meta">
                        <span className="cart-badge-size">Size {item.size}</span>
                        <span>{item.brand}</span>
                        <span>•</span>
                        <span>{item.color}</span>
                        <span>•</span>
                        <span className="cart-hsn-tag">HSN {item.hsn_code || "6403"}</span>
                      </div>
                      <div className="cart-item-rate">
                        {formatINR(unitPrice)} each
                      </div>
                    </div>

                    <div className="cart-item-controls">
                      {/* Quantity Selector */}
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

                      {/* Custom Item-Wise GST Dropdown (Issue 3) */}
                      <div className="cart-item-gst-control" title="Custom GST for this item">
                        <label>GST:</label>
                        <select
                          value={currentTaxRate}
                          onChange={(e) =>
                            updateCartItemTaxRate(item.variant_id, Number(e.target.value))
                          }
                          className="cart-gst-select"
                        >
                          <option value="0">0%</option>
                          <option value="5">5%</option>
                          <option value="12">12%</option>
                          <option value="18">18%</option>
                        </select>
                      </div>

                      {/* Line Total */}
                      <div className="cart-item-line-total">
                        <div>{formatINR(lineTotal)}</div>
                        <span className="item-tax-preview">+₹{lineTax} GST</span>
                      </div>

                      {/* Remove Button */}
                      <button
                        type="button"
                        className="cart-remove-btn"
                        onClick={() => removeFromCart(item.variant_id)}
                        title="Remove from Bill"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                );
              })}
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
              <Tag size={12} style={{ marginRight: "4px" }} /> Bill Discount (₹)
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

          {/* Product-wise Tax Calculation Display (Issue 3) */}
          <div className="tax-row">
            <span>Taxable Amount</span>
            <strong>{formatINR(taxableAmount)}</strong>
          </div>

          <div className="tax-row highlight-gst">
            <span>Item-wise Total GST</span>
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
                    : `Diff: ₹${Math.abs(
                        Math.round((grandTotal - (splitCash + splitUpi)) * 100) / 100
                      )}`}
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
                    const roundedCash = Math.min(
                      grandTotal,
                      Math.floor(grandTotal / 500) * 500 || 500
                    );
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

      {/* BARCODE LOOKUP DIRECTORY MODAL (Issue 8) */}
      {isBarcodeModalOpen && (
        <div className="modal-backdrop" onClick={() => setIsBarcodeModalOpen(false)}>
          <div
            className="modal-content barcode-directory-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                <div className="setting-icon-box">
                  <Barcode size={20} />
                </div>
                <div>
                  <h3>Barcode Quick Directory & Scanner</h3>
                  <p>All active footwear size barcodes for instant counter scan test</p>
                </div>
              </div>
              <button
                type="button"
                className="btn-close"
                onClick={() => setIsBarcodeModalOpen(false)}
              >
                <X size={18} />
              </button>
            </div>

            <div className="modal-body" style={{ maxHeight: "380px", overflowY: "auto", padding: "16px 20px" }}>
              <table className="custom-table" style={{ fontSize: "11px" }}>
                <thead>
                  <tr>
                    <th>Article & Name</th>
                    <th style={{ textAlign: "center" }}>Size</th>
                    <th>Color</th>
                    <th>Barcode</th>
                    <th style={{ textAlign: "right" }}>Price</th>
                    <th style={{ textAlign: "center" }}>Stock</th>
                    <th style={{ textAlign: "center" }}>Scan Test</th>
                  </tr>
                </thead>
                <tbody>
                  {products.flatMap((prod) =>
                    prod.variants.map((v) => (
                      <tr key={v.id}>
                        <td>
                          <strong>{prod.name}</strong>
                          <div className="sub-text">
                            {prod.brand} • {prod.article_no}
                          </div>
                        </td>
                        <td style={{ textAlign: "center" }}>
                          <span className="receipt-size-badge">{v.size}</span>
                        </td>
                        <td>{v.color}</td>
                        <td>
                          <span style={{ fontFamily: "monospace", letterSpacing: "1px", fontWeight: 700 }}>
                            {v.barcode || "—"}
                          </span>
                        </td>
                        <td style={{ textAlign: "right" }}>
                          {formatINR(v.selling_price)}
                        </td>
                        <td style={{ textAlign: "center" }}>
                          <span className={`stock-badge ${(v.stock || 0) <= 0 ? "out" : (v.stock || 0) <= 3 ? "low" : "ok"}`}>
                            {v.stock || 0}
                          </span>
                        </td>
                        <td style={{ textAlign: "center" }}>
                          <button
                            type="button"
                            className="btn-tiny"
                            disabled={(v.stock || 0) <= 0}
                            onClick={() => {
                              handleBarcodeProcess(v.barcode);
                              setIsBarcodeModalOpen(false);
                            }}
                          >
                            + Scan Add
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="modal-footer">
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setIsBarcodeModalOpen(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
