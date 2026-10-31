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
  Coins,
  QrCode,
  Tag,
  Check,
  Package,
  Layers,
  Barcode,
  ScanLine,
  RotateCcw,
  AlertCircle,
  CheckCircle2,
  X,
} from "lucide-react";
import { useStore } from "../context/StoreContext.jsx";
import { formatINR } from "../utils/calculations.js";
import ProductDetailsModal from "./ProductDetailsModal.jsx";

const categories = [
  { id: "All", label: "All Items" },
  { id: "Gents", label: "Gents (Men)" },
  { id: "Ladies", label: "Ladies (Women)" },
  { id: "Boys", label: "Boys / Kids" },
  { id: "Girls", label: "Girls / Kids" },
  { id: "Infant", label: "Infant" },
  { id: "Formal", label: "Formal" },
  { id: "Casual", label: "Casual" },
  { id: "Sports", label: "Sports" },
  { id: "Sandals", label: "Sandals" },
];

// Product colour data may come from older records as a comma-separated string
// or newer records as an array. Normalize both formats before filtering.
const normalizeColors = (value) => {
  const values = Array.isArray(value)
    ? value
    : typeof value === "string"
      ? value.split(",")
      : [];

  return values
    .filter((color) => typeof color === "string")
    .flatMap((color) => color.split(","))
    .map((color) => color.trim())
    .filter(Boolean);
};

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

  // Filters State
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [selectedBrand, setSelectedBrand] = useState("All");
  const [selectedSize, setSelectedSize] = useState("All");
  const [selectedColor, setSelectedColor] = useState("All");
  const [query, setQuery] = useState("");

  // Product Selection State for Modal
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [selectedVariantId, setSelectedVariantId] = useState(null);

  // Customer Details State
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerError, setCustomerError] = useState("");

  // Payment & Bill Discount State
  const [billDiscount, setBillDiscount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState("Split");
  const [splitCash, setSplitCash] = useState(0);
  const [splitUpi, setSplitUpi] = useState(0);
  const [cashReceived, setCashReceived] = useState("");

  // Barcode Scanner State
  const [barcodeInput, setBarcodeInput] = useState("");
  const [scanToast, setScanToast] = useState(null);
  const [isBarcodeModalOpen, setIsBarcodeModalOpen] = useState(false);
  const barcodeInputRef = useRef(null);
  const scanTimerRef = useRef(null);
  const scanToastTimerRef = useRef(null);

  // Focus the barcode field when the Billing page first opens.
  // The scanner listener below also supports scans when focus moves to
  // non-text areas of the page.
  useEffect(() => {
    barcodeInputRef.current?.focus();
  }, []);

  useEffect(() => {
    return () => {
      if (scanTimerRef.current) clearTimeout(scanTimerRef.current);
      if (scanToastTimerRef.current) clearTimeout(scanToastTimerRef.current);
    };
  }, []);

  // Synthesize audible beep on successful scan
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

  // Handle card click: opens modal
  const handleProductCardClick = (prod) => {
    setSelectedProduct(prod);
  };

  // Handle add to bill from modal with quantity
  const handleAddFromModal = (variant, product, quantity) => {
    if (!variant || !product) return;
    if ((variant.stock || 0) <= 0) {
      alert(`Size ${variant.size} is currently out of stock.`);
      return;
    }

    playBeep();
    
    // Add the selected variant with the specified quantity
    for (let i = 0; i < quantity; i++) {
      addToCart(variant, product);
    }

    // Show non-intrusive toast notification
    setScanToast({
      name: product.name,
      size: variant.size,
      price: variant.selling_price,
      quantity: quantity,
      barcode: variant.barcode || product.barcode,
    });
    setTimeout(() => setScanToast(null), 3000);
  };

  // Derive unique filter options
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
      ...Array.from(set).sort((a, b) => {
        const isSA = String(a).startsWith("S");
        const isSB = String(b).startsWith("S");
        if (!isSA && !isSB) return Number(a) - Number(b);
        if (isSA && !isSB) return 1;
        if (!isSA && isSB) return -1;
        return Number(String(a).replace("S", "")) - Number(String(b).replace("S", ""));
      }),
    ];
  }, [products]);

  const availableColors = useMemo(() => {
    const set = new Set();
    products.forEach((p) => {
      normalizeColors(p.colours).forEach((color) => set.add(color));

      p.variants?.forEach((v) => {
        normalizeColors(v.color).forEach((color) => set.add(color));
      });
    });
    return ["All", ...Array.from(set).sort()];
  }, [products]);

  // Filter products strictly based on category, brand, size, color, and live query
  const filteredProducts = useMemo(() => {
    return products.filter((prod) => {
      if (selectedCategory !== "All") {
        const c = String(prod.category || "").toLowerCase();
        const sub = String(prod.sub_category || "").toLowerCase();
        const sc = selectedCategory.toLowerCase();

        const matchCat =
          (sc === "gents" && (c.includes("men") || c === "gents")) ||
          (sc === "ladies" && (c.includes("women") || c === "ladies")) ||
          (sc === "boys" && (c.includes("boy") || c.includes("kid"))) ||
          (sc === "girls" && (c.includes("girl") || c.includes("kid"))) ||
          (sc === "infant" && (c.includes("infant") || c.includes("baby"))) ||
          c === sc ||
          sub === sc;
        if (!matchCat) return false;
      }

      if (selectedBrand !== "All") {
        if (prod.brand?.toLowerCase() !== selectedBrand.toLowerCase()) {
          return false;
        }
      }

      if (selectedSize !== "All") {
        const hasSize = prod.variants?.some(
          (v) => String(v.size) === String(selectedSize) && (v.stock || 0) > 0
        );
        if (!hasSize) return false;
      }

      if (selectedColor !== "All") {
        const targetC = selectedColor.toLowerCase();
        const hasColor =
          normalizeColors(prod.colours).some((color) =>
            color.toLowerCase().includes(targetC)
          ) ||
          prod.variants?.some(
            (v) =>
              normalizeColors(v.color).some((color) =>
                color.toLowerCase().includes(targetC)
              ) && (v.stock || 0) > 0
          );
        if (!hasColor) return false;
      }

      if (!query.trim()) return true;
      const q = query.toLowerCase().trim();

      const matchName = prod.name?.toLowerCase().includes(q);
      const matchArt = prod.article_no?.toLowerCase().includes(q);
      const matchBrand = prod.brand?.toLowerCase().includes(q);
      const matchCat = prod.category?.toLowerCase().includes(q);
      const matchBarcode = prod.barcode?.toLowerCase().includes(q);

      const matchVariant = prod.variants?.some(
        (v) =>
          v.barcode?.toLowerCase().includes(q) ||
          v.sku?.toLowerCase().includes(q) ||
          String(v.size).toLowerCase() === q ||
          normalizeColors(v.color).some((color) =>
            color.toLowerCase().includes(q)
          )
      );

      return matchName || matchArt || matchBrand || matchCat || matchBarcode || matchVariant;
    });
  }, [products, selectedCategory, selectedBrand, selectedSize, selectedColor, query]);

  // Barcode scanning processing
  const handleBarcodeProcess = (scannedCode) => {
    if (scanTimerRef.current) {
      clearTimeout(scanTimerRef.current);
      scanTimerRef.current = null;
    }
    const raw = scannedCode.trim();
    if (!raw) return;

    let matchedProduct = null;
    let matchedVariant = null;

    // 1. Direct variant barcode / SKU check
    for (const prod of products) {
      const v = prod.variants?.find(
        (variant) =>
          variant.barcode?.toLowerCase() === raw.toLowerCase() ||
          variant.sku?.toLowerCase() === raw.toLowerCase()
      );
      if (v) {
        matchedProduct = prod;
        matchedVariant = v;
        break;
      }
    }

    // 2. Product-level barcode check (e.g. FW890101)
    if (!matchedProduct) {
      matchedProduct = products.find(
        (p) =>
          p.barcode?.toLowerCase() === raw.toLowerCase() ||
          p.article_no?.toLowerCase() === raw.toLowerCase()
      );
      if (matchedProduct) {
        // Open modal for size selection
        setSelectedProduct(matchedProduct);
        playBeep();
        setBarcodeInput("");
        return;
      }
    }

    if (matchedProduct && matchedVariant) {
      if ((matchedVariant.stock || 0) <= 0) {
        alert(
          `Out of Stock: ${matchedProduct.name} (Size ${matchedVariant.size}) currently has 0 stock.`
        );
        setBarcodeInput("");
        return;
      }

      playBeep();
      addToCart(matchedVariant, matchedProduct);

      setScanToast({
        name: matchedProduct.name,
        sku: matchedVariant.sku || matchedProduct.article_no || "",
        size: matchedVariant.size,
        color: matchedVariant.color,
        price: matchedVariant.selling_price,
        barcode: matchedVariant.barcode,
        image: matchedProduct.image || `/assets/products/${matchedProduct.article_no?.toLowerCase()}.jpg`,
        stock: matchedVariant.stock,
        quantity: 1,
        isScan: true,
      });

      if (scanToastTimerRef.current) clearTimeout(scanToastTimerRef.current);
      scanToastTimerRef.current = setTimeout(() => {
        setScanToast(null);
        scanToastTimerRef.current = null;
      }, 2200);
      setBarcodeInput("");
    } else {
      alert(`Barcode not found in inventory: ${raw}`);
      setBarcodeInput("");
    }
  };

  const handleBarcodeInputChange = (e) => {
    const value = e.target.value;
    setBarcodeInput(value);

    // Most keyboard-wedge scanners send characters rapidly and may not send
    // Enter. Treat a short pause after the final character as scan completion.
    if (scanTimerRef.current) clearTimeout(scanTimerRef.current);
    if (value.trim().length >= 6) {
      scanTimerRef.current = setTimeout(() => {
        handleBarcodeProcess(value);
      }, 100);
    }
  };

  const handleBarcodeKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (barcodeInput.trim()) handleBarcodeProcess(barcodeInput);
    }
  };

  // Support scanners even when the cashier has clicked a non-text area.
  // Ordinary typing in customer/payment/search inputs is deliberately ignored.
  useEffect(() => {
    let keyBuffer = "";
    let scanTimer = null;
    let lastKeyTime = 0;

    const handleWindowKeyDown = (e) => {
      if (selectedProduct || isBarcodeModalOpen) {
        keyBuffer = "";
        if (scanTimer) clearTimeout(scanTimer);
        return;
      }

      const active = document.activeElement;
      const isBarcodeField = active === barcodeInputRef.current;
      const isOtherEditable =
        active &&
        (active.tagName === "INPUT" ||
          active.tagName === "SELECT" ||
          active.tagName === "TEXTAREA" ||
          active.isContentEditable);

      // The barcode input has its own debounce handler. Never intercept
      // keystrokes intended for another editable control.
      if (isBarcodeField || isOtherEditable) {
        keyBuffer = "";
        if (scanTimer) clearTimeout(scanTimer);
        return;
      }

      const now = Date.now();
      if (now - lastKeyTime > 120) keyBuffer = "";
      lastKeyTime = now;

      if (e.key === "Enter") {
        if (keyBuffer.length >= 6) {
          handleBarcodeProcess(keyBuffer);
          keyBuffer = "";
          if (scanTimer) clearTimeout(scanTimer);
          e.preventDefault();
        }
        return;
      }

      if (e.key.length === 1) {
        keyBuffer += e.key;
        if (scanTimer) clearTimeout(scanTimer);
        if (keyBuffer.length >= 6) {
          scanTimer = setTimeout(() => {
            handleBarcodeProcess(keyBuffer);
            keyBuffer = "";
          }, 100);
        }
      }
    };

    window.addEventListener("keydown", handleWindowKeyDown);
    return () => {
      window.removeEventListener("keydown", handleWindowKeyDown);
      if (scanTimer) clearTimeout(scanTimer);
    };
  }, [products, selectedProduct, isBarcodeModalOpen]);

  // Product-wise GST and Cart Calculations
  const subtotal = cart.reduce(
    (sum, item) => sum + (Number(item.unit_price ?? item.unitPrice) || 0) * item.quantity,
    0
  );
  const totalDiscount = Math.min(subtotal, Math.max(0, Number(billDiscount) || 0));

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

  // Cash Payment Tender & Balance Calculations
  const cashReceivedNum = Number(cashReceived) || 0;
  const cashBalance = Math.round((cashReceivedNum - grandTotal) * 100) / 100;
  const isCashGiven = cashReceived !== "" && !isNaN(cashReceivedNum) && cashReceivedNum > 0;

  // Auto-sync split payment amounts when grand total changes
  useEffect(() => {
    if (paymentMethod === "Split") {
      const half = Math.round((grandTotal / 2) * 100) / 100;
      setSplitCash(half);
      setSplitUpi(Math.round((grandTotal - half) * 100) / 100);
    }
  }, [grandTotal, paymentMethod]);

  // Payment method selection helpers
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

  // Checkout with validation
  const handleCheckout = () => {
    if (cart.length === 0) return;

    if (!customerName.trim()) {
      setCustomerError("Customer Name is mandatory before billing.");
      return;
    }
    const cleanPhone = customerPhone.trim().replace(/\D/g, "");
    if (!cleanPhone || cleanPhone.length < 10) {
      setCustomerError("Customer 10-digit mobile number is mandatory.");
      return;
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
      cashTendered: paymentMethod === "Cash" && isCashGiven ? cashReceivedNum : null,
      changeReturned: paymentMethod === "Cash" && isCashGiven ? Math.max(0, cashBalance) : null,
    });

    // Reset form
    setCustomerName("");
    setCustomerPhone("");
    setBillDiscount(0);
    setSplitCash(0);
    setSplitUpi(0);
    setCashReceived("");
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
      {/* SCANNED PRODUCT CONFIRMATION */}
      {scanToast?.isScan && (
        <div
          role="status"
          aria-live="polite"
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 1200,
            display: "grid",
            placeItems: "center",
            padding: "20px",
            background: "rgba(15, 23, 42, 0.42)",
            pointerEvents: "none",
          }}
        >
          <div
            style={{
              width: "min(560px, 100%)",
              background: "#ffffff",
              color: "#0f172a",
              borderRadius: "16px",
              boxShadow: "0 24px 70px rgba(15, 23, 42, 0.28)",
              overflow: "hidden",
              pointerEvents: "none",
              border: "1px solid rgba(148, 163, 184, 0.28)",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                padding: "16px 20px",
                borderBottom: "1px solid #e2e8f0",
                color: "#166534",
                fontWeight: 700,
                fontSize: "16px",
              }}
            >
              <CheckCircle2 size={22} />
              Product Added to Bill
              <span style={{ marginLeft: "auto", color: "#64748b", fontSize: "12px", fontWeight: 500 }}>
                Closing automatically
              </span>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "minmax(150px, 210px) 1fr",
                gap: "20px",
                padding: "20px",
                alignItems: "center",
              }}
            >
              <div
                style={{
                  height: "180px",
                  borderRadius: "12px",
                  background: "#f8fafc",
                  border: "1px solid #e2e8f0",
                  display: "grid",
                  placeItems: "center",
                  overflow: "hidden",
                }}
              >
                <img
                  src={scanToast.image}
                  alt={scanToast.name}
                  style={{ width: "100%", height: "100%", objectFit: "contain", padding: "10px" }}
                  onError={(e) => {
                    e.currentTarget.style.display = "none";
                  }}
                />
              </div>

              <div style={{ display: "grid", gap: "10px", minWidth: 0 }}>
                <div>
                  <div style={{ fontSize: "20px", fontWeight: 750, lineHeight: 1.25 }}>
                    {scanToast.name}
                  </div>
                  {scanToast.sku && (
                    <div style={{ color: "#64748b", fontSize: "13px", marginTop: "4px" }}>
                      SKU: {scanToast.sku}
                    </div>
                  )}
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px 16px", fontSize: "14px" }}>
                  <div>
                    <div style={{ color: "#64748b", fontSize: "12px" }}>Size</div>
                    <strong>{scanToast.size || "—"}</strong>
                  </div>
                  <div>
                    <div style={{ color: "#64748b", fontSize: "12px" }}>Colour</div>
                    <strong>{scanToast.color || "—"}</strong>
                  </div>
                  <div>
                    <div style={{ color: "#64748b", fontSize: "12px" }}>Unit price</div>
                    <strong>{formatINR(Number(scanToast.price) || 0)}</strong>
                  </div>
                  <div>
                    <div style={{ color: "#64748b", fontSize: "12px" }}>Quantity added</div>
                    <strong>+{scanToast.quantity || 1}</strong>
                  </div>
                  <div>
                    <div style={{ color: "#64748b", fontSize: "12px" }}>Available stock</div>
                    <strong>{scanToast.stock ?? "—"}</strong>
                  </div>
                  {scanToast.barcode && (
                    <div>
                      <div style={{ color: "#64748b", fontSize: "12px" }}>Barcode</div>
                      <strong style={{ overflowWrap: "anywhere" }}>{scanToast.barcode}</strong>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div
              style={{
                margin: "0 20px 20px",
                padding: "11px 14px",
                borderRadius: "10px",
                background: "#ecfdf5",
                color: "#166534",
                display: "flex",
                alignItems: "center",
                gap: "9px",
                fontSize: "13px",
                fontWeight: 600,
              }}
            >
              <CheckCircle2 size={18} />
              Added successfully — ready for the next scan
            </div>
          </div>
        </div>
      )}

      {/* EXISTING NOTIFICATION FOR MANUAL PRODUCT SELECTION */}
      {scanToast && !scanToast.isScan && (
        <div className="barcode-scan-banner" role="alert">
          <CheckCircle2 size={18} style={{ color: "#22c55e" }} />
          <div>
            <strong>✓ Added to Bill: {scanToast.name}</strong>
            <span>
              Size: {scanToast.size}
              {scanToast.quantity && scanToast.quantity > 1 && ` × ${scanToast.quantity}`}
              {" | "}
              {formatINR(scanToast.price * (scanToast.quantity || 1))}
              {scanToast.barcode && ` | Barcode: ${scanToast.barcode}`}
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
        {/* Panel Header */}
        <div className="panel-heading">
          <div>
            <h2>Product catalogue</h2>
            <p>Select footwear model to view details and add to bill</p>
          </div>
          <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
            <button
              type="button"
              className="btn-barcode-scan-pill"
              onClick={() => setIsBarcodeModalOpen(true)}
              title="Open Barcode Quick Lookup Directory"
            >
              <Barcode size={14} /> Barcode / QR
            </button>
            <span className="small-tag">
              {filteredProducts.length} ARTICLES AVAILABLE
            </span>
          </div>
        </div>

        {/* Integrated Unified Search & Barcode Scan Bar */}
        <div className="billing-search-scan-bar">
          <div className="search-box-unified">
            <Search size={15} className="search-icon-left" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name, article code, brand, color, size..."
              className="search-input-field"
            />
            {query && (
              <button
                type="button"
                className="search-clear-icon-btn"
                onClick={() => setQuery("")}
                title="Clear search"
              >
                ✕
              </button>
            )}
          </div>

          <div className="barcode-box-unified" title="Auto-detects USB / Bluetooth Barcode Scanners">
            <ScanLine size={15} className="barcode-icon-left" />
            <input
              ref={barcodeInputRef}
              type="text"
              value={barcodeInput}
              onChange={handleBarcodeInputChange}
              onKeyDown={handleBarcodeKeyDown}
              placeholder="Scan Barcode (Auto-Add)..."
              className="barcode-input-field"
            />
            <span className="scanner-ready-badge" title="Hardware Scanner Active">
              <span className="pulse-dot" /> LIVE
            </span>
          </div>
        </div>

        {/* Category Filter Pills */}
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

        {/* Secondary Filter Toolbar: Brand, Size, Color */}
        <div className="catalogue-filter-toolbar">
          <div className="filter-dropdown-chip">
            <span className="chip-label">Brand:</span>
            <select
              value={selectedBrand}
              onChange={(e) => setSelectedBrand(e.target.value)}
              className="chip-select"
            >
              {availableBrands.map((b) => (
                <option key={b} value={b}>
                  {b === "All" ? "All Brands" : b}
                </option>
              ))}
            </select>
          </div>

          <div className="filter-dropdown-chip">
            <span className="chip-label">Size:</span>
            <select
              value={selectedSize}
              onChange={(e) => setSelectedSize(e.target.value)}
              className="chip-select"
            >
              {availableSizes.map((s) => (
                <option key={s} value={s}>
                  {s === "All" ? "All Sizes" : `Size ${s}`}
                </option>
              ))}
            </select>
          </div>

          <div className="filter-dropdown-chip">
            <span className="chip-label">Color:</span>
            <select
              value={selectedColor}
              onChange={(e) => setSelectedColor(e.target.value)}
              className="chip-select"
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
              className="btn-filter-reset-action"
              onClick={resetAllFilters}
              title="Reset all search and filter conditions"
            >
              <RotateCcw size={11} /> Reset Filters
            </button>
          )}
        </div>

        {/* Product Cards Grid (Matching Photo: Image left, Art/Brand/Name/Price right) */}
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
                const sellingPrice =
                  prod.variants?.[0]?.selling_price || prod.selling_price || 0;
                const taxRate =
                  prod.tax_rate ?? (sellingPrice >= 1000 ? 12 : 5);
                const totalStock = prod.variants?.reduce((sum, v) => sum + (v.stock || 0), 0) || 0;

                return (
                  <div
                    key={prod.id}
                    className="footwear-card-photo clickable-product-card"
                    onClick={() => handleProductCardClick(prod)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        handleProductCardClick(prod);
                      }
                    }}
                  >
                    {/* Shoe Thumbnail (Left) */}
                    <div className="footwear-thumb-wrap">
                      <img
                        src={prod.image || `/assets/products/${prod.article_no?.toLowerCase()}.jpg`}
                        alt={prod.name}
                        className="footwear-thumb-img"
                        onError={(e) => {
                          e.target.style.display = "none";
                          e.target.nextElementSibling.style.display = "flex";
                        }}
                      />
                      <div className="footwear-thumb-fallback" style={{ display: "none" }}>
                        <Package size={22} style={{ color: "#94a3b8" }} />
                      </div>
                    </div>

                    {/* Shoe Meta & Price (Right) */}
                    <div className="footwear-card-details">
                      <div className="card-top-row">
                        <span className="card-art-code">
                          <Barcode size={12} className="card-barcode-icon" /> {prod.article_no}
                        </span>
                      </div>

                      <div className="card-brand-name">{prod.brand}</div>
                      <div className="card-product-name" title={prod.name}>
                        {prod.name}
                      </div>

                      <div className="card-price-row">
                        <span className="card-price-val">{formatINR(sellingPrice)}</span>
                        <span className="card-gst-pill">GST: {taxRate}%</span>
                      </div>

                      <div className="card-stock-summary">
                        <span className="stock-summary-label">
                          {prod.variants?.length || 0} sizes
                        </span>
                        <span className={`stock-summary-count ${totalStock > 0 ? "in-stock" : "out-of-stock"}`}>
                          {totalStock} pairs
                        </span>
                      </div>

                      <div className="product-card-action-hint">
                        Click to select size →
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Product Details Modal */}
        {selectedProduct && (
          <ProductDetailsModal
            product={selectedProduct}
            onClose={() => setSelectedProduct(null)}
            onAddToBill={handleAddFromModal}
          />
        )}
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

        {/* Customer Details Card (Mandatory *) */}
        <div className="pos-customer-card">
          <div className="pos-customer-header">
            <div className="customer-header-title">
              <User size={14} style={{ color: "#d97706" }} />
              <strong>Customer Details</strong>
              <span className="customer-mandatory-badge">MANDATORY *</span>
            </div>
          </div>

          <div className="pos-customer-inputs-grid">
            <div className="customer-field-box">
              <input
                type="text"
                required
                placeholder="Customer Name *"
                value={customerName}
                onChange={(e) => {
                  setCustomerName(e.target.value);
                  if (customerError) setCustomerError("");
                }}
              />
            </div>
            <div className="customer-field-box">
              <input
                type="tel"
                maxLength={10}
                required
                placeholder="Mobile (10 digits) *"
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

        {/* Cart Items List */}
        <div className="cart-items-wrapper">
          {cart.length === 0 ? (
            <div className="cart-empty">
              <div className="cart-empty-circle">
                <ShoppingCart size={30} style={{ color: "#94a3b8" }} />
              </div>
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
                        <span className="cart-hsn-tag">HSN 6403</span>
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

                      {/* Custom Item-Wise GST Dropdown */}
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

          <div className="tax-row">
            <span>Taxable Amount</span>
            <strong>{formatINR(taxableAmount)}</strong>
          </div>

          <div className="tax-row highlight-gst">
            <span>Item-wise Total GST</span>
            <strong>{formatINR(taxAmount)}</strong>
          </div>

          <div className="grand-total">
            <span className="grand-total-label">Grand total</span>
            <strong className="grand-total-val">{formatINR(grandTotal)}</strong>
          </div>

          {/* Payment Method Selector (Split is First) */}
          <div className="payment-options">
            {[
              { id: "Split", label: "Cash+UPI", icon: Layers },
              { id: "UPI", label: "UPI / QR", icon: QrCode },
              { id: "Cash", label: "Cash", icon: Banknote },
              { id: "Card", label: "Card", icon: CreditCard },
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
                  <label className="split-label">
                    <Banknote size={12} style={{ color: "#16a34a" }} /> Cash Amount
                  </label>
                  <div className="split-input-box">
                    <span className="split-curr-sign">₹</span>
                    <input
                      type="number"
                      min="0"
                      max={grandTotal}
                      step="any"
                      value={splitCash || ""}
                      onChange={(e) => handleCashChange(e.target.value)}
                      placeholder="0.00"
                    />
                  </div>
                </div>

                <div className="split-field">
                  <label className="split-label">
                    <QrCode size={12} style={{ color: "#2563eb" }} /> UPI Amount
                  </label>
                  <div className="split-input-box">
                    <span className="split-curr-sign">₹</span>
                    <input
                      type="number"
                      min="0"
                      max={grandTotal}
                      step="any"
                      value={splitUpi || ""}
                      onChange={(e) => handleUpiChange(e.target.value)}
                      placeholder="0.00"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Cash Payment Controls (Amount Received & Balance Calculation) */}
          {paymentMethod === "Cash" && (
            <div className="cash-payment-card">
              <div className="cash-header">
                <span className="cash-title">Cash Payment & Change:</span>
                {isCashGiven && (
                  <span
                    className={`cash-status-badge ${
                      cashBalance >= 0 ? "balanced" : "unbalanced"
                    }`}
                  >
                    {cashBalance >= 0
                      ? `✓ Return ₹${cashBalance.toFixed(2)}`
                      : `Due ₹${Math.abs(cashBalance).toFixed(2)}`}
                  </span>
                )}
              </div>

              <div className="cash-inputs-grid">
                <div className="cash-field">
                  <label className="cash-label">
                    <Banknote size={12} style={{ color: "#16a34a" }} /> Amount Received
                  </label>
                  <div className="cash-input-box">
                    <span className="cash-curr-sign">₹</span>
                    <input
                      type="number"
                      min="0"
                      step="any"
                      value={cashReceived}
                      onChange={(e) => setCashReceived(e.target.value)}
                      placeholder={grandTotal ? grandTotal.toString() : "0.00"}
                    />
                  </div>
                </div>

                <div className="cash-field">
                  <label className="cash-label">
                    <Coins size={12} style={{ color: "#d97706" }} /> Balance to Return
                  </label>
                  <div
                    className={`cash-balance-display ${
                      !isCashGiven
                        ? "neutral"
                        : cashBalance >= 0
                        ? "positive"
                        : "negative"
                    }`}
                  >
                    {!isCashGiven
                      ? "₹0.00"
                      : cashBalance >= 0
                      ? formatINR(cashBalance)
                      : `- ${formatINR(Math.abs(cashBalance))}`}
                  </div>
                </div>
              </div>
            </div>
          )}

          <button
            className="checkout-button"
            disabled={cart.length === 0}
            onClick={handleCheckout}
          >
            Checkout - {formatINR(grandTotal)}
          </button>
        </div>
      </div>

      {/* BARCODE LOOKUP DIRECTORY MODAL */}
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
                    <th style={{ textAlign: "center" }}>Quick Action</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((prod) =>
                    prod.variants?.map((v) => (
                      <tr key={v.id}>
                        <td>
                          <strong>{prod.name}</strong>
                          <span className="sub-text" style={{ marginLeft: "5px" }}>
                            ({prod.article_no})
                          </span>
                        </td>
                        <td style={{ textAlign: "center" }}>
                          <span className="size-badge-bold">Sz {v.size}</span>
                        </td>
                        <td>{v.color}</td>
                        <td>
                          <code style={{ fontSize: "11px", color: "#1e3a8a", fontWeight: 700 }}>
                            {v.barcode}
                          </code>
                        </td>
                        <td style={{ textAlign: "right", fontWeight: 600 }}>
                          {formatINR(v.selling_price)}
                        </td>
                        <td style={{ textAlign: "center" }}>
                          <span
                            className={`stock-badge ${
                              (v.stock || 0) === 0 ? "out" : (v.stock || 0) <= 3 ? "low" : "ok"
                            }`}
                          >
                            {v.stock || 0}
                          </span>
                        </td>
                        <td style={{ textAlign: "center" }}>
                          <button
                            type="button"
                            className="btn-tiny"
                            style={{ background: "#f0fdf4", color: "#16a34a", borderColor: "#bbf7d0" }}
                            disabled={(v.stock || 0) <= 0}
                            onClick={() => {
                              playBeep();
                              addToCart(v, prod);
                              setScanToast({
                                name: prod.name,
                                size: v.size,
                                price: v.selling_price,
                                barcode: v.barcode,
                              });
                              setIsBarcodeModalOpen(false);
                            }}
                          >
                            Scan / Add
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="modal-footer" style={{ justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "11px", color: "#64748b" }}>
                <ScanLine size={14} style={{ color: "#10b981" }} />
                <span>Simulate scanner: Clicking "Scan / Add" beeps and adds the size directly into bill.</span>
              </div>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setIsBarcodeModalOpen(false)}
              >
                Close Directory
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
