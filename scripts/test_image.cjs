const fs = require('fs');
const zlib = require('zlib');

const buf = fs.readFileSync('C:/Users/intco/.gemini/antigravity-ide/brain/b8a01551-5c1c-413d-999d-6cfa3ab2a712/.user_uploaded/media_1790932804774.png');
const width = buf.readUInt32BE(16);
const height = buf.readUInt32BE(20);

let pos = 8;
const idatChunks = [];
while (pos < buf.length) {
  const len = buf.readUInt32BE(pos);
  const type = buf.toString('ascii', pos + 4, pos + 8);
  if (type === 'IDAT') idatChunks.push(buf.slice(pos + 8, pos + 8 + len));
  pos += 12 + len;
}
const raw = zlib.inflateSync(Buffer.concat(idatChunks));
const bpp = 4;
const rowSize = width * bpp;
const pixels = Buffer.alloc(width * height * bpp);

let rawPos = 0;
for (let y = 0; y < height; y++) {
  const filter = raw[rawPos++];
  const prevRowOffset = (y - 1) * rowSize;
  const currRowOffset = y * rowSize;
  for (let x = 0; x < rowSize; x++) {
    const byte = raw[rawPos++];
    const left = x >= bpp ? pixels[currRowOffset + x - bpp] : 0;
    const up = y > 0 ? pixels[prevRowOffset + x] : 0;
    const upLeft = y > 0 && x >= bpp ? pixels[prevRowOffset + x - bpp] : 0;
    let val = 0;
    if (filter === 0) val = byte;
    else if (filter === 1) val = (byte + left) & 0xff;
    else if (filter === 2) val = (byte + up) & 0xff;
    else if (filter === 3) val = (byte + Math.floor((left + up) / 2)) & 0xff;
    else if (filter === 4) {
      const p = left + up - upLeft;
      const pa = Math.abs(p - left), pb = Math.abs(p - up), pc = Math.abs(p - upLeft);
      const pr = (pa <= pb && pa <= pc) ? left : (pb <= pc ? up : upLeft);
      val = (byte + pr) & 0xff;
    }
    pixels[currRowOffset + x] = val;
  }
}

// Find any unusual colors (red, highlight, pen markup)
const coloredPixels = [];
for (let y = 0; y < height; y++) {
  for (let x = 0; x < width; x++) {
    const off = (y * width + x) * 4;
    const r = pixels[off], g = pixels[off+1], b = pixels[off+2];
    // Check for red markup (high R, low G, low B)
    if (r > 200 && g < 50 && b < 50) {
      coloredPixels.push({ x, y, r, g, b });
    }
  }
}
console.log('Red markup count:', coloredPixels.length);
if (coloredPixels.length > 0) {
  console.log('Red markup at:', coloredPixels.slice(0, 10));
}
