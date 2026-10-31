// In-app Code 128-B barcode generation. No network/API dependency.
// Code 128-B supports the JDS alphanumeric identifiers used by this POS.
const CODE128_PATTERNS = {
  0: "BaBbBb",
  1: "BbBaBb",
  2: "BbBbBa",
  3: "AbAbBc",
  4: "AbAcBb",
  5: "AcAbBb",
  6: "AbBbAc",
  7: "AbBcAb",
  8: "AcBbAb",
  9: "BbAbAc",
  10: "BbAcAb",
  11: "BcAbAb",
  12: "AaBbCb",
  13: "AbBaCb",
  14: "AbBbCa",
  15: "AaCbBb",
  16: "AbCaBb",
  17: "AbCbBa",
  18: "BbCbAa",
  19: "BbAaCb",
  20: "BbAbCa",
  21: "BaCbAb",
  22: "BbCaAb",
  23: "CaBaCa",
  24: "CaAbBb",
  25: "CbAaBb",
  26: "CbAbBa",
  27: "CaBbAb",
  28: "CbBaAb",
  29: "CbBbAa",
  30: "BaBaBc",
  31: "BaBcBa",
  32: "BcBaBa",
  33: "AaAcBc",
  34: "AcAaBc",
  35: "AcAcBa",
  36: "AaBcAc",
  37: "AcBaAc",
  38: "AcBcAa",
  39: "BaAcAc",
  40: "BcAaAc",
  41: "BcAcAa",
  42: "AaBaCc",
  43: "AaBcCa",
  44: "AcBaCa",
  45: "AaCaBc",
  46: "AaCcBa",
  47: "AcCaBa",
  48: "CaCaBa",
  49: "BaAcCa",
  50: "BcAaCa",
  51: "BaCaAc",
  52: "BaCcAa",
  53: "BaCaCa",
  54: "CaAaBc",
  55: "CaAcBa",
  56: "CcAaBa",
  57: "CaBaAc",
  58: "CaBcAa",
  59: "CcBaAa",
  60: "CaDaAa",
  61: "BbAdAa",
  62: "DcAaAa",
  63: "AaAbBd",
  64: "AaAdBb",
  65: "AbAaBd",
  66: "AbAdBa",
  67: "AdAaBb",
  68: "AdAbBa",
  69: "AaBbAd",
  70: "AaBdAb",
  71: "AbBaAd",
  72: "AbBdAa",
  73: "AdBaAb",
  74: "AdBbAa",
  75: "BdAbAa",
  76: "BbAaAd",
  77: "DaCaAa",
  78: "BdAaAb",
  79: "AcDaAa",
  80: "AaAbDb",
  81: "AbAaDb",
  82: "AbAbDa",
  83: "AaDbAb",
  84: "AbDaAb",
  85: "AbDbAa",
  86: "DaAbAb",
  87: "DbAaAb",
  88: "DbAbAa",
  89: "BaBaDa",
  90: "BaDaBa",
  91: "DaBaBa",
  92: "AaAaDc",
  93: "AaAcDa",
  94: "AcAaDa",
  95: "AaDaAc",
  96: "AaDcAa",
  97: "DaAaAc",
  98: "DaAcAa",
  99: "AaCaDa",
  100: "AaDaCa",
  101: "CaAaDa",
  102: "DaAaCa",
  103: "BaAdAb",
  104: "BaAbAd",
  105: "BaAbCb",
  106: "BcCaAaB"
};

const randomHex = (length = 12) => {
  const bytes = new Uint8Array(Math.ceil(length / 2));
  if (globalThis.crypto?.getRandomValues) {
    globalThis.crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < bytes.length; i += 1) bytes[i] = Math.floor(Math.random() * 256);
  }
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("").toUpperCase().slice(0, length);
};

/** Creates a stable-looking, app-owned identifier and checks the supplied set. */
export function generateUniqueVariantBarcode(usedBarcodes = new Set()) {
  let candidate;
  let attempts = 0;
  do {
    candidate = `JDS-${randomHex(12)}`;
    attempts += 1;
    if (attempts > 20) throw new Error("Unable to generate a unique barcode. Please try again.");
  } while (usedBarcodes.has(candidate));
  usedBarcodes.add(candidate);
  return candidate;
}

/** Returns the Code 128-B module sequence (bars/spaces) including checksum + stop. */
export function encodeCode128B(value) {
  const text = String(value ?? "");
  if (!text || [...text].some((char) => char.charCodeAt(0) < 32 || char.charCodeAt(0) > 126)) {
    throw new Error("Code 128-B supports printable ASCII characters only.");
  }
  const codes = [104, ...[...text].map((char) => char.charCodeAt(0) - 32)];
  const checksum = codes.reduce((sum, code, index) => sum + code * index, 0) % 103;
  codes.push(checksum, 106);

  return codes.map((code) => CODE128_PATTERNS[code]).join("");
}

/** Builds bar rectangles for a crisp, scanner-readable SVG. */
export function getCode128Bars(value) {
  const encoded = encodeCode128B(value);
  const bars = [];
  let x = 10;
  let isBar = true;
  for (const token of encoded) {
    const width = token.toLowerCase().charCodeAt(0) - 96;
    if (isBar) bars.push({ x, width });
    x += width;
    isBar = !isBar;
  }
  return { bars, width: x + 10 };
}
