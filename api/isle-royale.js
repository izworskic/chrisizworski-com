const URLS = Object.freeze({
  boaterCampgrounds: "https://www.nps.gov/common/uploads/sortable_dataset/isro/2DF94ED6-9CAA-9B24-8BD6A700012D59F3/isro-BoaterTable.csv",
  currentConditions: "https://www.nps.gov/isro/planyourvisit/current-conditions-at-isle-royale.htm",
  boaterPage: "https://www.nps.gov/isro/planyourvisit/boat-in-campgrounds.htm",
  scubaPage: "https://www.nps.gov/isro/planyourvisit/scuba-diving.htm",
});

const USER_AGENT =
  "ChrisIzworskiIsleRoyaleMap/1.0 (+https://chrisizworski.com/isle-royale-map/; contact: izworski@gmail.com)";

function decodeHtml(text = "") {
  return String(text)
    .replace(/&nbsp;|&#160;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;|&#34;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&#8211;|&ndash;/gi, "–")
    .replace(/&#8212;|&mdash;/gi, "—");
}

function stripHtml(html = "") {
  return decodeHtml(
    String(html)
      .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
      .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
      .replace(/<(?:br|\/p|\/li|\/h[1-6])\b[^>]*>/gi, "\n")
      .replace(/<[^>]+>/g, " "),
  )
    .replace(/[ \t]+/g, " ")
    .replace(/\n\s+/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function parseCsv(text = "") {
  const rows = [];
  let row = [];
  let field = "";
  let quoted = false;
  const input = String(text).replace(/^\uFEFF/, "");

  for (let i = 0; i < input.length; i++) {
    const ch = input[i];
    if (quoted) {
      if (ch === '"') {
        if (input[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          quoted = false;
        }
      } else {
        field += ch;
      }
      continue;
    }
    if (ch === '"') {
      quoted = true;
    } else if (ch === ",") {
      row.push(field.trim());
      field = "";
    } else if (ch === "\n") {
      row.push(field.trim().replace(/\r$/, ""));
      if (row.some(value => value !== "")) rows.push(row);
      row = [];
      field = "";
    } else {
      field += ch;
    }
  }
  row.push(field.trim().replace(/\r$/, ""));
  if (row.some(value => value !== "")) rows.push(row);
  return rows;
}

function key(value = "") {
  return String(value).toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function firstValue(row, patterns) {
  const entries = Object.entries(row);
  for (const pattern of patterns) {
    const found = entries.find(([name, value]) => pattern.test(key(name)) && String(value || "").trim());
    if (found) return String(found[1]).trim();
  }
  return null;
}

function normalizeBoaterCsv(text = "") {
  const parsed = parseCsv(text);
  if (parsed.length < 2) return [];
  const headers = parsed[0].map((header, index) => String(header || `column_${index + 1}`).trim());
  return parsed.slice(1).map(values => {
    const row = {};
    headers.forEach((header, index) => { row[header] = values[index] ?? ""; });
    const name = firstValue(row, [
      /^overnightdocks?$/, /^campgrounds?$/, /^campgroundname$/, /^location$/, /^name$/
    ]) || String(values[0] || "").trim() || null;
    if (!name) return null;
    return {
      name,
      consecutive_night_limit: firstValue(row, [/consecutiv.*staylimit/, /staylimit/]),
      shelters: firstValue(row, [/^shelters?$/]),
      tent_sites: firstValue(row, [/tentsites?/]),
      food_storage_lockers: firstValue(row, [/foodstoragelockers?/]),
      fire_ring_grill: firstValue(row, [/firering/, /grill/]),
      dock_depth: firstValue(row, [/depthatdock/, /dockdepth/]),
      onboard_generator_use: firstValue(row, [/onboardgenerator/, /generatoruse/]),
      raw: row,
    };
  }).filter(Boolean);
}

function parseLatLon(value = "") {
  const text = decodeHtml(String(value)).replace(/[′’']/g, "'").replace(/[″”"]/g, '"').trim();

  const decimal = text.match(/(-?\d{1,2}\.\d+)\s*[,;/ ]+\s*(-?\d{1,3}\.\d+)/);
  if (decimal) {
    const lat = Number(decimal[1]);
    const lon = Number(decimal[2]);
    if (Math.abs(lat) <= 90 && Math.abs(lon) <= 180) return { lat, lon };
  }

  const dm = text.match(/([NS])\s*(\d{1,2})\D+(\d{1,2}(?:\.\d+)?)\D+([EW])\s*(\d{1,3})\D+(\d{1,2}(?:\.\d+)?)/i);
  if (dm) {
    let lat = Number(dm[2]) + Number(dm[3]) / 60;
    let lon = Number(dm[5]) + Number(dm[6]) / 60;
    if (dm[1].toUpperCase() === "S") lat *= -1;
    if (dm[4].toUpperCase() === "W") lon *= -1;
    if (Math.abs(lat) <= 90 && Math.abs(lon) <= 180) return { lat, lon };
  }

  return null;
}

function extractSortableDatasetUrl(html = "") {
  const decoded = decodeHtml(String(html));
  const direct = decoded.match(/(?:https?:)?\/\/[^"'\s<>]+\/common\/uploads\/sortable_dataset\/[^"'\s<>]+\.csv(?:\?[^"'\s<>]*)?/i);
  if (direct) return direct[0].startsWith("//") ? `https:${direct[0]}` : direct[0];

  const relative = decoded.match(/["'](\/common\/uploads\/sortable_dataset\/[^"']+\.csv(?:\?[^"']*)?)["']/i);
  if (relative) return new URL(relative[1], "https://www.nps.gov").toString();

  return null;
}

function normalizeShipwreckCsv(text = "") {
  const parsed = parseCsv(text);
  if (parsed.length < 2) return [];
  const headers = parsed[0].map((header, index) => String(header || `column_${index + 1}`).trim());

  return parsed.slice(1).map(values => {
    const row = {};
    headers.forEach((header, index) => { row[header] = values[index] ?? ""; });
    const name = firstValue(row, [/^divesite$/, /^shipwreck$/, /^wreckname$/, /^wreck$/, /^name$/])
      || String(values[0] || "").trim()
      || null;
    const coordinateText = firstValue(row, [/buoygpscoordinates?/, /gpscoordinates?/, /^coordinates?$/]);
    const coords = parseLatLon(coordinateText || "");
    if (!name || !coords) return null;

    return {
      name,
      lat: coords.lat,
      lon: coords.lon,
      vessel_type: firstValue(row, [/vesseltype/, /^type$/]),
      buoy_coordinates: coordinateText,
      buoy_on: firstValue(row, [/buoyon/, /buoystatus/]),
      depth: firstValue(row, [/depthminmax/, /^depth$/]),
      buoy_attachment: firstValue(row, [/buoyattachment/, /attachment/]),
    };
  }).filter(Boolean);
}

function extractLastUpdated(html = "") {
  const text = stripHtml(html);
  const match = text.match(/Last updated:\s*([A-Z][a-z]+\s+\d{1,2},\s+\d{4})/i);
  return match ? match[1] : null;
}

function detectCurrentClosures(html = "") {
  const text = stripHtml(html);
  const alerts = [];
  const heading = "Tent Camping Closed at Multiple East End Campgrounds";
  const start = text.toLowerCase().indexOf(heading.toLowerCase());
  if (start >= 0) {
    const block = text.slice(start, start + 2600);
    const places = ["Three Mile", "Daisy Farm", "Moskey Basin", "Caribou Island"]
      .filter(name => block.toLowerCase().includes(name.toLowerCase()));
    if (places.length >= 3 && /tent\s+(?:and\s+)?(?:hammock\s+)?camping.*not permitted|tent sites.*closed|tent camping closed/i.test(block)) {
      alerts.push({
        id: "east-end-tent-closures",
        severity: "closure",
        title: "Tent, group-site and hammock restrictions are active at multiple east-end campgrounds",
        places,
        detail: "Shelters may remain available. Verify the current NPS conditions page before relying on campground status.",
      });
    }
  }

  if (/Off-trail Camping Zone 9\s*:\s*Closed/i.test(text)) {
    alerts.push({
      id: "off-trail-zone-9",
      severity: "closure",
      title: "Off-trail Camping Zone 9 is listed closed",
      places: ["Off-trail Camping Zone 9"],
      detail: "Verify the current NPS conditions page before an off-trail itinerary.",
    });
  }

  const zoneBlock = text.match(/Off-trail camping zones?\s+([0-9,\s]+)\s+are closed/i);
  if (zoneBlock) {
    const zones = [...new Set((zoneBlock[1].match(/\d+/g) || []).map(Number))];
    if (zones.length) {
      alerts.push({
        id: "off-trail-zone-closures",
        severity: "closure",
        title: "Multiple off-trail camping zones are listed closed",
        places: zones.map(zone => `Off-trail Camping Zone ${zone}`),
        zones,
        detail: "This is regulation-sensitive. Verify the current NPS conditions page and permit guidance before departure.",
      });
    }
  }

  return alerts;
}

async function fetchText(url, accept) {
  const response = await fetch(url, {
    headers: { accept, "user-agent": USER_AGENT },
    signal: AbortSignal.timeout(8_000),
  });
  if (!response.ok) throw new Error(`NPS source returned ${response.status}`);
  return response.text();
}

async function fetchShipwreckDataset() {
  const html = await fetchText(URLS.scubaPage, "text/html,application/xhtml+xml");
  const datasetUrl = extractSortableDatasetUrl(html);
  if (!datasetUrl) throw new Error("NPS shipwreck dataset link was not discoverable");
  const csv = await fetchText(datasetUrl, "text/csv,text/plain;q=0.9,*/*;q=0.5");
  return {
    html,
    csv,
    datasetUrl,
    pageLastUpdated: extractLastUpdated(html),
  };
}

function sourceState(result, name, url, extra = {}) {
  return {
    name,
    url,
    available: result.status === "fulfilled",
    ...extra,
  };
}

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("X-Robots-Tag", "noindex, nofollow");
  res.setHeader("Cache-Control", "public, s-maxage=600, stale-while-revalidate=1800");

  if (req.method !== "GET" && req.method !== "HEAD") {
    res.setHeader("Allow", "GET, HEAD");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const [boaterResult, conditionsResult, shipwreckResult] = await Promise.allSettled([
    fetchText(URLS.boaterCampgrounds, "text/csv,text/plain;q=0.9,*/*;q=0.5"),
    fetchText(URLS.currentConditions, "text/html,application/xhtml+xml"),
    fetchShipwreckDataset(),
  ]);

  const boaterCampgrounds = boaterResult.status === "fulfilled"
    ? normalizeBoaterCsv(boaterResult.value)
    : [];

  const alerts = conditionsResult.status === "fulfilled"
    ? detectCurrentClosures(conditionsResult.value)
    : [];

  const shipwrecks = shipwreckResult.status === "fulfilled"
    ? normalizeShipwreckCsv(shipwreckResult.value.csv)
    : [];

  const conditionsUpdated = conditionsResult.status === "fulfilled"
    ? extractLastUpdated(conditionsResult.value)
    : null;

  const sources = {
    boater_campgrounds: sourceState(
      boaterResult,
      "National Park Service — Boat-In Campgrounds",
      URLS.boaterPage,
      { dataset_url: URLS.boaterCampgrounds, page_last_updated: "June 23, 2026" },
    ),
    current_conditions: sourceState(
      conditionsResult,
      "National Park Service — Current Conditions",
      URLS.currentConditions,
      { upstream_last_updated: conditionsUpdated },
    ),
    shipwreck_buoys: sourceState(
      shipwreckResult,
      "National Park Service — Shipwreck Buoys",
      URLS.scubaPage,
      shipwreckResult.status === "fulfilled"
        ? {
            dataset_url: shipwreckResult.value.datasetUrl,
            upstream_last_updated: shipwreckResult.value.pageLastUpdated,
            mapped_records: shipwrecks.length,
          }
        : {},
    ),
  };

  return res.status(200).json({
    fetched_at: new Date().toISOString(),
    degraded: boaterResult.status !== "fulfilled" || conditionsResult.status !== "fulfilled" || shipwreckResult.status !== "fulfilled",
    boater_campgrounds: boaterCampgrounds,
    current_alerts: alerts,
    shipwrecks,
    sources,
    disclaimer:
      "Operational data is fetched from current NPS public pages. Source availability and page structure can change. Always verify current park conditions, permits, closures, regulations, weather and on-island guidance before acting.",
  });
};

module.exports._test = {
  decodeHtml,
  stripHtml,
  parseCsv,
  normalizeBoaterCsv,
  parseLatLon,
  extractSortableDatasetUrl,
  normalizeShipwreckCsv,
  extractLastUpdated,
  detectCurrentClosures,
};
