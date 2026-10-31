import React, { createContext, useContext, useState, useEffect } from "react";
import {
  initialProducts,
  initialSales,
  initialShopSettings,
  initialNotifications,
} from "../data/initialData.js";
import { supabase } from "../services/supabase.js";
import { generateUniqueVariantBarcode } from "../utils/barcode.js";

const StoreContext = createContext();

const STORAGE_KEYS = {
  PRODUCTS: "jds_footwear_products_v4",
  SALES: "jds_footwear_sales_v4",
  SETTINGS: "jds_footwear_settings_v4",
  NOTIFICATIONS: "jds_footwear_notifications_v4",
  USERS: "jds_footwear_users_v1",
  CURRENT_USER: "jds_current_user_v1",
  STOCK_LOGS: "jds_footwear_stock_logs_v4",
};

const initialUsersList = [
  { id: "usr-moni", name: "Moni", role: "Admin", pin: "1234", phone: "+91 98401 23456", is_active: true },
  { id: "usr-raj", name: "Raj", role: "Staff", pin: "2345", phone: "+91 98401 34567", is_active: true },
  { id: "usr-aakif", name: "Aakif", role: "Cashier", pin: "1111", phone: "+91 98401 45678", is_active: true },
  { id: "usr-nishok", name: "Nishok", role: "Staff", pin: "2222", phone: "+91 98401 56789", is_active: true },
];

const initialStockLogs = [
  {
    id: "log-seed-1",
    product_name: "Casual Sneaker",
    article_no: "SX-701",
    delta: 37,
    reason: "Batch Inward Delivery",
    note: "Batch BAT-2026-A initial stock verified",
    adjusted_by: "Raj",
    created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
  },
  {
    id: "log-seed-2",
    product_name: "Formal Leather Shoes",
    article_no: "BT-852",
    delta: 20,
    reason: "Restock Delivery",
    note: "Supplier shipment BAT-2026-B verified",
    adjusted_by: "Nishok",
    created_at: new Date(Date.now() - 86400000).toISOString(),
  },
  {
    id: "log-seed-3",
    product_name: "Ladies Fancy Flat",
    article_no: "VK-04",
    delta: 67,
    reason: "Restock Delivery",
    note: "Stock intake BAT-2026-C verified",
    adjusted_by: "Moni",
    created_at: new Date(Date.now() - 86400000 * 3).toISOString(),
  },
  {
    id: "log-seed-4",
    product_name: "Kids Running Shoes",
    article_no: "CP-990",
    delta: 18,
    reason: "Restock Delivery",
    note: "Campus intake BAT-2026-D",
    adjusted_by: "Aakif",
    created_at: new Date(Date.now() - 86400000 * 4).toISOString(),
  },
];

export function StoreProvider({ children }) {
  const [activeTab, setActiveTab] = useState("billing");
  const [searchTerm, setSearchTerm] = useState("");
  const [targetInvoiceFilter, setTargetInvoiceFilter] = useState("");
  const [targetInventoryFilter, setTargetInventoryFilter] = useState("");
  const [highlightTarget, setHighlightTarget] = useState(null);
  const [dbStatus, setDbStatus] = useState({
    connected: false,
    mode: "Supabase Connected",
    message: "Connected to PostgreSQL database",
  });

  // Users state with self-healing to Moni (Admin), Raj (Staff), Aakif (Cashier), Nishok (Staff)
  const [users, setUsers] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.USERS);
      if (saved) {
        const parsed = JSON.parse(saved);
        const hasRequestedUsers = parsed.some((u) =>
          ["moni", "raj", "aakif", "nishok"].includes(u.name?.toLowerCase())
        );
        if (hasRequestedUsers && parsed.length >= 4) {
          // Strictly ensure Raj is Staff (not Admin)
          return parsed.map((u) => {
            if (u.name.toLowerCase() === "raj") {
              return { ...u, role: "Staff" };
            }
            return u;
          });
        }
      }
      return initialUsersList;
    } catch {
      return initialUsersList;
    }
  });

  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.CURRENT_USER);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (["moni", "raj", "aakif", "nishok"].includes(parsed.name?.toLowerCase())) {
          if (parsed.name.toLowerCase() === "raj") {
            return { ...parsed, role: "Staff" };
          }
          return parsed;
        }
      }
      return initialUsersList[0];
    } catch {
      return initialUsersList[0];
    }
  });

  // Login authentication session state
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    try {
      const savedAuth = sessionStorage.getItem("jds_pos_auth_v1");
      return savedAuth === "true";
    } catch {
      return false;
    }
  });

  const login = (userId, pin) => {
    const user = users.find((u) => u.id === userId);
    if (!user) return { success: false, message: "User not found" };

    if (user.pin && String(user.pin).trim() !== String(pin).trim()) {
      return { success: false, message: "Incorrect security PIN. Please try again." };
    }

    const updatedUser = user.name.toLowerCase() === "raj" ? { ...user, role: "Staff" } : user;
    setCurrentUser(updatedUser);
    setIsAuthenticated(true);
    try {
      sessionStorage.setItem("jds_pos_auth_v1", "true");
      localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(updatedUser));
    } catch (e) {
      console.warn("Storage warning:", e);
    }
    return { success: true, user: updatedUser };
  };

  const logout = () => {
    setIsAuthenticated(false);
    try {
      sessionStorage.removeItem("jds_pos_auth_v1");
    } catch (e) {
      console.warn("Storage warning:", e);
    }
  };

  // Stock Audit Logs state (for admin accountability)
  const [stockLogs, setStockLogs] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.STOCK_LOGS);
      if (saved) {
        const parsed = JSON.parse(saved);
        const hasNewNames = parsed.some((l) =>
          ["moni", "raj", "aakif", "nishok"].includes(l.adjusted_by?.toLowerCase())
        );
        if (hasNewNames) return parsed;
      }
      return initialStockLogs;
    } catch {
      return initialStockLogs;
    }
  });

  // Load state from localStorage or initialData with self-healing for new catalog
  const [products, setProducts] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.PRODUCTS);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0 && parsed.some((p) => p.article_no === "SX-701")) {
          // Older/local cached records may contain variants as a keyed object
          // instead of an array. Billing and inventory views rely on array
          // methods (map, reduce, find, some), so normalize at the data boundary.
          const usedBarcodes = new Set();
          return parsed.map((product) => {
            let variants = product?.variants;
            if (typeof variants === "string") {
              try {
                variants = JSON.parse(variants);
              } catch {
                variants = [];
              }
            }
            if (!Array.isArray(variants)) {
              variants =
                variants && typeof variants === "object"
                  ? Object.values(variants)
                  : [];
            }
            const normalizedVariants = variants
              .filter((variant) => variant && typeof variant === "object")
              .map((variant) => {
                const existingBarcode = String(variant.barcode || "").trim();
                const canKeepExisting = existingBarcode
                  && /^[\x20-\x7E]+$/.test(existingBarcode)
                  && !usedBarcodes.has(existingBarcode);
                const barcode = canKeepExisting
                  ? existingBarcode
                  : generateUniqueVariantBarcode(usedBarcodes);
                usedBarcodes.add(barcode);
                return { ...variant, barcode };
              });
            return {
              ...product,
              variants: normalizedVariants,
            };
          });
        }
      }
      return initialProducts;
    } catch {
      return initialProducts;
    }
  });

  const [sales, setSales] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.SALES);
      if (saved) {
        const parsed = JSON.parse(saved);
        const hasNewUsers = parsed.some((s) =>
          ["moni", "raj", "aakif", "nishok"].includes(s.billed_by?.toLowerCase())
        );
        if (hasNewUsers && parsed.length >= 4) {
          // Self-heal any corrupted sales where total is 0, null, or NaN
          return parsed.map((s) => {
            const itemsSubtotal = s.items?.reduce(
              (sum, it) => sum + (Number(it.unit_price ?? it.unitPrice) || 0) * (Number(it.quantity) || 1),
              0
            ) || 0;
            if ((!s.total || isNaN(s.total) || Number(s.total) === 0) && itemsSubtotal > 0) {
              const disc = Number(s.discount_amount) || 0;
              const taxable = Math.max(0, itemsSubtotal - disc);
              const rate = Number(s.tax_rate) || 5;
              const tax = (taxable * rate) / 100;
              return {
                ...s,
                subtotal: itemsSubtotal,
                discount_amount: disc,
                tax_amount: tax,
                tax_rate: rate,
                total: Math.round((taxable + tax) * 100) / 100,
              };
            }
            return s;
          });
        }
      }
      return initialSales;
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

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
    } catch (e) {
      console.warn("Error saving users:", e);
    }
  }, [users]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(currentUser));
    } catch (e) {
      console.warn("Error saving current user:", e);
    }
  }, [currentUser]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.STOCK_LOGS, JSON.stringify(stockLogs));
    } catch (e) {
      console.warn("Error saving stock logs:", e);
    }
  }, [stockLogs]);

  // Connect to Supabase backend & subscribe to Realtime channel
  useEffect(() => {
    let channel = null;

    async function initSupabase() {
      if (!supabase) {
        setDbStatus({
          connected: false,
          mode: "Offline Mode",
          message: "Supabase URL/Key missing in .env",
        });
        return;
      }

      try {
        const { error: testErr } = await supabase.from("products").select("id").limit(1);
        if (testErr) {
          console.warn("Supabase connection check:", testErr.message);
          setDbStatus({
            connected: true,
            mode: "Supabase Active",
            message: "Connected to Supabase PostgreSQL (Local resilient cache active)",
          });
        } else {
          setDbStatus({
            connected: true,
            mode: "Supabase Live",
            message: "Connected to Supabase PostgreSQL",
          });

          // Fetch products from Supabase
          const { data: dbProducts } = await supabase
            .from("products")
            .select(`
              id, name, brand, category, article_no, is_active,
              product_variants (
                id, size, color, sku, barcode, selling_price, cost_price,
                inventory (quantity, reorder_level)
              )
            `);

          if (dbProducts && dbProducts.length > 0) {
            const transformed = dbProducts.map((p) => {
              const initP = initialProducts.find(
                (ip) => ip.id === p.id || ip.article_no === p.article_no
              );
              return {
                id: p.id,
                name: p.name,
                brand: p.brand,
                category: p.category,
                sub_category: initP?.sub_category || "Casual",
                article_no: p.article_no,
                tax_rate: initP?.tax_rate ?? (p.tax_rate || 5),
                batch_no: initP?.batch_no || "BAT-2026-A",
                serial_prefix: initP?.serial_prefix || `SN-${p.article_no}`,
                barcode: initP?.barcode || p.product_variants?.[0]?.barcode || "",
                colours: initP?.colours || "Standard",
                image: initP?.image || `/assets/products/${p.article_no?.toLowerCase()}.jpg`,
                is_active: p.is_active,
                variants: (p.product_variants || []).map((v) => {
                  const inv = Array.isArray(v.inventory) ? v.inventory[0] : v.inventory;
                  const initV = initP?.variants?.find(
                    (iv) => iv.id === v.id || String(iv.size) === String(v.size)
                  );
                  return {
                    id: v.id,
                    size: v.size,
                    color: v.color || initV?.color || "Standard",
                    sku: v.sku,
                    barcode: v.barcode,
                    selling_price: Number(v.selling_price) || initV?.selling_price || 0,
                    cost_price: Number(v.cost_price) || initV?.cost_price || 0,
                    tax_rate: initV?.tax_rate ?? (Number(v.selling_price) >= 1000 ? 12 : 5),
                    stock: Number(inv?.quantity ?? initV?.stock ?? 0),
                    reorder_level: Number(inv?.reorder_level) || 2,
                  };
                }),
              };
            });
            setProducts(transformed);
          }

          // Fetch sales from Supabase
          const { data: dbSales } = await supabase
            .from("sales")
            .select(`
              id, invoice_no, total, subtotal, tax_amount, discount_amount, status, notes, created_at,
              customer_name, customer_phone,
              sale_items (
                id, variant_id, product_name, article_no, brand, size, color, unit_price, cost_price, quantity, discount_amount, line_total
              ),
              payments (
                id, method, amount, status
              )
            `)
            .order("created_at", { ascending: false });

          if (dbSales && dbSales.length > 0) {
            const transformedSales = dbSales.map((s) => {
              const payments = s.payments || [];
              let payMethod = payments[0]?.method || "Cash";
              let paySplit = null;
              if (payments.length > 1) {
                payMethod = "Split";
                const cashP = payments.find((p) => p.method === "Cash");
                const upiP = payments.find((p) => p.method === "UPI");
                paySplit = {
                  cash: Number(cashP?.amount) || 0,
                  upi: Number(upiP?.amount) || 0,
                };
              }
              return {
                id: s.id,
                invoice_no: s.invoice_no,
                customer: {
                  name: s.customer_name || "Walk-in Customer",
                  phone: s.customer_phone || "",
                },
                subtotal: Number(s.subtotal) || 0,
                discount_amount: Number(s.discount_amount) || 0,
                tax_amount: Number(s.tax_amount) || 0,
                total: Number(s.total) || 0,
                status: s.status || "Completed",
                notes: s.notes || "",
                payment_method: payMethod,
                payment_split: paySplit,
                created_at: s.created_at,
                items: (s.sale_items || []).map((it) => ({
                  product_name: it.product_name,
                  article_no: it.article_no,
                  brand: it.brand,
                  size: it.size,
                  color: it.color,
                  unit_price: Number(it.unit_price) || 0,
                  unitPrice: Number(it.unit_price) || 0,
                  cost_price: Number(it.cost_price) || 0,
                  quantity: Number(it.quantity) || 1,
                  discount_amount: Number(it.discount_amount) || 0,
                })),
              };
            });
            setSales(transformedSales);
          }

          // Fetch notifications from Supabase
          const { data: dbNotifs } = await supabase
            .from("notifications")
            .select("*")
            .order("created_at", { ascending: false })
            .limit(20);

          if (dbNotifs && dbNotifs.length > 0) {
            setNotifications(
              dbNotifs.map((n) => ({
                id: n.id,
                title: n.title,
                message: n.message,
                time: n.time || "Just now",
                unread: n.unread ?? true,
                type: n.type || "general",
                targetTab: n.target_tab || "dashboard",
                invoiceNo: n.invoice_no,
                productId: n.product_id,
                saleId: n.sale_id,
              }))
            );
          }
        }

        // Clean up any stale channels from hot module reload
        try {
          const channels = supabase.getChannels();
          channels.forEach((c) => {
            if (c.topic.includes("jds-realtime-channel")) {
              supabase.removeChannel(c);
            }
          });
        } catch {
          // ignore
        }

        // Set up Realtime subscriptions for multi-device sync
        try {
          channel = supabase
            .channel(`jds-realtime-channel-${Date.now()}`)
            .on(
              "postgres_changes",
              { event: "*", schema: "public", table: "inventory" },
              (payload) => {
                if (payload.new && payload.new.variant_id) {
                  const { variant_id, quantity } = payload.new;
                  setProducts((prev) =>
                    prev.map((prod) => ({
                      ...prod,
                      variants: prod.variants.map((v) =>
                        v.id === variant_id ? { ...v, stock: Number(quantity) } : v
                      ),
                    }))
                  );
                }
              }
            )
            .on(
              "postgres_changes",
              { event: "INSERT", schema: "public", table: "sales" },
              (payload) => {
                if (payload.new && payload.new.id) {
                  setSales((prev) => {
                    if (prev.some((s) => s.id === payload.new.id || s.invoice_no === payload.new.invoice_no)) {
                      return prev;
                    }
                    return [payload.new, ...prev];
                  });
                }
              }
            )
            .on(
              "postgres_changes",
              { event: "INSERT", schema: "public", table: "notifications" },
              (payload) => {
                if (payload.new && payload.new.id) {
                  setNotifications((prev) => {
                    if (prev.some((n) => n.id === payload.new.id)) return prev;
                    return [
                      {
                        id: payload.new.id,
                        title: payload.new.title,
                        message: payload.new.message,
                        time: payload.new.time || "Just now",
                        unread: true,
                        type: payload.new.type || "general",
                        targetTab: payload.new.target_tab || "dashboard",
                        invoiceNo: payload.new.invoice_no,
                        productId: payload.new.product_id,
                        saleId: payload.new.sale_id,
                      },
                      ...prev,
                    ];
                  });
                }
              }
            )
            .subscribe((status) => {
              if (status === "SUBSCRIBED") {
                setDbStatus({
                  connected: true,
                  mode: "Supabase Realtime Live",
                  message: "Realtime synchronized with Supabase PostgreSQL",
                });
              }
            });
        } catch (realtimeErr) {
          console.warn("Realtime subscription warning:", realtimeErr);
        }
      } catch (err) {
        console.warn("Supabase init exception:", err);
        setDbStatus({
          connected: false,
          mode: "Local Storage Mode",
          message: "Operating with resilient local browser database",
        });
      }
    }

    initSupabase();

    return () => {
      if (channel && supabase) {
        supabase.removeChannel(channel);
      }
    };
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
      const price = Number(variant.selling_price) || 0;
      const itemTaxRate = Number(
        variant.tax_rate !== undefined
          ? variant.tax_rate
          : product.tax_rate !== undefined
          ? product.tax_rate
          : price >= 1000
          ? 12
          : 5
      );
      const hsn = product.hsn_code || (price >= 1000 ? "6403" : "6404");
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
          unit_price: price,
          unitPrice: price,
          cost_price: Number(variant.cost_price || 0),
          quantity: 1,
          discount_amount: 0,
          max_stock: availableStock,
          tax_rate: itemTaxRate,
          hsn_code: hsn,
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

  const updateCartItemTaxRate = (variantId, taxRate) => {
    setCart((prev) =>
      prev.map((item) =>
        item.variant_id === variantId
          ? { ...item, tax_rate: Math.max(0, Number(taxRate) || 0) }
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
    paymentSplit = null,
    cashTendered = null,
    changeReturned = null,
    notes = "",
  }) => {
    if (cart.length === 0) return null;

    const rawSubtotal = cart.reduce(
      (sum, item) => sum + (Number(item.unit_price ?? item.unitPrice) || 0) * (Number(item.quantity) || 1),
      0
    );
    const itemDiscounts = cart.reduce(
      (sum, item) => sum + (Number(item.discount_amount) || 0) * (Number(item.quantity) || 1),
      0
    );
    const overallBillDiscount = Math.max(0, Number(billDiscount || 0));
    const totalDiscount = Math.min(rawSubtotal, overallBillDiscount + itemDiscounts);

    // Compute itemized taxable amounts, GST, CGST, and SGST per product
    let totalTaxAmount = 0;
    let totalTaxableVal = 0;
    const gstBreakdownMap = new Map();

    const saleItems = cart.map((item) => {
      const itemPrice = Number(item.unit_price ?? item.unitPrice ?? 0);
      const qty = Number(item.quantity) || 1;
      const rawLineTotal = itemPrice * qty;
      const directItemDisc = (Number(item.discount_amount) || 0) * qty;

      // Allocate proportional bill-level discount across items
      const propBillDisc = rawSubtotal > 0 ? (rawLineTotal / rawSubtotal) * overallBillDiscount : 0;
      const itemTotalDiscount = Math.min(rawLineTotal, directItemDisc + propBillDisc);
      const itemTaxable = Math.max(0, rawLineTotal - itemTotalDiscount);
      const itemRate = Number(item.tax_rate ?? taxRate ?? 5);
      const itemTax = (itemTaxable * itemRate) / 100;
      const cgstAmt = itemTax / 2;
      const sgstAmt = itemTax / 2;

      totalTaxableVal += itemTaxable;
      totalTaxAmount += itemTax;

      // Group into GST Statement breakdown
      const slabKey = `${itemRate}%`;
      if (!gstBreakdownMap.has(slabKey)) {
        gstBreakdownMap.set(slabKey, {
          rate: itemRate,
          taxable: 0,
          cgstRate: itemRate / 2,
          cgstAmt: 0,
          sgstRate: itemRate / 2,
          sgstAmt: 0,
          totalTax: 0,
        });
      }
      const slabObj = gstBreakdownMap.get(slabKey);
      slabObj.taxable += itemTaxable;
      slabObj.cgstAmt += cgstAmt;
      slabObj.sgstAmt += sgstAmt;
      slabObj.totalTax += itemTax;

      return {
        product_id: item.product_id,
        variant_id: item.variant_id,
        product_name: item.product_name,
        article_no: item.article_no,
        brand: item.brand,
        size: item.size,
        color: item.color,
        unit_price: itemPrice,
        unitPrice: itemPrice,
        cost_price: Number(item.cost_price || 0),
        quantity: qty,
        discount_amount: itemTotalDiscount,
        tax_rate: itemRate,
        taxable_amount: Math.round(itemTaxable * 100) / 100,
        tax_amount: Math.round(itemTax * 100) / 100,
        cgst_rate: itemRate / 2,
        cgst_amount: Math.round(cgstAmt * 100) / 100,
        sgst_rate: itemRate / 2,
        sgst_amount: Math.round(sgstAmt * 100) / 100,
        hsn_code: item.hsn_code || (itemPrice >= 1000 ? "6403" : "6404"),
        total_with_tax: Math.round((itemTaxable + itemTax) * 100) / 100,
      };
    });

    const gstBreakdown = Array.from(gstBreakdownMap.values()).map((s) => ({
      ...s,
      taxable: Math.round(s.taxable * 100) / 100,
      cgstAmt: Math.round(s.cgstAmt * 100) / 100,
      sgstAmt: Math.round(s.sgstAmt * 100) / 100,
      totalTax: Math.round(s.totalTax * 100) / 100,
    }));

    const finalTaxAmount = Math.round(totalTaxAmount * 100) / 100;
    const finalTaxable = Math.round(totalTaxableVal * 100) / 100;
    const grandTotal = Math.round((finalTaxable + finalTaxAmount) * 100) / 100;

    const nextInvoiceNum = `${settings.invoice_prefix || "JDS-INV-"}${new Date().getFullYear()}-${String(
      sales.length + 43
    ).padStart(4, "0")}`;

    const newSale = {
      id: `sale-${Date.now()}`,
      invoice_no: nextInvoiceNum,
      created_at: new Date().toISOString(),
      billed_by: currentUser?.name || "JDS Admin",
      user_role: currentUser?.role || "Cashier",
      user_id: currentUser?.id || "usr-admin-1",
      customer: {
        name: customer.name || "Walk-in Customer",
        phone: customer.phone || "",
      },
      status: "Completed",
      subtotal: rawSubtotal,
      discount_amount: totalDiscount,
      taxable_amount: finalTaxable,
      tax_amount: finalTaxAmount,
      tax_rate: taxRate,
      total: grandTotal,
      gst_breakdown: gstBreakdown,
      payment_method: paymentMethod,
      payment_split: paymentMethod === "Split" ? paymentSplit : null,
      cash_tendered: paymentMethod === "Cash" ? cashTendered : null,
      change_returned: paymentMethod === "Cash" ? changeReturned : null,
      notes: notes || "Over-the-counter sale",
      items: saleItems,
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
                  type: "stock",
                  targetTab: "inventory",
                  productId: prod.id,
                  productName: prod.name,
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
    const paymentLabel = paymentMethod === "Split"
      ? `Split (Cash: ₹${paymentSplit?.cash || 0}, UPI: ₹${paymentSplit?.upi || 0})`
      : paymentMethod;

    setNotifications((prev) => [
      {
        id: `notif-sale-${Date.now()}`,
        title: "Sale Completed",
        message: `Invoice ${newSale.invoice_no} completed for ₹${newSale.total.toLocaleString(
          "en-IN"
        )} via ${paymentLabel}.`,
        time: "Just now",
        unread: true,
        type: "sale",
        targetTab: "transactions",
        invoiceNo: newSale.invoice_no,
        saleId: newSale.id,
      },
      ...prev,
    ]);

    // Clear cart and prepare receipt
    clearCart();
    setRecentInvoice(newSale);
    setIsReceiptOpen(true);

    // Async push to Supabase
    if (supabase) {
      (async () => {
        try {
          // 1. Insert sale record
          await supabase.from("sales").insert({
            id: newSale.id,
            invoice_no: newSale.invoice_no,
            subtotal: newSale.subtotal,
            discount_amount: newSale.discount_amount,
            tax_amount: newSale.tax_amount,
            tax_rate: newSale.tax_rate,
            total: newSale.total,
            status: newSale.status,
            notes: newSale.notes,
            customer_name: newSale.customer?.name,
            customer_phone: newSale.customer?.phone,
            billed_by: newSale.billed_by,
            user_role: newSale.user_role,
          });

          // 2. Insert sale items
          const itemsRows = newSale.items.map((it) => ({
            sale_id: newSale.id,
            variant_id: it.variant_id,
            product_name: it.product_name,
            article_no: it.article_no,
            brand: it.brand,
            size: it.size,
            color: it.color,
            unit_price: it.unit_price,
            cost_price: it.cost_price,
            quantity: it.quantity,
            discount_amount: it.discount_amount,
            line_total: it.unit_price * it.quantity,
          }));
          await supabase.from("sale_items").insert(itemsRows);

          // 3. Insert payments
          if (paymentMethod === "Split" && paymentSplit) {
            await supabase.from("payments").insert([
              { sale_id: newSale.id, method: "Cash", amount: Number(paymentSplit.cash) || 0 },
              { sale_id: newSale.id, method: "UPI", amount: Number(paymentSplit.upi) || 0 },
            ]);
          } else {
            await supabase.from("payments").insert([
              { sale_id: newSale.id, method: paymentMethod, amount: newSale.total },
            ]);
          }

          // 4. Update variant stock in inventory
          for (const it of newSale.items) {
            const vStock = Math.max(0, (it.max_stock || 10) - it.quantity);
            await supabase.from("inventory").upsert({
              variant_id: it.variant_id,
              quantity: vStock,
              updated_at: new Date().toISOString(),
            });
          }

          // 5. Insert notification
          await supabase.from("notifications").insert({
            id: `notif-sale-${Date.now()}`,
            title: "Sale Completed",
            message: `Invoice ${newSale.invoice_no} completed for ₹${newSale.total.toLocaleString("en-IN")} via ${paymentLabel}.`,
            time: "Just now",
            unread: true,
            type: "sale",
            target_tab: "transactions",
            invoice_no: newSale.invoice_no,
            sale_id: newSale.id,
          });
        } catch (syncErr) {
          console.warn("[Supabase Sync] Checkout async push notice:", syncErr.message);
        }
      })();
    }

    return newSale;
  };

  // Single Variant Stock Adjustment
  const adjustStock = (variantId, delta, reason = "Stock Adjustment", note = "") => {
    let affectedProd = null;
    let affectedSize = "";
    setProducts((prev) =>
      prev.map((prod) => {
        const hasVariant = prod.variants.some((v) => v.id === variantId);
        if (!hasVariant) return prod;
        affectedProd = prod;

        return {
          ...prod,
          variants: prod.variants.map((v) => {
            if (v.id !== variantId) return v;
            affectedSize = v.size;
            const newStock = Math.max(0, (v.stock || 0) + delta);
            return { ...v, stock: newStock };
          }),
        };
      })
    );

    // Accountability audit log for admin
    const logItem = {
      id: `log-adj-${Date.now()}`,
      product_id: affectedProd?.id,
      product_name: affectedProd?.name || "Footwear Item",
      article_no: affectedProd?.article_no || "",
      size: affectedSize,
      delta: delta,
      reason: reason,
      note: note,
      adjusted_by: currentUser?.name || "JDS Admin",
      created_at: new Date().toISOString(),
    };
    setStockLogs((prev) => [logItem, ...prev]);

    setNotifications((prev) => [
      {
        id: `notif-adj-${Date.now()}`,
        title: "Stock Adjusted",
        message: `${delta > 0 ? `+${delta}` : delta} pairs updated by ${currentUser?.name || "Admin"} (${reason}${
          note ? `: ${note}` : ""
        }).`,
        time: "Just now",
        unread: true,
        type: "stock",
        targetTab: "inventory",
        productId: affectedProd?.id,
        productName: affectedProd?.name,
      },
      ...prev,
    ]);
  };

  // Multi-Size Bulk Stock Adjustment for a Footwear Article
  const bulkAdjustStock = (productId, variantAdjustments, reason = "Stock Adjustment", note = "") => {
    let totalPairsDelta = 0;
    const adjMap = new Map();
    variantAdjustments.forEach((adj) => {
      adjMap.set(adj.variantId, adj);
    });

    setProducts((prev) =>
      prev.map((prod) => {
        if (prod.id !== productId) return prod;
        return {
          ...prod,
          variants: prod.variants.map((v) => {
            const adj = adjMap.get(v.id);
            if (!adj) return v;
            const finalQty = adj.newStock !== undefined
              ? Math.max(0, Number(adj.newStock))
              : Math.max(0, (v.stock || 0) + Number(adj.delta || 0));
            totalPairsDelta += (finalQty - (v.stock || 0));
            return { ...v, stock: finalQty };
          }),
        };
      })
    );

    const targetProd = products.find((p) => p.id === productId);

    // Accountability audit log for admin
    const logItem = {
      id: `log-bulk-${Date.now()}`,
      product_id: productId,
      product_name: targetProd?.name || "Footwear Article",
      article_no: targetProd?.article_no || "",
      delta: totalPairsDelta,
      reason: reason,
      note: note,
      adjusted_by: currentUser?.name || "JDS Admin",
      created_at: new Date().toISOString(),
    };
    setStockLogs((prev) => [logItem, ...prev]);

    const sign = totalPairsDelta >= 0 ? `+${totalPairsDelta}` : `${totalPairsDelta}`;
    const notifObj = {
      id: `notif-bulk-adj-${Date.now()}`,
      title: "Stock Adjusted (All Sizes)",
      message: `${sign} pairs updated by ${currentUser?.name || "Admin"} across sizes (${reason}${note ? `: ${note}` : ""}).`,
      time: "Just now",
      unread: true,
      type: "stock",
      targetTab: "inventory",
      productId: productId,
      productName: targetProd?.name,
    };

    setNotifications((prev) => [notifObj, ...prev]);

    // Async push to Supabase
    if (supabase) {
      (async () => {
        try {
          for (const adj of variantAdjustments) {
            if (adj.newStock !== undefined) {
              await supabase.from("inventory").upsert({
                variant_id: adj.variantId,
                quantity: Math.max(0, Number(adj.newStock)),
                updated_at: new Date().toISOString(),
              });
            }
          }
          await supabase.from("notifications").insert({
            id: notifObj.id,
            title: notifObj.title,
            message: notifObj.message,
            time: "Just now",
            unread: true,
            type: "stock",
            target_tab: "inventory",
            product_id: productId,
          });
        } catch (adjErr) {
          console.warn("[Supabase Sync] Bulk adjust async push notice:", adjErr.message);
        }
      })();
    }
  };

  // Product Operations
  const addProduct = (newProduct) => {
    // Generate valid RFC UUID for Supabase
    const prodId = typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `00000000-0000-4000-8000-${Date.now().toString().slice(-12).padStart(12, "0")}`;
    const usedBarcodes = new Set(products.flatMap((product) => (product.variants || []).map((variant) => String(variant.barcode || "").trim()).filter(Boolean)));

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
      variants: newProduct.variants.map((v, i) => {
        const vId = typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `00000000-0000-4000-8000-${(Date.now() + i + 1).toString().slice(-12).padStart(12, "0")}`;
        const requestedBarcode = String(v.barcode || "").trim();
        const barcodeVal = requestedBarcode && !usedBarcodes.has(requestedBarcode)
          ? requestedBarcode
          : generateUniqueVariantBarcode(usedBarcodes);
        usedBarcodes.add(barcodeVal);

        return {
          id: vId,
          product_id: prodId,
          size: String(v.size),
          color: v.color || "Standard",
          cost_price: Number(v.cost_price) || 0,
          selling_price: Number(v.selling_price) || 0,
          sku: v.sku || `JDS-${newProduct.article_no}-${v.size}`,
          barcode: barcodeVal,
          stock: Math.max(0, Number(v.stock) || 0),
          reorder_level: Number(v.reorder_level) || 3,
        };
      }),
    };

    setProducts((prev) => [formatted, ...prev]);

    setNotifications((prev) => [
      {
        id: `notif-prod-${Date.now()}`,
        title: "Product Added",
        message: `New footwear model ${formatted.name} (${formatted.article_no}) saved with ${formatted.variants.length} barcoded sizes.`,
        time: "Just now",
        unread: true,
        type: "stock",
        targetTab: "inventory",
        productId: formatted.id,
        productName: formatted.name,
      },
      ...prev,
    ]);

    // Record stock inward audit log for admin accountability
    const totalNewStock = formatted.variants.reduce((sum, v) => sum + (v.stock || 0), 0);
    const addLog = {
      id: `log-add-${Date.now()}`,
      product_id: formatted.id,
      product_name: formatted.name,
      article_no: formatted.article_no,
      delta: totalNewStock,
      reason: "New Footwear Intake",
      note: `Added model with ${formatted.variants.length} barcoded sizes`,
      adjusted_by: currentUser?.name || "JDS Admin",
      created_at: new Date().toISOString(),
    };
    setStockLogs((prev) => [addLog, ...prev]);

    // Push to Supabase backend immediately
    if (supabase) {
      (async () => {
        try {
          await supabase.from("products").insert({
            id: formatted.id,
            name: formatted.name,
            brand: formatted.brand,
            category: formatted.category,
            article_no: formatted.article_no,
            is_active: true,
          });

          for (const v of formatted.variants) {
            await supabase.from("product_variants").insert({
              id: v.id,
              product_id: formatted.id,
              size: v.size,
              color: v.color,
              sku: v.sku,
              barcode: v.barcode,
              selling_price: v.selling_price,
              cost_price: v.cost_price,
            });
            await supabase.from("inventory").insert({
              variant_id: v.id,
              quantity: v.stock,
              reorder_level: v.reorder_level,
            });
          }
        } catch (err) {
          console.warn("[Supabase Sync] Product creation sync notice:", err.message);
        }
      })();
    }

    return formatted;
  };

  const updateProduct = (productId, updatedData) => {
    let oldProd = null;

    setProducts((prev) =>
      prev.map((prod) => {
        if (prod.id !== productId) return prod;
        oldProd = prod;

        let mergedVariants = prod.variants;
        if (Array.isArray(updatedData.variants)) {
          mergedVariants = updatedData.variants.map((v) => ({
            ...v,
            selling_price: Number(v.selling_price) || 0,
            cost_price: Number(v.cost_price) || 0,
            stock: Math.max(0, Number(v.stock) || 0),
          }));
        }

        return {
          ...prod,
          ...updatedData,
          variants: mergedVariants,
        };
      })
    );

    // Audit trail if variant stock or prices changed
    if (updatedData.variants && oldProd) {
      const oldTotal = oldProd.variants.reduce((s, v) => s + (v.stock || 0), 0);
      const newTotal = updatedData.variants.reduce((s, v) => s + (Number(v.stock) || 0), 0);
      const delta = newTotal - oldTotal;

      const logItem = {
        id: `log-edit-${Date.now()}`,
        product_id: productId,
        product_name: updatedData.name || oldProd.name,
        article_no: updatedData.article_no || oldProd.article_no,
        delta: delta,
        reason: "Product Details & Price Edit",
        note: `Updated product attributes, pricing, and stock (Net delta: ${delta >= 0 ? `+${delta}` : delta} pairs)`,
        adjusted_by: currentUser?.name || "JDS Admin",
        created_at: new Date().toISOString(),
      };
      setStockLogs((prev) => [logItem, ...prev]);
    }

    // Async push updates to Supabase
    if (supabase) {
      (async () => {
        try {
          const { data: pData } = await supabase
            .from("products")
            .select("id")
            .eq("article_no", oldProd?.article_no || updatedData.article_no)
            .limit(1);
          const prodUUID = pData?.[0]?.id || toUUID(productId);

          await supabase.from("products").upsert({
            id: prodUUID,
            name: updatedData.name || oldProd?.name,
            brand: updatedData.brand || oldProd?.brand,
            category: mapCategoryForSupabase(updatedData.category || oldProd?.category),
            article_no: updatedData.article_no || oldProd?.article_no,
            is_active: true,
            updated_at: new Date().toISOString(),
          }, { onConflict: "article_no" });

          if (Array.isArray(updatedData.variants)) {
            for (const v of updatedData.variants) {
              const sku = v.sku || `JDS-${updatedData.article_no || oldProd?.article_no}-${v.size}`;
              const { data: vData } = await supabase.from("product_variants").upsert({
                id: toUUID(v.id),
                product_id: prodUUID,
                size: String(v.size),
                color: v.color || "Standard",
                sku: sku,
                barcode: v.barcode || null,
                selling_price: Number(v.selling_price) || 0,
                cost_price: Number(v.cost_price) || 0,
              }, { onConflict: "sku" }).select("id");

              const varUUID = vData?.[0]?.id || toUUID(v.id);
              await supabase.from("inventory").upsert({
                variant_id: varUUID,
                quantity: Number(v.stock) || 0,
                reorder_level: Number(v.reorder_level) || 3,
                updated_at: new Date().toISOString(),
              }, { onConflict: "variant_id" });
            }
          }
        } catch (err) {
          console.warn("[Supabase Sync] Product update notice:", err.message);
        }
      })();
    }
  };

  const deleteProduct = (productId) => {
    setProducts((prev) => prev.filter((prod) => prod.id !== productId));
  };

  const isAdmin = currentUser?.role === "Admin";

  // User Management Actions (Admin alone can edit and delete users)
  const switchUser = (userId) => {
    const target = users.find((u) => u.id === userId);
    if (target) {
      const sanitized = target.name.toLowerCase() === "raj" ? { ...target, role: "Staff" } : target;
      setCurrentUser(sanitized);
      localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(sanitized));
      return sanitized;
    }
    return null;
  };

  const addUser = (userData) => {
    if (!isAdmin) {
      alert("Permission Denied: Only Administrator can add new users.");
      return null;
    }
    const role = userData.name.toLowerCase() === "raj" ? "Staff" : (userData.role || "Cashier");
    const newUser = {
      id: `usr-${Date.now()}`,
      name: userData.name.trim(),
      role: role,
      pin: userData.pin || "1234",
      phone: userData.phone || "",
      is_active: true,
      created_at: new Date().toISOString(),
    };
    setUsers((prev) => [...prev, newUser]);
    if (supabase) {
      supabase.from("store_users").insert(newUser).then(() => {});
    }
    return newUser;
  };

  const updateUser = (userId, updatedData) => {
    if (!isAdmin) {
      alert("Permission Denied: Only Administrator can edit user accounts.");
      return false;
    }
    const sanitized = { ...updatedData };
    if (sanitized.name?.toLowerCase() === "raj") {
      sanitized.role = "Staff"; // Ensure Raj is strictly Staff
    }
    setUsers((prev) =>
      prev.map((u) => (u.id === userId ? { ...u, ...sanitized } : u))
    );
    if (currentUser?.id === userId) {
      setCurrentUser((prev) => ({ ...prev, ...sanitized }));
    }
    if (supabase) {
      supabase.from("store_users").update(sanitized).eq("id", userId).then(() => {});
    }
    return true;
  };

  const deleteUser = (userId) => {
    if (!isAdmin) {
      alert("Permission Denied: Only Administrator can delete user accounts.");
      return false;
    }
    if (users.length <= 1) {
      alert("At least one user account must remain active.");
      return false;
    }
    setUsers((prev) => prev.filter((u) => u.id !== userId));
    if (currentUser?.id === userId) {
      const nextUser = users.find((u) => u.id !== userId);
      if (nextUser) setCurrentUser(nextUser);
    }
    if (supabase) {
      supabase.from("store_users").delete().eq("id", userId).then(() => {});
    }
    return true;
  };

  // Feature: Add new size variant to any footwear product
  const addVariantToProduct = (productId, variantData) => {
    const prod = products.find((p) => p.id === productId);
    if (!prod) return { success: false, message: "Footwear model not found." };

    const sizeStr = String(variantData.size || "").trim();
    if (!sizeStr) return { success: false, message: "Size number / name is required." };

    const exists = prod.variants.some(
      (v) => String(v.size).toLowerCase() === sizeStr.toLowerCase()
    );
    if (exists) {
      return {
        success: false,
        message: `Size ${sizeStr} already exists for ${prod.name}. You can adjust its stock directly.`,
      };
    }

    const varId = `var-${prod.id.replace("prod-", "")}-${sizeStr.replace(/[^a-zA-Z0-9]/g, "")}-${Date.now().toString().slice(-4)}`;
    const usedBarcodes = new Set(products.flatMap((product) => (product.variants || []).map((variant) => String(variant.barcode || "").trim()).filter(Boolean)));
    const requestedBarcode = String(variantData.barcode || "").trim();
    const barcode = requestedBarcode && !usedBarcodes.has(requestedBarcode)
      ? requestedBarcode
      : generateUniqueVariantBarcode(usedBarcodes);
    usedBarcodes.add(barcode);
    const sku = variantData.sku?.trim() || `JDS-${prod.article_no}-${sizeStr}`;
    const costPrice = Number(variantData.cost_price) || prod.variants[0]?.cost_price || 500;
    const sellingPrice = Number(variantData.selling_price) || prod.variants[0]?.selling_price || 999;
    const initialStock = Number(variantData.stock) || 0;
    const reorderLevel = Number(variantData.reorder_level) || 3;

    const newVariant = {
      id: varId,
      size: sizeStr,
      color: variantData.color?.trim() || prod.variants[0]?.color || "Standard",
      cost_price: costPrice,
      selling_price: sellingPrice,
      sku: sku,
      barcode: barcode,
      stock: initialStock,
      reorder_level: reorderLevel,
    };

    setProducts((prev) =>
      prev.map((p) => {
        if (p.id !== productId) return p;
        const updatedVariants = [...p.variants, newVariant].sort((a, b) => {
          const numA = parseFloat(a.size);
          const numB = parseFloat(b.size);
          if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
          return String(a.size).localeCompare(String(b.size));
        });
        return { ...p, variants: updatedVariants };
      })
    );

    // Stock audit trail for admin accountability
    const addLog = {
      id: `log-size-${Date.now()}`,
      product_id: prod.id,
      product_name: prod.name,
      article_no: prod.article_no,
      size: sizeStr,
      delta: initialStock,
      reason: "New Size Variant Added",
      note: `Added size ${sizeStr} (Barcode: ${barcode}) with initial stock ${initialStock} pairs`,
      adjusted_by: currentUser?.name || "JDS Staff",
      created_at: new Date().toISOString(),
    };
    setStockLogs((prev) => [addLog, ...prev]);

    setNotifications((prev) => [
      {
        id: `notif-size-${Date.now()}`,
        title: "New Size Added",
        message: `Added size ${sizeStr} to ${prod.name} with barcode ${barcode}.`,
        time: "Just now",
        unread: true,
        type: "stock",
        targetTab: "inventory",
        productId: prod.id,
        productName: prod.name,
      },
      ...prev,
    ]);

    // Async sync to Supabase
    if (supabase) {
      (async () => {
        try {
          const { data: pData } = await supabase
            .from("products")
            .select("id")
            .eq("article_no", prod.article_no)
            .limit(1);
          const prodUUID = pData?.[0]?.id || toUUID(prod.id);
          const varUUID = toUUID(newVariant.id);

          const { data: vData, error: varErr } = await supabase.from("product_variants").upsert({
            id: varUUID,
            product_id: prodUUID,
            size: String(newVariant.size),
            color: newVariant.color,
            sku: newVariant.sku,
            barcode: newVariant.barcode,
            selling_price: Number(newVariant.selling_price) || 0,
            cost_price: Number(newVariant.cost_price) || 0,
          }, { onConflict: "sku" }).select("id");
          if (varErr) throw varErr;

          const savedVarId = vData?.[0]?.id || varUUID;
          await supabase.from("inventory").upsert({
            variant_id: savedVarId,
            quantity: Number(newVariant.stock) || 0,
            reorder_level: Number(newVariant.reorder_level) || 3,
            updated_at: new Date().toISOString(),
          }, { onConflict: "variant_id" });
        } catch (err) {
          console.warn("[Supabase Sync] Add variant notice:", err.message);
        }
      })();
    }

    return { success: true, variant: newVariant };
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

    // Accountability log
    const refLog = {
      id: `log-ref-${Date.now()}`,
      product_id: sale.id,
      product_name: `Invoice ${sale.invoice_no} Refund`,
      article_no: "REFUND",
      delta: sale.items?.length || 1,
      reason: "Customer Return & Refund",
      note: `Stock restored for invoice ${sale.invoice_no}`,
      adjusted_by: currentUser?.name || "JDS Admin",
      created_at: new Date().toISOString(),
    };
    setStockLogs((prev) => [refLog, ...prev]);

    setNotifications((prev) => [
      {
        id: `notif-ref-${Date.now()}`,
        title: "Invoice Refunded",
        message: `Invoice ${sale.invoice_no} marked as refunded by ${currentUser?.name || "Admin"}. Stock restored.`,
        time: "Just now",
        unread: true,
        type: "sale",
        targetTab: "transactions",
        invoiceNo: sale.invoice_no,
        saleId: sale.id,
      },
      ...prev,
    ]);

    if (supabase) {
      supabase.from("sales").update({ status: "Refunded" }).eq("id", saleId).then(() => {});
    }
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
    localStorage.removeItem(STORAGE_KEYS.STOCK_LOGS);
    setProducts(initialProducts);
    setSales(initialSales);
    setSettings(initialShopSettings);
    setNotifications(initialNotifications);
    setStockLogs(initialStockLogs);
    setCart([]);
  };

  const markNotificationRead = (id) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, unread: false } : n))
    );
    if (supabase) {
      supabase.from("notifications").update({ unread: false }).eq("id", id).then(() => {});
    }
  };

  const markAllNotificationsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, unread: false })));
    if (supabase) {
      supabase.from("notifications").update({ unread: false }).neq("id", "0").then(() => {});
    }
  };

  // Clear single notification after clicking and checking or explicit dismissal
  const clearNotification = (id) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    if (supabase) {
      supabase.from("notifications").delete().eq("id", id).then(() => {});
    }
  };

  // Clear all notifications completely
  const clearAllNotifications = () => {
    setNotifications([]);
    if (supabase) {
      supabase.from("notifications").delete().neq("id", "0").then(() => {});
    }
  };

  // Clickable notification handler: clears notification after clicking/checking and navigates directly with pinpoint highlighting
  const handleNotificationClick = (notification) => {
    if (!notification) return;
    
    // Feature: let the notification be cleared after clicking and checking that
    clearNotification(notification.id);

    const target =
      notification.targetTab ||
      (notification.type === "sale" || notification.invoiceNo || notification.title?.includes("Sale")
        ? "transactions"
        : notification.type === "stock" || notification.productId || notification.title?.includes("Stock")
        ? "inventory"
        : "dashboard");

    setActiveTab(target);

    // Set pinpoint highlight target with timestamp
    setHighlightTarget({
      tab: target,
      invoiceNo: notification.invoiceNo,
      saleId: notification.saleId,
      productId: notification.productId,
      productName: notification.productName,
      timestamp: Date.now(),
    });

    if (target === "transactions") {
      if (notification.invoiceNo) {
        setTargetInvoiceFilter(notification.invoiceNo);
      }
    } else if (target === "inventory") {
      if (notification.productName) {
        setTargetInventoryFilter(notification.productName);
      } else if (notification.productId) {
        const foundProd = products.find((p) => p.id === notification.productId);
        if (foundProd) {
          setTargetInventoryFilter(foundProd.name || foundProd.article_no);
        }
      }
    }
  };

  const clearHighlightTarget = () => setHighlightTarget(null);

  // Helper to ensure valid RFC-4122 UUID for PostgreSQL
  const toUUID = (str) => {
    if (typeof str === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(str)) {
      return str;
    }
    const hex = Array.from(String(str))
      .map((c) => c.charCodeAt(0).toString(16))
      .join("")
      .padEnd(32, "0")
      .slice(0, 32);
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-a${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
  };

  // Clear mock / demo data to start a real-time store with fresh inventory
  const clearAllData = () => {
    localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify([]));
    localStorage.setItem(STORAGE_KEYS.SALES, JSON.stringify([]));
    localStorage.setItem(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify([]));
    localStorage.setItem(STORAGE_KEYS.STOCK_LOGS, JSON.stringify([]));
    setProducts([]);
    setSales([]);
    setNotifications([]);
    setStockLogs([]);
    setCart([]);
  };

  // Category mapping helper to conform strictly with PostgreSQL table check constraints
  const mapCategoryForSupabase = (cat) => {
    if (!cat) return "Gents";
    const s = String(cat).trim().toLowerCase();
    if (s.includes("girl")) return "Girls";
    if (s.includes("women") || s.includes("ladies") || s.includes("female")) return "Ladies";
    if (s.includes("boy")) return "Boys";
    if (s.includes("kid") || s.includes("child")) return "Boys";
    if (s.includes("men") || s.includes("gents") || s.includes("male")) return "Gents";
    return "Gents";
  };

  // Sync entire local catalog to Supabase with valid UUIDs, Barcodes, and PostgreSQL constraint compliance
  const syncCatalogToSupabase = async () => {
    if (!supabase) return { success: false, message: "Supabase client not configured in .env" };
    try {
      for (const prod of products) {
        const { data: prodData, error: prodErr } = await supabase.from("products").upsert({
          name: prod.name,
          brand: prod.brand,
          category: mapCategoryForSupabase(prod.category),
          article_no: prod.article_no,
          is_active: true,
          updated_at: new Date().toISOString(),
        }, { onConflict: "article_no" }).select("id");
        if (prodErr) throw prodErr;
        const prodUUID = prodData?.[0]?.id || toUUID(prod.id);

        for (const v of prod.variants) {
          const sku = v.sku || `JDS-${prod.article_no}-${v.size}`;
          const { data: varData, error: varErr } = await supabase.from("product_variants").upsert({
            product_id: prodUUID,
            size: String(v.size),
            color: v.color || "Standard",
            sku: sku,
            barcode: v.barcode || null,
            selling_price: Number(v.selling_price) || 0,
            cost_price: Number(v.cost_price) || 0,
          }, { onConflict: "sku" }).select("id");
          if (varErr) throw varErr;
          const varUUID = varData?.[0]?.id || toUUID(v.id);

          const { error: invErr } = await supabase.from("inventory").upsert({
            variant_id: varUUID,
            quantity: Number(v.stock) || 0,
            reorder_level: Number(v.reorder_level) || 3,
            updated_at: new Date().toISOString(),
          }, { onConflict: "variant_id" });
          if (invErr) throw invErr;
        }
      }
      return { success: true, message: "Footwear catalog, sizes & barcodes synced to Supabase successfully!" };
    } catch (err) {
      console.error("Sync error:", err);
      return { success: false, message: `Supabase sync error: ${err.message}` };
    }
  };

  const value = {
    activeTab,
    setActiveTab,
    searchTerm,
    setSearchTerm,
    targetInvoiceFilter,
    setTargetInvoiceFilter,
    targetInventoryFilter,
    setTargetInventoryFilter,
    highlightTarget,
    setHighlightTarget,
    clearHighlightTarget,
    dbStatus,
    products,
    sales,
    settings,
    notifications,
    users,
    currentUser,
    setCurrentUser,
    switchUser,
    addUser,
    updateUser,
    deleteUser,
    isAdmin,
    isAuthenticated,
    login,
    logout,
    addVariantToProduct,
    stockLogs,
    cart,
    addToCart,
    updateCartQty,
    updateCartItemDiscount,
    updateCartItemTaxRate,
    removeFromCart,
    clearCart,
    completeCheckout,
    addProduct,
    updateProduct,
    deleteProduct,
    adjustStock,
    bulkAdjustStock,
    refundSale,
    updateSettings,
    resetToDemoData,
    clearAllData,
    markNotificationRead,
    markAllNotificationsRead,
    clearNotification,
    clearAllNotifications,
    handleNotificationClick,
    syncCatalogToSupabase,
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
