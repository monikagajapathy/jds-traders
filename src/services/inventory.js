import { requireSupabase } from "./supabase.js";

export async function listInventory() {
  const client = requireSupabase();
  const { data, error } = await client
    .from("inventory")
    .select(`
      variant_id, quantity_on_hand, reorder_level, updated_at,
      product_variants (
        id, sku, barcode, size_label, color, selling_price, purchase_cost,
        products (id, article_code, name, brand, category)
      )
    `)
    .order("updated_at", { ascending: false });

  if (error) throw error;
  return data ?? [];
}

// Stock must be adjusted through the secured database function, not by directly
// editing inventory.quantity_on_hand from the browser.
export async function adjustStock({ variantId, quantityDelta, reason, note = "" }) {
  const client = requireSupabase();
  const { data, error } = await client.rpc("adjust_inventory", {
    p_variant_id: variantId,
    p_quantity_delta: quantityDelta,
    p_reason: reason,
    p_note: note || null,
  });

  if (error) throw error;
  return data;
}
