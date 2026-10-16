export const initialShopSettings = {
  shop_name: "JDS Traders",
  tagline: "FOOTWEAR • SINCE 2014",
  phone: "+91 98400 12345",
  email: "contact@jdstraders.com",
  address: "Shop No. 14, Commercial Plaza, Main Road, Tirupur, Tamil Nadu - 641604",
  gstin: "33AAAAA0000A1Z5",
  currency: "₹",
  default_tax_rate: 5,
  invoice_prefix: "JDS-INV-",
  footer_note: "Thank you for shopping at JDS Traders! Exchange within 7 days with original invoice in unworn condition."
};

export const initialProducts = [
  {
    id: "prod-1",
    article_no: "ART-101",
    name: "Classic Derby Oxford Leather Shoes",
    brand: "JD Signature",
    category: "Men",
    sub_category: "Formal",
    tax_rate: 12,
    is_active: true,
    variants: [
      { id: "var-101-6", size: "6", color: "Tan Brown", cost_price: 1350, selling_price: 2499, sku: "JDS-101-T-6", barcode: "890123410106", stock: 5, reorder_level: 3 },
      { id: "var-101-7", size: "7", color: "Tan Brown", cost_price: 1350, selling_price: 2499, sku: "JDS-101-T-7", barcode: "890123410107", stock: 8, reorder_level: 3 },
      { id: "var-101-8", size: "8", color: "Tan Brown", cost_price: 1350, selling_price: 2499, sku: "JDS-101-T-8", barcode: "890123410108", stock: 6, reorder_level: 4 },
      { id: "var-101-9", size: "9", color: "Tan Brown", cost_price: 1350, selling_price: 2499, sku: "JDS-101-T-9", barcode: "890123410109", stock: 2, reorder_level: 3 },
      { id: "var-101-10", size: "10", color: "Tan Brown", cost_price: 1350, selling_price: 2499, sku: "JDS-101-T-10", barcode: "890123410110", stock: 4, reorder_level: 2 },
    ]
  },
  {
    id: "prod-2",
    article_no: "ART-102",
    name: "Rugged Adventure Nubuck Boots",
    brand: "Woodland",
    category: "Men",
    sub_category: "Casual",
    tax_rate: 12,
    is_active: true,
    variants: [
      { id: "var-102-7", size: "7", color: "Camel", cost_price: 2600, selling_price: 4295, sku: "WL-102-C-7", barcode: "890123410207", stock: 3, reorder_level: 3 },
      { id: "var-102-8", size: "8", color: "Camel", cost_price: 2600, selling_price: 4295, sku: "WL-102-C-8", barcode: "890123410208", stock: 2, reorder_level: 3 },
      { id: "var-102-9", size: "9", color: "Camel", cost_price: 2600, selling_price: 4295, sku: "WL-102-C-9", barcode: "890123410209", stock: 5, reorder_level: 3 },
      { id: "var-102-10", size: "10", color: "Camel", cost_price: 2600, selling_price: 4295, sku: "WL-102-C-10", barcode: "890123410210", stock: 4, reorder_level: 2 },
    ]
  },
  {
    id: "prod-3",
    article_no: "ART-103",
    name: "Air Mesh Ultra Running Shoes",
    brand: "Campus",
    category: "Men",
    sub_category: "Sports",
    tax_rate: 12,
    is_active: true,
    variants: [
      { id: "var-103-6", size: "6", color: "Black/Red", cost_price: 720, selling_price: 1399, sku: "CAM-103-BR-6", barcode: "890123410306", stock: 7, reorder_level: 4 },
      { id: "var-103-7", size: "7", color: "Black/Red", cost_price: 720, selling_price: 1399, sku: "CAM-103-BR-7", barcode: "890123410307", stock: 12, reorder_level: 4 },
      { id: "var-103-8", size: "8", color: "Black/Red", cost_price: 720, selling_price: 1399, sku: "CAM-103-BR-8", barcode: "890123410308", stock: 9, reorder_level: 4 },
      { id: "var-103-9", size: "9", color: "Black/Red", cost_price: 720, selling_price: 1399, sku: "CAM-103-BR-9", barcode: "890123410309", stock: 8, reorder_level: 3 },
      { id: "var-103-10", size: "10", color: "Black/Red", cost_price: 720, selling_price: 1399, sku: "CAM-103-BR-10", barcode: "890123410310", stock: 5, reorder_level: 2 },
    ]
  },
  {
    id: "prod-4",
    article_no: "ART-104",
    name: "Cushioned Slip-on Loafer",
    brand: "Sparx",
    category: "Men",
    sub_category: "Casual",
    tax_rate: 5,
    is_active: true,
    variants: [
      { id: "var-104-6", size: "6", color: "Navy Blue", cost_price: 490, selling_price: 899, sku: "SPX-104-NV-6", barcode: "890123410406", stock: 6, reorder_level: 3 },
      { id: "var-104-7", size: "7", color: "Navy Blue", cost_price: 490, selling_price: 899, sku: "SPX-104-NV-7", barcode: "890123410407", stock: 8, reorder_level: 3 },
      { id: "var-104-8", size: "8", color: "Navy Blue", cost_price: 490, selling_price: 899, sku: "SPX-104-NV-8", barcode: "890123410408", stock: 10, reorder_level: 3 },
      { id: "var-104-9", size: "9", color: "Navy Blue", cost_price: 490, selling_price: 899, sku: "SPX-104-NV-9", barcode: "890123410409", stock: 5, reorder_level: 3 },
      { id: "var-104-10", size: "10", color: "Navy Blue", cost_price: 490, selling_price: 899, sku: "SPX-104-NV-10", barcode: "890123410410", stock: 1, reorder_level: 3 },
    ]
  },
  {
    id: "prod-5",
    article_no: "ART-105",
    name: "Classic Block Heel Dress Pump",
    brand: "Metro",
    category: "Women",
    sub_category: "Formal",
    tax_rate: 12,
    is_active: true,
    variants: [
      { id: "var-105-4", size: "4", color: "Glossy Black", cost_price: 980, selling_price: 1899, sku: "MET-105-BK-4", barcode: "890123410504", stock: 4, reorder_level: 2 },
      { id: "var-105-5", size: "5", color: "Glossy Black", cost_price: 980, selling_price: 1899, sku: "MET-105-BK-5", barcode: "890123410505", stock: 7, reorder_level: 3 },
      { id: "var-105-6", size: "6", color: "Glossy Black", cost_price: 980, selling_price: 1899, sku: "MET-105-BK-6", barcode: "890123410506", stock: 9, reorder_level: 3 },
      { id: "var-105-7", size: "7", color: "Glossy Black", cost_price: 980, selling_price: 1899, sku: "MET-105-BK-7", barcode: "890123410507", stock: 6, reorder_level: 3 },
      { id: "var-105-8", size: "8", color: "Glossy Black", cost_price: 980, selling_price: 1899, sku: "MET-105-BK-8", barcode: "890123410508", stock: 3, reorder_level: 2 },
    ]
  },
  {
    id: "prod-6",
    article_no: "ART-106",
    name: "Comfort Orthopedic Wedge Sandal",
    brand: "Doctor Extra Soft",
    category: "Women",
    sub_category: "Casual",
    tax_rate: 5,
    is_active: true,
    variants: [
      { id: "var-106-4", size: "4", color: "Beige", cost_price: 520, selling_price: 949, sku: "DOC-106-BG-4", barcode: "890123410604", stock: 4, reorder_level: 2 },
      { id: "var-106-5", size: "5", color: "Beige", cost_price: 520, selling_price: 949, sku: "DOC-106-BG-5", barcode: "890123410605", stock: 8, reorder_level: 3 },
      { id: "var-106-6", size: "6", color: "Beige", cost_price: 520, selling_price: 949, sku: "DOC-106-BG-6", barcode: "890123410606", stock: 11, reorder_level: 4 },
      { id: "var-106-7", size: "7", color: "Beige", cost_price: 520, selling_price: 949, sku: "DOC-106-BG-7", barcode: "890123410607", stock: 7, reorder_level: 3 },
      { id: "var-106-8", size: "8", color: "Beige", cost_price: 520, selling_price: 949, sku: "DOC-106-BG-8", barcode: "890123410608", stock: 5, reorder_level: 2 },
    ]
  },
  {
    id: "prod-7",
    article_no: "ART-107",
    name: "Tough Sole Uniform School Shoe",
    brand: "Bata",
    category: "Kids",
    sub_category: "Formal",
    tax_rate: 5,
    is_active: true,
    variants: [
      { id: "var-107-1", size: "1", color: "Black", cost_price: 380, selling_price: 699, sku: "BAT-107-BK-1", barcode: "890123410701", stock: 6, reorder_level: 3 },
      { id: "var-107-2", size: "2", color: "Black", cost_price: 380, selling_price: 699, sku: "BAT-107-BK-2", barcode: "890123410702", stock: 9, reorder_level: 3 },
      { id: "var-107-3", size: "3", color: "Black", cost_price: 380, selling_price: 699, sku: "BAT-107-BK-3", barcode: "890123410703", stock: 12, reorder_level: 4 },
      { id: "var-107-4", size: "4", color: "Black", cost_price: 380, selling_price: 699, sku: "BAT-107-BK-4", barcode: "890123410704", stock: 10, reorder_level: 3 },
      { id: "var-107-5", size: "5", color: "Black", cost_price: 380, selling_price: 699, sku: "BAT-107-BK-5", barcode: "890123410705", stock: 8, reorder_level: 3 },
    ]
  },
  {
    id: "prod-8",
    article_no: "ART-108",
    name: "Active Grip Junior Sports Sneaker",
    brand: "JD Sport",
    category: "Kids",
    sub_category: "Sports",
    tax_rate: 12,
    is_active: true,
    variants: [
      { id: "var-108-2", size: "2", color: "Electric Blue", cost_price: 580, selling_price: 1099, sku: "JDS-108-BL-2", barcode: "890123410802", stock: 5, reorder_level: 3 },
      { id: "var-108-3", size: "3", color: "Electric Blue", cost_price: 580, selling_price: 1099, sku: "JDS-108-BL-3", barcode: "890123410803", stock: 7, reorder_level: 3 },
      { id: "var-108-4", size: "4", color: "Electric Blue", cost_price: 580, selling_price: 1099, sku: "JDS-108-BL-4", barcode: "890123410804", stock: 4, reorder_level: 3 },
      { id: "var-108-5", size: "5", color: "Electric Blue", cost_price: 580, selling_price: 1099, sku: "JDS-108-BL-5", barcode: "890123410805", stock: 2, reorder_level: 3 },
    ]
  }
];

export const initialSales = [
  {
    id: "sale-1001",
    invoice_no: "JDS-INV-2026-0038",
    created_at: new Date(Date.now() - 3600000 * 2).toISOString(),
    customer: { name: "Rajesh Kumar", phone: "9876543210" },
    status: "Completed",
    subtotal: 2499,
    discount_amount: 100,
    tax_amount: 119.95,
    total: 2518.95,
    payment_method: "UPI",
    items: [
      {
        product_id: "prod-1",
        variant_id: "var-101-8",
        product_name: "Classic Derby Oxford Leather Shoes",
        article_no: "ART-101",
        brand: "JD Signature",
        size: "8",
        color: "Tan Brown",
        unit_price: 2499,
        quantity: 1,
        discount_amount: 100,
      }
    ]
  },
  {
    id: "sale-1002",
    invoice_no: "JDS-INV-2026-0039",
    created_at: new Date(Date.now() - 3600000 * 4).toISOString(),
    customer: { name: "Kavitha M", phone: "9841238910" },
    status: "Completed",
    subtotal: 2848,
    discount_amount: 150,
    tax_amount: 134.9,
    total: 2832.9,
    payment_method: "Cash",
    items: [
      {
        product_id: "prod-5",
        variant_id: "var-105-6",
        product_name: "Classic Block Heel Dress Pump",
        article_no: "ART-105",
        brand: "Metro",
        size: "6",
        color: "Glossy Black",
        unit_price: 1899,
        quantity: 1,
        discount_amount: 100,
      },
      {
        product_id: "prod-6",
        variant_id: "var-106-6",
        product_name: "Comfort Orthopedic Wedge Sandal",
        article_no: "ART-106",
        brand: "Doctor Extra Soft",
        size: "6",
        color: "Beige",
        unit_price: 949,
        quantity: 1,
        discount_amount: 50,
      }
    ]
  },
  {
    id: "sale-1003",
    invoice_no: "JDS-INV-2026-0040",
    created_at: new Date(Date.now() - 3600000 * 7).toISOString(),
    customer: { name: "Arun Prakash", phone: "9443219087" },
    status: "Completed",
    subtotal: 4295,
    discount_amount: 200,
    tax_amount: 204.75,
    total: 4299.75,
    payment_method: "Card",
    items: [
      {
        product_id: "prod-2",
        variant_id: "var-102-9",
        product_name: "Rugged Adventure Nubuck Boots",
        article_no: "ART-102",
        brand: "Woodland",
        size: "9",
        color: "Camel",
        unit_price: 4295,
        quantity: 1,
        discount_amount: 200,
      }
    ]
  },
  {
    id: "sale-1004",
    invoice_no: "JDS-INV-2026-0041",
    created_at: new Date(Date.now() - 86400000).toISOString(),
    customer: { name: "Suresh Babu", phone: "9940123765" },
    status: "Completed",
    subtotal: 1399,
    discount_amount: 0,
    tax_amount: 69.95,
    total: 1468.95,
    payment_method: "UPI",
    items: [
      {
        product_id: "prod-3",
        variant_id: "var-103-8",
        product_name: "Air Mesh Ultra Running Shoes",
        article_no: "ART-103",
        brand: "Campus",
        size: "8",
        color: "Black/Red",
        unit_price: 1399,
        quantity: 1,
        discount_amount: 0,
      }
    ]
  },
  {
    id: "sale-1005",
    invoice_no: "JDS-INV-2026-0042",
    created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
    customer: { name: "Priya Sundar", phone: "9884512903" },
    status: "Completed",
    subtotal: 1598,
    discount_amount: 100,
    tax_amount: 74.9,
    total: 1572.9,
    payment_method: "Cash",
    items: [
      {
        product_id: "prod-4",
        variant_id: "var-104-7",
        product_name: "Cushioned Slip-on Loafer",
        article_no: "ART-104",
        brand: "Sparx",
        size: "7",
        color: "Navy Blue",
        unit_price: 899,
        quantity: 1,
        discount_amount: 50,
      },
      {
        product_id: "prod-7",
        variant_id: "var-107-3",
        product_name: "Tough Sole Uniform School Shoe",
        article_no: "ART-107",
        brand: "Bata",
        size: "3",
        color: "Black",
        unit_price: 699,
        quantity: 1,
        discount_amount: 50,
      }
    ]
  }
];

export const initialNotifications = [
  { id: "notif-1", title: "Low Stock Alert", message: "Woodland Boots (Camel, Size 8) has only 2 pairs left.", time: "10 mins ago", unread: true },
  { id: "notif-2", title: "Sale Completed", message: "Invoice JDS-INV-2026-0038 for ₹2,519 via UPI.", time: "2 hours ago", unread: true },
  { id: "notif-3", title: "Low Stock Alert", message: "Sparx Loafer (Navy Blue, Size 10) has only 1 pair left.", time: "4 hours ago", unread: false },
];
