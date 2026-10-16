export function formatINR(value) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(Number(value ?? 0));
}

export function calculateCartPreview(items, discountAmount = 0, taxRate = 0) {
  const subtotal = items.reduce(
    (sum, item) => sum + Number(item.unitPrice) * Number(item.quantity),
    0
  );
  const discount = Math.min(Math.max(Number(discountAmount) || 0, 0), subtotal);
  const taxableAmount = subtotal - discount;
  const tax = taxableAmount * (Math.max(Number(taxRate) || 0, 0) / 100);

  return {
    subtotal,
    discount,
    tax,
    grandTotal: taxableAmount + tax,
  };
}
