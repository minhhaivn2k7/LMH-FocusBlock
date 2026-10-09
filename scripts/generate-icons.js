/**
 * Generates extension PNG icons using pure Node.js (zlib + fs)
 * No third-party dependencies required.
 * Color: #0033CC (R: 0, G: 51, B: 204)
 */

import fs from 'fs';
import path from 'path';
import zlib from 'zlib';

function createPng(width, height) {
  // RGBA buffer
  const rowBytes = width * 4 + 1; // +1 for filter byte
  const buffer = Buffer.alloc(rowBytes * height);

  const R = 0;
  const G = 51;
  const B = 204;
  const A = 255;

  const center = width / 2;
  const radius = width * 0.44;

  for (let y = 0; y < height; y++) {
    const rowOffset = y * rowBytes;
    buffer[rowOffset] = 0; // Filter: None

    for (let x = 0; x < width; x++) {
      const pixelOffset = rowOffset + 1 + x * 4;

      const dx = x - center + 0.5;
      const dy = y - center + 0.5;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // Icon: Blue circle with white "F" / focus inner pattern
      if (dist <= radius) {
        // Inner white cross/focus mark
        const innerDist = Math.abs(dx) < width * 0.15 || Math.abs(dy) < height * 0.15;
        const inCenterSquare = Math.abs(dx) < width * 0.28 && Math.abs(dy) < height * 0.28;

        if (inCenterSquare && innerDist) {
          // White symbol
          buffer[pixelOffset] = 255;
          buffer[pixelOffset + 1] = 255;
          buffer[pixelOffset + 2] = 255;
          buffer[pixelOffset + 3] = 255;
        } else {
          // Brand color #0033CC
          buffer[pixelOffset] = R;
          buffer[pixelOffset + 1] = G;
          buffer[pixelOffset + 2] = B;
          buffer[pixelOffset + 3] = A;
        }
      } else {
        // Transparent
        buffer[pixelOffset] = 0;
        buffer[pixelOffset + 1] = 0;
        buffer[pixelOffset + 2] = 0;
        buffer[pixelOffset + 3] = 0;
      }
    }
  }

  // Compress IDAT
  const compressedData = zlib.deflateSync(buffer);

  // PNG structure
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  function chunk(type, data) {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length, 0);

    const typeBuf = Buffer.from(type, 'ascii');
    const crcPayload = Buffer.concat([typeBuf, data]);

    const crcVal = crc32(crcPayload);
    const crcBuf = Buffer.alloc(4);
    crcBuf.writeUInt32BE(crcVal >>> 0, 0);

    return Buffer.concat([len, typeBuf, data, crcBuf]);
  }

  // IHDR
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8; // bit depth
  ihdrData[9] = 6; // color type: RGBA
  ihdrData[10] = 0; // compression
  ihdrData[11] = 0; // filter
  ihdrData[12] = 0; // interlace

  const ihdr = chunk('IHDR', ihdrData);
  const idat = chunk('IDAT', compressedData);
  const iend = chunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdr, idat, iend]);
}

// CRC32 table
const crcTable = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  }
  crcTable[n] = c;
}

function crc32(buf) {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc = crcTable[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  }
  return crc ^ 0xffffffff;
}

const outDir = path.resolve('public/icons');
fs.mkdirSync(outDir, { recursive: true });

[16, 32, 48, 128].forEach((size) => {
  const png = createPng(size, size);
  fs.writeFileSync(path.join(outDir, `icon-${size}.png`), png);
  console.log(`Generated icon-${size}.png (${size}x${size})`);
});
