const fs = require('fs');
const zlib = require('zlib');
const path = require('path');

function createPngChunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const body = Buffer.concat([typeBuf, data]);
  const crcVal = zlib.crc32(body);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crcVal >>> 0, 0);
  return Buffer.concat([len, body, crcBuf]);
}

const inputPath = path.resolve('public/logo.png');
const fileBuf = fs.readFileSync(inputPath);

let idats = [];
let pos = 8;
while (pos < fileBuf.length) {
  const len = fileBuf.readUInt32BE(pos);
  const type = fileBuf.toString('ascii', pos + 4, pos + 8);
  if (type === 'IDAT') {
    idats.push(fileBuf.slice(pos + 8, pos + 8 + len));
  }
  pos += 12 + len;
}

const origW = 2000;
const origH = 2000;
const raw = zlib.inflateSync(Buffer.concat(idats));

const unfilter = Buffer.alloc(origW * origH * 4);
let rawPos = 0;
for (let y = 0; y < origH; y++) {
  const filter = raw[rawPos++];
  for (let x = 0; x < origW * 4; x++) {
    const val = raw[rawPos++];
    const prior = y > 0 ? unfilter[(y - 1) * origW * 4 + x] : 0;
    unfilter[y * origW * 4 + x] = (val + prior) & 0xff;
  }
}

// Find logo boundaries
let minX = origW, maxX = 0, minY = origH, maxY = 0;
for (let y = 0; y < origH; y++) {
  for (let x = 0; x < origW; x++) {
    const idx = (y * origW + x) * 4;
    const r = unfilter[idx];
    const g = unfilter[idx + 1];
    const b = unfilter[idx + 2];
    if (r < 240 || g < 240 || b < 240) {
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  }
}

const padding = 20;
const cx = Math.round((minX + maxX) / 2);
const cy = Math.round((minY + maxY) / 2);
const halfSize = Math.max(Math.round((maxX - minX) / 2), Math.round((maxY - minY) / 2)) + padding;
const cropSize = halfSize * 2;

const startX = cx - halfSize;
const startY = cy - halfSize;

console.log(`Cropping logo from center (${cx}, ${cy}) to size ${cropSize}x${cropSize}`);

// Create filtered scanlines with filter byte 0 for each line
const scanlines = Buffer.alloc(cropSize * (1 + cropSize * 4));
let scanPos = 0;

for (let y = 0; y < cropSize; y++) {
  scanlines[scanPos++] = 0; // Filter 0 (None)
  const srcY = startY + y;
  for (let x = 0; x < cropSize; x++) {
    const srcX = startX + x;
    let r = 255, g = 255, b = 255, a = 0;
    if (srcX >= 0 && srcX < origW && srcY >= 0 && srcY < origH) {
      const idx = (srcY * origW + srcX) * 4;
      r = unfilter[idx];
      g = unfilter[idx + 1];
      b = unfilter[idx + 2];
      const origA = unfilter[idx + 3];

      // Distance from center for circle boundary
      const dx = x - halfSize;
      const dy = y - halfSize;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // White background detection
      const brightness = (r * 0.299 + g * 0.587 + b * 0.114);
      const isWhite = r > 238 && g > 238 && b > 238;

      if (dist > halfSize - 4 || isWhite) {
        a = 0;
      } else if (brightness > 220) {
        // Feather edges
        const factor = (238 - brightness) / 18;
        a = Math.min(origA, Math.max(0, Math.round(255 * factor)));
      } else {
        a = origA;
      }
    }

    scanlines[scanPos++] = r;
    scanlines[scanPos++] = g;
    scanlines[scanPos++] = b;
    scanlines[scanPos++] = a;
  }
}

// Compress scanlines with max compression
const compressed = zlib.deflateSync(scanlines, { level: 9 });

// Create IHDR
const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(cropSize, 0);
ihdr.writeUInt32BE(cropSize, 4);
ihdr[8] = 8; // bit depth
ihdr[9] = 6; // color type RGBA
ihdr[10] = 0; // compression
ihdr[11] = 0; // filter
ihdr[12] = 0; // interlace

const pngSig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
const ihdrChunk = createPngChunk('IHDR', ihdr);
const idatChunk = createPngChunk('IDAT', compressed);
const iendChunk = createPngChunk('IEND', Buffer.alloc(0));

const finalPng = Buffer.concat([pngSig, ihdrChunk, idatChunk, iendChunk]);

fs.writeFileSync('public/logo-transparent.png', finalPng);
fs.writeFileSync('src/assets/logo-transparent.png', finalPng);
fs.writeFileSync('public/logo.png', finalPng);
fs.writeFileSync('src/assets/logo.png', finalPng);

console.log('Successfully created circular transparent logo: size', finalPng.length, 'bytes');
