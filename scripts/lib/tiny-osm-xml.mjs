// Minimal streaming reader for OpenStreetMap API XML.
// Only what the water-geometry build needs: node positions, way node refs and tags, and the members
// of water relations. Kept dependency-free because this repo ships no runtime dependencies.
const WATERWAY_KINDS = new Set(['river', 'stream', 'canal', 'riverbank']);

export class XMLParser {
  collect(text, {nodes, ways, relations}) {
    const elementPattern = /<(node|way|relation)\b([^>]*?)(\/?)>([\s\S]*?)(?:<\/\1>)?(?=\s*<(?:node|way|relation|\/osm))/g;
    let match;
    while ((match = elementPattern.exec(text))) {
      const [, kind, attributeText, selfClosing, body] = match;
      const attributes = readAttributes(attributeText);
      const id = attributes.id;
      if (!id) continue;
      if (kind === 'node') {
        if (!nodes.has(id) && attributes.lat && attributes.lon) {
          nodes.set(id, {lat: Number(attributes.lat), lon: Number(attributes.lon)});
        }
        continue;
      }
      if (selfClosing) continue;
      const tags = readTags(body);
      if (kind === 'way') {
        if (ways.has(id)) continue;
        const refs = [...body.matchAll(/<nd\s+ref="(\d+)"/g)].map(entry => entry[1]);
        if (refs.length) ways.set(id, {refs, tags});
        continue;
      }
      if (relations.has(id)) continue;
      if (tags.natural !== 'water' && tags.waterway !== 'riverbank') continue;
      const members = [...body.matchAll(/<member\s+type="([^"]+)"\s+ref="(\d+)"\s+role="([^"]*)"/g)]
        .map(entry => ({type: entry[1], ref: entry[2], role: entry[3]}));
      if (members.length) relations.set(id, {members, tags});
    }
  }
}

export function isWaterway(value) {
  return WATERWAY_KINDS.has(value);
}

function readAttributes(text) {
  const out = {};
  for (const entry of text.matchAll(/([a-zA-Z:]+)="([^"]*)"/g)) out[entry[1]] = entry[2];
  return out;
}

function readTags(body) {
  const out = {};
  for (const entry of body.matchAll(/<tag\s+k="([^"]*)"\s+v="([^"]*)"/g)) out[entry[1]] = decode(entry[2]);
  return out;
}

function decode(value) {
  return value.replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
}
