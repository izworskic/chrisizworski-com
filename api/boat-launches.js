const DNR_LAYER = "https://services3.arcgis.com/Jdnp1TjADvSDxMAX/arcgis/rest/services/PRDBASPublicView/FeatureServer/0";

const WHERE = [
  "bas_type='Boating Access Site'",
  "launch_status='Open'",
  "greatlakesaccess LIKE 'Yes%'",
  "latitude IS NOT NULL",
  "longitude IS NOT NULL",
].join(" AND ");

const FIELDS = [
  "OBJECTID","globalid","facilityid","legacyid","name","labelname","waterbody","waterbodytype","bas_type","descrip","condition",
  "recpassport","rampcode_new","ownedby","dnradmin","maintby","collecttype","datasource","latitude","longitude",
  "nlanes","carrydown","npiers","ntrailerableparking","nvehicleonlyparking","nvaulttoilets","nflushtoilets",
  "nothertoilets","county","qaqc_1_date","qaqc_1_comments","referenceonly","gia","carrydowntype",
  "ncarrydownlaunches","flag","flagcomments","staffed","contact","phone","greatlakesaccess","parkingsurface",
  "waterwaysprogramconfirmation","operating_hours","launch_status","fish_cleaning_station",
  "local_watercraft_controls","accessible_feat_piers","accessible_feat_park","accessible_feat_ped_route",
  "accessible_feat_restroom","NameCounty","WaterbodyCounty","closures_url","last_edited_date"
];

function queryUrl() {
  const params = new URLSearchParams({
    where: WHERE,
    outFields: FIELDS.join(","),
    returnGeometry: "false",
    resultRecordCount: "2000",
    f: "json",
  });
  return `${DNR_LAYER}/query?${params}`;
}

function sourceId(a) {
  const facility = String(a.facilityid || "").trim();
  const global = String(a.globalid || "").trim();
  const object = String(a.OBJECTID || "").trim();
  if (facility) return { id: `facility:${facility}`, sourceId: facility, idType: "facilityid" };
  if (global) return { id: `global:${global}`, sourceId: global, idType: "globalid" };
  if (object) return { id: `object:${object}`, sourceId: object, idType: "OBJECTID" };
  return null;
}

function eligibleAttributes(a = {}) {
  if (!a.name) return false;
  if (!sourceId(a)) return false;
  if (!Number.isFinite(Number(a.latitude)) || !Number.isFinite(Number(a.longitude))) return false;
  if (String(a.referenceonly || "").toLowerCase() === "yes") return false;
  // Any nonblank DNR review flag is withheld from verified results. That includes
  // current Review Needed / Review in Progress coding and protects future values.
  if (String(a.flag || "").trim()) return false;
  return true;
}

function normalizeFeature(feature, sourceUpdatedAt = null) {
  const a = feature?.attributes || {};
  if (!eligibleAttributes(a)) return null;
  const identity = sourceId(a);
  return {
    id: identity.id,
    sourceType: "michigan-dnr",
    sourceId: identity.sourceId,
    sourceIdType: identity.idType,
    sourceUrl: DNR_LAYER,
    facilityId: String(a.facilityid || "").trim() || null,
    globalId: String(a.globalid || "").trim() || null,
    objectId: a.OBJECTID ?? null,
    legacyId: a.legacyid ?? null,
    name: a.name,
    labelName: a.labelname || null,
    latitude: Number(a.latitude),
    longitude: Number(a.longitude),
    waterbody: a.waterbody || null,
    waterbodyType: a.waterbodytype || null,
    county: a.WaterbodyCounty || a.NameCounty || a.county || null,
    greatLakesAccess: a.greatlakesaccess || null,
    rampClass: Number.isFinite(Number(a.rampcode_new)) ? Number(a.rampcode_new) : null,
    lanes: Number.isFinite(Number(a.nlanes)) ? Number(a.nlanes) : null,
    trailerParking: Number.isFinite(Number(a.ntrailerableparking)) ? Number(a.ntrailerableparking) : null,
    vehicleParking: Number.isFinite(Number(a.nvehicleonlyparking)) ? Number(a.nvehicleonlyparking) : null,
    carryDown: String(a.carrydown || "").toLowerCase() === "yes",
    carryDownType: a.carrydowntype || null,
    piers: Number.isFinite(Number(a.npiers)) ? Number(a.npiers) : null,
    vaultToilets: Number.isFinite(Number(a.nvaulttoilets)) ? Number(a.nvaulttoilets) : null,
    flushToilets: Number.isFinite(Number(a.nflushtoilets)) ? Number(a.nflushtoilets) : null,
    otherToilets: Number.isFinite(Number(a.nothertoilets)) ? Number(a.nothertoilets) : null,
    fee: a.recpassport || null,
    operatingHours: a.operating_hours || null,
    operator: a.dnradmin || a.maintby || a.ownedby || null,
    owner: a.ownedby || null,
    grantInAid: String(a.gia || "").toLowerCase() === "yes",
    waterwaysConfirmed: String(a.waterwaysprogramconfirmation || "").toLowerCase() === "yes",
    coordinateCollection: a.collecttype ?? null,
    dataSource: a.datasource || null,
    qaDate: a.qaqc_1_date ?? null,
    lastEditedDate: a.last_edited_date ?? null,
    sourceUpdatedAt,
    closureUrl: a.closures_url || null,
    localWatercraftControls: a.local_watercraft_controls || null,
    description: a.descrip || null,
  };
}

async function fetchJson(url) {
  const response = await fetch(url, {
    headers: {
      accept: "application/json",
      "user-agent": "ChrisIzworskiBoatLaunchFinder/3.0 (+https://chrisizworski.com/michigan-boat-launches/)",
    },
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) throw new Error(`Michigan DNR returned ${response.status}`);
  const data = await response.json();
  if (data?.error) throw new Error(data.error.message || "Michigan DNR query error");
  return data;
}

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("X-Robots-Tag", "noindex, nofollow");
  res.setHeader("Cache-Control", "public, s-maxage=1800, stale-while-revalidate=3600");

  if (req.method !== "GET" && req.method !== "HEAD") {
    res.setHeader("Allow", "GET, HEAD");
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const [query, metadata] = await Promise.all([
      fetchJson(queryUrl()),
      fetchJson(`${DNR_LAYER}?f=json`).catch(() => null),
    ]);
    const sourceUpdatedAt = metadata?.editingInfo?.lastEditDate || metadata?.lastEditDate || null;
    const launches = (query.features || []).map(f => normalizeFeature(f, sourceUpdatedAt)).filter(Boolean);
    const unique = [...new Map(launches.map(x => [x.id, x])).values()];
    if (!unique.length) throw new Error("Michigan DNR returned no qualifying open Great Lakes-access sites");

    return res.status(200).json({
      source: "Michigan DNR Parks and Recreation boating access data",
      source_url: DNR_LAYER,
      fetched_at: new Date().toISOString(),
      source_updated_at: sourceUpdatedAt,
      qualification: {
        bas_type: "Boating Access Site",
        launch_status: "Open",
        great_lakes_access: "Yes*",
        stable_id: "facilityid, otherwise globalid/OBJECTID",
        excludes_reference_only: true,
        excludes_flagged_records: true,
      },
      fallback_used: false,
      count: unique.length,
      launches: unique,
    });
  } catch (error) {
    res.setHeader("Cache-Control", "no-store");
    return res.status(502).json({
      error: "Authoritative launch data unavailable",
      detail: String(error?.message || error),
      fallback_used: false,
    });
  }
};

module.exports._test = { DNR_LAYER, WHERE, FIELDS, sourceId, eligibleAttributes, normalizeFeature, queryUrl };
