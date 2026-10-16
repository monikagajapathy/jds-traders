import { requireSupabase } from "./supabase.js";

export async function searchProducts(searchText = "") {
  const client = requireSupabase();
  const term = searchText.trim();

  let query = client
    .from("products")
    .select(`
      id, article_code, name, brand, category, description, active,
      product_variants (
        id, sku, barcode, size_label, color, selling_price, purchase_cost,
        inventory (quantity_on_hand, reorder_level)
      )
    `)
    .eq("active", true)
    .order("name");

  if (term) {
    // Search general product fields. SKU/barcode matching can be added with a
    // dedicated RPC if you need one unified search across related variants.
    query = query.or(
      `name.ilike.%${term}%,article_code.ilike.%${term}%,brand.ilike.%${term}%`
    );
  }

  const { data, error } = await query;
  if (error) throw error;

  return (data ?? []).map((product) => ({
    ...product,
    product_variants: (product.product_variants ?? []).map((variant) => ({
      ...variant,
      inventory: Array.isArray(variant.inventory)
        ? variant.inventory[0] ?? null
        : variant.inventory,
    })),
  }));
}

export async function createProduct(product) {
  const client = requireSupabase();
  const { data, error } = await client
    .from("products")
    .insert({
      article_code: product.article_code,
      name: product.name,
      brand: product.brand || null,
      category: product.category,
      description: product.description || null,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}
