import React, { useMemo, useState, useEffect } from "react";
import { X, Search, Plus, Minus, Package } from "lucide-react";
import { formatINR } from "../utils/calculations.js";

export default function ProductDetailsModal({ product, onClose, onAddToBill }) {
  const variants = useMemo(
    () => (Array.isArray(product?.variants) ? product.variants : []),
    [product?.variants]
  );

  const [selectedSize, setSelectedSize] = useState("");
  const [selectedVariantId, setSelectedVariantId] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [sizeSearch, setSizeSearch] = useState("");

  // First choose a size. Only colours stocked for that size are then offered.
  const availableSizes = useMemo(() => {
    const sizes = [...new Set(variants.map((variant) => String(variant.size ?? "").trim()).filter(Boolean))];
    return sizes.sort((a, b) => {
      const na = Number(a);
      const nb = Number(b);
      if (Number.isFinite(na) && Number.isFinite(nb)) return na - nb;
      return a.localeCompare(b, undefined, { numeric: true });
    });
  }, [variants]);

  const filteredSizes = useMemo(() => {
    const search = sizeSearch.trim().toLowerCase();
    return search
      ? availableSizes.filter((size) => size.toLowerCase().includes(search))
      : availableSizes;
  }, [availableSizes, sizeSearch]);

  const variantsForSize = useMemo(
    () => variants.filter((variant) => String(variant.size ?? "").trim() === selectedSize),
    [variants, selectedSize]
  );

  const availableColorsForSize = useMemo(() => {
    const seen = new Set();
    return variantsForSize
      .map((variant) => String(variant.color || "Standard").trim())
      .filter((color) => {
        const key = color.toLowerCase();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
  }, [variantsForSize]);

  const selectedVariant = useMemo(
    () => variantsForSize.find((variant) => variant.id === selectedVariantId) || null,
    [variantsForSize, selectedVariantId]
  );

  const availableStock = Math.max(0, Number(selectedVariant?.stock) || 0);
  const maxQuantity = availableStock;
  const totalPrice = selectedVariant
    ? (Number(selectedVariant.selling_price) || 0) * quantity
    : 0;

  useEffect(() => {
    // If the product changes while the modal remains mounted, clear stale selections.
    setSelectedSize("");
    setSelectedVariantId(null);
    setQuantity(1);
    setSizeSearch("");
  }, [product?.id]);

  const handleSizeChange = (size) => {
    setSelectedSize(size);
    const sizeVariants = variants.filter(
      (variant) => String(variant.size ?? "").trim() === size
    );
    // Auto-select first in-stock variant for this size so Add to Bill is immediately enabled
    const inStock = sizeVariants.find((v) => (Number(v.stock) || 0) > 0) || sizeVariants[0];
    setSelectedVariantId(inStock?.id ?? null);
    setQuantity(1);
  };

  const handleColorChange = (color) => {
    const matchingVariant = variantsForSize.find(
      (variant) => String(variant.color || "Standard").trim() === color
    );
    setSelectedVariantId(matchingVariant?.id ?? null);
    setQuantity(1);
  };

  const handleQuantityInput = (rawValue) => {
    if (rawValue === "") {
      setQuantity("");
      return;
    }
    const value = Number(rawValue);
    if (Number.isInteger(value) && value >= 1 && value <= maxQuantity) {
      setQuantity(value);
    }
  };

  const handleAddToBill = () => {
    const finalQuantity = Number(quantity);
    if (!selectedVariant || availableStock <= 0) return;
    if (!Number.isInteger(finalQuantity) || finalQuantity < 1 || finalQuantity > availableStock) {
      alert(`Enter a quantity between 1 and ${availableStock}.`);
      return;
    }

    onAddToBill(selectedVariant, product, finalQuantity);
    onClose();
  };

  const getStockStatus = (variant) => {
    const stock = Math.max(0, Number(variant.stock) || 0);
    if (stock === 0) return "out";
    if (stock <= (Number(variant.reorder_level) || 3)) return "low";
    return "ok";
  };

  const productTaxRate = Number(product?.tax_rate ?? 5);
  const productTotalStock = variants.reduce(
    (sum, variant) => sum + (Number(variant.stock) || 0),
    0
  );

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="product-modal-content"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="product-details-modal-title"
      >
        <div className="product-modal-header">
          <div>
            <h3 id="product-details-modal-title">Product Details & Size Selection</h3>
            <p>Select size to add directly, or customize colour and quantity</p>
          </div>
          <button type="button" className="btn-close" onClick={onClose} aria-label="Close">
            <X size={20} />
          </button>
        </div>

        <div className="product-modal-body">
          <div className="product-info-section">
            <div className="product-info-image">
              {product.image ? (
                <img
                  src={product.image}
                  alt={product.name}
                  style={{ width: "100%", height: "100%", objectFit: "contain", borderRadius: "8px" }}
                  onError={(e) => {
                    e.currentTarget.style.display = "none";
                  }}
                />
              ) : (
                <Package size={48} strokeWidth={1.5} />
              )}
            </div>
            <div className="product-info-details">
              <div className="product-info-header">
                <span className="art-pill">{product.article_no}</span>
                <span className="brand-label">{product.brand}</span>
              </div>
              <h4 className="product-modal-name">{product.name}</h4>
              <div className="product-info-meta">
                <span className="product-category-tag">
                  {product.category} • {product.sub_category}
                </span>
                <span className="product-price-tag">
                  {formatINR(variants[0]?.selling_price || product.selling_price || 0)}
                </span>
                <span className="product-tax-tag">{productTaxRate}% GST</span>
              </div>
              <div className="product-total-stock">Total Stock: {productTotalStock} pairs</div>
            </div>
          </div>

          {availableSizes.length > 12 && (
            <div className="size-search-section">
              <div className="size-search-box">
                <Search size={14} />
                <input
                  type="text"
                  placeholder="Search size..."
                  value={sizeSearch}
                  onChange={(event) => setSizeSearch(event.target.value)}
                />
                {sizeSearch && (
                  <button type="button" className="search-clear-btn" onClick={() => setSizeSearch("")}>
                    ✕
                  </button>
                )}
              </div>
            </div>
          )}

          <div className="size-selection-section">
            <label className="section-label">1. Select Size ({filteredSizes.length} sizes):</label>
            <div className="size-grid">
              {filteredSizes.length === 0 ? (
                <div className="no-sizes-message">No sizes match your search.</div>
              ) : (
                filteredSizes.map((size) => {
                  const sizeVariants = variants.filter(
                    (variant) => String(variant.size ?? "").trim() === size
                  );
                  const sizeStock = sizeVariants.reduce(
                    (sum, variant) => sum + Math.max(0, Number(variant.stock) || 0),
                    0
                  );
                  const isSelected = selectedSize === size;
                  return (
                    <button
                      key={size}
                      type="button"
                      disabled={sizeStock <= 0}
                      className={`size-grid-btn ${isSelected ? "selected" : ""} ${sizeStock <= 0 ? "out-of-stock" : ""}`}
                      onClick={() => handleSizeChange(size)}
                      title={`Size ${size} — ${sizeStock} pairs across colours`}
                    >
                      <span className="size-grid-number">{size}</span>
                      <span className="size-grid-stock">
                        {sizeStock <= 0 ? "Out" : `${sizeStock} pcs`}
                      </span>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {selectedSize && (
            <div className="category-selection-section">
              <label className="section-label">2. Select Colour for Size {selectedSize}:</label>
              <div className="category-buttons">
                {availableColorsForSize.map((color) => {
                  const variant = variantsForSize.find(
                    (item) => String(item.color || "Standard").trim() === color
                  );
                  const stock = Math.max(0, Number(variant?.stock) || 0);
                  const status = variant ? getStockStatus(variant) : "out";
                  const isSelected = selectedVariantId === variant?.id;
                  return (
                    <button
                      key={`${selectedSize}-${color}`}
                      type="button"
                      disabled={!variant || stock <= 0}
                      className={`category-select-btn ${isSelected ? "active" : ""} ${stock <= 0 ? "out-of-stock" : ""}`}
                      onClick={() => handleColorChange(color)}
                      title={`${color} — ${stock} pairs available`}
                    >
                      {color}
                      <span style={{ display: "block", fontSize: "10px", opacity: 0.8 }}>
                        {stock <= 0 ? "Out of stock" : status === "low" ? `${stock} left` : `${stock} pairs`}
                      </span>
                    </button>
                  );
                })}
              </div>
              {availableColorsForSize.length === 0 && (
                <div className="no-sizes-message">No colour variants found for this size.</div>
              )}
            </div>
          )}

          {selectedVariant ? (
            <div className="selection-summary">
              <div className="summary-row">
                <span className="summary-label">Selected:</span>
                <span className="summary-value">
                  Size {selectedVariant.size} ({selectedVariant.color || "Standard"})
                </span>
              </div>
              <div className="summary-row">
                <span className="summary-label">Available Stock:</span>
                <span className="summary-value stock-highlight">{availableStock} pairs</span>
              </div>
              <div className="summary-row">
                <span className="summary-label">Price per pair:</span>
                <span className="summary-value">{formatINR(selectedVariant.selling_price)}</span>
              </div>
              <div className="summary-row">
                <span className="summary-label">GST:</span>
                <span className="summary-value">{productTaxRate}%</span>
              </div>
            </div>
          ) : (
            <div className="no-selection-message">
              <Package size={20} />
              <span>
                {!selectedSize
                  ? "Please select a size to continue"
                  : "Please select a colour to continue"}
              </span>
            </div>
          )}

          {selectedVariant && availableStock > 0 && (
            <div className="quantity-section">
              <label className="section-label">3. Quantity:</label>
              <div className="quantity-control">
                <button
                  type="button"
                  className="qty-btn"
                  onClick={() => setQuantity((current) => Math.max(1, (Number(current) || 1) - 1))}
                  disabled={Number(quantity) <= 1}
                  aria-label="Decrease quantity"
                >
                  <Minus size={14} />
                </button>
                <input
                  type="number"
                  className="qty-input"
                  value={quantity}
                  onChange={(event) => handleQuantityInput(event.target.value)}
                  onBlur={() => {
                    if (!Number.isInteger(Number(quantity)) || Number(quantity) < 1) setQuantity(1);
                    else if (Number(quantity) > maxQuantity) setQuantity(maxQuantity);
                  }}
                  min="1"
                  max={maxQuantity}
                />
                <button
                  type="button"
                  className="qty-btn"
                  onClick={() => setQuantity((current) => Math.min(maxQuantity, (Number(current) || 0) + 1))}
                  disabled={Number(quantity) >= maxQuantity}
                  aria-label="Increase quantity"
                >
                  <Plus size={14} />
                </button>
                <span className="qty-max-hint">Max: {maxQuantity}</span>
              </div>
            </div>
          )}
        </div>

        <div className="product-modal-footer">
          <button type="button" className="btn-modal-cancel" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="btn-modal-add"
            onClick={handleAddToBill}
            disabled={!selectedVariant || availableStock <= 0 || !Number.isInteger(Number(quantity)) || Number(quantity) < 1 || Number(quantity) > availableStock}
          >
            Add to Bill
            {selectedVariant && (
              <span className="btn-price-tag">{formatINR(totalPrice)}</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
