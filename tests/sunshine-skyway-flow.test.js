const test = require('node:test');
const assert = require('node:assert/strict');
const zlib = require('node:zlib');

const flow = require('../lib/sunshine-skyway-flow');

function chunk(type, data) {
  const body = Buffer.from(data);
  const out = Buffer.alloc(12 + body.length);
  out.writeUInt32BE(body.length, 0);
  out.write(type, 4, 4, 'ascii');
  body.copy(out, 8);
  // Decoder intentionally does not depend on CRC validation; zero is enough for fixtures.
  out.writeUInt32BE(0, 8 + body.length);
  return out;
}

function rgbaPng(width, height, rgba) {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;
  const row = Buffer.alloc(width * 4);
  for (let x = 0; x < width; x += 1) {
    row[x * 4] = rgba[0];
    row[x * 4 + 1] = rgba[1];
    row[x * 4 + 2] = rgba[2];
    row[x * 4 + 3] = rgba[3];
  }
  const raw = Buffer.alloc(height * (row.length + 1));
  for (let y = 0; y < height; y += 1) {
    const start = y * (row.length + 1);
    raw[start] = 0;
    row.copy(raw, start + 1);
  }
  return Buffer.concat([
    signature,
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

function responseFor(buffer) {
  return {
    ok: true,
    status: 200,
    arrayBuffer: async () => buffer,
  };
}

test('PNG decoder reads the RGBA tiles used by the FL511 traffic layer', () => {
  const png = rgbaPng(2, 1, [36, 157, 116, 255]);
  const image = flow.decodePngRgba(png);
  assert.equal(image.width, 2);
  assert.equal(image.height, 1);
  assert.deepEqual([...image.data.subarray(0, 4)], [36, 157, 116, 255]);
  assert.equal(flow.sampleFlowClass(image, 0, 0, 0).class, 'FAST');
});

test('direction summary converts FL511 categories into human traffic states without invented mph', () => {
  const samples = [
    { flowClass: 'FAST' },
    { flowClass: 'FAST' },
    { flowClass: 'MODERATE' },
    { flowClass: 'FAST' },
  ];
  const summary = flow.summarizeDirection(samples);
  assert.equal(summary.state, 'SOME_SLOWING');
  assert.equal(summary.label, 'Some slowing on the Skyway');
  assert.equal(summary.sampleCount, 4);
});

test('live FL511 speed tiles can produce a moving-well result for the selected direction', async () => {
  flow._tileCache.clear();
  const fast = rgbaPng(256, 256, [36, 157, 116, 255]);
  const result = await flow.buildTrafficFlow({
    direction: 'southbound',
    now: Date.parse('2026-10-05T21:30:00Z'),
    fetchImpl: async () => responseFor(fast),
  });
  assert.equal(result.source, 'FL511 Traffic Speeds');
  assert.equal(result.sourceHealth.state, 'ok');
  assert.equal(result.selectedDirection, 'southbound');
  assert.equal(result.selected.state, 'MOVING_WELL');
  assert.match(result.note, /does not infer mph or delay minutes/i);
});

test('speed-layer failure stays unavailable instead of fabricating congestion', async () => {
  flow._tileCache.clear();
  const result = await flow.buildTrafficFlow({
    direction: 'northbound',
    now: Date.parse('2026-10-05T21:31:00Z'),
    fetchImpl: async () => { throw new Error('network down'); },
  });
  assert.equal(result.sourceHealth.state, 'unavailable');
  assert.equal(result.selected.state, 'UNAVAILABLE');
});
