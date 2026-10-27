import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://okfxktqbbpidnmencbye.supabase.co";
const supabasePublishableKey = "sb_publishable_5cKA3QvenFz0cEUlvwoUOg_OHPLYgOE";

const supabase = createClient(supabaseUrl, supabasePublishableKey);

const newProductsData = [
  {
    id: "a0000001-0000-4000-8000-000000000001",
    article_no: "SX-701",
    name: "Casual Sneaker",
    category: "Gents",
    sub_category: "Casual",
    brand: "Sparx",
    barcode: "FW890101",
    batch_no: "BAT-2026-A",
    serial_prefix: "SN-SX701",
    colours: "Black, White",
    image: "/assets/products/sx-701.jpg",
    cost_price: 520,
    selling_price: 850,
    tax_rate: 5,
    sizes: [
      { size: "1", stock: 1 },
      { size: "2", stock: 2 },
      { size: "3", stock: 1 },
      { size: "4", stock: 2 },
      { size: "5", stock: 2 },
      { size: "6", stock: 2 },
      { size: "7", stock: 3 },
      { size: "8", stock: 4 },
      { size: "9", stock: 2 },
      { size: "10", stock: 1 },
      { size: "11", stock: 1 },
      { size: "12", stock: 2 },
      { size: "13", stock: 1 },
      { size: "S7", stock: 2 },
      { size: "S8", stock: 4 },
      { size: "S9", stock: 2 },
      { size: "S10", stock: 1 },
      { size: "S11", stock: 1 },
      { size: "S12", stock: 1 },
      { size: "S15", stock: 1 },
      { size: "S16", stock: 1 },
    ],
  },
  {
    id: "a0000001-0000-4000-8000-000000000002",
    article_no: "BT-852",
    name: "Formal Leather Shoes",
    category: "Gents",
    sub_category: "Formal",
    brand: "Bata",
    barcode: "FW890102",
    batch_no: "BAT-2026-B",
    serial_prefix: "SN-BT852",
    colours: "Black, Brown",
    image: "/assets/products/bt-852.jpg",
    cost_price: 900,
    selling_price: 1400,
    tax_rate: 12,
    sizes: [
      { size: "4", stock: 1 },
      { size: "5", stock: 1 },
      { size: "6", stock: 1 },
      { size: "7", stock: 2 },
      { size: "9", stock: 1 },
      { size: "10", stock: 1 },
      { size: "11", stock: 1 },
      { size: "12", stock: 1 },
      { size: "13", stock: 1 },
      { size: "S7", stock: 3 },
      { size: "S8", stock: 2 },
      { size: "S9", stock: 2 },
      { size: "S10", stock: 1 },
      { size: "S11", stock: 1 },
      { size: "S12", stock: 1 },
    ],
  },
  {
    id: "a0000001-0000-4000-8000-000000000003",
    article_no: "VK-04",
    name: "Ladies Fancy Flat",
    category: "Ladies",
    sub_category: "Sandals",
    brand: "VKC Pride",
    barcode: "FW890103",
    batch_no: "BAT-2026-C",
    serial_prefix: "SN-VK04",
    colours: "Black, Blue",
    image: "/assets/products/vk-04.jpg",
    cost_price: 170,
    selling_price: 280,
    tax_rate: 5,
    sizes: [
      { size: "1", stock: 3 },
      { size: "2", stock: 4 },
      { size: "3", stock: 3 },
      { size: "4", stock: 3 },
      { size: "5", stock: 4 },
      { size: "6", stock: 4 },
      { size: "7", stock: 5 },
      { size: "8", stock: 3 },
      { size: "9", stock: 4 },
      { size: "10", stock: 2 },
      { size: "11", stock: 2 },
      { size: "12", stock: 3 },
      { size: "13", stock: 2 },
      { size: "S7", stock: 5 },
      { size: "S8", stock: 4 },
      { size: "S9", stock: 4 },
      { size: "S10", stock: 2 },
      { size: "S11", stock: 2 },
      { size: "S12", stock: 1 },
      { size: "S13", stock: 1 },
      { size: "S15", stock: 2 },
      { size: "S16", stock: 2 },
      { size: "S17", stock: 1 },
      { size: "S18", stock: 1 },
    ],
  },
  {
    id: "a0000001-0000-4000-8000-000000000004",
    article_no: "CP-990",
    name: "Kids Running Shoes",
    category: "Boys",
    sub_category: "Sports",
    brand: "Campus",
    barcode: "FW890104",
    batch_no: "BAT-2026-D",
    serial_prefix: "SN-CP990",
    colours: "Grey, Black",
    image: "/assets/products/cp-990.jpg",
    cost_price: 420,
    selling_price: 699,
    tax_rate: 5,
    sizes: [
      { size: "1", stock: 4 },
      { size: "2", stock: 5 },
      { size: "3", stock: 4 },
      { size: "4", stock: 3 },
      { size: "5", stock: 2 },
    ],
  },
  {
    id: "a0000001-0000-4000-8000-000000000005",
    article_no: "GL-102",
    name: "Girls Cute Sandal",
    category: "Girls",
    sub_category: "Sandals",
    brand: "Paragon",
    barcode: "FW890105",
    batch_no: "BAT-2026-E",
    serial_prefix: "SN-GL102",
    colours: "Pink, Red",
    image: "/assets/products/gl-102.jpg",
    cost_price: 210,
    selling_price: 350,
    tax_rate: 5,
    sizes: [
      { size: "1", stock: 3 },
      { size: "2", stock: 4 },
      { size: "3", stock: 3 },
      { size: "4", stock: 2 },
      { size: "5", stock: 0 },
    ],
  },
  {
    id: "a0000001-0000-4000-8000-000000000006",
    article_no: "INF-01",
    name: "Infant Soft Booties",
    category: "Infant",
    sub_category: "Casual",
    brand: "FirstStep",
    barcode: "FW890106",
    batch_no: "BAT-2026-F",
    serial_prefix: "SN-INF01",
    colours: "Yellow, Blue",
    image: "/assets/products/inf-01.jpg",
    cost_price: 95,
    selling_price: 160,
    tax_rate: 5,
    sizes: [
      { size: "1", stock: 8 },
      { size: "2", stock: 6 },
      { size: "3", stock: 5 },
    ],
  },
];

async function sync() {
  console.log("Starting Supabase Sync...");

  // 1. Delete all existing inventory
  const { error: invDelErr } = await supabase.from("inventory").delete().neq("quantity", -99999);
  console.log("Deleted old inventory:", invDelErr || "OK");

  // 2. Delete all existing product_variants
  const { error: varDelErr } = await supabase.from("product_variants").delete().neq("selling_price", -99999);
  console.log("Deleted old variants:", varDelErr || "OK");

  // 3. Delete all existing products
  const { error: prodDelErr } = await supabase.from("products").delete().neq("tax_rate", -99999);
  console.log("Deleted old products:", prodDelErr || "OK");

  // 4. Insert new products
  let pIdx = 1;
  for (const p of newProductsData) {
    const { error: pErr } = await supabase.from("products").insert({
      id: p.id,
      article_no: p.article_no,
      name: p.name,
      category: p.category,
      brand: p.brand,
      tax_rate: p.tax_rate,
      is_active: true,
    });
    if (pErr) console.error("Error inserting product:", p.article_no, pErr);

    const variantRows = [];
    const invRows = [];

    let idx = 1;
    for (const s of p.sizes) {
      const hexIdx = idx.toString(16).padStart(12, "0");
      const varId = `b000000${pIdx}-0000-4000-8000-${hexIdx}`;
      const sku = `${p.serial_prefix}-${s.size}`;
      const barcode = `${p.barcode}-${s.size}`;

      variantRows.push({
        id: varId,
        product_id: p.id,
        sku,
        barcode,
        color: p.colours,
        size: s.size,
        cost_price: p.cost_price,
        selling_price: p.selling_price,
        is_active: true,
      });

      invRows.push({
        variant_id: varId,
        quantity: s.stock,
        reorder_level: 2,
      });

      idx++;
    }

    const { error: vErr } = await supabase.from("product_variants").insert(variantRows);
    if (vErr) console.error("Error inserting variants for:", p.article_no, vErr);

    const { error: iErr } = await supabase.from("inventory").upsert(invRows);
    if (iErr) console.error("Error upserting inventory for:", p.article_no, iErr);

    pIdx++;
  }

  console.log("Sync finished! Verifying products count...");
  const { data: finalP } = await supabase.from("products").select("article_no, name");
  console.log("Final products in Supabase:", finalP);
}

sync();
