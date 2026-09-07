const ARA_LAYER = "https://ws.lioservices.lrc.gov.on.ca/arcgis2/rest/services/LIO_OPEN_DATA/LIO_Open07/MapServer/2";
const WATERBODY_LAYER = "https://ws.lioservices.lrc.gov.on.ca/arcgis1071a/rest/services/LIO_OPEN_DATA/LIO_Open08/MapServer/17";
const ACCESS_LAYER = "https://ws.lioservices.lrc.gov.on.ca/arcgis2/rest/services/LIO_OPEN_DATA/LIO_Open07/MapServer/15";
const STOCKING_LAYER = "https://services1.arcgis.com/TJH5KDher0W13Kgo/ArcGIS/rest/services/FishStockingDataForRecreationalPurposes/FeatureServer/0";

const ARA_FIELDS = [
  "OBJECTID","ARA_IDENT","WATERBODY_LID","WATERBODY_TYPE","CORPORATE_WATERBODY_NAME","OFFICIAL_WATERBODY_NAME",
  "WATERBODY_ALIAS_NAME1","WATERBODY_ALIAS_NAME2","FISHERIES_MANAGEMENT_ZONE_ID","THERMAL_REGIME","THERMAL_REGIME_REASON",
  "FISH_SPECIES_SUMMARY","SURFACE_AREA","MAXIMUM_DEPTH","MEAN_DEPTH","SECCHI_DEPTH","CONDUCTIVITY",
  "COLDWATER_REHAB_POTENTIAL_IND","SPATIAL_VERIFICATION_FLG","EFFECTIVE_DATETIME"
];
const WATERBODY_FIELDS = [
  "WATERBODY_IDENT","OFFICIAL_NAME","OFFICIAL_ALTERNATE_NAME","UNOFFICIAL_NAME","LATITUDE_DECIMAL_DEGREES",
  "LONGITUDE_DECIMAL_DEGREES","GEOGRAPHIC_TOWNSHIP_NAME","UPPER_TIER_MUNICIPALITY","LOWER_TIER_MUNICIPALITY",
  "SINGLE_TIER_MUNICIPALITY","TERRITORIAL_DISTRICT","LOCATION_NARRATIVE","REFRESH_DATETIME"
];
const STOCK_FIELDS = [
  "MNRF_District","Stocking_Year","Species","Official_Waterbody_Name","Unoffcial_Waterbody_Name","Waterbody_Location_Identifier",
  "Geographic_Township","Developmental_Stage","Number_of_Fish_Stocked","Latitude","Longitude","ObjectId"
];
const ACCESS_FIELDS = [
  "OBJECTID","FISHING_ACCESS_POINT_TYPE","SITE_LAST_VERIFICATION_DATE","VERIFICATION_DATE_SOURCE","PARKING_PRESENCE_FLG",
  "SITE_OWNERSHIP_TYPE","MATERIAL_TYPE","ACCESSIBILITY_FLG","USER_FEE_FLG","VISIBILITY_IND","SITE_NAME","SITE_PHOTO_URL",
  "ADDITIONAL_INFORMATION_URL","GENERAL_COMMENTS"
];

const SPECIES_PROFILES = {
  "brook trout": { cold: true, depthGood: 7 },
  "lake trout": { cold: true, depthGood: 18 },
  "rainbow trout": { cold: true, depthGood: 10 },
  "brown trout": { cold: true, depthGood: 8 },
  "splake": { cold: true, depthGood: 12 },
  "walleye": { depthGood: 6 },
  "northern pike": { depthGood: 4 },
  "smallmouth bass": { depthGood: 4 },
  "largemouth bass": { depthGood: 2 },
  "muskellunge": { depthGood: 5 },
  "yellow perch": { depthGood: 3 },
  "black crappie": { depthGood: 2 },
  "whitefish": { cold: true, depthGood: 15 }
};

function hasValue(value) {
  return value !== null && value !== undefined && String(value).trim() !== "";
}
function numberOrNull(value) {
  if (!hasValue(value)) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}
function text(value) {
  return hasValue(value) ? String(value).trim() : null;
}
function escapeSql(value) {
  return String(value || "").replace(/'/g, "''");
}
function clamp(n, min, max) {
  return Math.min(max, Math.max(min, n));
}
function cleanQuery(value, max = 80) {
  return String(value || "").replace(/[<>]/g, "").trim().slice(0, max);
}
function cleanSpecies(value) {
  return cleanQuery(value, 64);
}
function parseSpecies(summary) {
  if (!hasValue(summary)) return [];
  const raw = String(summary).replace(/\r?\n/g, ";");
  const parts = raw.split(/\s*[;,|]\s*/).map(s => s.trim()).filter(Boolean);
  return [...new Set(parts)].slice(0, 40);
}
function yearFrom(value) {
  const n = Number(value);
  return Number.isInteger(n) && n > 1900 && n < 2200 ? n : null;
}
function municipality(a = {}) {
  return text(a.SINGLE_TIER_MUNICIPALITY) || text(a.LOWER_TIER_MUNICIPALITY) || text(a.UPPER_TIER_MUNICIPALITY) || text(a.TERRITORIAL_DISTRICT) || null;
}
function nameFor(a = {}) {
  return text(a.OFFICIAL_WATERBODY_NAME) || text(a.CORPORATE_WATERBODY_NAME) || text(a.WATERBODY_ALIAS_NAME1) || "Unnamed lake";
}
function looksLikeLake(value) {
  const s = String(value || "").toLowerCase();
  if (!s) return true;
  return s.includes("lake") || s.includes("pond") || s.includes("reservoir") || s.includes("impoundment");
}

function queryUrl(base, params) {
  const qs = new URLSearchParams({ f: "json", ...params });
  return `${base}/query?${qs}`;
}

async function fetchJson(url, timeout = 12_000) {
  const response = await fetch(url, {
    headers: {
      accept: "application/json",
      "user-agent": "ChrisIzworskiOntarioFishingLakeFinder/1.0 (+https://chrisizworski.com/ontario-fishing-lake-finder/)"
    },
    signal: AbortSignal.timeout(timeout)
  });
  if (!response.ok) throw new Error(`Upstream returned HTTP ${response.status}`);
  const data = await response.json();
  if (data?.error) throw new Error(data.error.message || "Ontario GIS query error");
  return data;
}

function buildAraWhere({ species, q, fmz, thermal }) {
  const parts = ["FISH_SPECIES_SUMMARY IS NOT NULL", "WATERBODY_LID IS NOT NULL"];
  if (species) parts.push(`FISH_SPECIES_SUMMARY LIKE '%${escapeSql(species)}%'`);
  if (q) {
    const safe = escapeSql(q);
    parts.push(`(OFFICIAL_WATERBODY_NAME LIKE '%${safe}%' OR CORPORATE_WATERBODY_NAME LIKE '%${safe}%' OR WATERBODY_ALIAS_NAME1 LIKE '%${safe}%' OR WATERBODY_ALIAS_NAME2 LIKE '%${safe}%')`);
  }
  if (fmz && /^\d{1,2}$/.test(String(fmz))) parts.push(`FISHERIES_MANAGEMENT_ZONE_ID=${Number(fmz)}`);
  if (thermal === "cold" || thermal === "cool" || thermal === "warm") parts.push(`THERMAL_REGIME LIKE '${escapeSql(thermal)}%'`);
  return parts.join(" AND ");
}

function normalizeAra(feature) {
  const a = feature?.attributes || {};
  const id = text(a.WATERBODY_LID);
  if (!id) return null;
  return {
    id,
    araId: text(a.ARA_IDENT),
    objectId: a.OBJECTID ?? null,
    name: nameFor(a),
    officialName: text(a.OFFICIAL_WATERBODY_NAME),
    corporateName: text(a.CORPORATE_WATERBODY_NAME),
    aliases: [text(a.WATERBODY_ALIAS_NAME1), text(a.WATERBODY_ALIAS_NAME2)].filter(Boolean),
    waterbodyType: text(a.WATERBODY_TYPE),
    speciesSummary: text(a.FISH_SPECIES_SUMMARY),
    species: parseSpecies(a.FISH_SPECIES_SUMMARY),
    fmz: numberOrNull(a.FISHERIES_MANAGEMENT_ZONE_ID),
    thermalRegime: text(a.THERMAL_REGIME),
    thermalReason: text(a.THERMAL_REGIME_REASON),
    surfaceAreaHa: numberOrNull(a.SURFACE_AREA),
    maximumDepthM: numberOrNull(a.MAXIMUM_DEPTH),
    meanDepthM: numberOrNull(a.MEAN_DEPTH),
    secchiDepthM: numberOrNull(a.SECCHI_DEPTH),
    conductivity: numberOrNull(a.CONDUCTIVITY),
    coldwaterRehabPotential: text(a.COLDWATER_REHAB_POTENTIAL_IND),
    spatialVerification: text(a.SPATIAL_VERIFICATION_FLG),
    effectiveAt: a.EFFECTIVE_DATETIME ?? null
  };
}

function dedupeAra(rows) {
  const byId = new Map();
  for (const row of rows) {
    if (!row) continue;
    const existing = byId.get(row.id);
    if (!existing) {
      byId.set(row.id, row);
      continue;
    }
    const existingArea = existing.surfaceAreaHa || 0;
    const rowArea = row.surfaceAreaHa || 0;
    const primary = rowArea > existingArea ? row : existing;
    const secondary = primary === row ? existing : row;
    primary.species = [...new Set([...(primary.species || []), ...(secondary.species || [])])];
    if (!primary.speciesSummary && secondary.speciesSummary) primary.speciesSummary = secondary.speciesSummary;
    byId.set(row.id, primary);
  }
  return [...byId.values()];
}

async function lookupLocations(ids) {
  if (!ids.length) return new Map();
  const map = new Map();
  for (let i = 0; i < ids.length; i += 35) {
    const chunk = ids.slice(i, i + 35);
    const where = `WATERBODY_IDENT IN (${chunk.map(id => `'${escapeSql(id)}'`).join(",")})`;
    const url = queryUrl(WATERBODY_LAYER, {
      where,
      outFields: WATERBODY_FIELDS.join(","),
      returnGeometry: "false",
      resultRecordCount: "2000"
    });
    const data = await fetchJson(url);
    for (const f of data.features || []) {
      const a = f.attributes || {};
      const id = text(a.WATERBODY_IDENT);
      if (!id) continue;
      map.set(id, {
        latitude: numberOrNull(a.LATITUDE_DECIMAL_DEGREES),
        longitude: numberOrNull(a.LONGITUDE_DECIMAL_DEGREES),
        officialName: text(a.OFFICIAL_NAME),
        alternateName: text(a.OFFICIAL_ALTERNATE_NAME),
        unofficialName: text(a.UNOFFICIAL_NAME),
        township: text(a.GEOGRAPHIC_TOWNSHIP_NAME),
        municipality: municipality(a),
        district: text(a.TERRITORIAL_DISTRICT),
        locationNarrative: text(a.LOCATION_NARRATIVE),
        refreshedAt: a.REFRESH_DATETIME ?? null
      });
    }
  }
  return map;
}

async function lookupStocking(ids) {
  if (!ids.length) return new Map();
  const map = new Map();
  for (let i = 0; i < ids.length; i += 30) {
    const chunk = ids.slice(i, i + 30);
    const where = `Waterbody_Location_Identifier IN (${chunk.map(id => `'${escapeSql(id)}'`).join(",")})`;
    const url = queryUrl(STOCKING_LAYER, {
      where,
      outFields: STOCK_FIELDS.join(","),
      returnGeometry: "false",
      orderByFields: "Stocking_Year DESC",
      resultRecordCount: "2000"
    });
    let data;
    try { data = await fetchJson(url); } catch { continue; }
    for (const f of data.features || []) {
      const a = f.attributes || {};
      const id = text(a.Waterbody_Location_Identifier);
      if (!id) continue;
      if (!map.has(id)) map.set(id, []);
      map.get(id).push({
        year: yearFrom(a.Stocking_Year),
        species: text(a.Species),
        numberStocked: numberOrNull(a.Number_of_Fish_Stocked),
        developmentalStage: text(a.Developmental_Stage),
        district: text(a.MNRF_District),
        township: text(a.Geographic_Township),
        officialWaterbodyName: text(a.Official_Waterbody_Name),
        unofficialWaterbodyName: text(a.Unoffcial_Waterbody_Name)
      });
    }
  }
  return map;
}

function matchScore(lake, requestedSpecies) {
  let score = 35;
  const reasons = ["Ontario ARA fish and lake record"];
  const target = String(requestedSpecies || "").toLowerCase();
  const speciesText = `${lake.speciesSummary || ""} ${(lake.species || []).join(" ")}`.toLowerCase();
  if (target) {
    if (speciesText.includes(target)) {
      score += 30;
      reasons.push(`${requestedSpecies} recorded`);
    } else {
      score -= 25;
      reasons.push(`${requestedSpecies} not shown in this ARA record`);
    }
  } else if (lake.species?.length) {
    score += Math.min(12, lake.species.length * 2);
    reasons.push(`${lake.species.length} recorded species`);
  }

  const profile = SPECIES_PROFILES[target];
  const thermal = String(lake.thermalRegime || "").toLowerCase();
  if (profile?.cold && thermal.includes("cold")) {
    score += 12;
    reasons.push("coldwater regime fits target");
  }
  if (profile?.depthGood && lake.maximumDepthM !== null && lake.maximumDepthM >= profile.depthGood) {
    score += 8;
    reasons.push(`depth data fits target (${Math.round(lake.maximumDepthM)} m max)`);
  }
  if (lake.maximumDepthM !== null && !profile) {
    score += 4;
    reasons.push("maximum depth is documented");
  }
  if (lake.surfaceAreaHa !== null) {
    score += 3;
    reasons.push("surface area is documented");
  }
  if (lake.latitude !== null && lake.longitude !== null) score += 5;

  const currentYear = new Date().getUTCFullYear();
  const targetStock = (lake.stocking || []).find(s => (!target || String(s.species || "").toLowerCase().includes(target)) && s.year && currentYear - s.year <= 5);
  const anyRecentStock = (lake.stocking || []).find(s => s.year && currentYear - s.year <= 5);
  if (targetStock) {
    score += 12;
    reasons.push(`${targetStock.species || requestedSpecies} stocked in ${targetStock.year}`);
  } else if (anyRecentStock && !target) {
    score += 8;
    reasons.push(`stocked in ${anyRecentStock.year}`);
  }

  return { score: clamp(Math.round(score), 0, 100), reasons: reasons.slice(0, 7) };
}

function normalizeAccess(feature, lat, lon) {
  const a = feature?.attributes || {};
  const g = feature?.geometry || {};
  const x = numberOrNull(g.x);
  const y = numberOrNull(g.y);
  let distanceKm = null;
  if (x !== null && y !== null && lat !== null && lon !== null) distanceKm = haversineKm(lat, lon, y, x);
  return {
    id: a.OBJECTID ?? null,
    name: text(a.SITE_NAME) || text(a.FISHING_ACCESS_POINT_TYPE) || "Fishing access point",
    type: text(a.FISHING_ACCESS_POINT_TYPE),
    latitude: y,
    longitude: x,
    distanceKm: distanceKm === null ? null : Math.round(distanceKm * 10) / 10,
    parking: text(a.PARKING_PRESENCE_FLG),
    ownership: text(a.SITE_OWNERSHIP_TYPE),
    material: text(a.MATERIAL_TYPE),
    accessible: text(a.ACCESSIBILITY_FLG),
    fee: text(a.USER_FEE_FLG),
    lastVerifiedAt: a.SITE_LAST_VERIFICATION_DATE ?? null,
    photoUrl: text(a.SITE_PHOTO_URL),
    infoUrl: text(a.ADDITIONAL_INFORMATION_URL),
    comments: text(a.GENERAL_COMMENTS)
  };
}
function haversineKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const toRad = x => x * Math.PI / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

async function lookupAccess(lat, lon, radiusKm = 10) {
  if (lat === null || lon === null) return [];
  const url = queryUrl(ACCESS_LAYER, {
    where: "1=1",
    geometry: `${lon},${lat}`,
    geometryType: "esriGeometryPoint",
    inSR: "4326",
    spatialRel: "esriSpatialRelIntersects",
    distance: String(clamp(radiusKm, 1, 25)),
    units: "esriSRUnit_Kilometer",
    outFields: ACCESS_FIELDS.join(","),
    returnGeometry: "true",
    outSR: "4326",
    resultRecordCount: "100"
  });
  try {
    const data = await fetchJson(url);
    return (data.features || []).map(f => normalizeAccess(f, lat, lon)).sort((a, b) => (a.distanceKm ?? 999) - (b.distanceKm ?? 999));
  } catch {
    return [];
  }
}

async function fetchAraSearch(filters, limit) {
  const url = queryUrl(ARA_LAYER, {
    where: buildAraWhere(filters),
    outFields: ARA_FIELDS.join(","),
    returnGeometry: "false",
    orderByFields: "SURFACE_AREA DESC",
    resultRecordCount: String(Math.min(1200, Math.max(limit * 7, 280)))
  });
  const data = await fetchJson(url);
  if (data?.exceededTransferLimit && (filters.q || filters.species || filters.fmz)) {
    // A bounded shortlist is intentional; never claim this is the complete provincial inventory.
  }
  return dedupeAra((data.features || []).map(normalizeAra).filter(Boolean));
}

async function search(filters, limit) {
  const raw = await fetchAraSearch(filters, limit);
  const lakes = raw.filter(r => looksLikeLake(r.waterbodyType));
  const shortlist = (lakes.length ? lakes : raw).slice(0, Math.min(200, Math.max(limit * 3, limit)));
  const ids = shortlist.map(x => x.id);
  const [locations, stockings] = await Promise.all([
    lookupLocations(ids),
    lookupStocking(ids)
  ]);
  const enriched = shortlist.map(lake => {
    const loc = locations.get(lake.id) || {};
    const stocking = stockings.get(lake.id) || [];
    const item = { ...lake, ...loc, stocking: stocking.slice(0, 8) };
    const scored = matchScore(item, filters.species);
    return { ...item, matchScore: scored.score, matchReasons: scored.reasons };
  }).filter(x => x.latitude !== null && x.longitude !== null);

  if (filters.minDepth) {
    const min = Number(filters.minDepth);
    if (Number.isFinite(min)) return enriched.filter(x => (x.maximumDepthM ?? -1) >= min).sort((a,b)=>b.matchScore-a.matchScore).slice(0, limit);
  }
  return enriched.sort((a, b) => b.matchScore - a.matchScore || (b.surfaceAreaHa || 0) - (a.surfaceAreaHa || 0)).slice(0, limit);
}

async function detail(id, species) {
  const safeId = escapeSql(cleanQuery(id, 32));
  if (!safeId) throw new Error("Missing waterbody id");
  const araUrl = queryUrl(ARA_LAYER, {
    where: `WATERBODY_LID='${safeId}'`,
    outFields: ARA_FIELDS.join(","),
    returnGeometry: "false",
    resultRecordCount: "100"
  });
  const data = await fetchJson(araUrl);
  const rows = dedupeAra((data.features || []).map(normalizeAra).filter(Boolean));
  if (!rows.length) return null;
  const base = rows[0];
  const [locations, stockings] = await Promise.all([
    lookupLocations([base.id]),
    lookupStocking([base.id])
  ]);
  const loc = locations.get(base.id) || {};
  const stocking = stockings.get(base.id) || [];
  const item = { ...base, ...loc, stocking };
  const access = await lookupAccess(item.latitude ?? null, item.longitude ?? null, 10);
  const scored = matchScore(item, species);
  return {
    ...item,
    access,
    matchScore: scored.score,
    matchReasons: scored.reasons,
    regulationNote: item.fmz ? `This lake is mapped in Fisheries Management Zone ${item.fmz}. Always check the current zone rules and any waterbody-specific exceptions before fishing.` : "Check Ontario's current fishing regulations and any waterbody-specific exceptions before fishing."
  };
}

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("X-Robots-Tag", "noindex, nofollow");
  res.setHeader("Cache-Control", "public, s-maxage=1800, stale-while-revalidate=7200");
  if (req.method !== "GET" && req.method !== "HEAD") {
    res.setHeader("Allow", "GET, HEAD");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const mode = cleanQuery(req.query?.mode || "search", 16);
  const species = cleanSpecies(req.query?.species);
  try {
    if (mode === "detail") {
      const lake = await detail(req.query?.id, species);
      if (!lake) return res.status(404).json({ error: "Lake not found in Ontario ARA data" });
      return res.status(200).json({
        fetchedAt: new Date().toISOString(),
        lake,
        sources: sourceManifest()
      });
    }

    const limit = clamp(Number(req.query?.limit) || 60, 10, 100);
    const filters = {
      species,
      q: cleanQuery(req.query?.q, 80),
      fmz: cleanQuery(req.query?.fmz, 2),
      thermal: cleanQuery(req.query?.thermal, 8).toLowerCase(),
      minDepth: cleanQuery(req.query?.minDepth, 8)
    };
    const lakes = await search(filters, limit);
    return res.status(200).json({
      fetchedAt: new Date().toISOString(),
      count: lakes.length,
      resultSemantics: "Ranked shortlist, not a claim of complete provincial inventory. Match score measures fit to selected filters and data richness, not fish abundance or guaranteed catch success.",
      filters,
      lakes,
      sources: sourceManifest()
    });
  } catch (error) {
    res.setHeader("Cache-Control", "no-store");
    return res.status(502).json({
      error: "Ontario fishing lake data is temporarily unavailable",
      detail: String(error?.message || error),
      fallbackUsed: false
    });
  }
};

function sourceManifest() {
  return {
    aquaticResourceAreas: { label: "Ontario Aquatic Resource Area polygon segment", url: ARA_LAYER, role: "fish species, FMZ and lake characteristics" },
    waterbodyIdentifier: { label: "Ontario Waterbody Location Identifier", url: WATERBODY_LAYER, role: "waterbody ID, coordinates and place context" },
    fishingAccess: { label: "Ontario Fishing Access Point", url: ACCESS_LAYER, role: "nearby source-published fishing access" },
    fishStocking: { label: "Ontario fish stocking data for recreational purposes", url: STOCKING_LAYER, role: "recent recreational stocking records" },
    regulations: { label: "Ontario Fishing Regulations Summary", url: "https://www.ontario.ca/document/ontario-fishing-regulations-summary", role: "current legal fishing rules and exceptions" },
    fishOnline: { label: "Ontario Fish ON-Line", url: "https://www.ontario.ca/page/how-use-fish-line", role: "official fishing map and reference" }
  };
}

module.exports._test = { buildAraWhere, normalizeAra, dedupeAra, matchScore, parseSpecies, looksLikeLake, haversineKm, sourceManifest, ARA_LAYER, WATERBODY_LAYER, ACCESS_LAYER, STOCKING_LAYER };
