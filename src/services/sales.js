import { requireSupabase } from "./supabase.js";

/**
 * Each item must contain variant_id, quantity, and optional discount_amount.
 * The database function reads prices/costs from trusted product records and
 * computes totals on the server. Do not send a trusted total from the browser.
 */
export async function completeSale({
  customerId = null,
  discountAmount = 0,
  taxRate = 0,
  payments,
  items,
  idempotencyKey,
}) {
  const client = requireSupabase();

  if (!Array.isArray(items) || items.length === 0) {
    throw new Error("Add at least one product before completing the sale.");
  }
  if (!Array.isArray(payments) || payments.length === 0) {
    throw new Error("Add at least one payment method.");
  }
  if (!idempotencyKey) {
    throw new Error("A unique idempotency key is required for this checkout.");
  }

  const { data, error } = await client.rpc("complete_sale", {
    p_customer_id: customerId,
    p_discount_amount: discountAmount,
    p_tax_rate: taxRate,
    p_items: items,
    p_payments: payments,
    p_idempotency_key: idempotencyKey,
  });

  if (error) throw error;
  return data;
}

export async function listSales({ from, to, limit = 100 } = {}) {
  const client = requireSupabase();
  let query = client
    .from("sales")
    .select("id, invoice_number, status, subtotal, discount_amount, tax_amount, grand_total, created_at, payments(method, amount, status)")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (from) query = query.gte("created_at", from);
  if (to) query = query.lte("created_at", to);

  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}
