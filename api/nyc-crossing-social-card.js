'use strict';

const zlib = require('node:zlib');

const WIDTH = 1200;
const HEIGHT = 630;

function crc32(buf) {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i += 1) {
    crc ^= buf[i];
    for (let bit = 0; bit < 8; bit += 1) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const typeBuf = Buffer.from(type, 'ascii');
  const out = Buffer.alloc(12 + data.length);
  out.writeUInt32BE(data.length, 0);
  typeBuf.copy(out, 4);
  data.copy(out, 8);
  out.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 8 + data.length);
  return out;
}

function drawCard() {
  const rowBytes = 1 + WIDTH * 3;
  const raw = Buffer.alloc(rowBytes * HEIGHT);
  const setPixel = (x, y, color) => {
    if (x < 0 || y < 0 || x >= WIDTH || y >= HEIGHT) return;
    const i = y * rowBytes + 1 + x * 3;
    raw[i] = color[0]; raw[i + 1] = color[1]; raw[i + 2] = color[2];
  };
  const rect = (x1, y1, x2, y2, color) => {
    for (let y = Math.max(0, y1); y <= Math.min(HEIGHT - 1, y2); y += 1) {
      for (let x = Math.max(0, x1); x <= Math.min(WIDTH - 1, x2); x += 1) setPixel(x, y, color);
    }
  };
  const line = (x1, y1, x2, y2, color, thickness = 1) => {
    const dx = Math.abs(x2 - x1), sx = x1 < x2 ? 1 : -1;
    const dy = -Math.abs(y2 - y1), sy = y1 < y2 ? 1 : -1;
    let err = dx + dy, x = x1, y = y1;
    while (true) {
      rect(x - Math.floor(thickness / 2), y - Math.floor(thickness / 2), x + Math.floor(thickness / 2), y + Math.floor(thickness / 2), color);
      if (x === x2 && y === y2) break;
      const e2 = 2 * err;
      if (e2 >= dy) { err += dy; x += sx; }
      if (e2 <= dx) { err += dx; y += sy; }
    }
  };
  const polygon = (points, color) => {
    const minY = Math.max(0, Math.min(...points.map(p => p[1])));
    const maxY = Math.min(HEIGHT - 1, Math.max(...points.map(p => p[1])));
    for (let y = minY; y <= maxY; y += 1) {
      const hits = [];
      for (let i = 0; i < points.length; i += 1) {
        const a = points[i], b = points[(i + 1) % points.length];
        if ((a[1] <= y && b[1] > y) || (b[1] <= y && a[1] > y)) hits.push(a[0] + ((y - a[1]) * (b[0] - a[0])) / (b[1] - a[1]));
      }
      hits.sort((a, b) => a - b);
      for (let i = 0; i + 1 < hits.length; i += 2) rect(Math.ceil(hits[i]), y, Math.floor(hits[i + 1]), y, color);
    }
  };
  const circle = (cx, cy, radius, color) => {
    for (let y = -radius; y <= radius; y += 1) {
      const span = Math.floor(Math.sqrt(radius * radius - y * y));
      rect(cx - span, cy + y, cx + span, cy + y, color);
    }
  };

  for (let y = 0; y < HEIGHT; y += 1) {
    raw[y * rowBytes] = 0;
    const water = y >= 420;
    const t = water ? (y - 420) / 210 : y / 420;
    const start = water ? [11, 79, 100] : [25, 118, 145];
    const end = water ? [4, 31, 49] : [9, 48, 73];
    for (let x = 0; x < WIDTH; x += 1) {
      const f = x / WIDTH;
      setPixel(x, y, start.map((v, i) => Math.round(v * (1 - t) + end[i] * t + (i === 0 ? 6 * f : 0))));
    }
  }

  // Soft sunset disc and a restrained Manhattan skyline.
  circle(842, 188, 70, [233, 178, 119]);
  const buildings = [
    [0,310,78,420],[86,267,150,420],[160,294,228,420],[240,331,292,420],
    [315,302,368,420],[378,270,434,420],[446,319,500,420],[515,284,576,420],
    [600,315,660,420],[681,276,739,420],[759,322,810,420],[834,291,895,420],
    [915,310,978,420],[996,270,1054,420],[1070,302,1130,420],[1140,284,1199,420]
  ];
  for (const [x1,y1,x2,y2] of buildings) {
    rect(x1,y1,x2,y2,[10,51,70]);
    rect(x1+5,y1-8,x2-5,y1-1,[10,51,70]);
  }
  // A few warm window lights, kept as texture rather than text.
  for (let x = 22; x < 1180; x += 54) {
    for (let y = 326 + (x % 3) * 7; y < 402; y += 25) rect(x,y,x+5,y+9,[225,174,105]);
  }

  // East River suspension bridge silhouette.
  const bridge = [8, 37, 56], cable = [181, 203, 197], deck = [226, 226, 210];
  rect(0,408,WIDTH-1,425,[38,112,131]);
  // Main towers and cross-bracing.
  for (const x of [292, 886]) {
    rect(x,143,x+25,410,bridge);
    rect(x-15,143,x+40,157,bridge);
    rect(x-9,186,x+34,197,bridge);
    rect(x-11,260,x+36,270,bridge);
    line(x-9,198,x+33,258,bridge,5);
    line(x+33,198,x-9,258,bridge,5);
    line(x-9,271,x+33,336,bridge,5);
    line(x+33,271,x-9,336,bridge,5);
  }
  const cableY = x => Math.round(238 + 112 * Math.pow((x - 590) / 590, 2));
  for (let x = 72; x < 1128; x += 7) line(x,cableY(x),x+7,cableY(x+7),cable,3);
  line(72,238,292,143,cable,3);
  line(292,143,886,143,cable,3);
  line(886,143,1128,238,cable,3);
  for (let x = 94; x <= 1106; x += 43) line(x,cableY(x),x,383,cable,2);
  rect(70,382,1130,397,deck);
  rect(54,397,1146,404,bridge);
  // Water reflections.
  for (let i = 0; i < 18; i += 1) {
    const x = (i * 137 + 36) % 1150;
    const y = 447 + (i * 19) % 150;
    rect(x,y,x+48+(i%4)*17,y+2,[20,91,108]);
  }
  // Small creator mark rendered as simple bars (no font dependency).
  rect(68,548,292,596,[5,36,54]);
  rect(88,564,212,570,[229,239,232]);
  rect(88,580,260,586,[118,171,178]);

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(WIDTH,0); ihdr.writeUInt32BE(HEIGHT,4);
  ihdr[8]=8; ihdr[9]=2; ihdr[10]=0; ihdr[11]=0; ihdr[12]=0;
  const compressed=zlib.deflateSync(raw,{level:9});
  return Buffer.concat([
    Buffer.from([137,80,78,71,13,10,26,10]),
    chunk('IHDR',ihdr),chunk('IDAT',compressed),chunk('IEND',Buffer.alloc(0))
  ]);
}

const IMAGE = drawCard();
module.exports = function nycCrossingSocialCard(req, res) {
  res.setHeader('X-Robots-Tag','noindex, nofollow');
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.setHeader('Allow','GET, HEAD');
    return res.status(405).end();
  }
  res.setHeader('Content-Type','image/png');
  res.setHeader('Content-Length',String(IMAGE.length));
  res.setHeader('Content-Disposition','inline; filename="nyc-crossing-social-card.png"');
  res.setHeader('Cache-Control','public, max-age=86400, s-maxage=31536000, stale-while-revalidate=86400');
  res.setHeader('X-Content-Type-Options','nosniff');
  if (req.method === 'HEAD') return res.status(200).end();
  return res.status(200).send(IMAGE);
};
