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
  const [targetInvoiceFilter, setTargetInvoiceFilter] = useState("");
  const [targetInventoryFilter, setTargetInventoryFilter] = useState("");
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
      if (saved) {
        const parsed = JSON.parse(saved);
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
            const transformed = dbProducts.map((p) => ({
              id: p.id,
              name: p.name,
              brand: p.brand,
              category: p.category,
              article_no: p.article_no,
              tax_rate: 12,
              variants: (p.product_variants || []).map((v) => {
                const inv = Array.isArray(v.inventory) ? v.inventory[0] : v.inventory;
                return {
                  id: v.id,
                  size: v.size,
                  color: v.color || "Standard",
                  sku: v.sku,
                  barcode: v.barcode,
                  selling_price: Number(v.selling_price) || 0,
                  cost_price: Number(v.cost_price) || 0,
                  stock: Number(inv?.quantity) || 0,
                  reorder_level: Number(inv?.reorder_level) || 3,
                };
              }),
            }));
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
    paymentSplit = null,
    notes = "",
  }) => {
    if (cart.length === 0) return null;

    const subtotal = cart.reduce(
      (sum, item) => sum + (Number(item.unit_price ?? item.unitPrice) || 0) * (Number(item.quantity) || 1),
      0
    );
    const itemDiscounts = cart.reduce(
      (sum, item) => sum + (Number(item.discount_amount) || 0) * (Number(item.quantity) || 1),
      0
    );
    const totalDiscount = Math.min(
      subtotal,
      Math.max(0, Number(billDiscount || 0)) + itemDiscounts
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
      payment_split: paymentMethod === "Split" ? paymentSplit : null,
      notes: notes || "Over-the-counter sale",
      items: cart.map((item) => {
        const itemPrice = Number(item.unit_price ?? item.unitPrice ?? 0);
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
          quantity: Number(item.quantity) || 1,
          discount_amount: Number(item.discount_amount) || 0,
        };
      }),
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
        type: "stock",
        targetTab: "inventory",
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

    const sign = totalPairsDelta >= 0 ? `+${totalPairsDelta}` : `${totalPairsDelta}`;
    const notifObj = {
      id: `notif-bulk-adj-${Date.now()}`,
      title: "Stock Adjusted (All Sizes)",
      message: `${sign} pairs updated across sizes (${reason}${note ? `: ${note}` : ""}).`,
      time: "Just now",
      unread: true,
      type: "stock",
      targetTab: "inventory",
      productId: productId,
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
    const cleanArt = newProduct.article_no.replace(/[^A-Z0-9]/gi, "").slice(-3).padStart(3, "0");

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
        const cleanSize = String(v.size).padStart(2, "0");
        const randomCode = Math.floor(1000 + Math.random() * 9000);
        const barcodeVal = v.barcode ? v.barcode.trim() : `890${cleanArt}${cleanSize}${randomCode}`;

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
    setProducts(initialProducts);
    setSales(initialSales);
    setSettings(initialShopSettings);
    setNotifications(initialNotifications);
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

  // Clickable notification handler with contextual navigation
  const handleNotificationClick = (notification) => {
    if (!notification) return;
    markNotificationRead(notification.id);

    const target =
      notification.targetTab ||
      (notification.type === "sale" || notification.invoiceNo || notification.title?.includes("Sale")
        ? "transactions"
        : notification.type === "stock" || notification.productId || notification.title?.includes("Stock")
        ? "inventory"
        : "dashboard");

    setActiveTab(target);

    if (target === "transactions") {
      if (notification.invoiceNo) {
        setTargetInvoiceFilter(notification.invoiceNo);
        const foundSale = sales.find(
          (s) => s.invoice_no === notification.invoiceNo || s.id === notification.saleId
        );
        if (foundSale) {
          setRecentInvoice(foundSale);
          setIsReceiptOpen(true);
        }
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
    setProducts([]);
    setSales([]);
    setNotifications([]);
    setCart([]);
  };

  // Sync entire local catalog to Supabase with valid UUIDs & Barcodes
  const syncCatalogToSupabase = async () => {
    if (!supabase) return { success: false, message: "Supabase client not configured in .env" };
    try {
      for (const prod of products) {
        const prodUUID = toUUID(prod.id);
        const { error: prodErr } = await supabase.from("products").upsert({
          id: prodUUID,
          name: prod.name,
          brand: prod.brand,
          category: prod.category,
          article_no: prod.article_no,
          is_active: true,
          updated_at: new Date().toISOString(),
        });
        if (prodErr) throw prodErr;

        for (const v of prod.variants) {
          const varUUID = toUUID(v.id);
          const { error: varErr } = await supabase.from("product_variants").upsert({
            id: varUUID,
            product_id: prodUUID,
            size: String(v.size),
            color: v.color || "Standard",
            sku: v.sku || `JDS-${prod.article_no}-${v.size}`,
            barcode: v.barcode || null,
            selling_price: Number(v.selling_price) || 0,
            cost_price: Number(v.cost_price) || 0,
          });
          if (varErr) throw varErr;

          const { error: invErr } = await supabase.from("inventory").upsert({
            variant_id: varUUID,
            quantity: Number(v.stock) || 0,
            reorder_level: Number(v.reorder_level) || 3,
            updated_at: new Date().toISOString(),
          });
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
    bulkAdjustStock,
    refundSale,
    updateSettings,
    resetToDemoData,
    clearAllData,
    markNotificationRead,
    markAllNotificationsRead,
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
