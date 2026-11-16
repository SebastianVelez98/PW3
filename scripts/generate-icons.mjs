/**
 * Generador reproducible de iconos PNG PWA para AromaPOS (taza de café artesanal).
 * Utiliza únicamente módulos nativos de Node.js.
 */

import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

const ICONS_DIR = path.resolve(process.cwd(), 'public', 'icons');

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(buffer) {
  let c = 0xffffffff;
  for (let i = 0; i < buffer.length; i += 1) {
    c = CRC_TABLE[(c ^ buffer[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function makeChunk(type, data) {
  const typeBuf = Buffer.from(type, 'ascii');
  const lenBuf = Buffer.alloc(4);
  lenBuf.writeUInt32BE(data.length, 0);

  const crcInput = Buffer.concat([typeBuf, data]);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(crcInput), 0);

  return Buffer.concat([lenBuf, typeBuf, data, crcBuf]);
}

function encodePng(width, height, rgbaBuffer) {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y += 1) {
    const rowStart = y * (stride + 1);
    raw[rowStart] = 0;
    rgbaBuffer.copy(raw, rowStart + 1, y * stride, (y + 1) * stride);
  }

  const compressed = zlib.deflateSync(raw, { level: 9 });
  return Buffer.concat([
    signature,
    makeChunk('IHDR', ihdr),
    makeChunk('IDAT', compressed),
    makeChunk('IEND', Buffer.alloc(0))
  ]);
}

function clamp(v, min = 0, max = 1) {
  return Math.max(min, Math.min(max, v));
}

function roundedRectSdf(px, py, cx, cy, hw, hh, r) {
  const qx = Math.abs(px - cx) - hw + r;
  const qy = Math.abs(py - cy) - hh + r;
  const out = Math.hypot(Math.max(qx, 0), Math.max(qy, 0));
  const inside = Math.min(Math.max(qx, qy), 0);
  return out + inside - r;
}

function mixColor(bg, fg, alpha) {
  const a = clamp(alpha);
  return [
    Math.round(bg[0] * (1 - a) + fg[0] * a),
    Math.round(bg[1] * (1 - a) + fg[1] * a),
    Math.round(bg[2] * (1 - a) + fg[2] * a),
    Math.round(bg[3] * (1 - a) + fg[3] * a)
  ];
}

function renderIcon(size, maskable = false) {
  const buf = Buffer.alloc(size * size * 4);

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const u = (x + 0.5) / size;
      const v = (y + 0.5) / size;

      // Degradado cálido terracota -> espresso (#C2410C -> #431407)
      const t = clamp(u * 0.4 + v * 0.7);
      const bgR = Math.round(194 * (1 - t) + 67 * t);
      const bgG = Math.round(65 * (1 - t) + 20 * t);
      const bgB = Math.round(12 * (1 - t) + 7 * t);

      let color = [bgR, bgG, bgB, 255];

      if (!maskable) {
        const bgDist = roundedRectSdf(u, v, 0.5, 0.5, 0.47, 0.47, 0.21);
        const bgAlpha = clamp(1 - bgDist * size * 0.7);
        color = [bgR, bgG, bgB, Math.round(255 * bgAlpha)];
      }

      const innerScale = maskable ? 0.78 : 1.0;
      const nu = (u - 0.5) / innerScale + 0.5;
      const nv = (v - 0.5) / innerScale + 0.5;

      // Asa de taza a la derecha
      const handleOuter = Math.hypot(nu - 0.67, nv - 0.51) - 0.115;
      const handleInner = Math.hypot(nu - 0.67, nv - 0.51) - 0.068;
      if (nu > 0.64 && handleOuter < 0.01 && handleInner > -0.01) {
        const a = clamp(Math.min(1 - handleOuter * size, 1 + handleInner * size) * 0.8);
        color = mixColor(color, [255, 255, 255, 255], a);
      }

      // Cuerpo blanco de la taza (parte superior recta, base redondeada)
      const cupBody = roundedRectSdf(nu, nv, 0.46, 0.55, 0.20, 0.17, 0.11);
      const cupTop = roundedRectSdf(nu, nv, 0.46, 0.44, 0.20, 0.07, 0.02);
      const cupDist = Math.min(cupBody, cupTop);
      if (cupDist < 0.01) {
        color = mixColor(color, [255, 255, 255, 255], clamp(1 - cupDist * size * 0.8));
      }

      // Plato dorado cálido bajo la taza
      const saucer = roundedRectSdf(nu, nv, 0.47, 0.78, 0.24, 0.026, 0.018);
      if (saucer < 0.01) {
        color = mixColor(color, [253, 230, 138, 255], clamp(1 - saucer * size * 0.8));
      }

      // Tres líneas de vapor sobre la taza
      for (const sx of [0.36, 0.46, 0.56]) {
        const steam = roundedRectSdf(nu, nv, sx, 0.27, 0.018, 0.065, 0.018);
        if (steam < 0.01) {
          color = mixColor(color, [253, 230, 138, 255], clamp(1 - steam * size * 0.8));
        }
      }

      // Grano / acento ámbar en el centro de la taza
      const emblem = Math.hypot(nu - 0.46, nv - 0.54) - 0.055;
      if (emblem < 0.01) {
        color = mixColor(color, [180, 83, 9, 255], clamp(1 - emblem * size * 0.8));
      }

      const idx = (y * size + x) * 4;
      buf[idx] = color[0];
      buf[idx + 1] = color[1];
      buf[idx + 2] = color[2];
      buf[idx + 3] = color[3];
    }
  }

  return encodePng(size, size, buf);
}

fs.mkdirSync(ICONS_DIR, { recursive: true });
fs.writeFileSync(path.join(ICONS_DIR, 'icon-192.png'), renderIcon(192, false));
fs.writeFileSync(path.join(ICONS_DIR, 'icon-512.png'), renderIcon(512, false));
fs.writeFileSync(path.join(ICONS_DIR, 'icon-maskable-512.png'), renderIcon(512, true));
console.log('Iconos PWA de AromaPOS generados en public/icons/');
