/**
 * Generates an Indian retail footwear barcode (EAN-13 compatible prefix 890).
 * Combines GS1 India country code (890), article number code, size, and unique seed.
 */
export function generateFootwearBarcode(articleNo = "GEN", size = "07") {
  const cleanArt = String(articleNo).replace(/[^A-Z0-9]/gi, "").slice(-3).padStart(3, "0");
  const cleanSize = String(size).replace(/[^0-9]/g, "").slice(-2).padStart(2, "0");
  const randomPart = Math.floor(1000 + Math.random() * 9000);
  return `890${cleanArt}${cleanSize}${randomPart}`;
}

/**
 * Returns a printable draft barcode value.
 */
export function makeDraftBarcode() {
  const timePart = Date.now().toString().slice(-8);
  const randomPart = Math.floor(1000 + Math.random() * 9000);
  return `JDS${timePart}${randomPart}`;
}
