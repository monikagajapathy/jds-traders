/**
 * Returns a printable barcode value, not a barcode graphic.
 * This is a convenient internal identifier, not a guarantee of uniqueness.
 * For production, use a database-enforced unique SKU/barcode and a standards-
 * compliant barcode encoder (for example Code 128) to create the scannable SVG.
 */
export function makeDraftBarcode() {
  const timePart = Date.now().toString().slice(-8);
  const randomPart = Math.floor(1000 + Math.random() * 9000);
  return `JDS${timePart}${randomPart}`;
}
