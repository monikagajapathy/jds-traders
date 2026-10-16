import React, { useState, useMemo } from "react";
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
} from "lucide-react";
import { useStore } from "../context/StoreContext.jsx";
import { formatINR } from "../utils/calculations.js";

export default function InventoryView() {
  const { products, addProduct, deleteProduct, adjustStock } = useStore();

  const [query, setQuery] = useState("");
  const [selectedCat, setSelectedCat] = useState("All");
  const [stockFilter, setStockFilter] = useState("All");

  // Modals state
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isAdjustOpen, setIsAdjustOpen] = useState(false);
  const [adjustTarget, setAdjustTarget] = useState(null); // { variantId, productName, size, currentStock }
  const [adjustDelta, setAdjustDelta] = useState(5);
  const [adjustReason, setAdjustReason] = useState("Restock Delivery");

  // New product form state
  const [newProd, setNewProd] = useState({
    article_no: "",
    name: "",
    brand: "JD Signature",
    category: "Men",
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

  // Calculate high-level inventory totals
  const stats = useMemo(() => {
    let totalPairs = 0;
    let totalCostVal = 0;
    let totalRetailVal = 0;
    let lowStockCount = 0;

    products.forEach((p) => {
      p.variants.forEach((v) => {
        const qty = v.stock || 0;
        totalPairs += qty;
        totalCostVal += qty * (v.cost_price || 0);
        totalRetailVal += qty * (v.selling_price || 0);
        if (qty <= (v.reorder_level || 3)) {
          lowStockCount++;
        }
      });
    });

    return { totalPairs, totalCostVal, totalRetailVal, lowStockCount };
  }, [products]);

  // Filtered Products
  const filteredProducts = useMemo(() => {
    return products.filter((prod) => {
      // Category filter
      if (selectedCat !== "All" && prod.category !== selectedCat) return false;

      // Stock status filter
      const totalStock = prod.variants.reduce((s, v) => s + (v.stock || 0), 0);
      if (stockFilter === "Low" && !prod.variants.some((v) => (v.stock || 0) <= (v.reorder_level || 3))) {
        return false;
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
  }, [products, selectedCat, stockFilter, query]);

  // Open Adjust Modal for a specific variant
  const handleOpenAdjust = (prod, variant) => {
    setAdjustTarget({
      variantId: variant.id,
      productName: prod.name,
      articleNo: prod.article_no,
      size: variant.size,
      currentStock: variant.stock || 0,
    });
    setAdjustDelta(5);
    setAdjustReason("Restock Delivery");
    setIsAdjustOpen(true);
  };

  const handleApplyAdjust = () => {
    if (!adjustTarget) return;
    adjustStock(
      adjustTarget.variantId,
      Number(adjustDelta),
      adjustReason,
      `From ${adjustTarget.currentStock} pairs`
    );
    setIsAdjustOpen(false);
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
      category: "Men",
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

        <div className="metric-card">
          <div className="metric-header">
            <span className="metric-title">Inventory Cost Valuation</span>
            <div className="metric-icon-wrap teal">
              <DollarSign size={18} />
            </div>
          </div>
          <div className="metric-value">{formatINR(stats.totalCostVal)}</div>
          <div className="metric-footer">
            <span>Estimated wholesale purchase cost</span>
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
              <option value="Men">Men's Footwear</option>
              <option value="Women">Women's Footwear</option>
              <option value="Kids">Kids' Footwear</option>
            </select>

            <select
              value={stockFilter}
              onChange={(e) => setStockFilter(e.target.value)}
              className="select-filter"
            >
              <option value="All">All Stock Levels</option>
              <option value="Low">Low Stock (&le; 3 pairs)</option>
              <option value="In">In Stock (&gt; 0)</option>
              <option value="Out">Out of Stock</option>
            </select>

            <button
              className="btn-primary"
              onClick={() => setIsAddOpen(true)}
              style={{ padding: "0 16px", height: "40px" }}
            >
              <Plus size={16} /> Add Footwear
            </button>
          </div>
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
                  const costPrice = prod.variants[0]?.cost_price || 0;
                  const marginPct =
                    minPrice > 0
                      ? Math.round(((minPrice - costPrice) / minPrice) * 100)
                      : 0;

                  return (
                    <tr key={prod.id}>
                      <td>
                        <div className="prod-cell">
                          <span className="art-pill">{prod.article_no}</span>
                          <div>
                            <strong>{prod.name}</strong>
                            <div className="sub-text">
                              GST: {prod.tax_rate}% • SKU: {prod.variants[0]?.sku || "-"}
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
                            const isLow = (v.stock || 0) <= (v.reorder_level || 3);
                            return (
                              <button
                                key={v.id}
                                className={`size-inventory-pill ${
                                  isLow ? "low" : ""
                                }`}
                                onClick={() => handleOpenAdjust(prod, v)}
                                title={`Click to adjust stock for Size ${v.size} (${v.color})`}
                              >
                                <span className="s-size">{v.size}</span>
                                <span className="s-qty">{v.stock}</span>
                              </button>
                            );
                          })}
                        </div>
                      </td>

                      <td style={{ textAlign: "right", color: "#64748b" }}>
                        {formatINR(costPrice)}
                      </td>

                      <td style={{ textAlign: "right" }}>
                        <div style={{ fontWeight: 700, color: "#1e293b" }}>
                          {formatINR(minPrice)}
                        </div>
                        <span className="margin-hint">{marginPct}% margin</span>
                      </td>

                      <td style={{ textAlign: "center" }}>
                        <span
                          className={`stock-badge ${
                            totalStock === 0
                              ? "out"
                              : totalStock <= 5
                              ? "low"
                              : "ok"
                          }`}
                        >
                          {totalStock} pairs
                        </span>
                      </td>

                      <td style={{ textAlign: "center" }}>
                        <div style={{ display: "flex", gap: "6px", justifyContent: "center" }}>
                          <button
                            className="btn-tiny"
                            onClick={() => handleOpenAdjust(prod, prod.variants[0])}
                            title="Adjust Stock"
                          >
                            Adjust
                          </button>
                          <button
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
                      setNewProd({ ...newProd, article_no: e.target.value })
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
                    <option value="Men">Men</option>
                    <option value="Women">Women</option>
                    <option value="Kids">Kids</option>
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

      {/* MODAL: QUICK ADJUST STOCK */}
      {isAdjustOpen && adjustTarget && (
        <div className="modal-backdrop" onClick={() => setIsAdjustOpen(false)}>
          <div
            className="modal-content adjust-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <div>
                <h3>Quick Stock Adjustment</h3>
                <p>
                  {adjustTarget.productName} ({adjustTarget.articleNo})
                </p>
              </div>
              <button
                className="btn-close"
                onClick={() => setIsAdjustOpen(false)}
              >
                <X size={18} />
              </button>
            </div>

            <div className="adjust-modal-body">
              <div className="current-stock-callout">
                <span>Selected Size:</span>
                <strong>Size {adjustTarget.size}</strong>
                <span>Current Stock:</span>
                <strong>{adjustTarget.currentStock} pairs</strong>
              </div>

              <div className="form-field" style={{ marginTop: "16px" }}>
                <label>Stock Change (Quantity Delta)</label>
                <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                  <input
                    type="number"
                    value={adjustDelta}
                    onChange={(e) => setAdjustDelta(Number(e.target.value))}
                    className="delta-input"
                  />
                  <div className="delta-presets">
                    <button
                      type="button"
                      className="btn-chip"
                      onClick={() => setAdjustDelta(5)}
                    >
                      +5 Restock
                    </button>
                    <button
                      type="button"
                      className="btn-chip"
                      onClick={() => setAdjustDelta(10)}
                    >
                      +10 Restock
                    </button>
                    <button
                      type="button"
                      className="btn-chip danger"
                      onClick={() => setAdjustDelta(-1)}
                    >
                      -1 Damaged
                    </button>
                  </div>
                </div>
                <div className="sub-text" style={{ marginTop: "5px" }}>
                  New Stock will be:{" "}
                  <strong>
                    {Math.max(0, adjustTarget.currentStock + Number(adjustDelta))}{" "}
                    pairs
                  </strong>
                </div>
              </div>

              <div className="form-field" style={{ marginTop: "14px" }}>
                <label>Reason / Note</label>
                <select
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                >
                  <option value="Restock Delivery">Restock Delivery / Shipment</option>
                  <option value="Damaged / Defect">Damaged / Manufacturer Defect</option>
                  <option value="Inventory Audit">Physical Inventory Audit</option>
                  <option value="Customer Return">Customer Return</option>
                </select>
              </div>
            </div>

            <div className="modal-footer">
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setIsAdjustOpen(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn-primary"
                onClick={handleApplyAdjust}
              >
                <Check size={16} /> Update Stock
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
