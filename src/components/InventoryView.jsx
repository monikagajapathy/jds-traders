import React, { useState, useMemo, useEffect } from "react";
import {
  Boxes,
  Plus,
  Search,
  Filter,
  SlidersHorizontal,
  PackagePlus,
  Trash2,
  X,
  Check,
  RotateCcw,
  Tag,
  DollarSign,
  TrendingUp,
  History,
  ShieldCheck,
  Edit2,
  AlertTriangle,
  Barcode,
  Layers,
  Sparkles,
} from "lucide-react";
import { useStore } from "../context/StoreContext.jsx";
import { formatINR } from "../utils/calculations.js";

export default function InventoryView() {
  const {
    products,
    addProduct,
    updateProduct,
    deleteProduct,
    adjustStock,
    bulkAdjustStock,
    addVariantToProduct,
    targetInventoryFilter,
    setTargetInventoryFilter,
    isAdmin,
    stockLogs,
    highlightTarget,
  } = useStore();

  const [query, setQuery] = useState(targetInventoryFilter || "");
  const [selectedCat, setSelectedCat] = useState("All");
  const [stockFilter, setStockFilter] = useState("All");
  const [isAuditOpen, setIsAuditOpen] = useState(false);

  // Low-Stock Threshold Configuration (Issue 5)
  // Clarification: 3 pairs applies per individual size (Retail mode), while 30 pairs applies to total article carton stock (Wholesale mode)
  const [lowStockThreshold, setLowStockThreshold] = useState(3);
  const [thresholdMode, setThresholdMode] = useState("per-size"); // 'per-size' | 'total'

  useEffect(() => {
    if (targetInventoryFilter) {
      setQuery(targetInventoryFilter);
      if (setTargetInventoryFilter) setTargetInventoryFilter("");
    }
  }, [targetInventoryFilter, setTargetInventoryFilter]);

  // Smooth scroll to highlighted product when clicked from notification
  useEffect(() => {
    if (highlightTarget?.tab === "inventory" && (highlightTarget.productId || highlightTarget.productName)) {
      const timer = setTimeout(() => {
        const targetId =
          highlightTarget.productId ||
          products.find(
            (p) =>
              p.name === highlightTarget.productName ||
              p.article_no === highlightTarget.productName
          )?.id;
        if (targetId) {
          const el = document.getElementById(`prod-row-${targetId}`);
          if (el) {
            el.scrollIntoView({ behavior: "smooth", block: "center" });
          }
        }
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [highlightTarget, products]);

  // Modals state: Combined Edit & Stock Adjustment (Issue 4)
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingProd, setEditingProd] = useState(null);
  const [editingAdjustReason, setEditingAdjustReason] = useState("Restock Delivery");
  const [editingAdjustNote, setEditingAdjustNote] = useState("");

  // Add new size state
  const [isAddSizeOpen, setIsAddSizeOpen] = useState(false);
  const [sizeTargetProduct, setSizeTargetProduct] = useState(null);
  const [newSizeForm, setNewSizeForm] = useState({
    size: "",
    color: "",
    cost_price: 600,
    selling_price: 1199,
    stock: 6,
    barcode: "",
    reorder_level: 3,
  });

  const handleOpenAddSize = (prod) => {
    setSizeTargetProduct(prod);
    const firstVar = prod.variants[0];
    const cleanArt = prod.article_no.replace(/[^A-Z0-9]/gi, "").slice(-3).padStart(3, "0");
    const nextSize = String(prod.variants.length + 6);
    const cleanSize = nextSize.padStart(2, "0");
    const randomCode = Math.floor(1000 + Math.random() * 9000);

    setNewSizeForm({
      size: nextSize,
      color: firstVar?.color || "Standard",
      cost_price: firstVar?.cost_price || 600,
      selling_price: firstVar?.selling_price || 1199,
      stock: 6,
      barcode: `890${cleanArt}${cleanSize}${randomCode}`,
      reorder_level: 3,
    });
    setIsAddSizeOpen(true);
  };

  const handleSaveAddSize = (e) => {
    e.preventDefault();
    if (!sizeTargetProduct) return;
    if (!newSizeForm.size.trim()) {
      alert("Please enter a valid shoe size.");
      return;
    }

    addVariantToProduct(sizeTargetProduct.id, {
      size: newSizeForm.size.trim(),
      color: newSizeForm.color || "Standard",
      cost_price: Number(newSizeForm.cost_price) || 0,
      selling_price: Number(newSizeForm.selling_price) || 0,
      stock: Math.max(0, Number(newSizeForm.stock) || 0),
      barcode: newSizeForm.barcode?.trim() || `890${Math.floor(100000000 + Math.random() * 900000000)}`,
      reorder_level: Number(newSizeForm.reorder_level) || 3,
    });

    setIsAddSizeOpen(false);
    setSizeTargetProduct(null);
  };

  // Open Combined Edit Product & Stock Adjustment Modal (Issue 4)
  const handleOpenEditProduct = (prod) => {
    setEditingProd({
      id: prod.id,
      name: prod.name || "",
      article_no: prod.article_no || "",
      brand: prod.brand || "JD Signature",
      category: prod.category || "Gents",
      sub_category: prod.sub_category || "Casual",
      tax_rate: prod.tax_rate ?? 12,
      variants: prod.variants.map((v) => ({
        id: v.id,
        size: v.size,
        color: v.color || "Standard",
        cost_price: v.cost_price || 0,
        selling_price: v.selling_price || 0,
        stock: v.stock || 0,
        initialStock: v.stock || 0,
        barcode: v.barcode || "",
        sku: v.sku || `JDS-${prod.article_no}-${v.size}`,
        reorder_level: v.reorder_level || 3,
      })),
    });
    setEditingAdjustReason("Restock Delivery");
    setEditingAdjustNote("");
    setIsEditOpen(true);
  };

  const handleSaveEditProduct = (e) => {
    e.preventDefault();
    if (!editingProd) return;
    if (!editingProd.name.trim() || !editingProd.article_no.trim()) {
      alert("Please provide both Article Code and Product Name.");
      return;
    }
    updateProduct(editingProd.id, {
      ...editingProd,
      reason: editingAdjustReason,
      note: editingAdjustNote,
    });
    setIsEditOpen(false);
    setEditingProd(null);
  };

  const handleAddVariantToEditing = () => {
    if (!editingProd) return;
    const cleanArt = editingProd.article_no.replace(/[^A-Z0-9]/gi, "").slice(-3).padStart(3, "0");
    const nextSizeNum = editingProd.variants.length + 6;
    const nextSize = String(nextSizeNum);
    const cleanSize = nextSize.padStart(2, "0");
    const randomCode = Math.floor(1000 + Math.random() * 9000);
    const newV = {
      id: typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `var-${Date.now()}`,
      size: nextSize,
      color: editingProd.variants[0]?.color || "Standard",
      cost_price: editingProd.variants[0]?.cost_price || 600,
      selling_price: editingProd.variants[0]?.selling_price || 1199,
      stock: 6,
      barcode: `890${cleanArt}${cleanSize}${randomCode}`,
      sku: `JDS-${editingProd.article_no}-${nextSize}`,
      reorder_level: 3,
    };
    setEditingProd({
      ...editingProd,
      variants: [...editingProd.variants, newV],
    });
  };

  const handleRemoveVariantFromEditing = (index) => {
    if (!editingProd || editingProd.variants.length <= 1) {
      alert("At least one size variant must remain.");
      return;
    }
    setEditingProd({
      ...editingProd,
      variants: editingProd.variants.filter((_, idx) => idx !== index),
    });
  };

  const handleEditingVariantChange = (index, field, value) => {
    if (!editingProd) return;
    const updated = [...editingProd.variants];
    updated[index] = { ...updated[index], [field]: value };
    setEditingProd({ ...editingProd, variants: updated });
  };

  // New product form state
  const [newProd, setNewProd] = useState({
    article_no: "",
    name: "",
    brand: "JD Signature",
    category: "Gents",
    sub_category: "Casual",
    tax_rate: 12,
    variants: [
      { size: "6", color: "Black", cost_price: 600, selling_price: 1199, stock: 6 },
      { size: "7", color: "Black", cost_price: 600, selling_price: 1199, stock: 8 },
      { size: "8", color: "Black", cost_price: 600, selling_price: 1199, stock: 10 },
      { size: "9", color: "Black", cost_price: 600, selling_price: 1199, stock: 8 },
      { size: "10", color: "Black", cost_price: 600, selling_price: 1199, stock: 4 },
    ],
  });

  // Calculate high-level inventory totals (Issue 5: low-stock detection)
  const stats = useMemo(() => {
    let totalPairs = 0;
    let totalCostVal = 0;
    let totalRetailVal = 0;
    let lowStockCount = 0;

    products.forEach((p) => {
      const prodTotalStock = p.variants.reduce((s, v) => s + (v.stock || 0), 0);
      let isProductLow = false;

      if (thresholdMode === "per-size") {
        isProductLow = p.variants.some((v) => (v.stock || 0) <= lowStockThreshold);
      } else {
        isProductLow = prodTotalStock <= lowStockThreshold;
      }

      if (isProductLow) {
        lowStockCount++;
      }

      p.variants.forEach((v) => {
        const qty = v.stock || 0;
        totalPairs += qty;
        totalCostVal += qty * (v.cost_price || 0);
        totalRetailVal += qty * (v.selling_price || 0);
      });
    });

    return { totalPairs, totalCostVal, totalRetailVal, lowStockCount };
  }, [products, lowStockThreshold, thresholdMode]);

  // Filtered Products (Issue 1 & 5)
  const filteredProducts = useMemo(() => {
    return products.filter((prod) => {
      // Category filter (flexible matching for Gents/Men, Ladies/Women, Boys/Kids, Girls)
      if (selectedCat !== "All") {
        const c = String(prod.category || "").toLowerCase();
        const sc = selectedCat.toLowerCase();
        const match =
          c === sc ||
          (sc === "gents" && (c.includes("gent") || c.includes("men"))) ||
          (sc === "ladies" && (c.includes("lad") || c.includes("women"))) ||
          (sc === "boys" && (c.includes("boy") || c.includes("kid"))) ||
          (sc === "girls" && (c.includes("girl") || c.includes("kid")));
        if (!match) return false;
      }

      // Stock status filter (Issue 5: respects 3 vs 30 threshold and per-size vs total mode)
      const totalStock = prod.variants.reduce((s, v) => s + (v.stock || 0), 0);
      if (stockFilter === "Low") {
        const isLow =
          thresholdMode === "per-size"
            ? prod.variants.some((v) => (v.stock || 0) <= lowStockThreshold)
            : totalStock <= lowStockThreshold;
        if (!isLow) return false;
      }
      if (stockFilter === "Out" && totalStock > 0) return false;
      if (stockFilter === "In" && totalStock === 0) return false;

      // Query filter
      if (!query.trim()) return true;
      const q = query.toLowerCase().trim();
      return (
        prod.name.toLowerCase().includes(q) ||
        prod.article_no.toLowerCase().includes(q) ||
        prod.brand.toLowerCase().includes(q) ||
        prod.variants.some(
          (v) => v.barcode?.includes(q) || v.sku?.toLowerCase().includes(q)
        )
      );
    });
  }, [products, selectedCat, stockFilter, query, lowStockThreshold, thresholdMode]);

  // Stock Adjustment Handlers inside Combined Edit Modal (Issue 4)
  const handleStepEditingStock = (idx, step) => {
    if (!editingProd) return;
    const updated = [...editingProd.variants];
    const cur = Number(updated[idx].stock) || 0;
    updated[idx] = { ...updated[idx], stock: Math.max(0, cur + step) };
    setEditingProd({ ...editingProd, variants: updated });
  };

  const handleBulkStepEditing = (step) => {
    if (!editingProd) return;
    const updated = editingProd.variants.map((v) => ({
      ...v,
      stock: Math.max(0, (Number(v.stock) || 0) + step),
    }));
    setEditingProd({ ...editingProd, variants: updated });
  };

  const handleResetEditingStock = () => {
    if (!editingProd) return;
    const original = products.find((p) => p.id === editingProd.id);
    if (!original) return;
    const updated = editingProd.variants.map((v) => {
      const origV = original.variants?.find((ov) => ov.id === v.id);
      return {
        ...v,
        stock: origV ? origV.stock : v.stock,
      };
    });
    setEditingProd({ ...editingProd, variants: updated });
  };

  const handleCreateProduct = (e) => {
    e.preventDefault();
    if (!newProd.article_no.trim() || !newProd.name.trim()) {
      alert("Please provide both Article Code and Product Name.");
      return;
    }

    addProduct(newProd);
    setIsAddOpen(false);
    // Reset form
    setNewProd({
      article_no: "",
      name: "",
      brand: "JD Signature",
      category: "Gents",
      sub_category: "Casual",
      tax_rate: 12,
      variants: [
        { size: "6", color: "Black", cost_price: 600, selling_price: 1199, stock: 6 },
        { size: "7", color: "Black", cost_price: 600, selling_price: 1199, stock: 8 },
        { size: "8", color: "Black", cost_price: 600, selling_price: 1199, stock: 10 },
        { size: "9", color: "Black", cost_price: 600, selling_price: 1199, stock: 8 },
        { size: "10", color: "Black", cost_price: 600, selling_price: 1199, stock: 4 },
      ],
    });
  };

  return (
    <div className="inventory-container">
      {/* KPI TILES */}
      <div className="metrics-grid">
        <div className="metric-card">
          <div className="metric-header">
            <span className="metric-title">Total Footwear Models</span>
            <div className="metric-icon-wrap navy">
              <Boxes size={18} />
            </div>
          </div>
          <div className="metric-value">{products.length}</div>
          <div className="metric-footer">
            <span>Active retail articles</span>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-header">
            <span className="metric-title">Total Pairs in Stock</span>
            <div className="metric-icon-wrap gold">
              <PackagePlus size={18} />
            </div>
          </div>
          <div className="metric-value">{stats.totalPairs}</div>
          <div className="metric-footer">
            <span>Pairs across all sizes</span>
          </div>
        </div>

        {/* Issue 5: Low-Stock Warning KPI with Threshold Mode Toggle */}
        <div className={`metric-card ${stats.lowStockCount > 0 ? "warning-card" : ""}`}>
          <div className="metric-header">
            <span className="metric-title">Low Stock Alert</span>
            <div className="metric-icon-wrap red">
              <AlertTriangle size={18} />
            </div>
          </div>
          <div className="metric-value" style={{ color: stats.lowStockCount > 0 ? "#dc2626" : "#16a34a" }}>
            {stats.lowStockCount}
            <span style={{ fontSize: "12px", color: "#64748b", fontWeight: 500, marginLeft: "6px" }}>
              models low
            </span>
          </div>
          <div className="metric-footer" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "10.5px" }}>
              {thresholdMode === "per-size" ? `≤ ${lowStockThreshold} pairs/size` : `≤ ${lowStockThreshold} pairs total`}
            </span>
            <div className="kpi-threshold-toggle">
              <button
                type="button"
                className={`threshold-btn ${lowStockThreshold === 3 && thresholdMode === "per-size" ? "active" : ""}`}
                onClick={() => {
                  setLowStockThreshold(3);
                  setThresholdMode("per-size");
                }}
                title="Retail reorder threshold: 3 pairs per shoe size"
              >
                3 Retail
              </button>
              <button
                type="button"
                className={`threshold-btn ${lowStockThreshold === 30 && thresholdMode === "total" ? "active" : ""}`}
                onClick={() => {
                  setLowStockThreshold(30);
                  setThresholdMode("total");
                }}
                title="Wholesale carton threshold: 30 pairs total across article"
              >
                30 Box
              </button>
            </div>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-header">
            <span className="metric-title">Inventory Valuation</span>
            <div className="metric-icon-wrap teal">
              <DollarSign size={18} />
            </div>
          </div>
          <div className="metric-value">{formatINR(stats.totalCostVal)}</div>
          <div className="metric-footer">
            <span>Wholesale purchase valuation</span>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-header">
            <span className="metric-title">Retail Value & Margin</span>
            <div className="metric-icon-wrap green">
              <TrendingUp size={18} />
            </div>
          </div>
          <div className="metric-value">{formatINR(stats.totalRetailVal)}</div>
          <div className="metric-footer positive">
            <span>
              ~
              {stats.totalRetailVal > 0
                ? Math.round(
                    ((stats.totalRetailVal - stats.totalCostVal) /
                      stats.totalRetailVal) *
                      100
                  )
                : 0}
              % Average Margin
            </span>
          </div>
        </div>
      </div>

      {/* CONTROLS HEADER */}
      <div className="panel" style={{ padding: "16px 20px", marginBottom: "18px" }}>
        <div className="inventory-controls-row">
          <div className="search-row" style={{ marginTop: 0, flex: 1, minWidth: "240px" }}>
            <Search size={16} />
            <input
              type="text"
              placeholder="Search by article, footwear model, brand or barcode..."
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
              value={selectedCat}
              onChange={(e) => setSelectedCat(e.target.value)}
              className="select-filter"
            >
              <option value="All">All Categories</option>
              <option value="Gents">Gents (Men's Footwear)</option>
              <option value="Ladies">Ladies (Women's Footwear)</option>
              <option value="Boys">Boys (Kids' Footwear)</option>
              <option value="Girls">Girls (Kids' Footwear)</option>
            </select>

            {/* Stock Level Selector with Issue 5 threshold details */}
            <select
              value={stockFilter}
              onChange={(e) => setStockFilter(e.target.value)}
              className="select-filter"
            >
              <option value="All">All Stock Levels</option>
              <option value="Low">
                Low Stock ({thresholdMode === "per-size" ? `≤ ${lowStockThreshold} pairs/size` : `≤ ${lowStockThreshold} pairs total`})
              </option>
              <option value="In">In Stock (&gt; 0)</option>
              <option value="Out">Out of Stock</option>
            </select>

            {/* Low-Stock Threshold Mode Quick Selector (Issue 5) */}
            <div className="threshold-selector-pill" title="Configure threshold rule">
              <span className="pill-label">Alert Rule:</span>
              <button
                type="button"
                className={`pill-opt ${thresholdMode === "per-size" && lowStockThreshold === 3 ? "selected" : ""}`}
                onClick={() => {
                  setThresholdMode("per-size");
                  setLowStockThreshold(3);
                }}
              >
                3 Pairs / Size
              </button>
              <button
                type="button"
                className={`pill-opt ${thresholdMode === "total" && lowStockThreshold === 30 ? "selected" : ""}`}
                onClick={() => {
                  setThresholdMode("total");
                  setLowStockThreshold(30);
                }}
              >
                30 Pairs Total
              </button>
            </div>

            {isAdmin && (
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setIsAuditOpen(true)}
                style={{ padding: "0 14px", height: "40px", borderColor: "#c5a15c", color: "#7c632e", fontWeight: 600 }}
                title="View stock addition and adjustment accountability logs (Admin only)"
              >
                <History size={15} /> Stock Audit Trail
              </button>
            )}

            <button
              className="btn-primary"
              onClick={() => setIsAddOpen(true)}
              style={{ padding: "0 16px", height: "40px" }}
            >
              <Plus size={16} /> Add Footwear
            </button>
          </div>
        </div>

        {/* Threshold Explanation Note */}
        <div className="threshold-info-strip">
          <span className="info-icon">ℹ</span>
          <span>
            <strong>Low-Stock Logic:</strong>{" "}
            {thresholdMode === "per-size"
              ? `Currently monitoring individual shoe sizes with ≤ ${lowStockThreshold} pairs left (Retail single-size reorder mode).`
              : `Currently monitoring total model carton stock with ≤ ${lowStockThreshold} pairs left (Wholesale box pack mode).`}
          </span>
        </div>
      </div>

      {/* PRODUCTS & SIZES TABLE */}
      <div className="panel table-panel">
        <div className="table-responsive">
          <table className="custom-table">
            <thead>
              <tr>
                <th>Article & Model</th>
                <th>Brand & Category</th>
                <th>Sizes & Stock Breakdown</th>
                <th style={{ textAlign: "right" }}>Cost Price</th>
                <th style={{ textAlign: "right" }}>Selling Price</th>
                <th style={{ textAlign: "center" }}>Total Stock</th>
                <th style={{ textAlign: "center" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: "center", padding: "40px 20px" }}>
                    <Boxes size={32} style={{ color: "#a0aec0", margin: "0 auto 10px" }} />
                    <div style={{ fontWeight: 600, color: "#4a5568" }}>
                      No footwear matching your search or filters
                    </div>
                  </td>
                </tr>
              ) : (
                filteredProducts.map((prod) => {
                  const totalStock = prod.variants.reduce(
                    (s, v) => s + (v.stock || 0),
                    0
                  );
                  const minPrice = Math.min(
                    ...prod.variants.map((v) => v.selling_price || 0)
                  );
                  const maxPrice = Math.max(
                    ...prod.variants.map((v) => v.selling_price || 0)
                  );
                  const costPrice = prod.variants[0]?.cost_price || 0;
                  const marginPct =
                    minPrice > 0
                      ? Math.round(((minPrice - costPrice) / minPrice) * 100)
                      : 0;

                  const isProductLowStock =
                    thresholdMode === "per-size"
                      ? prod.variants.some((v) => (v.stock || 0) <= lowStockThreshold)
                      : totalStock <= lowStockThreshold;

                  const isHighlighted =
                    highlightTarget?.tab === "inventory" &&
                    (highlightTarget.productId === prod.id ||
                      highlightTarget.productName === prod.name ||
                      highlightTarget.productName === prod.article_no);

                  return (
                    <tr
                      key={prod.id}
                      id={`prod-row-${prod.id}`}
                      className={`${isHighlighted ? "table-row-highlight" : ""} ${isProductLowStock ? "row-low-stock-alert" : ""}`}
                    >
                      <td>
                        <div className="prod-cell">
                          <span className="art-pill">{prod.article_no}</span>
                          <div>
                            <strong style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                              {prod.name}
                              {isProductLowStock && (
                                <span className="low-stock-badge-dot" title="Low stock alert on this article">
                                  LOW
                                </span>
                              )}
                            </strong>
                            <div className="sub-text">
                              GST: {prod.tax_rate || 12}% • Barcode: {prod.variants[0]?.barcode || "-"}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td>
                        <div style={{ fontWeight: 600 }}>{prod.brand}</div>
                        <span className="sub-tag">
                          {prod.category} • {prod.sub_category}
                        </span>
                      </td>

                      <td>
                        <div className="size-stock-pills">
                          {prod.variants.map((v) => {
                            const isSizeLow = (v.stock || 0) <= (thresholdMode === "per-size" ? lowStockThreshold : 3);
                            return (
                              <button
                                key={v.id}
                                className={`size-inventory-pill ${isSizeLow ? "low" : ""}`}
                                onClick={() => handleOpenEditProduct(prod)}
                                title={`Size ${v.size} (${v.color || "Standard"}): ${v.stock} pairs ${isSizeLow ? "(LOW STOCK)" : ""} - Click to edit & adjust`}
                              >
                                <span className="s-size">{v.size}</span>
                                <span className="s-qty">{v.stock}</span>
                                {isSizeLow && <span className="s-dot-alert" />}
                              </button>
                            );
                          })}
                          <button
                            type="button"
                            className="btn-add-size-pill"
                            onClick={() => handleOpenAddSize(prod)}
                            title={`Add a new size variant to ${prod.name}`}
                          >
                            <Plus size={11} /> Size
                          </button>
                        </div>
                      </td>

                      <td style={{ textAlign: "right", color: "#64748b" }}>
                        {formatINR(costPrice)}
                      </td>

                      <td style={{ textAlign: "right" }}>
                        <div style={{ fontWeight: 700, color: "#1e293b" }}>
                          {minPrice === maxPrice ? formatINR(minPrice) : `${formatINR(minPrice)} - ${formatINR(maxPrice)}`}
                        </div>
                        <span className="margin-hint">{marginPct}% margin</span>
                      </td>

                      <td style={{ textAlign: "center" }}>
                        <span
                          className={`stock-badge ${
                            totalStock === 0
                              ? "out"
                              : totalStock <= lowStockThreshold
                              ? "low"
                              : "ok"
                          }`}
                        >
                          {totalStock} pairs
                        </span>
                      </td>

                      {/* Actions Column (Combined Edit & Adjust - Issue 4) */}
                      <td style={{ textAlign: "center" }}>
                        <div style={{ display: "flex", gap: "6px", justifyContent: "center", alignItems: "center" }}>
                          <button
                            type="button"
                            className="btn-tiny btn-edit-action"
                            style={{ color: "#0284c7", borderColor: "#bae6fd", background: "#f0f9ff", fontWeight: 700, padding: "4px 10px" }}
                            onClick={() => handleOpenEditProduct(prod)}
                            title="Edit product details, selling prices, and adjust size stock"
                          >
                            <Edit2 size={12} /> Edit
                          </button>
                          <button
                            type="button"
                            className="btn-tiny-danger"
                            onClick={() => {
                              if (
                                confirm(
                                  `Delete ${prod.name} (${prod.article_no}) from catalog?`
                                )
                              ) {
                                deleteProduct(prod.id);
                              }
                            }}
                            title="Delete Footwear"
                          >
                            <Trash2 size={12} />
                          </button>
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

      {/* MODAL: EDIT PRODUCT DETAILS & VARIANTS (Issue 9) */}
      {isEditOpen && editingProd && (
        <div className="modal-backdrop" onClick={() => setIsEditOpen(false)}>
          <div
            className="modal-content product-edit-modal"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: "860px", width: "95%" }}
          >
            <div className="modal-header">
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <div className="setting-icon-box" style={{ background: "#e0f2fe", color: "#0284c7" }}>
                  <Edit2 size={18} />
                </div>
                <div>
                  <h3>Edit Footwear Details & Pricing</h3>
                  <p>
                    Update name, article code, GST slab, and individual size selling prices & stock
                  </p>
                </div>
              </div>
              <button className="btn-close" onClick={() => setIsEditOpen(false)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveEditProduct} className="product-form">
              <div className="form-grid-3">
                <div className="form-field">
                  <label>Article Code*</label>
                  <input
                    type="text"
                    required
                    value={editingProd.article_no}
                    onChange={(e) =>
                      setEditingProd({ ...editingProd, article_no: e.target.value.toUpperCase() })
                    }
                  />
                </div>

                <div className="form-field" style={{ gridColumn: "span 2" }}>
                  <label>Footwear Name / Model*</label>
                  <input
                    type="text"
                    required
                    value={editingProd.name}
                    onChange={(e) =>
                      setEditingProd({ ...editingProd, name: e.target.value })
                    }
                  />
                </div>
              </div>

              <div className="form-grid-3">
                <div className="form-field">
                  <label>Brand</label>
                  <input
                    type="text"
                    value={editingProd.brand}
                    onChange={(e) =>
                      setEditingProd({ ...editingProd, brand: e.target.value })
                    }
                  />
                </div>

                <div className="form-field">
                  <label>Category</label>
                  <select
                    value={editingProd.category}
                    onChange={(e) =>
                      setEditingProd({ ...editingProd, category: e.target.value })
                    }
                  >
                    <option value="Gents">Gents (Men's Footwear)</option>
                    <option value="Ladies">Ladies (Women's Footwear)</option>
                    <option value="Boys">Boys (Kids' Footwear)</option>
                    <option value="Girls">Girls (Kids' Footwear)</option>
                  </select>
                </div>

                <div className="form-field">
                  <label>GST Tax Slab (Issue 3)</label>
                  <select
                    value={editingProd.tax_rate}
                    onChange={(e) =>
                      setEditingProd({ ...editingProd, tax_rate: Number(e.target.value) })
                    }
                  >
                    <option value="5">5% (Footwear below ₹1,000)</option>
                    <option value="12">12% (Footwear ₹1,000 & above)</option>
                    <option value="18">18% Standard GST</option>
                    <option value="0">0% Exempt</option>
                  </select>
                </div>
              </div>

              {/* Editable Sizes & Pricing Table (Issue 9) */}
              {/* Editable Sizes, Pricing & Stock Adjustment Table (Combined - Issue 4) */}
              <div className="edit-variants-container" style={{ marginTop: "16px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px", flexWrap: "wrap", gap: "8px" }}>
                  <div>
                    <h4 style={{ margin: 0, fontSize: "13px", fontWeight: 700, color: "#1e293b" }}>
                      Sizes, Pricing & Stock Adjustment
                    </h4>
                    <span style={{ fontSize: "11px", color: "#64748b" }}>
                      Adjust stock with steppers or direct input, set prices, and manage barcodes.
                    </span>
                  </div>
                  <div style={{ display: "flex", gap: "5px", alignItems: "center" }}>
                    <button type="button" className="btn-chip" onClick={() => handleBulkStepEditing(1)}>+1 All</button>
                    <button type="button" className="btn-chip" onClick={() => handleBulkStepEditing(5)}>+5 All (Box)</button>
                    <button type="button" className="btn-chip danger" onClick={() => handleBulkStepEditing(-1)}>-1 All</button>
                    <button type="button" className="btn-chip" onClick={handleResetEditingStock} title="Reset stock changes">
                      <RotateCcw size={11} /> Reset
                    </button>
                    <button
                      type="button"
                      className="btn-tiny"
                      style={{ background: "#f0fdf4", color: "#16a34a", borderColor: "#bbf7d0", fontWeight: 700 }}
                      onClick={handleAddVariantToEditing}
                    >
                      <Plus size={13} /> Add Size
                    </button>
                  </div>
                </div>

                <div className="table-responsive" style={{ maxHeight: "280px", overflowY: "auto", border: "1px solid #e2e8f0", borderRadius: "6px" }}>
                  <table className="custom-table edit-variants-table" style={{ fontSize: "12px" }}>
                    <thead>
                      <tr>
                        <th style={{ width: "70px" }}>Size</th>
                        <th style={{ width: "100px" }}>Color</th>
                        <th style={{ width: "110px", textAlign: "right" }}>Cost (₹)</th>
                        <th style={{ width: "120px", textAlign: "right" }}>Selling Price (₹)</th>
                        <th style={{ width: "115px", textAlign: "center" }}>Stock (Pairs)</th>
                        <th>Barcode (EAN/UPC)</th>
                        <th style={{ width: "40px", textAlign: "center" }}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {editingProd.variants.map((v, idx) => (
                        <tr key={v.id || idx}>
                          <td>
                            <input
                              type="text"
                              className="table-input"
                              value={v.size}
                              onChange={(e) => handleEditingVariantChange(idx, "size", e.target.value)}
                              style={{ width: "55px", textAlign: "center", fontWeight: 700 }}
                            />
                          </td>
                          <td>
                            <input
                              type="text"
                              className="table-input"
                              value={v.color}
                              onChange={(e) => handleEditingVariantChange(idx, "color", e.target.value)}
                              placeholder="Color"
                            />
                          </td>
                          <td>
                            <input
                              type="number"
                              min="0"
                              className="table-input"
                              value={v.cost_price}
                              onChange={(e) => handleEditingVariantChange(idx, "cost_price", Number(e.target.value))}
                              style={{ textAlign: "right" }}
                            />
                          </td>
                          <td>
                            <input
                              type="number"
                              min="0"
                              className="table-input highlight-price"
                              value={v.selling_price}
                              onChange={(e) => handleEditingVariantChange(idx, "selling_price", Number(e.target.value))}
                              style={{ textAlign: "right", fontWeight: 700, color: "#0f172a" }}
                            />
                          </td>
                          <td style={{ textAlign: "center" }}>
                            <div style={{ display: "inline-flex", alignItems: "center", border: "1.5px solid #cbd5e1", borderRadius: "5px", overflow: "hidden", background: "#ffffff" }}>
                              <button
                                type="button"
                                style={{ border: 0, background: "#f1f5f9", width: "22px", height: "26px", cursor: "pointer", fontWeight: 700, color: "#475569" }}
                                onClick={() => handleStepEditingStock(idx, -1)}
                                title="Decrease stock by 1"
                              >
                                -
                              </button>
                              <input
                                type="number"
                                min="0"
                                className="table-input"
                                value={v.stock}
                                onChange={(e) => handleEditingVariantChange(idx, "stock", Math.max(0, Number(e.target.value) || 0))}
                                style={{ width: "42px", textAlign: "center", border: 0, fontWeight: 700, color: (v.stock || 0) <= 3 ? "#dc2626" : "#0f172a" }}
                              />
                              <button
                                type="button"
                                style={{ border: 0, background: "#f1f5f9", width: "22px", height: "26px", cursor: "pointer", fontWeight: 700, color: "#475569" }}
                                onClick={() => handleStepEditingStock(idx, 1)}
                                title="Increase stock by 1"
                              >
                                +
                              </button>
                            </div>
                          </td>
                          <td>
                            <div style={{ display: "flex", gap: "4px" }}>
                              <input
                                type="text"
                                className="table-input"
                                value={v.barcode}
                                onChange={(e) => handleEditingVariantChange(idx, "barcode", e.target.value)}
                                placeholder="Scan/Type barcode"
                              />
                              <button
                                type="button"
                                className="btn-tiny"
                                style={{ padding: "0 6px", fontSize: "10px" }}
                                onClick={() => {
                                  const cleanArt = editingProd.article_no.replace(/[^A-Z0-9]/gi, "").slice(-3).padStart(3, "0");
                                  const cleanSize = String(v.size).padStart(2, "0");
                                  const randomCode = Math.floor(1000 + Math.random() * 9000);
                                  handleEditingVariantChange(idx, "barcode", `890${cleanArt}${cleanSize}${randomCode}`);
                                }}
                                title="Auto-generate standard barcode"
                              >
                                Auto
                              </button>
                            </div>
                          </td>
                          <td style={{ textAlign: "center" }}>
                            {editingProd.variants.length > 1 && (
                              <button
                                type="button"
                                className="btn-tiny-danger"
                                onClick={() => handleRemoveVariantFromEditing(idx)}
                                title="Remove this size variant"
                              >
                                <X size={12} />
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Adjustment Reason & Audit Note */}
                <div style={{ marginTop: "12px", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "6px", padding: "10px 12px", display: "grid", gridTemplateColumns: "1.2fr 2fr", gap: "10px" }}>
                  <div>
                    <label style={{ fontSize: "11px", fontWeight: 700, color: "#475569", display: "block", marginBottom: "4px" }}>
                      Stock Adjustment Reason (Audit Log)
                    </label>
                    <select
                      value={editingAdjustReason}
                      onChange={(e) => setEditingAdjustReason(e.target.value)}
                      style={{ width: "100%", height: "32px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "11.5px", padding: "0 8px", background: "#fff" }}
                    >
                      <option value="Restock Delivery">Restock Delivery / Intake</option>
                      <option value="Physical Inventory Audit">Physical Inventory Audit Correction</option>
                      <option value="Damaged / Defect Removal">Damaged / Defective Stock Removal</option>
                      <option value="Customer Return">Customer Return Restock</option>
                      <option value="Product Details Edit">General Product & Price Update</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: "11px", fontWeight: 700, color: "#475569", display: "block", marginBottom: "4px" }}>
                      Audit Note / Supplier Invoice Ref
                    </label>
                    <input
                      type="text"
                      placeholder="Optional intake note, supplier invoice #, or audit reason..."
                      value={editingAdjustNote}
                      onChange={(e) => setEditingAdjustNote(e.target.value)}
                      style={{ width: "100%", height: "32px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "11.5px", padding: "0 8px", background: "#fff" }}
                    />
                  </div>
                </div>
              </div>

              <div className="modal-footer" style={{ marginTop: "20px" }}>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setIsEditOpen(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  <Check size={16} /> Save Product & Stock Updates
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ADD NEW FOOTWEAR */}
      {isAddOpen && (
        <div className="modal-backdrop" onClick={() => setIsAddOpen(false)}>
          <div
            className="modal-content product-form-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <div>
                <h3>Add New Footwear Article</h3>
                <p>Register model details, pricing, and initial size quantities</p>
              </div>
              <button className="btn-close" onClick={() => setIsAddOpen(false)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateProduct} className="product-form">
              <div className="form-grid-2">
                <div className="form-field">
                  <label>Article Code (e.g. ART-109)*</label>
                  <input
                    type="text"
                    required
                    placeholder="ART-109"
                    value={newProd.article_no}
                    onChange={(e) =>
                      setNewProd({ ...newProd, article_no: e.target.value.toUpperCase() })
                    }
                  />
                </div>

                <div className="form-field">
                  <label>Footwear Name / Model*</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Italian Leather Loafer"
                    value={newProd.name}
                    onChange={(e) =>
                      setNewProd({ ...newProd, name: e.target.value })
                    }
                  />
                </div>

                <div className="form-field">
                  <label>Brand</label>
                  <input
                    type="text"
                    placeholder="e.g. JD Signature, Bata, Woodland"
                    value={newProd.brand}
                    onChange={(e) =>
                      setNewProd({ ...newProd, brand: e.target.value })
                    }
                  />
                </div>

                <div className="form-field">
                  <label>Category</label>
                  <select
                    value={newProd.category}
                    onChange={(e) =>
                      setNewProd({ ...newProd, category: e.target.value })
                    }
                  >
                    <option value="Gents">Gents (Men's Footwear)</option>
                    <option value="Ladies">Ladies (Women's Footwear)</option>
                    <option value="Boys">Boys (Kids' Footwear)</option>
                    <option value="Girls">Girls (Kids' Footwear)</option>
                  </select>
                </div>

                <div className="form-field">
                  <label>Footwear Type</label>
                  <select
                    value={newProd.sub_category}
                    onChange={(e) =>
                      setNewProd({ ...newProd, sub_category: e.target.value })
                    }
                  >
                    <option value="Casual">Casual</option>
                    <option value="Formal">Formal</option>
                    <option value="Sports">Sports / Sneakers</option>
                    <option value="Sandals">Sandals / Slippers</option>
                  </select>
                </div>

                <div className="form-field">
                  <label>GST Rate</label>
                  <select
                    value={newProd.tax_rate}
                    onChange={(e) =>
                      setNewProd({ ...newProd, tax_rate: Number(e.target.value) })
                    }
                  >
                    <option value="5">5% (Below ₹1,000)</option>
                    <option value="12">12% (₹1,000 & above)</option>
                    <option value="18">18% Standard</option>
                  </select>
                </div>
              </div>

              {/* Variants / Sizes Builder */}
              <div className="variant-builder-section">
                <h4>Sizes & Initial Stock</h4>
                <div className="variant-builder-grid">
                  {newProd.variants.map((v, idx) => (
                    <div key={idx} className="variant-row-card">
                      <div className="v-size-tag">Size {v.size}</div>
                      <div className="v-inputs">
                        <div>
                          <label>Pairs in Stock</label>
                          <input
                            type="number"
                            min="0"
                            value={v.stock}
                            onChange={(e) => {
                              const updated = [...newProd.variants];
                              updated[idx].stock = Number(e.target.value);
                              setNewProd({ ...newProd, variants: updated });
                            }}
                          />
                        </div>
                        <div>
                          <label>Cost Price (₹)</label>
                          <input
                            type="number"
                            min="0"
                            value={v.cost_price}
                            onChange={(e) => {
                              const updated = [...newProd.variants];
                              updated[idx].cost_price = Number(e.target.value);
                              setNewProd({ ...newProd, variants: updated });
                            }}
                          />
                        </div>
                        <div>
                          <label>Selling Price (₹)</label>
                          <input
                            type="number"
                            min="0"
                            value={v.selling_price}
                            onChange={(e) => {
                              const updated = [...newProd.variants];
                              updated[idx].selling_price = Number(e.target.value);
                              setNewProd({ ...newProd, variants: updated });
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setIsAddOpen(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  <Check size={16} /> Save Footwear Model
                </button>
              </div>
            </form>
          </div>
        </div>
      )}


      {/* STOCK AUDIT TRAIL MODAL (ADMIN ACCOUNTABILITY) */}
      {isAuditOpen && (
        <div className="modal-backdrop" onClick={() => setIsAuditOpen(false)}>
          <div className="modal-content" style={{ maxWidth: "780px" }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                <div className="setting-icon-box">
                  <History size={18} />
                </div>
                <div>
                  <h2>Footwear Stock Audit Trail</h2>
                  <p>Logged stock inward intakes, physical counts, and cashier adjustments</p>
                </div>
              </div>
              <button className="btn-close" onClick={() => setIsAuditOpen(false)}>
                <X size={18} />
              </button>
            </div>

            <div className="modal-body" style={{ maxHeight: "380px", overflowY: "auto", padding: "14px 20px" }}>
              {(!stockLogs || stockLogs.length === 0) ? (
                <div style={{ padding: "30px", textAlign: "center", color: "#94a3b8" }}>
                  No stock adjustment events recorded yet.
                </div>
              ) : (
                <table className="custom-table" style={{ fontSize: "11px" }}>
                  <thead>
                    <tr>
                      <th>Date & Time</th>
                      <th>Product & Model</th>
                      <th style={{ textAlign: "center" }}>Stock Delta</th>
                      <th>Reason / Note</th>
                      <th style={{ textAlign: "center", color: "#7c632e" }}>Adjusted By</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stockLogs.map((log) => (
                      <tr key={log.id}>
                        <td>
                          <span style={{ fontSize: "10px", color: "#64748b" }}>
                            {new Date(log.created_at).toLocaleString("en-IN", {
                              dateStyle: "short",
                              timeStyle: "short",
                            })}
                          </span>
                        </td>
                        <td>
                          <strong>{log.product_name}</strong>
                          {log.article_no && <span className="sub-text"> ({log.article_no})</span>}
                          {log.size && <span className="item-pill-small" style={{ marginLeft: "4px" }}>Sz {log.size}</span>}
                        </td>
                        <td style={{ textAlign: "center" }}>
                          <span className={`delta-badge ${log.delta > 0 ? "plus" : log.delta < 0 ? "minus" : "zero"}`}>
                            {log.delta > 0 ? `+${log.delta}` : log.delta}
                          </span>
                        </td>
                        <td>
                          <span style={{ fontWeight: 600 }}>{log.reason}</span>
                          {log.note && <div className="sub-text">{log.note}</div>}
                        </td>
                        <td style={{ textAlign: "center" }}>
                          <span className="staff-pill" style={{ background: "#faf3e4", color: "#7c632e", borderColor: "#efe2c5" }}>
                            {log.adjusted_by || "Admin"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <div className="modal-footer" style={{ justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "11px", color: "#64748b" }}>
                <ShieldCheck size={14} style={{ color: "#c5a15c" }} />
                <span>Strict Audit Mode: Visible only to store Administrators.</span>
              </div>
              <button className="btn-secondary" onClick={() => setIsAuditOpen(false)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: ADD NEW SIZE VARIANT TO EXISTING FOOTWEAR */}
      {isAddSizeOpen && sizeTargetProduct && (
        <div className="modal-backdrop" onClick={() => setIsAddSizeOpen(false)}>
          <div
            className="modal-content"
            style={{ maxWidth: "520px" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <div>
                <h3>Add Size to {sizeTargetProduct.name}</h3>
                <p>
                  Article: <strong>{sizeTargetProduct.article_no}</strong> • Current Sizes:{" "}
                  {sizeTargetProduct.variants.map((v) => v.size).join(", ")}
                </p>
              </div>
              <button className="btn-close" onClick={() => setIsAddSizeOpen(false)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveAddSize} className="product-form">
              <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                <div className="form-field">
                  <label>Shoe Size (UK / India)*</label>
                  <div style={{ display: "flex", gap: "6px", marginBottom: "8px", flexWrap: "wrap" }}>
                    {["5", "6", "7", "8", "9", "10", "11", "12"].map((sz) => {
                      const alreadyHas = sizeTargetProduct.variants.some((v) => v.size === sz);
                      const isChosen = newSizeForm.size === sz;
                      return (
                        <button
                          key={sz}
                          type="button"
                          className="btn-tiny"
                          style={{
                            background: isChosen ? "#101c35" : alreadyHas ? "#f1f5f9" : "#fff",
                            borderColor: isChosen ? "#101c35" : "#cbd5e1",
                            color: isChosen ? "#fff" : alreadyHas ? "#94a3b8" : "#1e293b",
                            fontWeight: isChosen ? 700 : 500,
                          }}
                          onClick={() => setNewSizeForm({ ...newSizeForm, size: sz })}
                        >
                          {sz} {alreadyHas ? "✓" : ""}
                        </button>
                      );
                    })}
                  </div>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 5, 11, 12 or 7.5"
                    value={newSizeForm.size}
                    onChange={(e) => setNewSizeForm({ ...newSizeForm, size: e.target.value })}
                  />
                </div>

                <div className="form-grid-2">
                  <div className="form-field">
                    <label>Color / Finish</label>
                    <input
                      type="text"
                      required
                      value={newSizeForm.color}
                      onChange={(e) => setNewSizeForm({ ...newSizeForm, color: e.target.value })}
                    />
                  </div>
                  <div className="form-field">
                    <label>Opening Stock (Pairs)</label>
                    <input
                      type="number"
                      min={0}
                      required
                      value={newSizeForm.stock}
                      onChange={(e) => setNewSizeForm({ ...newSizeForm, stock: e.target.value })}
                    />
                  </div>
                </div>

                <div className="form-grid-2">
                  <div className="form-field">
                    <label>Cost Price (₹)</label>
                    <input
                      type="number"
                      min={0}
                      required
                      value={newSizeForm.cost_price}
                      onChange={(e) => setNewSizeForm({ ...newSizeForm, cost_price: e.target.value })}
                    />
                  </div>
                  <div className="form-field">
                    <label>Selling Price (₹)</label>
                    <input
                      type="number"
                      min={0}
                      required
                      value={newSizeForm.selling_price}
                      onChange={(e) => setNewSizeForm({ ...newSizeForm, selling_price: e.target.value })}
                    />
                  </div>
                </div>

                <div className="form-grid-2">
                  <div className="form-field">
                    <label>Barcode Number (EAN / UPC)</label>
                    <div style={{ display: "flex", gap: "6px" }}>
                      <input
                        type="text"
                        placeholder="Scan or auto-generate"
                        value={newSizeForm.barcode}
                        onChange={(e) => setNewSizeForm({ ...newSizeForm, barcode: e.target.value })}
                      />
                      <button
                        type="button"
                        className="btn-tiny"
                        style={{ whiteSpace: "nowrap" }}
                        onClick={() =>
                          setNewSizeForm({
                            ...newSizeForm,
                            barcode: `890${Math.floor(100000000 + Math.random() * 900000000)}`,
                          })
                        }
                      >
                        Auto
                      </button>
                    </div>
                  </div>
                  <div className="form-field">
                    <label>Reorder Alert Level</label>
                    <input
                      type="number"
                      min={1}
                      value={newSizeForm.reorder_level}
                      onChange={(e) => setNewSizeForm({ ...newSizeForm, reorder_level: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setIsAddSizeOpen(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  <Plus size={15} /> Save New Size Variant
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
