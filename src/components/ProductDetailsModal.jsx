import React, { useState, useMemo, useEffect } from "react";
import { X, Search, Plus, Minus, Package } from "lucide-react";
import { formatINR } from "../utils/calculations.js";

export default function ProductDetailsModal({ product, onClose, onAddToBill }) {
  const [selectedColor, setSelectedColor] = useState("");
  const [selectedSize, setSelectedSize] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [sizeSearch, setSizeSearch] = useState("");

  // Extract unique colors from variants
  const availableColors = useMemo(() => {
    const colors = new Set();
    product.variants?.forEach(v => {
      if (v.color) colors.add(v.color);
    });
    return Array.from(colors);
  }, [product.variants]);

  // Initialize selected color
  useEffect(() => {
    if (availableColors.length > 0 && !selectedColor) {
      setSelectedColor(availableColors[0]);
    }
  }, [availableColors, selectedColor]);

  // Filter variants by selected color and search
  const availableVariants = useMemo(() => {
    let filtered = product.variants?.filter(v => v.color === selectedColor) || [];

    // Apply size search filter
    if (sizeSearch.trim()) {
      const searchLower = sizeSearch.toLowerCase().trim();
      filtered = filtered.filter((v) =>
        v.size.toString().toLowerCase().includes(searchLower)
      );
    }

    return filtered;
  }, [product.variants, selectedColor, sizeSearch]);

  // Get selected variant details
  const selectedVariant = selectedSize
    ? product.variants?.find((v) => v.id === selectedSize)
    : null;

  const availableStock = selectedVariant?.stock || 0;
  const maxQuantity = Math.max(1, availableStock);

  // Handle quantity change
  const handleQuantityChange = (delta) => {
    const newQty = quantity + delta;
    if (newQty >= 1 && newQty <= maxQuantity) {
      setQuantity(newQty);
    }
  };

  // Handle color change
  const handleColorChange = (color) => {
    setSelectedColor(color);
    setSelectedSize(null);
    setQuantity(1);
  };

  // Handle add to bill
  const handleAddToBill = () => {
    if (!selectedVariant || availableStock <= 0) return;

    onAddToBill(selectedVariant, product, quantity);
    onClose();
  };

  // Calculate total price
  const totalPrice = selectedVariant
    ? (selectedVariant.selling_price || 0) * quantity
    : 0;

  // Determine stock status for a variant
  const getStockStatus = (variant) => {
    const stock = variant.stock || 0;
    if (stock === 0) return "out";
    if (stock <= (variant.reorder_level || 3)) return "low";
    return "ok";
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="product-modal-content"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="product-modal-header">
          <div>
            <h3>Product Details & Size Selection</h3>
            <p>Select color, size and quantity to add to bill</p>
          </div>
          <button
            type="button"
            className="btn-close"
            onClick={onClose}
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="product-modal-body">
          {/* Product Info Section */}
          <div className="product-info-section">
            <div className="product-info-image">
              <Package size={48} strokeWidth={1.5} />
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
                  {formatINR(product.variants?.[0]?.selling_price || 0)}
                </span>
                <span className="product-tax-tag">
                  {product.tax_rate}% GST
                </span>
              </div>
              <div className="product-total-stock">
                Total Stock: {product.variants?.reduce((sum, v) => sum + (v.stock || 0), 0) || 0} pairs
              </div>
            </div>
          </div>

          {/* Color Selection */}
          {availableColors.length > 1 && (
            <div className="category-selection-section">
              <label className="section-label">Select Color:</label>
              <div className="category-buttons">
                {availableColors.map((color) => (
                  <button
                    key={color}
                    type="button"
                    className={`category-select-btn ${
                      selectedColor === color ? "active" : ""
                    }`}
                    onClick={() => handleColorChange(color)}
                  >
                    {color}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Size Search (when many sizes) */}
          {availableVariants.length > 12 && (
            <div className="size-search-section">
              <div className="size-search-box">
                <Search size={14} />
                <input
                  type="text"
                  placeholder="Search size..."
                  value={sizeSearch}
                  onChange={(e) => setSizeSearch(e.target.value)}
                />
                {sizeSearch && (
                  <button
                    className="search-clear-btn"
                    onClick={() => setSizeSearch("")}
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Size Selection Grid */}
          <div className="size-selection-section">
            <label className="section-label">
              Select Size ({availableVariants.length} available):
            </label>
            <div className="size-grid">
              {availableVariants.length === 0 ? (
                <div className="no-sizes-message">
                  No sizes available for {selectedColor}
                </div>
              ) : (
                availableVariants.map((variant) => {
                  const stockStatus = getStockStatus(variant);
                  const isSelected = selectedSize === variant.id;
                  const isOutOfStock = stockStatus === "out";

                  return (
                    <button
                      key={variant.id}
                      type="button"
                      disabled={isOutOfStock}
                      className={`size-grid-btn ${
                        isSelected ? "selected" : ""
                      } ${stockStatus === "low" ? "low-stock" : ""} ${
                        isOutOfStock ? "out-of-stock" : ""
                      }`}
                      onClick={() => {
                        setSelectedSize(variant.id);
                        setQuantity(1);
                      }}
                      title={`Size ${variant.size} (${variant.color}) - Stock: ${variant.stock} pairs`}
                    >
                      <span className="size-grid-number">{variant.size}</span>
                      <span className="size-grid-color">{variant.color}</span>
                      <span className="size-grid-stock">
                        {stockStatus === "out" ? (
                          "Out"
                        ) : stockStatus === "low" ? (
                          <span className="low-badge">{variant.stock} left</span>
                        ) : (
                          `${variant.stock} pcs`
                        )}
                      </span>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Selection Summary */}
          {selectedVariant ? (
            <div className="selection-summary">
              <div className="summary-row">
                <span className="summary-label">Selected:</span>
                <span className="summary-value">
                  Size {selectedVariant.size} ({selectedVariant.color})
                </span>
              </div>
              <div className="summary-row">
                <span className="summary-label">Available Stock:</span>
                <span className="summary-value stock-highlight">
                  {availableStock} pairs
                </span>
              </div>
              <div className="summary-row">
                <span className="summary-label">Price per pair:</span>
                <span className="summary-value">
                  {formatINR(selectedVariant.selling_price)}
                </span>
              </div>
              <div className="summary-row">
                <span className="summary-label">GST:</span>
                <span className="summary-value">{product.tax_rate}%</span>
              </div>
            </div>
          ) : (
            <div className="no-selection-message">
              <Package size={20} />
              <span>Please select a size to continue</span>
            </div>
          )}

          {/* Quantity Selector */}
          {selectedVariant && availableStock > 0 && (
            <div className="quantity-section">
              <label className="section-label">Quantity:</label>
              <div className="quantity-control">
                <button
                  type="button"
                  className="qty-btn"
                  onClick={() => handleQuantityChange(-1)}
                  disabled={quantity <= 1}
                  aria-label="Decrease quantity"
                >
                  <Minus size={14} />
                </button>
                <input
                  type="number"
                  className="qty-input"
                  value={quantity}
                  onChange={(e) => {
                    const val = parseInt(e.target.value, 10);
                    if (!isNaN(val) && val >= 1 && val <= maxQuantity) {
                      setQuantity(val);
                    }
                  }}
                  min="1"
                  max={maxQuantity}
                />
                <button
                  type="button"
                  className="qty-btn"
                  onClick={() => handleQuantityChange(1)}
                  disabled={quantity >= maxQuantity}
                  aria-label="Increase quantity"
                >
                  <Plus size={14} />
                </button>
                <span className="qty-max-hint">Max: {maxQuantity}</span>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="product-modal-footer">
          <button
            type="button"
            className="btn-modal-cancel"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            type="button"
            className="btn-modal-add"
            onClick={handleAddToBill}
            disabled={!selectedVariant || availableStock <= 0}
          >
            Add to Bill
            {selectedVariant && (
              <span className="btn-price-tag">
                {formatINR(totalPrice)}
              </span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
