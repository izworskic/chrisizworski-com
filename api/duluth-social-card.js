const zlib = require('node:zlib');

const WIDTH = 1200;
const HEIGHT = 630;

function crc32(buf) {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i += 1) {
    crc ^= buf[i];
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
    }
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

  function setPixel(x, y, r, g, b) {
    if (x < 0 || y < 0 || x >= WIDTH || y >= HEIGHT) return;
    const i = y * rowBytes + 1 + x * 3;
    raw[i] = r;
    raw[i + 1] = g;
    raw[i + 2] = b;
  }

  function rect(x1, y1, x2, y2, c) {
    for (let y = Math.max(0, y1); y <= Math.min(HEIGHT - 1, y2); y += 1) {
      for (let x = Math.max(0, x1); x <= Math.min(WIDTH - 1, x2); x += 1) {
        setPixel(x, y, ...c);
      }
    }
  }

  function line(x1, y1, x2, y2, c, thickness = 1) {
    const dx = Math.abs(x2 - x1);
    const sx = x1 < x2 ? 1 : -1;
    const dy = -Math.abs(y2 - y1);
    const sy = y1 < y2 ? 1 : -1;
    let err = dx + dy;
    let x = x1;
    let y = y1;
    while (true) {
      rect(x - Math.floor(thickness / 2), y - Math.floor(thickness / 2), x + Math.floor(thickness / 2), y + Math.floor(thickness / 2), c);
      if (x === x2 && y === y2) break;
      const e2 = 2 * err;
      if (e2 >= dy) { err += dy; x += sx; }
      if (e2 <= dx) { err += dx; y += sy; }
    }
  }

  function polygon(points, c) {
    const ys = points.map((p) => p[1]);
    const minY = Math.max(0, Math.min(...ys));
    const maxY = Math.min(HEIGHT - 1, Math.max(...ys));
    for (let y = minY; y <= maxY; y += 1) {
      const hits = [];
      for (let i = 0; i < points.length; i += 1) {
        const a = points[i];
        const b = points[(i + 1) % points.length];
        if ((a[1] <= y && b[1] > y) || (b[1] <= y && a[1] > y)) {
          hits.push(a[0] + ((y - a[1]) * (b[0] - a[0])) / (b[1] - a[1]));
        }
      }
      hits.sort((a, b) => a - b);
      for (let i = 0; i + 1 < hits.length; i += 2) {
        rect(Math.ceil(hits[i]), y, Math.floor(hits[i + 1]), y, c);
      }
    }
  }

  for (let y = 0; y < HEIGHT; y += 1) {
    raw[y * rowBytes] = 0;
    const sky = y < 410;
    const t = sky ? y / 410 : (y - 410) / 220;
    const from = sky ? [24, 104, 136] : [19, 82, 105];
    const to = sky ? [8, 48, 66] : [4, 35, 50];
    const c = from.map((v, i) => Math.round(v * (1 - t) + to[i] * t));
    rect(0, y, WIDTH - 1, y, c);
  }

  const bridge = [8, 37, 49];
  const ship = [184, 79, 42];
  const shipDark = [152, 61, 34];
  const deck = [230, 233, 228];
  const hatch = [158, 183, 188];
  const waterline = [220, 236, 239];

  rect(0, 385, WIDTH - 1, 420, [39, 111, 135]);
  rect(135, 135, 205, 420, bridge);
  rect(995, 135, 1065, 420, bridge);
  rect(118, 120, 222, 150, bridge);
  rect(978, 120, 1082, 150, bridge);
  rect(205, 160, 995, 185, bridge);
  rect(300, 260, 900, 292, bridge);
  for (let x = 320; x < 900; x += 55) line(x, 185, x, 260, bridge, 4);
  for (let x = 205; x < 980; x += 95) {
    line(x, 160, Math.min(x + 95, 995), 185, bridge, 4);
    line(x, 185, Math.min(x + 95, 995), 160, bridge, 4);
  }

  polygon([[290, 450], [320, 405], [995, 405], [930, 465], [855, 480], [390, 480], [340, 450]], ship);
  polygon([[920, 405], [995, 405], [930, 465], [855, 480]], shipDark);
  rect(410, 360, 820, 405, deck);
  rect(360, 330, 470, 405, deck);
  rect(385, 292, 422, 330, [98, 100, 94]);
  for (let x = 500; x < 790; x += 58) rect(x, 374, x + 42, 394, hatch);
  line(305, 487, 1010, 487, waterline, 4);

  const signature = [229, 239, 241];
  rect(66, 540, 360, 588, [6, 42, 57]);
  // Simple brand bars: visual identity without relying on a font renderer.
  rect(82, 556, 222, 563, signature);
  rect(82, 572, 315, 579, [121, 170, 184]);

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(WIDTH, 0);
  ihdr.writeUInt32BE(HEIGHT, 4);
  ihdr[8] = 8;
  ihdr[9] = 2;
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const compressed = zlib.deflateSync(raw, { level: 9 });
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr),
    chunk('IDAT', compressed),
    chunk('IEND', Buffer.alloc(0))
  ]);
}

const IMAGE = drawCard();

module.exports = function duluthSocialCard(req, res) {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.setHeader('Allow', 'GET, HEAD');
    return res.status(405).end();
  }

  res.setHeader('Content-Type', 'image/png');
  res.setHeader('Content-Length', String(IMAGE.length));
  res.setHeader('Content-Disposition', 'inline; filename="duluth-social-card.png"');
  res.setHeader('Cache-Control', 'public, max-age=86400, s-maxage=31536000, stale-while-revalidate=86400');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  if (req.method === 'HEAD') return res.status(200).end();
  return res.status(200).send(IMAGE);
};
