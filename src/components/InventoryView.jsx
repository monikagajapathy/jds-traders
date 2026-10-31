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
  Copy,
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
  Camera,
  Settings,
  Calendar,
  ChevronDown,
  ArrowLeft,
  Eye,
  Save,
} from "lucide-react";
import { useStore } from "../context/StoreContext.jsx";
import { formatINR } from "../utils/calculations.js";
import Code128Barcode from "./Code128Barcode.jsx";
import { generateUniqueVariantBarcode } from "../utils/barcode.js";

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
  const [selectedProductId, setSelectedProductId] = useState(null);
  const [editingStockVariantId, setEditingStockVariantId] = useState(null);
  const [stockQuantityDraft, setStockQuantityDraft] = useState("");
  const [barcodePreview, setBarcodePreview] = useState(null);
  const [barcodeCopied, setBarcodeCopied] = useState(false);

  const copyVariantBarcode = async () => {
    const value = barcodePreview?.variant?.barcode;
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      setBarcodeCopied(true);
      window.setTimeout(() => setBarcodeCopied(false), 1600);
    } catch {
      alert("Clipboard access was blocked by the browser. Please select and copy the barcode text.");
    }
  };

  const printVariantBarcode = () => {
    if (!barcodePreview?.variant?.barcode) return;
    const svg = document.getElementById("variant-barcode-svg")?.outerHTML;
    if (!svg) return;
    const { product, variant } = barcodePreview;
    const printWindow = window.open("", "_blank", "width=520,height=420");
    if (!printWindow) {
      alert("Please allow pop-ups to print the barcode label.");
      return;
    }
    printWindow.document.write(`<!doctype html><html><head><title>Barcode Label</title><style>
      @page { size: 70mm 45mm; margin: 4mm; }
      * { box-sizing: border-box; } body { margin: 0; font-family: Arial, sans-serif; color: #111827; }
      .label { width: 62mm; text-align: center; padding: 2mm; }
      .name { font-size: 11pt; font-weight: 700; margin-bottom: 2mm; }
      .meta { font-size: 8pt; margin-bottom: 2mm; }
      svg { width: 100%; height: auto; }
      .code { font-family: monospace; font-size: 9pt; margin-top: 1mm; letter-spacing: .5px; }
      @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
    </style></head><body><div class="label">
      <div class="name">${String(product.name || "").replace(/[&<>"]/g, "")}</div>
      <div class="meta">${String(product.article_no || "").replace(/[&<>"]/g, "")} · Size ${String(variant.size || "").replace(/[&<>"]/g, "")} · ${String(variant.color || "Standard").replace(/[&<>"]/g, "")}</div>
      ${svg}
      <div class="code">${String(variant.barcode).replace(/[&<>"]/g, "")}</div>
    </div><script>window.onload=()=>{window.print();window.close();};</script></body></html>`);
    printWindow.document.close();
  };

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
  const [pendingVariantFocusId, setPendingVariantFocusId] = useState(null);
  const [editingAdjustReason, setEditingAdjustReason] = useState("Restock Delivery");
  const [editingAdjustNote, setEditingAdjustNote] = useState("");

  // After adding a size, scroll its row into view and focus the size field.
  // requestAnimationFrame lets the browser finish laying out the newly rendered row.
  useEffect(() => {
    if (!pendingVariantFocusId || !editingProd) return;

    const frameId = window.requestAnimationFrame(() => {
      const row = document.getElementById(
        `editing-variant-row-${pendingVariantFocusId}`
      );
      const sizeInput = document.getElementById(
        `editing-variant-size-${pendingVariantFocusId}`
      );

      if (!row || !sizeInput) return;

      row.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "nearest" });
      sizeInput.focus({ preventScroll: true });
      sizeInput.select();
      setPendingVariantFocusId(null);
    });

    return () => window.cancelAnimationFrame(frameId);
  }, [editingProd, pendingVariantFocusId]);

  // Dedicated stock workflows: incoming stock and quantity correction are separate operations.
  const [stockOperationMode, setStockOperationMode] = useState(null); // "add" | "edit"
  const [stockOperationProduct, setStockOperationProduct] = useState(null);
  const [stockOperationDrafts, setStockOperationDrafts] = useState({});
  const [stockOperationReason, setStockOperationReason] = useState("Restock Delivery");
  const [stockOperationNote, setStockOperationNote] = useState("");

  const openStockOperation = (product, mode) => {
    if (!product) return;
    setStockOperationProduct(product);
    setStockOperationMode(mode);
    const variants = Array.isArray(product.variants) ? product.variants : [];
    if (variants.length === 0) {
      alert("This product has no size variants. Add a size before adjusting stock.");
      return;
    }
    setStockOperationDrafts(
      Object.fromEntries(variants.map((variant) => [
        variant.id,
        mode === "add" ? "0" : String(Number(variant.stock) || 0),
      ]))
    );
    setStockOperationReason(mode === "add" ? "Restock Delivery" : "Physical Inventory Audit");
    setStockOperationNote("");
  };

  const closeStockOperation = () => {
    setStockOperationMode(null);
    setStockOperationProduct(null);
    setStockOperationDrafts({});
    setStockOperationNote("");
  };

  const saveStockOperation = (event) => {
    event.preventDefault();
    if (!stockOperationProduct || !stockOperationMode) return;

    const adjustments = stockOperationProduct.variants
      .map((variant) => {
        const rawValue = stockOperationDrafts[variant.id] ?? "0";
        const entered = Number(rawValue);
        if (!Number.isInteger(entered) || entered < 0) return null;
        if (stockOperationMode === "add") {
          return entered > 0
            ? { variantId: variant.id, newStock: (Number(variant.stock) || 0) + entered }
            : null;
        }
        return { variantId: variant.id, newStock: entered };
      });

    if (adjustments.some((item, index) => {
      const rawValue = Number(stockOperationDrafts[stockOperationProduct.variants[index].id] ?? "0");
      return !Number.isInteger(rawValue) || rawValue < 0;
    })) {
      alert("Enter a whole number of pairs (zero or more) for every size.");
      return;
    }

    const validAdjustments = adjustments.filter(Boolean);
    if (!validAdjustments.length) {
      alert(stockOperationMode === "add"
        ? "Enter at least one incoming quantity."
        : "No size quantities were provided.");
      return;
    }

    bulkAdjustStock(
      stockOperationProduct.id,
      validAdjustments,
      stockOperationReason,
      stockOperationNote
    );
    closeStockOperation();
  };

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
    const usedBarcodes = new Set(products.flatMap((product) => (product.variants || []).map((variant) => variant.barcode).filter(Boolean)));
    const usedNumericSizes = prod.variants
      .map((variant) => String(variant.size).trim())
      .filter((size) => /^\d+(\.\d+)?$/.test(size))
      .map(Number);
    let nextSizeNumber = 1;
    while (usedNumericSizes.some((size) => size === nextSizeNumber)) {
      nextSizeNumber += 1;
    }
    const nextSize = String(nextSizeNumber);

    setNewSizeForm({
      size: nextSize,
      color: firstVar?.color || "Standard",
      cost_price: firstVar?.cost_price || 600,
      selling_price: firstVar?.selling_price || 1199,
      stock: 6,
      barcode: generateUniqueVariantBarcode(usedBarcodes),
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

    const result = addVariantToProduct(sizeTargetProduct.id, {
      size: newSizeForm.size.trim(),
      color: newSizeForm.color || "Standard",
      cost_price: Number(newSizeForm.cost_price) || 0,
      selling_price: Number(newSizeForm.selling_price) || 0,
      stock: Math.max(0, Number(newSizeForm.stock) || 0),
      barcode: newSizeForm.barcode?.trim() || `890${Math.floor(100000000 + Math.random() * 900000000)}`,
      reorder_level: Number(newSizeForm.reorder_level) || 3,
    });

    if (result?.success === false) {
      alert(result.message || "Unable to add this size. Check whether it already exists.");
      return;
    }

    setIsAddSizeOpen(false);
    setSizeTargetProduct(null);
  };

  // Dynamic Dropdown Lists for Category, Footwear Type, and GST Rate
  const [categoriesList, setCategoriesList] = useState([
    "Gents",
    "Ladies",
    "Boys",
    "Girls",
    "Infant",
  ]);
  const [footwearTypesList, setFootwearTypesList] = useState([
    "Casual",
    "Formal",
    "Sports",
    "Sandals",
    "Boots",
    "Ethnic",
    "Slippers",
  ]);
  const [gstRatesList, setGstRatesList] = useState([0, 5, 12, 18, 28]);

  // Dynamic inline add popover state: { type: 'category' | 'type' | 'gst', target: 'new' | 'edit', value: '' }
  const [dynamicAddModal, setDynamicAddModal] = useState(null);

  // Photo-Accurate Add Item Modal States (Vyapar / ERP Layout)
  const [addItemType, setAddItemType] = useState("product"); // 'product' | 'service'
  const [addItemTab, setAddItemTab] = useState("stock"); // 'stock' | 'pricing' | 'online' (stock active as in photo)

  const defaultNewProdTemplate = {
    article_no: "",
    name: "",
    hsn: "64041190",
    unit: "Pairs",
    image_url: "",
    brand: "Sparx",
    category: "Gents",
    sub_category: "Casual",
    color: "Black, White",
    cost_price: 520,
    selling_price: 850,
    tax_rate: 5,
    opening_qty: 37,
    batch_no: "BAT-2026-A",
    as_of_date: new Date().toISOString().slice(0, 10),
    min_stock: 3,
    location: "Rack A-12",
    barcode: "",
    description: "",
    gst_inclusive: false,
    availableColors: ["Black"],
    availableSizes: ["6", "7", "8", "9", "10"],
    variants: [
      { size: "6", color: "Black", cost_price: 520, selling_price: 850, stock: 7 },
      { size: "7", color: "Black", cost_price: 520, selling_price: 850, stock: 10 },
      { size: "8", color: "Black", cost_price: 520, selling_price: 850, stock: 10 },
      { size: "9", color: "Black", cost_price: 520, selling_price: 850, stock: 6 },
      { size: "10", color: "Black", cost_price: 520, selling_price: 850, stock: 4 },
    ],
    priceOverrides: [], // { color: string, size: string | null, selling_price: number, cost_price: number }
  };

  const [newProd, setNewProd] = useState(defaultNewProdTemplate);

  // Color management functions
  const handleAddColor = (colorName) => {
    if (!colorName || !colorName.trim()) return;
    const trimmed = colorName.trim();
    if (newProd.availableColors.includes(trimmed)) {
      alert("This color already exists");
      return;
    }
    
    const updatedColors = [...newProd.availableColors, trimmed];
    const newVariants = [];
    
    // Create variants for the new color across all sizes
    newProd.availableSizes.forEach(size => {
      newVariants.push({
        size,
        color: trimmed,
        cost_price: newProd.cost_price,
        selling_price: newProd.selling_price,
        stock: 0,
      });
    });
    
    setNewProd({
      ...newProd,
      availableColors: updatedColors,
      variants: [...newProd.variants, ...newVariants],
    });
  };

  const handleRemoveColor = (colorName) => {
    const hasStock = newProd.variants.some(v => v.color === colorName && v.stock > 0);
    if (hasStock) {
      alert("Cannot remove a color that has stock. Please adjust stock to zero first.");
      return;
    }
    
    setNewProd({
      ...newProd,
      availableColors: newProd.availableColors.filter(c => c !== colorName),
      variants: newProd.variants.filter(v => v.color !== colorName),
      priceOverrides: newProd.priceOverrides.filter(o => o.color !== colorName),
    });
  };

  const handleAddSize = (sizeName) => {
    if (!sizeName || !sizeName.trim()) return;
    const trimmed = sizeName.trim();
    if (newProd.availableSizes.includes(trimmed)) {
      alert("This size already exists");
      return;
    }
    
    const updatedSizes = [...newProd.availableSizes, trimmed].sort((a, b) => {
      const numA = parseFloat(a);
      const numB = parseFloat(b);
      if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
      return a.localeCompare(b);
    });
    
    const newVariants = [];
    
    // Create variants for the new size across all colors
    newProd.availableColors.forEach(color => {
      newVariants.push({
        size: trimmed,
        color,
        cost_price: newProd.cost_price,
        selling_price: newProd.selling_price,
        stock: 0,
      });
    });
    
    setNewProd({
      ...newProd,
      availableSizes: updatedSizes,
      variants: [...newProd.variants, ...newVariants],
    });
  };

  const handleRemoveSize = (sizeName) => {
    const hasStock = newProd.variants.some(v => v.size === sizeName && v.stock > 0);
    if (hasStock) {
      alert("Cannot remove a size that has stock. Please adjust stock to zero first.");
      return;
    }
    
    setNewProd({
      ...newProd,
      availableSizes: newProd.availableSizes.filter(s => s !== sizeName),
      variants: newProd.variants.filter(v => v.size !== sizeName),
      priceOverrides: newProd.priceOverrides.filter(o => o.size !== sizeName),
    });
  };

  // Update stock for a specific color-size combination
  const handleMatrixStockChange = (size, color, newStock) => {
    const stock = Math.max(0, parseInt(newStock) || 0);
    setNewProd({
      ...newProd,
      variants: newProd.variants.map(v =>
        v.size === size && v.color === color ? { ...v, stock } : v
      ),
    });
  };

  // Get stock for a specific color-size combination
  const getMatrixStock = (size, color) => {
    const variant = newProd.variants.find(v => v.size === size && v.color === color);
    return variant ? variant.stock : 0;
  };

  // Calculate totals
  const getColorTotal = (color) => {
    return newProd.variants
      .filter(v => v.color === color)
      .reduce((sum, v) => sum + (v.stock || 0), 0);
  };

  const getSizeTotal = (size) => {
    return newProd.variants
      .filter(v => v.size === size)
      .reduce((sum, v) => sum + (v.stock || 0), 0);
  };

  const getGrandTotal = () => {
    return newProd.variants.reduce((sum, v) => sum + (v.stock || 0), 0);
  };

  // Price override management
  const handleAddPriceOverride = () => {
    const color = prompt("Enter color for price override (or leave blank for all colors):");
    const size = prompt("Enter size for price override (or leave blank for all sizes):");
    const sellingPrice = prompt("Enter selling price override:", newProd.selling_price);
    const costPrice = prompt("Enter cost price override:", newProd.cost_price);
    
    if (sellingPrice === null) return;
    
    const override = {
      color: color?.trim() || null,
      size: size?.trim() || null,
      selling_price: parseFloat(sellingPrice) || newProd.selling_price,
      cost_price: parseFloat(costPrice) || newProd.cost_price,
    };
    
    setNewProd({
      ...newProd,
      priceOverrides: [...newProd.priceOverrides, override],
    });
  };

  const handleRemovePriceOverride = (index) => {
    setNewProd({
      ...newProd,
      priceOverrides: newProd.priceOverrides.filter((_, i) => i !== index),
    });
  };

  // Get effective price for a variant (considering overrides)
  const getEffectivePrice = (size, color, priceType = 'selling') => {
    const basePrice = priceType === 'selling' ? newProd.selling_price : newProd.cost_price;
    
    // Check for exact size-color match
    const exactMatch = newProd.priceOverrides.find(o => o.size === size && o.color === color);
    if (exactMatch) return priceType === 'selling' ? exactMatch.selling_price : exactMatch.cost_price;
    
    // Check for color-only match
    const colorMatch = newProd.priceOverrides.find(o => o.color === color && !o.size);
    if (colorMatch) return priceType === 'selling' ? colorMatch.selling_price : colorMatch.cost_price;
    
    // Check for size-only match
    const sizeMatch = newProd.priceOverrides.find(o => o.size === size && !o.color);
    if (sizeMatch) return priceType === 'selling' ? sizeMatch.selling_price : sizeMatch.cost_price;
    
    return basePrice;
  };

  // Open Combined Edit Product & Stock Adjustment Modal
  const handleOpenEditProduct = (prod, reason = "Restock Delivery") => {
    const rawColor =
      prod.color ||
      (Array.isArray(prod.colours) ? prod.colours.join(", ") : "") ||
      prod.variants?.[0]?.color ||
      "Black";

    setEditingProd({
      id: prod.id,
      name: prod.name || "",
      article_no: prod.article_no || "",
      brand: prod.brand || "Sparx",
      category: prod.category || "Gents",
      sub_category: prod.sub_category || "Casual",
      color: rawColor,
      tax_rate: prod.tax_rate ?? 5,
      hsn: prod.hsn || prod.hsn_code || "64041190",
      unit: prod.unit || "Pairs",
      location: prod.location || "Rack A-1",
      variants: (Array.isArray(prod.variants) ? prod.variants : []).map((v) => ({
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
    setEditingAdjustReason(reason);
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

    const colorArray = editingProd.color
      ? editingProd.color.split(",").map((c) => c.trim()).filter(Boolean)
      : ["Black"];

    updateProduct(editingProd.id, {
      ...editingProd,
      color: editingProd.color,
      colours: colorArray,
      reason: editingAdjustReason,
      note: editingAdjustNote,
    });
    setIsEditOpen(false);
    setEditingProd(null);
  };

  const handleAddVariantToEditing = () => {
    if (!editingProd) return;

    // Pick the next unused numeric shoe size instead of relying on row count.
    const usedNumericSizes = editingProd.variants
      .map((variant) => String(variant.size).trim())
      .filter((size) => /^\d+(\.\d+)?$/.test(size))
      .map(Number);
    let nextSizeNumber = 1;
    while (usedNumericSizes.some((size) => size === nextSizeNumber)) {
      nextSizeNumber += 1;
    }

    const nextSize = String(nextSizeNumber);
    const usedBarcodes = new Set(
      products.flatMap((product) =>
        (product.variants || []).map((variant) => variant.barcode).filter(Boolean)
      )
    );
    editingProd.variants.forEach((variant) => {
      if (variant.barcode) usedBarcodes.add(variant.barcode);
    });

    const newVariantId =
      typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : `var-${Date.now()}`;

    const newVariant = {
      id: newVariantId,
      size: nextSize,
      color: editingProd.variants[0]?.color || "Standard",
      cost_price: editingProd.variants[0]?.cost_price || 600,
      selling_price: editingProd.variants[0]?.selling_price || 1199,
      stock: 0,
      barcode: generateUniqueVariantBarcode(usedBarcodes),
      sku: `JDS-${editingProd.article_no}-${nextSize}`,
      reorder_level: 3,
    };

    setEditingProd((current) =>
      current ? { ...current, variants: [...current.variants, newVariant] } : current
    );
    setPendingVariantFocusId(newVariantId);
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

  // Helper for dynamic additions (Category, Footwear Type, GST Rate)
  const handleSaveDynamicOption = (e) => {
    e.preventDefault();
    if (!dynamicAddModal || !dynamicAddModal.value.trim()) return;
    const { type, target, value } = dynamicAddModal;
    const cleanVal = value.trim();

    if (type === "category") {
      if (!categoriesList.includes(cleanVal)) {
        setCategoriesList((prev) => [...prev, cleanVal]);
      }
      if (target === "new") {
        setNewProd((prev) => ({ ...prev, category: cleanVal }));
      } else if (target === "edit" && editingProd) {
        setEditingProd((prev) => ({ ...prev, category: cleanVal }));
      }
    } else if (type === "type") {
      if (!footwearTypesList.includes(cleanVal)) {
        setFootwearTypesList((prev) => [...prev, cleanVal]);
      }
      if (target === "new") {
        setNewProd((prev) => ({ ...prev, sub_category: cleanVal }));
      } else if (target === "edit" && editingProd) {
        setEditingProd((prev) => ({ ...prev, sub_category: cleanVal }));
      }
    } else if (type === "gst") {
      const numRate = Number(cleanVal);
      if (!isNaN(numRate) && !gstRatesList.includes(numRate)) {
        setGstRatesList((prev) => [...prev, numRate].sort((a, b) => a - b));
      }
      if (target === "new") {
        setNewProd((prev) => ({ ...prev, tax_rate: numRate }));
      } else if (target === "edit" && editingProd) {
        setEditingProd((prev) => ({ ...prev, tax_rate: numRate }));
      }
    }

    setDynamicAddModal(null);
  };

  // Add Item: Opening quantity distribution
  const handleOpeningQtyChange = (qty) => {
    const total = Math.max(0, Number(qty) || 0);
    const numVars = newProd.variants.length || 5;
    const base = Math.floor(total / numVars);
    const remainder = total % numVars;

    const updated = newProd.variants.map((v, i) => ({
      ...v,
      stock: base + (i < remainder ? 1 : 0),
    }));

    setNewProd({
      ...newProd,
      opening_qty: total,
      variants: updated,
    });
  };

  const handleNewVariantStockChange = (idx, stockVal) => {
    const val = Math.max(0, Number(stockVal) || 0);
    const updated = [...newProd.variants];
    updated[idx] = { ...updated[idx], stock: val };
    const sumTotal = updated.reduce((s, v) => s + (v.stock || 0), 0);
    setNewProd({
      ...newProd,
      opening_qty: sumTotal,
      variants: updated,
    });
  };

  const handleAddSizeToNewProd = () => {
    const nextSize = String(newProd.variants.length + 6);
    const updated = [
      ...newProd.variants,
      {
        size: nextSize,
        color: newProd.color ? newProd.color.split(",")[0].trim() : "Black",
        cost_price: newProd.cost_price,
        selling_price: newProd.selling_price,
        stock: 5,
      },
    ];
    const sumTotal = updated.reduce((s, v) => s + (v.stock || 0), 0);
    setNewProd({
      ...newProd,
      opening_qty: sumTotal,
      variants: updated,
    });
  };

  // Add Item Save & Save and New
  const handleSaveProduct = (andNew = false) => {
    if (!newProd.article_no.trim() || !newProd.name.trim()) {
      alert("Please provide both Item Name and Item Code (Article No).");
      return;
    }

    // Apply price overrides to variants
    const preparedVariants = newProd.variants.map((v) => {
      const effectiveSellingPrice = getEffectivePrice(v.size, v.color, 'selling');
      const effectiveCostPrice = getEffectivePrice(v.size, v.color, 'cost');
      
      return {
        ...v,
        cost_price: effectiveCostPrice,
        selling_price: effectiveSellingPrice,
        stock: Math.max(0, Number(v.stock) || 0),
      };
    });

    const prodToSave = {
      ...newProd,
      color: newProd.availableColors.join(", "),
      colours: newProd.availableColors,
      variants: preparedVariants,
      opening_qty: getGrandTotal(),
    };

    addProduct(prodToSave);

    if (andNew) {
      const randomNum = Math.floor(100 + Math.random() * 900);
      const prefix = (newProd.brand?.slice(0, 2) || "FW").toUpperCase();
      setNewProd({
        ...defaultNewProdTemplate,
        article_no: `${prefix}-${randomNum}`,
      });
      setAddItemTab("stock");
    } else {
      setIsAddOpen(false);
      setNewProd({ ...defaultNewProdTemplate });
    }
  };

  // Calculate high-level inventory totals (Issue 5: low-stock detection)
  const stats = useMemo(() => {
    let totalPairs = 0;
    let totalCostVal = 0;
    let totalRetailVal = 0;
    let lowStockCount = 0;

    products.forEach((p) => {
      const variants = Array.isArray(p?.variants) ? p.variants : [];
      const prodTotalStock = variants.reduce((s, v) => s + (Number(v.stock) || 0), 0);
      let isProductLow = false;

      if (thresholdMode === "per-size") {
        isProductLow = variants.some((v) => (Number(v.stock) || 0) <= lowStockThreshold);
      } else {
        isProductLow = prodTotalStock <= lowStockThreshold;
      }

      if (isProductLow) {
        lowStockCount++;
      }

      variants.forEach((v) => {
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
      const variants = Array.isArray(prod?.variants) ? prod.variants : [];
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
      const totalStock = variants.reduce((s, v) => s + (Number(v.stock) || 0), 0);
      if (stockFilter === "Low") {
        const isLow =
          thresholdMode === "per-size"
            ? variants.some((v) => (Number(v.stock) || 0) <= lowStockThreshold)
            : totalStock <= lowStockThreshold;
        if (!isLow) return false;
      }
      if (stockFilter === "Out" && totalStock > 0) return false;
      if (stockFilter === "In" && totalStock === 0) return false;

      // Query filter
      if (!query.trim()) return true;
      const q = query.toLowerCase().trim();
      return (
        String(prod.name || "").toLowerCase().includes(q) ||
        String(prod.article_no || "").toLowerCase().includes(q) ||
        String(prod.brand || "").toLowerCase().includes(q) ||
        variants.some(
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

  const selectedProduct = products.find((product) => product.id === selectedProductId) || null;

  const beginSizeStockEdit = (variant) => {
    setEditingStockVariantId(variant.id);
    setStockQuantityDraft(String(Number(variant.stock) || 0));
  };

  const cancelSizeStockEdit = () => {
    setEditingStockVariantId(null);
    setStockQuantityDraft("");
  };

  const saveSizeStockEdit = (variant) => {
    const nextQuantity = Number(stockQuantityDraft);
    if (!Number.isInteger(nextQuantity) || nextQuantity < 0) {
      alert("Enter a valid whole-number quantity (0 or greater).");
      return;
    }
    const currentQuantity = Number(variant.stock) || 0;
    if (nextQuantity !== currentQuantity) {
      bulkAdjustStock(
        selectedProduct.id,
        [{ variantId: variant.id, newStock: nextQuantity }],
        "Physical Inventory Audit",
        `Size ${variant.size}, ${variant.color || "Standard"}: ${currentQuantity} → ${nextQuantity}`
      );
    }
    cancelSizeStockEdit();
  };

  return (
    <div className="inventory-container">
      {selectedProduct ? (
        <section className="stock-product-details-page">
          <div className="stock-details-breadcrumb">
            <button type="button" onClick={() => setSelectedProductId(null)}>
              <ArrowLeft size={15} /> Back to Stock Control
            </button>
            <span>/</span><span>Product Details</span>
          </div>

          <div className="stock-details-heading">
            <div>
              <h2>{selectedProduct.name}</h2>
              <p>{selectedProduct.brand} <span>·</span> {selectedProduct.category} <span>·</span> {selectedProduct.sub_category}</p>
              <span className="stock-details-article">Article: {selectedProduct.article_no}</span>
            </div>
            {isAdmin && (
              <div className="stock-details-actions">
                <button type="button" className="stock-secondary-action" onClick={() => handleOpenEditProduct(selectedProduct, "Product Details Edit")}>
                  <Edit2 size={14} /> Edit Product
                </button>
                <button type="button" className="stock-secondary-action" onClick={() => openStockOperation(selectedProduct, "add")}>
                  <PackagePlus size={14} /> Add Stock
                </button>
                <button type="button" className="stock-primary-action" onClick={() => openStockOperation(selectedProduct, "edit")}>
                  <SlidersHorizontal size={14} /> Edit Stock
                </button>
              </div>
            )}
          </div>

          <div className="stock-detail-metrics">
            <div><span>Total Stock</span><strong>{selectedProduct.variants.reduce((sum, variant) => sum + (Number(variant.stock) || 0), 0)} <small>pairs</small></strong></div>
            <div><span>Cost Price</span><strong>{formatINR(selectedProduct.variants[0]?.cost_price || 0)}</strong><small>per pair</small></div>
            <div><span>Selling Price</span><strong>{formatINR(selectedProduct.variants[0]?.selling_price || 0)}</strong><small>per pair</small></div>
            <div><span>Stock Value</span><strong>{formatINR(selectedProduct.variants.reduce((sum, variant) => sum + ((Number(variant.stock) || 0) * (Number(variant.cost_price) || 0)), 0))}</strong></div>
          </div>

          <div className="stock-details-content-grid">
            <section className="panel stock-size-detail-panel">
              <div className="stock-detail-section-heading">
                <div><h3>Size-wise Inventory</h3><p>Manage quantities for each size and color independently.</p></div>
                <span>{selectedProduct.variants.length} variants</span>
              </div>
              <div className="stock-detail-table-scroll">
                <table className="custom-table stock-detail-table">
                  <thead><tr><th>Size</th><th>Color</th><th>SKU / Barcode</th><th className="center-cell">Available Stock</th><th>Status</th>{isAdmin && <th className="center-cell">Actions</th>}</tr></thead>
                  <tbody>
                    {selectedProduct.variants.map((variant) => {
                      const quantity = Number(variant.stock) || 0;
                      const low = quantity > 0 && quantity <= (Number(variant.reorder_level) || lowStockThreshold);
                      const out = quantity === 0;
                      const isEditing = editingStockVariantId === variant.id;
                      return (
                        <tr key={variant.id}>
                          <td><strong>{variant.size}</strong></td>
                          <td>{variant.color || "Standard"}</td>
                          <td>
                            <div className="variant-barcode-cell">
                              <code>{variant.barcode || "Barcode pending"}</code>
                              <button type="button" className="variant-barcode-preview-button"
                                onClick={() => { setBarcodeCopied(false); setBarcodePreview({ product: selectedProduct, variant }); }}
                                disabled={!variant.barcode}>
                                <Eye size={12} /> Preview
                              </button>
                            </div>
                          </td>
                          <td className="center-cell">
                            {isEditing ? (
                              <input className="stock-inline-quantity" type="number" min="0" step="1" value={stockQuantityDraft}
                                onChange={(event) => setStockQuantityDraft(event.target.value)}
                                aria-label={`New quantity for size ${variant.size}`} autoFocus />
                            ) : <strong>{quantity} <small>pairs</small></strong>}
                          </td>
                          <td><span className={`stock-status-tag ${out ? "out" : low ? "low" : "healthy"}`}><i />{out ? "Out of Stock" : low ? "Low Stock" : "In Stock"}</span></td>
                          {isAdmin && (
                            <td className="center-cell">
                              {isEditing ? (
                                <div className="stock-inline-actions">
                                  <button type="button" className="save" onClick={() => saveSizeStockEdit(variant)}><Save size={13} /> Save</button>
                                  <button type="button" className="cancel" onClick={cancelSizeStockEdit}>Cancel</button>
                                </div>
                              ) : (
                                <button type="button" className="stock-row-edit-button" onClick={() => beginSizeStockEdit(variant)}
                                  disabled={editingStockVariantId !== null}
                                  title={`Edit stock for size ${variant.size} (${variant.color || "Standard"})`}>
                                  <Edit2 size={13} /> Edit
                                </button>
                              )}
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>

            <aside className="stock-details-side-column">
              <section className="panel stock-product-info-panel">
                <div className="stock-detail-product-image">
                  {selectedProduct.image ? (
                    <img
                      src={selectedProduct.image}
                      alt={selectedProduct.name}
                      onError={(e) => {
                        e.currentTarget.style.display = "none";
                      }}
                    />
                  ) : (
                    <PackagePlus size={42} />
                  )}
                </div>
                <h3>Product Information</h3>
                <dl>
                  <div><dt>Product Name</dt><dd>{selectedProduct.name}</dd></div>
                  <div><dt>Brand</dt><dd>{selectedProduct.brand || "—"}</dd></div>
                  <div><dt>Category</dt><dd>{selectedProduct.category || "—"}</dd></div>
                  <div><dt>Footwear Type</dt><dd>{selectedProduct.sub_category || "—"}</dd></div>
                  <div><dt>Article / SKU</dt><dd>{selectedProduct.article_no}</dd></div>
                  <div><dt>GST Rate</dt><dd>{selectedProduct.tax_rate ?? 0}%</dd></div>
                  <div><dt>Location / Rack</dt><dd>{selectedProduct.location || "—"}</dd></div>
                </dl>
              </section>
              <section className="panel stock-barcode-panel">
                <h3>Variant Barcodes</h3>
                <p className="stock-barcode-help">Each size and colour has its own barcode. Use Preview in the corresponding inventory row to copy or print its label.</p>
                <div className="stock-barcode-count">{selectedProduct.variants.filter((variant) => variant.barcode).length} of {selectedProduct.variants.length} variants have barcodes</div>
              </section>
            </aside>
          </div>
        </section>
      ) : (
        <>

      {/* KPI TILES (Single-Line 4-Card Alignment) */}
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

        {/* Unified 4th Card: Inventory Valuation & Margin */}
        <div className="metric-card">
          <div className="metric-header">
            <span className="metric-title">Valuation & Margin</span>
            <div className="metric-icon-wrap green">
              <TrendingUp size={18} />
            </div>
          </div>
          <div className="metric-value" style={{ display: "flex", alignItems: "baseline", gap: "6px", flexWrap: "wrap" }}>
            <span>{formatINR(stats.totalCostVal)}</span>
            <span style={{ fontSize: "12px", fontWeight: 700, color: "#16a34a" }}>
              (~{stats.totalRetailVal > 0 ? Math.round(((stats.totalRetailVal - stats.totalCostVal) / stats.totalRetailVal) * 100) : 0}% Margin)
            </span>
          </div>
          <div className="metric-footer positive">
            <span>Wholesale: {formatINR(stats.totalCostVal)} · Retail: {formatINR(stats.totalRetailVal)}</span>
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

            {isAdmin && (
              <button
                className="btn-primary"
                onClick={() => setIsAddOpen(true)}
                style={{ padding: "0 16px", height: "40px" }}
              >
                <Plus size={16} /> Add Footwear
              </button>
            )}
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

      {/* STOCK CONTROL PRODUCT TABLE */}
      <section className="panel stock-control-table-panel">
        <div className="stock-control-table-scroll">
          <table className="custom-table stock-control-table">
            <thead>
              <tr>
                <th>Product</th><th>SKU / Barcode</th><th>Brand & Category</th><th>Sizes & Stock</th>
                <th className="numeric-cell">Cost Price</th><th className="numeric-cell">Selling Price</th>
                <th className="center-cell">Total Stock</th><th>Status</th><th className="center-cell">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredProducts.length === 0 ? (
                <tr><td colSpan="9" className="stock-table-empty"><Boxes size={30} /><strong>No footwear found</strong><span>Try changing your search or filters.</span></td></tr>
              ) : filteredProducts.map((prod) => {
                const variants = Array.isArray(prod?.variants) ? prod.variants : [];
                const totalStock = variants.reduce((sum, variant) => sum + (Number(variant.stock) || 0), 0);
                const prices = variants.map((variant) => Number(variant.selling_price) || 0);
                const minPrice = prices.length ? Math.min(...prices) : 0;
                const maxPrice = prices.length ? Math.max(...prices) : 0;
                const costPrice = Number(variants[0]?.cost_price) || 0;
                const isOutOfStock = totalStock === 0;
                const isLowStock = thresholdMode === "per-size"
                  ? variants.some((variant) => (Number(variant.stock) || 0) <= lowStockThreshold)
                  : totalStock <= lowStockThreshold;
                const isHighlighted = highlightTarget?.tab === "inventory" &&
                  (highlightTarget.productId === prod.id || highlightTarget.productName === prod.name || highlightTarget.productName === prod.article_no);
                return (
                  <tr key={prod.id} id={`prod-row-${prod.id}`}
                    className={`${isHighlighted ? "table-row-highlight" : ""} ${isLowStock ? "row-low-stock-alert" : ""}`}>
                    <td>
                      <div className="stock-product-cell">
                        <div className="stock-product-image">{prod.image ? <img src={prod.image} alt="" /> : <PackagePlus size={20} />}</div>
                        <div className="stock-product-copy"><strong>{prod.name}</strong><span>{prod.category} · {prod.sub_category}</span></div>
                      </div>
                    </td>
                    <td><div className="stock-code-cell"><strong>{prod.article_no}</strong><span>{variants[0]?.barcode || prod.barcode || "—"}</span></div></td>
                    <td><div className="stock-brand-cell"><strong>{prod.brand || "—"}</strong><span>{prod.category || "Uncategorised"}</span></div></td>
                    <td>
                      <div className="stock-size-pills" aria-label={`Stock by size for ${prod.name}`}>
                        {variants.slice(0, 5).map((variant) => {
                          const qty = Number(variant.stock) || 0;
                          const low = qty <= (thresholdMode === "per-size" ? lowStockThreshold : 3);
                          return <span key={variant.id} className={`stock-size-pill ${qty === 0 ? "is-empty" : low ? "is-low" : ""}`} title={`Size ${variant.size}, ${variant.color || "Standard"}: ${qty} pairs`}><b>{variant.size}</b><span>{qty}</span></span>;
                        })}
                        {variants.length > 5 && <button type="button" className="stock-more-sizes" onClick={() => setSelectedProductId(prod.id)}>+{variants.length - 5} more</button>}
                      </div>
                    </td>
                    <td className="numeric-cell">{formatINR(costPrice)}</td>
                    <td className="numeric-cell"><strong>{minPrice === maxPrice ? formatINR(minPrice) : `${formatINR(minPrice)} – ${formatINR(maxPrice)}`}</strong></td>
                    <td className="center-cell"><strong className="stock-total-value">{totalStock}</strong><span className="stock-unit-label">pairs</span></td>
                    <td><span className={`stock-status-tag ${isOutOfStock ? "out" : isLowStock ? "low" : "healthy"}`}><i />{isOutOfStock ? "Out of Stock" : isLowStock ? "Low Stock" : "In Stock"}</span></td>
                    <td className="center-cell">
                      <div className="stock-row-actions">
                        <button type="button" className="stock-view-button" onClick={() => { setSelectedProductId(prod.id); cancelSizeStockEdit(); }}><Eye size={13} /> View</button>
                        {isAdmin && (
                          <>
                            <button type="button" className="stock-icon-action" onClick={() => handleOpenEditProduct(prod)} title="Edit product details" aria-label={`Edit ${prod.name}`}><Edit2 size={14} /></button>
                            <button type="button" className="stock-icon-action danger" onClick={() => { if (confirm(`Delete ${prod.name} (${prod.article_no}) from catalog?`)) deleteProduct(prod.id); }} title="Delete product" aria-label={`Delete ${prod.name}`}><Trash2 size={14} /></button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="stock-table-footer"><span>Showing {filteredProducts.length} of {products.length} products</span></div>
      </section>
        </>
      )}

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
                    {categoriesList.map((cat) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                <div className="form-field">
                  <label>Footwear Type</label>
                  <select
                    value={editingProd.sub_category || "Casual"}
                    onChange={(e) =>
                      setEditingProd({ ...editingProd, sub_category: e.target.value })
                    }
                  >
                    {footwearTypesList.map((ft) => (
                      <option key={ft} value={ft}>{ft}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-grid-3">
                <div className="form-field">
                  <label>Color / Available Colours</label>
                  <input
                    type="text"
                    value={editingProd.color || ""}
                    placeholder="e.g. Black, White, Brown"
                    onChange={(e) =>
                      setEditingProd({ ...editingProd, color: e.target.value })
                    }
                  />
                </div>

                <div className="form-field">
                  <label>GST Tax Slab</label>
                  <select
                    value={editingProd.tax_rate}
                    onChange={(e) =>
                      setEditingProd({ ...editingProd, tax_rate: Number(e.target.value) })
                    }
                  >
                    {gstRatesList.map((r) => (
                      <option key={r} value={r}>{r}% GST</option>
                    ))}
                  </select>
                </div>

                <div className="form-field">
                  <label>Location / Rack</label>
                  <input
                    type="text"
                    value={editingProd.location || ""}
                    placeholder="e.g. Rack A-12"
                    onChange={(e) =>
                      setEditingProd({ ...editingProd, location: e.target.value })
                    }
                  />
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
                        <tr key={v.id || idx} id={v.id ? `editing-variant-row-${v.id}` : undefined}>
                          <td>
                            <input
                              id={v.id ? `editing-variant-size-${v.id}` : undefined}
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

      {/* MODAL: DEDICATED ADD STOCK / EDIT STOCK WORKFLOW */}
      {stockOperationMode && stockOperationProduct && (
        <div className="modal-backdrop" onClick={closeStockOperation}>
          <div
            className="modal-content stock-operation-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="stock-operation-title"
            onClick={(event) => event.stopPropagation()}
            style={{ maxWidth: "760px", width: "95%" }}
          >
            <div className="modal-header">
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <div className="modal-icon">
                  {stockOperationMode === "add" ? <PackagePlus size={18} /> : <SlidersHorizontal size={18} />}
                </div>
                <div>
                  <h3 id="stock-operation-title">
                    {stockOperationMode === "add" ? "Add Incoming Stock" : "Edit Existing Stock"}
                  </h3>
                  <p>
                    {stockOperationProduct.name} · Article {stockOperationProduct.article_no}
                  </p>
                </div>
              </div>
              <button type="button" className="btn-close" onClick={closeStockOperation} aria-label="Close">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={saveStockOperation} className="product-form">
              <div className="stock-operation-intro">
                {stockOperationMode === "add"
                  ? "Enter the number of pairs received for each size. These quantities will be added to the current stock."
                  : "Enter the corrected physical quantity for each size. Values replace the current stock quantities."}
              </div>

              <div className="table-responsive stock-operation-table-wrap">
                <table className="custom-table">
                  <thead>
                    <tr>
                      <th>Size</th>
                      <th>Color</th>
                      <th>Current Stock</th>
                      <th>{stockOperationMode === "add" ? "Quantity Received" : "Corrected Quantity"}</th>
                      <th>{stockOperationMode === "add" ? "After Addition" : "New Stock"}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stockOperationProduct.variants.map((variant) => {
                      const currentQty = Number(variant.stock) || 0;
                      const enteredQty = Number(stockOperationDrafts[variant.id] ?? 0);
                      const projectedQty = stockOperationMode === "add"
                        ? currentQty + (Number.isFinite(enteredQty) ? enteredQty : 0)
                        : (Number.isFinite(enteredQty) ? enteredQty : 0);
                      return (
                        <tr key={variant.id}>
                          <td><strong>{variant.size}</strong></td>
                          <td>{variant.color || "Standard"}</td>
                          <td>{currentQty} pairs</td>
                          <td>
                            <input
                              type="number"
                              min="0"
                              step="1"
                              inputMode="numeric"
                              aria-label={`${stockOperationMode === "add" ? "Quantity received" : "Corrected quantity"} for size ${variant.size}`}
                              value={stockOperationDrafts[variant.id] ?? "0"}
                              onChange={(event) => setStockOperationDrafts((current) => ({
                                ...current,
                                [variant.id]: event.target.value,
                              }))}
                              style={{ width: "110px", minHeight: "34px" }}
                            />
                          </td>
                          <td><strong>{projectedQty} pairs</strong></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="form-grid-2 stock-operation-meta">
                <div className="form-field">
                  <label>Adjustment Reason</label>
                  <select value={stockOperationReason} onChange={(event) => setStockOperationReason(event.target.value)}>
                    {stockOperationMode === "add" ? (
                      <>
                        <option>Restock Delivery</option>
                        <option>Supplier Return Reversal</option>
                        <option>Opening Stock</option>
                        <option>Other Stock In</option>
                      </>
                    ) : (
                      <>
                        <option>Physical Inventory Audit</option>
                        <option>Stock Correction</option>
                        <option>Damage / Write-off</option>
                        <option>Other Adjustment</option>
                      </>
                    )}
                  </select>
                </div>
                <div className="form-field">
                  <label>Note / Reference (optional)</label>
                  <input
                    value={stockOperationNote}
                    onChange={(event) => setStockOperationNote(event.target.value)}
                    placeholder="Supplier invoice, audit note or reason..."
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={closeStockOperation}>Cancel</button>
                <button type="submit" className="btn-primary">
                  <Check size={16} />
                  {stockOperationMode === "add" ? "Save Incoming Stock" : "Save Stock Correction"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ADD ITEM (PHOTO-ACCURATE VYAPAR/ERP LAYOUT) */}
      {isAddOpen && (
        <div className="modal-backdrop" onClick={() => setIsAddOpen(false)}>
          <div
            className="modal-content add-item-modal-dialog"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="add-item-header">
              <div className="add-item-header-left">
                <h3 className="add-item-title">Add Item</h3>
                {/* Product ● Service Toggle Switch */}
                <div className="product-service-toggle">
                  <span style={{ color: addItemType === "product" ? "#0f172a" : "#94a3b8", fontWeight: addItemType === "product" ? 700 : 500 }}>
                    Product
                  </span>
                  <div
                    className={`toggle-switch-track ${addItemType}`}
                    onClick={() => setAddItemType(addItemType === "product" ? "service" : "product")}
                    title="Toggle Product or Service"
                  >
                    <div className="toggle-switch-thumb"></div>
                  </div>
                  <span style={{ color: addItemType === "service" ? "#0f172a" : "#94a3b8", fontWeight: addItemType === "service" ? 700 : 500 }}>
                    Service
                  </span>
                </div>
              </div>

              <div className="add-item-header-actions">
                <button
                  type="button"
                  className="header-icon-btn"
                  title="Item Settings"
                  onClick={() => alert("Item Settings: Footwear barcodes, auto-SKU, and tax defaults configured.")}
                >
                  <Settings size={18} />
                </button>
                <button
                  type="button"
                  className="header-icon-btn"
                  onClick={() => setIsAddOpen(false)}
                  title="Close"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Form Body */}
            <div className="add-item-form-body">
              {/* Row 1: Item Name *, Item HSN (with 🔍), Select Unit, Add Item Image */}
              <div className="add-item-top-row">
                <div className="clean-input-group">
                  <input
                    type="text"
                    required
                    className="clean-input"
                    placeholder="Item Name *"
                    value={newProd.name}
                    onChange={(e) => setNewProd({ ...newProd, name: e.target.value })}
                  />
                </div>

                <div className="clean-input-group hsn-input-wrap">
                  <input
                    type="text"
                    className="clean-input"
                    placeholder="Item HSN"
                    value={newProd.hsn}
                    onChange={(e) => setNewProd({ ...newProd, hsn: e.target.value })}
                  />
                  <span
                    className="hsn-search-icon"
                    title="Search HSN Code for Footwear"
                    onClick={() => {
                      const sampleHsn = prompt("Lookup HSN code (6404 for rubber/fabric soles, 6403 for leather):", newProd.hsn || "64041190");
                      if (sampleHsn) setNewProd({ ...newProd, hsn: sampleHsn });
                    }}
                  >
                    <Search size={15} />
                  </span>
                </div>

                <button
                  type="button"
                  className="btn-select-unit"
                  onClick={() => {
                    const nextUnits = ["Pairs", "Box", "Pieces", "Dozens"];
                    const curIdx = nextUnits.indexOf(newProd.unit || "Pairs");
                    const next = nextUnits[(curIdx + 1) % nextUnits.length];
                    setNewProd({ ...newProd, unit: next });
                  }}
                  title="Click to toggle item unit"
                >
                  {newProd.unit || "Select Unit"} <ChevronDown size={13} />
                </button>

                <button
                  type="button"
                  className="btn-add-item-img"
                  onClick={() => {
                    const imgUrl = prompt("Enter footwear image URL or path:", newProd.image_url || "/assets/products/sx-701.jpg");
                    if (imgUrl) setNewProd({ ...newProd, image_url: imgUrl });
                  }}
                  title="Upload / Set Footwear Image"
                >
                  <Camera size={14} />
                  <span>{newProd.image_url ? "Image Added ✓" : "Add Item Image"}</span>
                </button>
              </div>

              {/* Row 2: Category, Item Code with Assign Code button */}
              <div className="add-item-second-row">
                <div className="clean-input-group">
                  <label>Category</label>
                  <div className="select-with-add-wrapper">
                    <select
                      value={newProd.category}
                      onChange={(e) => {
                        if (e.target.value === "__add_new__") {
                          setDynamicAddModal({ type: "category", target: "new", value: "" });
                        } else {
                          setNewProd({ ...newProd, category: e.target.value });
                        }
                      }}
                    >
                      {categoriesList.map((cat) => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                      <option value="__add_new__" style={{ fontWeight: 700, color: "#2563eb" }}>+ Add New Category...</option>
                    </select>
                    <button
                      type="button"
                      className="btn-quick-add-opt"
                      onClick={() => setDynamicAddModal({ type: "category", target: "new", value: "" })}
                      title="Add New Category"
                    >
                      + Add
                    </button>
                  </div>
                </div>

                <div className="clean-input-group">
                  <label>Item Code (Article No)*</label>
                  <div className="input-with-button">
                    <input
                      type="text"
                      required
                      className="clean-input"
                      placeholder="e.g. SX-701"
                      value={newProd.article_no}
                      onChange={(e) => setNewProd({ ...newProd, article_no: e.target.value.toUpperCase() })}
                    />
                    <button
                      type="button"
                      className="btn-assign-code-inner"
                      onClick={() => {
                        const randomNum = Math.floor(100 + Math.random() * 900);
                        const prefix = (newProd.brand?.slice(0, 2) || "FW").toUpperCase();
                        setNewProd({ ...newProd, article_no: `${prefix}-${randomNum}` });
                      }}
                      title="Auto-generate item article code"
                    >
                      Assign Code
                    </button>
                  </div>
                </div>
              </div>

              {/* Tabs Navigation: Pricing | Stock | Online Store (Stock has red underline) */}
              <div className="add-item-tabs-bar">
                <button
                  type="button"
                  className={`add-item-tab-link ${addItemTab === "pricing" ? "active" : ""}`}
                  onClick={() => setAddItemTab("pricing")}
                >
                  Pricing
                </button>
                <button
                  type="button"
                  className={`add-item-tab-link ${addItemTab === "stock" ? "active" : ""}`}
                  onClick={() => setAddItemTab("stock")}
                >
                  Stock
                </button>
                <button
                  type="button"
                  className={`add-item-tab-link ${addItemTab === "online" ? "active" : ""}`}
                  onClick={() => setAddItemTab("online")}
                >
                  Online Store
                </button>
              </div>

              {/* TAB 1: STOCK (Enhanced Color-Size Matrix) */}
              {addItemTab === "stock" && (
                <div className="tab-content-panel">
                  <div className="tab-content-scrollable">
                  {/* Row 1: Opening Quantity (Auto-calculated), At Price, As Of Date */}
                  <div className="stock-grid-row-1">
                    <div className="clean-input-group">
                      <label>Opening Quantity (Auto-calculated)</label>
                      <div className="opening-qty-box">
                        <input
                          type="number"
                          disabled
                          className="clean-input"
                          value={getGrandTotal()}
                          style={{ background: "#f8fafc", cursor: "not-allowed" }}
                        />
                        <button
                          type="button"
                          className="batch-tag-btn"
                          onClick={() => {
                            const b = prompt("Enter Batch Number / Lot:", newProd.batch_no || "BAT-2026-A");
                            if (b) setNewProd({ ...newProd, batch_no: b });
                          }}
                          title={`Batch: ${newProd.batch_no || "BAT-2026-A"}. Click to edit.`}
                        >
                          Batch
                        </button>
                      </div>
                    </div>

                    <div className="clean-input-group">
                      <label>At Price (Cost Price ₹)</label>
                      <input
                        type="number"
                        min="0"
                        className="clean-input"
                        value={newProd.cost_price}
                        onChange={(e) => {
                          const cp = Number(e.target.value) || 0;
                          setNewProd({
                            ...newProd,
                            cost_price: cp,
                            variants: newProd.variants.map((v) => ({ ...v, cost_price: cp })),
                          });
                        }}
                      />
                    </div>

                    <div className="clean-input-group">
                      <label>As Of Date</label>
                      <div className="date-input-wrap">
                        <input
                          type="date"
                          className="clean-input"
                          value={newProd.as_of_date}
                          onChange={(e) => setNewProd({ ...newProd, as_of_date: e.target.value })}
                        />
                        <span className="date-calendar-icon">
                          <Calendar size={15} />
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Row 2: Min Stock To Maintain, Location */}
                  <div className="stock-grid-row-2">
                    <div className="clean-input-group">
                      <label>Min Stock To Maintain</label>
                      <input
                        type="number"
                        min="0"
                        className="clean-input"
                        placeholder="e.g. 3 pairs retail / 30 pairs box"
                        value={newProd.min_stock}
                        onChange={(e) => setNewProd({ ...newProd, min_stock: Number(e.target.value) || 3 })}
                      />
                    </div>

                    <div className="clean-input-group">
                      <label>Location (Rack / Shelf)</label>
                      <input
                        type="text"
                        className="clean-input"
                        placeholder="e.g. Rack A-12, Ground Floor Shelf"
                        value={newProd.location}
                        onChange={(e) => setNewProd({ ...newProd, location: e.target.value })}
                      />
                    </div>
                  </div>

                  {/* Size Breakdown & Quantities */}
                  <div style={{ marginTop: "16px" }}>
                    <div style={{ marginBottom: "12px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "8px" }}>
                        <div>
                          <h4 style={{ fontSize: "12px", fontWeight: 700, color: "#0f172a", marginBottom: "4px" }}>
                            Size Breakdown & Quantities
                          </h4>
                          <p style={{ fontSize: "10px", color: "#64748b", marginBottom: "0" }}>
                            Enter opening stock quantity. Up to 30 sizes can be added automatically.
                          </p>
                        </div>
                        <button
                          type="button"
                          className="btn-tiny"
                          style={{ background: "#eff6ff", color: "#1e40af", borderColor: "#bfdbfe", flexShrink: 0 }}
                          onClick={() => {
                            const size = prompt("Enter new size:", "");
                            if (size) handleAddSize(size);
                          }}
                        >
                          <Plus size={11} /> Add Size
                        </button>
                      </div>
                      
                      {/* Color Chips */}
                      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "10px", marginTop: "12px" }}>
                        <label style={{ fontSize: "11px", fontWeight: 600, color: "#64748b" }}>
                          Available Colors ({newProd.availableColors.length})
                        </label>
                        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                          {newProd.availableColors.map((color) => (
                            <div
                              key={color}
                              className="color-chip-tag"
                            >
                              <span className="color-dot" style={{ background: color === "Black" ? "#000" : color === "White" ? "#fff" : "#94a3b8" }}></span>
                              <span>{color}</span>
                              {newProd.availableColors.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => handleRemoveColor(color)}
                                  className="color-chip-remove"
                                  title={`Remove ${color}`}
                                >
                                  ×
                                </button>
                              )}
                            </div>
                          ))}
                          <button
                            type="button"
                            className="color-chip-add"
                            onClick={() => {
                              const color = prompt("Enter new color name:", "");
                              if (color) handleAddColor(color);
                            }}
                          >
                            <Plus size={12} /> Add Color
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Stock Table - Scrollable */}
                    <div className="table-scroll-wrapper">
                      <table className="stock-matrix-table">
                        <thead>
                          <tr>
                            <th style={{ textAlign: "left" }}>Size</th>
                            {newProd.availableColors.map((color) => (
                              <th key={color}>
                                <span className="color-dot" style={{ background: color === "Black" ? "#000" : color === "White" ? "#fff" : "#94a3b8", marginRight: "4px" }}></span>
                                {color}
                              </th>
                            ))}
                            <th style={{ background: "#f8fafc", color: "#64748b" }}>Total</th>
                            <th style={{ background: "#f8fafc", color: "#64748b" }}>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {newProd.availableSizes.map((size) => (
                            <tr key={size}>
                              <td style={{ fontWeight: 700, color: "#0f172a" }}>{size}</td>
                              {newProd.availableColors.map((color) => (
                                <td key={`${size}-${color}`}>
                                  <div style={{ position: "relative", display: "inline-block" }}>
                                    <input
                                      type="number"
                                      min="0"
                                      value={getMatrixStock(size, color)}
                                      onChange={(e) => handleMatrixStockChange(size, color, e.target.value)}
                                      className="stock-input-cell"
                                      placeholder="0"
                                    />
                                    <span className="stock-suffix">prs</span>
                                  </div>
                                </td>
                              ))}
                              <td style={{ fontWeight: 700, color: "#0f172a", background: "#f8fafc" }}>
                                {getSizeTotal(size)}
                              </td>
                              <td style={{ background: "#f8fafc" }}>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveSize(size)}
                                  className="btn-icon-delete"
                                  title={`Delete size ${size}`}
                                >
                                  <Trash2 size={14} />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot>
                          <tr className="total-row">
                            <td style={{ fontWeight: 700 }}>Total (Pairs)</td>
                            {newProd.availableColors.map((color) => (
                              <td key={`total-${color}`}>
                                {getColorTotal(color)}
                              </td>
                            ))}
                            <td style={{ fontWeight: 800, fontSize: "13px", background: "#d1fae5" }}>
                              {getGrandTotal()}
                            </td>
                            <td style={{ background: "#d1fae5" }}></td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>

                    <div style={{ marginTop: "12px" }}>
                      <span style={{ fontSize: "10px", color: "#3b82f6", display: "flex", alignItems: "center", gap: "4px" }}>
                        <AlertTriangle size={11} />
                        Each cell represents quantity per specific color and size
                      </span>
                    </div>
                  </div>
                  </div>

                  {/* Save Buttons for Stock Tab */}
                  <div className="tab-footer-buttons">
                    <button
                      type="button"
                      className="btn-save-new"
                      onClick={() => handleSaveProduct(true)}
                    >
                      Save & New
                    </button>
                    <button
                      type="button"
                      className="btn-save-item"
                      onClick={() => handleSaveProduct(false)}
                    >
                      Save
                    </button>
                  </div>
                </div>
              )}

              {/* TAB 2: PRICING */}
              {addItemTab === "pricing" && (
                <div className="tab-content-panel">
                  <div className="tab-content-scrollable">
                  {/* Base Pricing Section */}
                  <div style={{ marginBottom: "16px" }}>
                    <h4 style={{ fontSize: "12px", fontWeight: 700, color: "#0f172a", marginBottom: "10px" }}>
                      Base Pricing (Applies to all variants)
                    </h4>
                    <div className="form-grid-3">
                      <div className="clean-input-group">
                        <label>Selling Price (₹)*</label>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          className="clean-input"
                          value={newProd.selling_price}
                          onChange={(e) => {
                            const sp = Number(e.target.value) || 0;
                            setNewProd({
                              ...newProd,
                              selling_price: sp,
                              variants: newProd.variants.map((v) => ({ ...v, selling_price: sp })),
                            });
                          }}
                        />
                      </div>

                      <div className="clean-input-group">
                        <label>Purchase Price / Cost (₹)*</label>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          className="clean-input"
                          value={newProd.cost_price}
                          onChange={(e) => {
                            const cp = Number(e.target.value) || 0;
                            setNewProd({
                              ...newProd,
                              cost_price: cp,
                              variants: newProd.variants.map((v) => ({ ...v, cost_price: cp })),
                            });
                          }}
                        />
                      </div>

                      <div className="clean-input-group">
                        <label>GST Rate %</label>
                        <div className="select-with-add-wrapper">
                          <select
                            value={newProd.tax_rate}
                            onChange={(e) => {
                              if (e.target.value === "__add_new__") {
                                setDynamicAddModal({ type: "gst", target: "new", value: "" });
                              } else {
                                setNewProd({ ...newProd, tax_rate: Number(e.target.value) });
                              }
                            }}
                          >
                            {gstRatesList.map((r) => (
                              <option key={r} value={r}>{r}% GST</option>
                            ))}
                            <option value="__add_new__" style={{ fontWeight: 700, color: "#2563eb" }}>+ Add Custom GST Rate...</option>
                          </select>
                          <button
                            type="button"
                            className="btn-quick-add-opt"
                            onClick={() => setDynamicAddModal({ type: "gst", target: "new", value: "" })}
                            title="Add Custom GST Rate"
                          >
                            + Add
                          </button>
                        </div>
                      </div>
                    </div>

                    <div style={{ marginTop: "8px", display: "flex", alignItems: "center", gap: "10px" }}>
                      <label style={{ fontSize: "11px", fontWeight: 600, color: "#334155", display: "flex", alignItems: "center", gap: "6px" }}>
                        <input
                          type="checkbox"
                          checked={newProd.gst_inclusive}
                          onChange={(e) => setNewProd({ ...newProd, gst_inclusive: e.target.checked })}
                        />
                        Price Includes GST
                      </label>
                    </div>
                  </div>

                  {/* Calculated Profit Margin */}
                  <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: "6px", padding: "12px 16px", marginBottom: "16px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px" }}>
                      <div>
                        <span style={{ fontSize: "11px", color: "#166534", fontWeight: 600, display: "block" }}>
                          Expected Profit per Pair:
                        </span>
                        <span style={{ fontSize: "15px", fontWeight: 800, color: "#15803d" }}>
                          ₹{Math.max(0, (newProd.selling_price || 0) - (newProd.cost_price || 0)).toFixed(2)}
                        </span>
                      </div>
                      <div>
                        <span style={{ fontSize: "11px", color: "#166534", fontWeight: 600, display: "block" }}>
                          Gross Margin:
                        </span>
                        <span style={{ fontSize: "15px", fontWeight: 800, color: "#15803d" }}>
                          {newProd.selling_price > 0 ? ((((newProd.selling_price - newProd.cost_price) / newProd.selling_price) * 100).toFixed(2)) : 0}%
                        </span>
                      </div>
                      {newProd.tax_rate > 0 && !newProd.gst_inclusive && (
                        <div>
                          <span style={{ fontSize: "11px", color: "#166534", fontWeight: 600, display: "block" }}>
                            Selling Price + GST:
                          </span>
                          <span style={{ fontSize: "15px", fontWeight: 800, color: "#15803d" }}>
                            ₹{(newProd.selling_price * (1 + newProd.tax_rate / 100)).toFixed(2)}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Variant Price Overrides */}
                  <div style={{ marginTop: "16px", background: "#fffbeb", border: "1px solid #fde68a", borderRadius: "6px", padding: "12px 16px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                      <div>
                        <h4 style={{ fontSize: "12px", fontWeight: 700, color: "#92400e", margin: 0 }}>
                          Variant Price Overrides (Optional)
                        </h4>
                        <p style={{ fontSize: "10px", color: "#a16207", margin: "4px 0 0" }}>
                          Set custom prices for specific color-size combinations
                        </p>
                      </div>
                      <button
                        type="button"
                        className="btn-tiny"
                        style={{ background: "#fef3c7", color: "#92400e", borderColor: "#fde68a" }}
                        onClick={handleAddPriceOverride}
                      >
                        <Plus size={11} /> Add Override
                      </button>
                    </div>

                    {newProd.priceOverrides.length > 0 ? (
                      <div className="table-scroll-wrapper" style={{ marginTop: "10px" }}>
                        <table style={{ width: "100%", fontSize: "11px", borderCollapse: "collapse", background: "#fff" }}>
                          <thead>
                            <tr style={{ background: "#fef3c7", borderBottom: "1px solid #fde68a" }}>
                              <th style={{ padding: "6px 8px", textAlign: "left", fontWeight: 700 }}>Color</th>
                              <th style={{ padding: "6px 8px", textAlign: "left", fontWeight: 700 }}>Size</th>
                              <th style={{ padding: "6px 8px", textAlign: "right", fontWeight: 700 }}>Selling Price</th>
                              <th style={{ padding: "6px 8px", textAlign: "right", fontWeight: 700 }}>Cost Price</th>
                              <th style={{ padding: "6px 8px", textAlign: "center", fontWeight: 700 }}>Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {newProd.priceOverrides.map((override, idx) => (
                              <tr key={idx} style={{ borderBottom: "1px solid #fef3c7" }}>
                                <td style={{ padding: "6px 8px" }}>{override.color || "All colors"}</td>
                                <td style={{ padding: "6px 8px" }}>{override.size || "All sizes"}</td>
                                <td style={{ padding: "6px 8px", textAlign: "right", fontWeight: 600 }}>₹{override.selling_price}</td>
                                <td style={{ padding: "6px 8px", textAlign: "right", fontWeight: 600 }}>₹{override.cost_price}</td>
                                <td style={{ padding: "6px 8px", textAlign: "center" }}>
                                  <button
                                    type="button"
                                    onClick={() => handleRemovePriceOverride(idx)}
                                    style={{ border: 0, background: "transparent", cursor: "pointer", color: "#dc2626", fontSize: "14px" }}
                                  >
                                    ×
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <p style={{ fontSize: "11px", color: "#a16207", textAlign: "center", margin: "10px 0 0", fontStyle: "italic" }}>
                        No price overrides set. Base pricing will apply to all variants.
                      </p>
                    )}
                  </div>
                  </div>

                  {/* Save Buttons for Pricing Tab */}
                  <div className="tab-footer-buttons">
                    <button
                      type="button"
                      className="btn-save-new"
                      onClick={() => handleSaveProduct(true)}
                    >
                      Save & New
                    </button>
                    <button
                      type="button"
                      className="btn-save-item"
                      onClick={() => handleSaveProduct(false)}
                    >
                      Save
                    </button>
                  </div>
                </div>
              )}

              {/* TAB 3: ONLINE STORE */}
              {addItemTab === "online" && (
                <div className="tab-content-panel">
                  <div className="tab-content-scrollable">
                  <div className="clean-input-group" style={{ marginBottom: "14px" }}>
                    <label>Master Barcode / EAN</label>
                    <div className="input-with-button">
                      <input
                        type="text"
                        className="clean-input"
                        placeholder="e.g. FW890101 or scan barcode"
                        value={newProd.barcode}
                        onChange={(e) => setNewProd({ ...newProd, barcode: e.target.value })}
                      />
                      <button
                        type="button"
                        className="btn-assign-code-inner"
                        onClick={() => {
                          const clean = (newProd.article_no || "FW").replace(/[^A-Z0-9]/gi, "").slice(-4);
                          setNewProd({ ...newProd, barcode: `890${clean}${Math.floor(100000 + Math.random() * 900000)}` });
                        }}
                      >
                        Auto Barcode
                      </button>
                    </div>
                  </div>

                  <div className="clean-input-group">
                    <label>Item Description & Online Notes</label>
                    <textarea
                      rows={3}
                      className="clean-input"
                      style={{ height: "auto", padding: "8px 12px", resize: "vertical" }}
                      placeholder="Add model description, sole type, upper material, warranty details..."
                      value={newProd.description}
                      onChange={(e) => setNewProd({ ...newProd, description: e.target.value })}
                    />
                  </div>
                  </div>

                  {/* Save Buttons for Online Store Tab */}
                  <div className="tab-footer-buttons">
                    <button
                      type="button"
                      className="btn-save-new"
                      onClick={() => handleSaveProduct(true)}
                    >
                      Save & New
                    </button>
                    <button
                      type="button"
                      className="btn-save-item"
                      onClick={() => handleSaveProduct(false)}
                    >
                      Save
                    </button>
                  </div>
                </div>
              )}
            </div>
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

      {/* INLINE DYNAMIC OPTION ADDER MODAL */}
      {dynamicAddModal && (
        <div className="inline-add-popover" onClick={() => setDynamicAddModal(null)}>
          <div className="inline-add-card" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
              <h4 style={{ margin: 0, fontSize: "14px", fontWeight: 700, color: "#0f172a" }}>
                {dynamicAddModal.type === "category" && "Add New Category"}
                {dynamicAddModal.type === "type" && "Add New Footwear Type"}
                {dynamicAddModal.type === "gst" && "Add Custom GST Rate (%)"}
              </h4>
              <button
                type="button"
                className="header-icon-btn"
                onClick={() => setDynamicAddModal(null)}
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSaveDynamicOption}>
              <div style={{ marginBottom: "14px" }}>
                <label style={{ fontSize: "11.5px", fontWeight: 600, color: "#64748b", display: "block", marginBottom: "4px" }}>
                  {dynamicAddModal.type === "category" && "Category Name"}
                  {dynamicAddModal.type === "type" && "Footwear Type Name"}
                  {dynamicAddModal.type === "gst" && "Tax Rate Percentage (e.g. 28, 3, 12)"}
                </label>
                <input
                  type={dynamicAddModal.type === "gst" ? "number" : "text"}
                  autoFocus
                  required
                  className="clean-input"
                  placeholder={
                    dynamicAddModal.type === "category"
                      ? "e.g. Unisex, Safety Shoes"
                      : dynamicAddModal.type === "type"
                      ? "e.g. Clogs, Loafers, Mules"
                      : "e.g. 28"
                  }
                  value={dynamicAddModal.value}
                  onChange={(e) => setDynamicAddModal({ ...dynamicAddModal, value: e.target.value })}
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px" }}>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setDynamicAddModal(null)}
                  style={{ height: "34px", padding: "0 14px", fontSize: "12px" }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  style={{ height: "34px", padding: "0 16px", fontSize: "12px" }}
                >
                  Add Option
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {barcodePreview && (
        <div className="modal-backdrop barcode-preview-backdrop" onMouseDown={(event) => {
          if (event.target === event.currentTarget) setBarcodePreview(null);
        }}>
          <section className="modal-content barcode-preview-modal" role="dialog" aria-modal="true" aria-labelledby="barcode-preview-title">
            <div className="modal-header">
              <div>
                <h3 id="barcode-preview-title">Variant Barcode</h3>
                <p>{barcodePreview.product.name} · Article {barcodePreview.product.article_no}</p>
              </div>
              <button type="button" className="btn-close" onClick={() => setBarcodePreview(null)} aria-label="Close barcode preview"><X size={17} /></button>
            </div>
            <div className="barcode-preview-meta">
              <span><small>SIZE</small><strong>{barcodePreview.variant.size}</strong></span>
              <span><small>COLOR</small><strong>{barcodePreview.variant.color || "Standard"}</strong></span>
              <span><small>SKU</small><strong>{barcodePreview.variant.sku || "—"}</strong></span>
            </div>
            <div className="barcode-preview-paper">
              <Code128Barcode value={barcodePreview.variant.barcode} height={82} />
              <code>{barcodePreview.variant.barcode}</code>
              <small>Code 128 · Generated by JDS Traders</small>
            </div>
            <div className="barcode-preview-note">This barcode identifies only this size and colour variant. Keep it unchanged after printing labels.</div>
            <div className="modal-footer barcode-preview-actions">
              <button type="button" className="btn-secondary" onClick={copyVariantBarcode}><Copy size={14} /> {barcodeCopied ? "Copied" : "Copy barcode"}</button>
              <button type="button" className="btn-primary" onClick={printVariantBarcode}><Barcode size={14} /> Print label</button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
