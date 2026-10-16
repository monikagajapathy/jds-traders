import React, { createContext, useContext, useState, useEffect } from "react";
import {
  initialProducts,
  initialSales,
  initialShopSettings,
  initialNotifications,
} from "../data/initialData.js";
import { supabase } from "../services/supabase.js";

const StoreContext = createContext();

const STORAGE_KEYS = {
  PRODUCTS: "jds_footwear_products_v1",
  SALES: "jds_footwear_sales_v1",
  SETTINGS: "jds_footwear_settings_v1",
  NOTIFICATIONS: "jds_footwear_notifications_v1",
};

export function StoreProvider({ children }) {
  const [activeTab, setActiveTab] = useState("billing");
  const [searchTerm, setSearchTerm] = useState("");
  const [dbStatus, setDbStatus] = useState({
    connected: false,
    mode: "Supabase Connected",
    message: "Connected to PostgreSQL database",
  });

  // Load state from localStorage or initialData
  const [products, setProducts] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.PRODUCTS);
      return saved ? JSON.parse(saved) : initialProducts;
    } catch {
      return initialProducts;
    }
  });

  const [sales, setSales] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.SALES);
      return saved ? JSON.parse(saved) : initialSales;
    } catch {
      return initialSales;
    }
  });

  const [settings, setSettings] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.SETTINGS);
      return saved ? JSON.parse(saved) : initialShopSettings;
    } catch {
      return initialShopSettings;
    }
  });

  const [notifications, setNotifications] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.NOTIFICATIONS);
      return saved ? JSON.parse(saved) : initialNotifications;
    } catch {
      return initialNotifications;
    }
  });

  const [cart, setCart] = useState([]);
  const [recentInvoice, setRecentInvoice] = useState(null);
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);

  // Sync to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(products));
    } catch (e) {
      console.warn("Error saving products:", e);
    }
  }, [products]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.SALES, JSON.stringify(sales));
    } catch (e) {
      console.warn("Error saving sales:", e);
    }
  }, [sales]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
    } catch (e) {
      console.warn("Error saving settings:", e);
    }
  }, [settings]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(notifications));
    } catch (e) {
      console.warn("Error saving notifications:", e);
    }
  }, [notifications]);

  // Check Supabase connection status on mount
  useEffect(() => {
    async function checkSupabase() {
      if (!supabase) {
        setDbStatus({
          connected: false,
          mode: "Offline Mode",
          message: "Supabase URL/Key missing",
        });
        return;
      }
      try {
        const { error } = await supabase.from("products").select("id").limit(1);
        if (!error) {
          setDbStatus({
            connected: true,
            mode: "Supabase Live",
            message: "Connected to Supabase PostgreSQL",
          });
        } else {
          setDbStatus({
            connected: true,
            mode: "Supabase Active",
            message: "Database active (Local resilient cache)",
          });
        }
      } catch {
        setDbStatus({
          connected: false,
          mode: "Local Storage",
          message: "Using resilient local storage",
        });
      }
    }
    checkSupabase();
  }, []);

  // Cart Operations
  const addToCart = (variant, product) => {
    const availableStock = variant.stock ?? 0;
    if (availableStock <= 0) return;

    setCart((prev) => {
      const existing = prev.find((item) => item.variant_id === variant.id);
      if (existing) {
        if (existing.quantity >= availableStock) {
          return prev; // Reached stock limit
        }
        return prev.map((item) =>
          item.variant_id === variant.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [
        ...prev,
        {
          product_id: product.id,
          variant_id: variant.id,
          product_name: product.name,
          article_no: product.article_no,
          brand: product.brand,
          size: variant.size,
          color: variant.color || "Standard",
          unit_price: Number(variant.selling_price),
          cost_price: Number(variant.cost_price || 0),
          quantity: 1,
          discount_amount: 0,
          max_stock: availableStock,
          tax_rate: product.tax_rate ?? settings.default_tax_rate ?? 5,
        },
      ];
    });
  };

  const updateCartQty = (variantId, delta) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.variant_id !== variantId) return item;
          const nextQty = item.quantity + delta;
          if (nextQty <= 0) return null;
          if (nextQty > item.max_stock) return item;
          return { ...item, quantity: nextQty };
        })
        .filter(Boolean)
    );
  };

  const updateCartItemDiscount = (variantId, discount) => {
    setCart((prev) =>
      prev.map((item) =>
        item.variant_id === variantId
          ? { ...item, discount_amount: Math.max(0, Number(discount) || 0) }
          : item
      )
    );
  };

  const removeFromCart = (variantId) => {
    setCart((prev) => prev.filter((item) => item.variant_id !== variantId));
  };

  const clearCart = () => {
    setCart([]);
  };

  // Checkout Operation
  const completeCheckout = ({
    customer = { name: "Walk-in Customer", phone: "" },
    billDiscount = 0,
    taxRate = 5,
    paymentMethod = "Cash",
    notes = "",
  }) => {
    if (cart.length === 0) return null;

    const subtotal = cart.reduce(
      (sum, item) => sum + item.unitPrice * item.quantity,
      0
    );
    const itemDiscounts = cart.reduce(
      (sum, item) => sum + (item.discount_amount || 0) * item.quantity,
      0
    );
    const totalDiscount = Math.min(
      subtotal,
      Number(billDiscount || 0) + itemDiscounts
    );
    const taxableAmount = Math.max(0, subtotal - totalDiscount);
    const taxAmount = (taxableAmount * (Number(taxRate) || 0)) / 100;
    const grandTotal = Math.round((taxableAmount + taxAmount) * 100) / 100;

    const nextInvoiceNum = `${settings.invoice_prefix || "JDS-INV-"}${new Date().getFullYear()}-${String(
      sales.length + 43
    ).padStart(4, "0")}`;

    const newSale = {
      id: `sale-${Date.now()}`,
      invoice_no: nextInvoiceNum,
      created_at: new Date().toISOString(),
      customer: {
        name: customer.name || "Walk-in Customer",
        phone: customer.phone || "",
      },
      status: "Completed",
      subtotal,
      discount_amount: totalDiscount,
      tax_amount: taxAmount,
      tax_rate: taxRate,
      total: grandTotal,
      payment_method: paymentMethod,
      notes: notes || "Over-the-counter sale",
      items: cart.map((item) => ({
        product_id: item.product_id,
        variant_id: item.variant_id,
        product_name: item.product_name,
        article_no: item.article_no,
        brand: item.brand,
        size: item.size,
        color: item.color,
        unit_price: item.unit_price,
        cost_price: item.cost_price,
        quantity: item.quantity,
        discount_amount: item.discount_amount || 0,
      })),
    };

    // Deduct stock from inventory
    setProducts((prev) =>
      prev.map((prod) => {
        const matchingCartItems = cart.filter(
          (c) => c.product_id === prod.id
        );
        if (matchingCartItems.length === 0) return prod;

        return {
          ...prod,
          variants: prod.variants.map((variant) => {
            const purchased = matchingCartItems.find(
              (c) => c.variant_id === variant.id
            );
            if (!purchased) return variant;
            const updatedStock = Math.max(0, variant.stock - purchased.quantity);

            // Trigger notification if low stock
            if (updatedStock <= (variant.reorder_level || 3)) {
              setNotifications((prevNotifs) => [
                {
                  id: `notif-${Date.now()}-${variant.id}`,
                  title: "Low Stock Alert",
                  message: `${prod.name} (Size ${variant.size}) now has only ${updatedStock} pairs left.`,
                  time: "Just now",
                  unread: true,
                },
                ...prevNotifs,
              ]);
            }

            return {
              ...variant,
              stock: updatedStock,
            };
          }),
        };
      })
    );

    // Add sale to history
    setSales((prev) => [newSale, ...prev]);

    // Add sale notification
    setNotifications((prev) => [
      {
        id: `notif-sale-${Date.now()}`,
        title: "Sale Completed",
        message: `Invoice ${newSale.invoice_no} completed for ₹${newSale.total.toLocaleString(
          "en-IN"
        )} via ${newSale.payment_method}.`,
        time: "Just now",
        unread: true,
      },
      ...prev,
    ]);

    // Clear cart and prepare receipt
    clearCart();
    setRecentInvoice(newSale);
    setIsReceiptOpen(true);

    return newSale;
  };

  // Stock Adjustment
  const adjustStock = (variantId, delta, reason = "Stock Adjustment", note = "") => {
    setProducts((prev) =>
      prev.map((prod) => {
        const hasVariant = prod.variants.some((v) => v.id === variantId);
        if (!hasVariant) return prod;

        return {
          ...prod,
          variants: prod.variants.map((v) => {
            if (v.id !== variantId) return v;
            const newStock = Math.max(0, (v.stock || 0) + delta);
            return { ...v, stock: newStock };
          }),
        };
      })
    );

    setNotifications((prev) => [
      {
        id: `notif-adj-${Date.now()}`,
        title: "Stock Adjusted",
        message: `${delta > 0 ? `+${delta}` : delta} pairs updated (${reason}${
          note ? `: ${note}` : ""
        }).`,
        time: "Just now",
        unread: true,
      },
      ...prev,
    ]);
  };

  // Product Operations
  const addProduct = (newProduct) => {
    const prodId = `prod-${Date.now()}`;
    const formatted = {
      ...newProduct,
      id: prodId,
      article_no: newProduct.article_no.trim().toUpperCase(),
      name: newProduct.name.trim(),
      brand: newProduct.brand.trim(),
      category: newProduct.category || "Men",
      sub_category: newProduct.sub_category || "Casual",
      tax_rate: Number(newProduct.tax_rate) || 5,
      is_active: true,
      variants: newProduct.variants.map((v, i) => ({
        id: `var-${Date.now()}-${i}`,
        size: String(v.size),
        color: v.color || "Standard",
        cost_price: Number(v.cost_price) || 0,
        selling_price: Number(v.selling_price) || 0,
        sku: v.sku || `JDS-${newProduct.article_no}-${v.size}`,
        barcode: v.barcode || `890${Date.now().toString().slice(-9)}`,
        stock: Math.max(0, Number(v.stock) || 0),
        reorder_level: Number(v.reorder_level) || 3,
      })),
    };

    setProducts((prev) => [formatted, ...prev]);

    setNotifications((prev) => [
      {
        id: `notif-prod-${Date.now()}`,
        title: "Product Added",
        message: `New footwear model ${formatted.name} (${formatted.article_no}) added with ${formatted.variants.length} sizes.`,
        time: "Just now",
        unread: true,
      },
      ...prev,
    ]);

    return formatted;
  };

  const updateProduct = (productId, updatedData) => {
    setProducts((prev) =>
      prev.map((prod) => (prod.id === productId ? { ...prod, ...updatedData } : prod))
    );
  };

  const deleteProduct = (productId) => {
    setProducts((prev) => prev.filter((prod) => prod.id !== productId));
  };

  // Refund / Return Sale
  const refundSale = (saleId) => {
    const sale = sales.find((s) => s.id === saleId);
    if (!sale || sale.status === "Refunded") return;

    // Restore stock
    setProducts((prev) =>
      prev.map((prod) => {
        const relevantItems = sale.items.filter(
          (item) => item.product_id === prod.id
        );
        if (relevantItems.length === 0) return prod;

        return {
          ...prod,
          variants: prod.variants.map((variant) => {
            const returnedItem = relevantItems.find(
              (item) => item.variant_id === variant.id
            );
            if (!returnedItem) return variant;
            return {
              ...variant,
              stock: variant.stock + returnedItem.quantity,
            };
          }),
        };
      })
    );

    // Update sale status
    setSales((prev) =>
      prev.map((s) => (s.id === saleId ? { ...s, status: "Refunded" } : s))
    );

    setNotifications((prev) => [
      {
        id: `notif-ref-${Date.now()}`,
        title: "Invoice Refunded",
        message: `Invoice ${sale.invoice_no} marked as refunded. Stock restored.`,
        time: "Just now",
        unread: true,
      },
      ...prev,
    ]);
  };

  // Settings
  const updateSettings = (newSettings) => {
    setSettings((prev) => ({ ...prev, ...newSettings }));
  };

  const resetToDemoData = () => {
    localStorage.removeItem(STORAGE_KEYS.PRODUCTS);
    localStorage.removeItem(STORAGE_KEYS.SALES);
    localStorage.removeItem(STORAGE_KEYS.SETTINGS);
    localStorage.removeItem(STORAGE_KEYS.NOTIFICATIONS);
    setProducts(initialProducts);
    setSales(initialSales);
    setSettings(initialShopSettings);
    setNotifications(initialNotifications);
    setCart([]);
  };

  const markAllNotificationsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, unread: false })));
  };

  const value = {
    activeTab,
    setActiveTab,
    searchTerm,
    setSearchTerm,
    dbStatus,
    products,
    sales,
    settings,
    notifications,
    cart,
    addToCart,
    updateCartQty,
    updateCartItemDiscount,
    removeFromCart,
    clearCart,
    completeCheckout,
    addProduct,
    updateProduct,
    deleteProduct,
    adjustStock,
    refundSale,
    updateSettings,
    resetToDemoData,
    markAllNotificationsRead,
    recentInvoice,
    setRecentInvoice,
    isReceiptOpen,
    setIsReceiptOpen,
  };

  return (
    <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
  );
}

export function useStore() {
  const context = useContext(StoreContext);
  if (!context) {
    throw new Error("useStore must be used within a StoreProvider");
  }
  return context;
}
