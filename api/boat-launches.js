const DNR_LAYER = "https://services3.arcgis.com/Jdnp1TjADvSDxMAX/arcgis/rest/services/PRDBASPublicView/FeatureServer/0";
const SUPPLEMENTAL = require("../data/boat-launch-supplemental.json");

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

function hasValue(value) {
  return value !== null && value !== undefined && String(value).trim() !== "";
}

function optionalNumber(value) {
  if (!hasValue(value)) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function sourceId(a) {
  const facility = hasValue(a.facilityid) ? String(a.facilityid).trim() : "";
  const global = hasValue(a.globalid) ? String(a.globalid).trim() : "";
  const object = hasValue(a.OBJECTID) ? String(a.OBJECTID).trim() : "";
  if (facility) return { id: `facility:${facility}`, sourceId: facility, idType: "facilityid" };
  if (global) return { id: `global:${global}`, sourceId: global, idType: "globalid" };
  if (object) return { id: `object:${object}`, sourceId: object, idType: "OBJECTID" };
  return null;
}

function reviewStatus(a = {}) {
  const flag = String(a.flag || "").trim();
  if (!flag) return "source-qualified";
  if (flag === "InProgress") return "dnr-review-in-progress";
  return "withhold";
}

function eligibleAttributes(a = {}) {
  if (!hasValue(a.name)) return false;
  if (!sourceId(a)) return false;
  if (optionalNumber(a.latitude) === null || optionalNumber(a.longitude) === null) return false;
  if (String(a.referenceonly || "").toLowerCase() === "yes") return false;
  if (reviewStatus(a) === "withhold") return false;
  return true;
}

function normalizeFeature(feature, sourceUpdatedAt = null) {
  const a = feature?.attributes || {};
  if (!eligibleAttributes(a)) return null;
  const identity = sourceId(a);
  const status = reviewStatus(a);
  return {
    id: identity.id,
    sourceType: "michigan-dnr",
    sourceId: identity.sourceId,
    sourceIdType: identity.idType,
    sourceUrl: DNR_LAYER,
    sourceLabel: "Michigan DNR Parks & Recreation boating access data",
    verificationStatus: status,
    detailsUnderReview: status === "dnr-review-in-progress",
    reviewNote: status === "dnr-review-in-progress" && hasValue(a.flagcomments) ? String(a.flagcomments).trim() : null,
    facilityId: hasValue(a.facilityid) ? String(a.facilityid).trim() : null,
    globalId: hasValue(a.globalid) ? String(a.globalid).trim() : null,
    objectId: a.OBJECTID ?? null,
    legacyId: a.legacyid ?? null,
    name: String(a.name).trim(),
    labelName: a.labelname || null,
    latitude: optionalNumber(a.latitude),
    longitude: optionalNumber(a.longitude),
    waterbody: a.waterbody || null,
    waterbodyType: a.waterbodytype || null,
    county: a.WaterbodyCounty || a.NameCounty || a.county || null,
    greatLakesAccess: a.greatlakesaccess || null,
    rampClass: optionalNumber(a.rampcode_new),
    rampDescription: null,
    lanes: optionalNumber(a.nlanes),
    trailerParking: optionalNumber(a.ntrailerableparking),
    vehicleParking: optionalNumber(a.nvehicleonlyparking),
    carryDown: String(a.carrydown || "").toLowerCase() === "yes",
    carryDownType: a.carrydowntype || null,
    piers: optionalNumber(a.npiers),
    vaultToilets: optionalNumber(a.nvaulttoilets),
    flushToilets: optionalNumber(a.nflushtoilets),
    otherToilets: optionalNumber(a.nothertoilets),
    fee: a.recpassport || null,
    operatingHours: a.operating_hours || null,
    operator: a.dnradmin || a.maintby || a.ownedby || null,
    owner: a.ownedby || null,
    seasonalStatus: null,
    grantInAid: String(a.gia || "").toLowerCase() === "yes",
    waterwaysConfirmed: String(a.waterwaysprogramconfirmation || "").toLowerCase() === "yes",
    coordinateCollection: optionalNumber(a.collecttype),
    coordinatePrecision: null,
    coordinateSourceUrl: null,
    dataSource: a.datasource || null,
    qaDate: a.qaqc_1_date ?? null,
    lastEditedDate: a.last_edited_date ?? null,
    sourceUpdatedAt,
    closureUrl: a.closures_url || null,
    localWatercraftControls: a.local_watercraft_controls || null,
    description: a.descrip || null,
    address: null,
  };
}

function normalizeSupplemental(record = {}) {
  const latitude = optionalNumber(record.latitude);
  const longitude = optionalNumber(record.longitude);
  if (
    record.sourceType !== "municipal-supplemental" ||
    record.verificationStatus !== "municipal-source-qualified" ||
    !hasValue(record.id) || !hasValue(record.name) || !hasValue(record.operator) ||
    !hasValue(record.sourceUrl) || !hasValue(record.coordinateSourceUrl) ||
    latitude === null || longitude === null
  ) return null;
  return {
    ...record,
    id: String(record.id),
    sourceId: String(record.id),
    sourceIdType: "supplemental-registry",
    latitude,
    longitude,
    detailsUnderReview: false,
    rampClass: optionalNumber(record.rampClass),
    lanes: optionalNumber(record.lanes),
    trailerParking: optionalNumber(record.trailerParking),
    vehicleParking: optionalNumber(record.vehicleParking),
    piers: optionalNumber(record.piers),
    vaultToilets: optionalNumber(record.vaultToilets),
    flushToilets: optionalNumber(record.flushToilets),
    otherToilets: optionalNumber(record.otherToilets),
    grantInAid: false,
    waterwaysConfirmed: false,
    carryDown: false,
    coordinateCollection: null,
    qaDate: null,
    lastEditedDate: null,
    sourceUpdatedAt: record.verifiedAt || null,
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
    const dnrLaunches = (query.features || []).map(f => normalizeFeature(f, sourceUpdatedAt)).filter(Boolean);
    const supplementalLaunches = SUPPLEMENTAL.map(normalizeSupplemental).filter(Boolean);
    const launches = [...dnrLaunches, ...supplementalLaunches];
    const unique = [...new Map(launches.map(x => [x.id, x])).values()];
    if (!dnrLaunches.length) throw new Error("Michigan DNR returned no qualifying open Great Lakes-access sites");
    const sourceQualifiedCount = unique.filter(x => x.verificationStatus === "source-qualified").length;
    const reviewInProgressCount = unique.filter(x => x.verificationStatus === "dnr-review-in-progress").length;
    const municipalSupplementalCount = unique.filter(x => x.verificationStatus === "municipal-source-qualified").length;

    return res.status(200).json({
      source: "Michigan DNR boating access data plus source-qualified municipal supplements",
      source_url: DNR_LAYER,
      fetched_at: new Date().toISOString(),
      source_updated_at: sourceUpdatedAt,
      qualification: {
        bas_type: "Boating Access Site",
        launch_status: "Open",
        great_lakes_access: "Yes*",
        stable_id: "facilityid, otherwise globalid/OBJECTID",
        excludes_reference_only: true,
        source_qualified: "blank DNR facility review flag",
        review_in_progress: "DNR InProgress is displayed with provisional facility details",
        withheld_review_status: "DNR Review Needed and unknown flag values",
        municipal_supplemental: "owner/operator source plus independently documented launch-specific location evidence",
      },
      fallback_used: false,
      count: unique.length,
      dnr_count: dnrLaunches.length,
      source_qualified_count: sourceQualifiedCount,
      review_in_progress_count: reviewInProgressCount,
      municipal_supplemental_count: municipalSupplementalCount,
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

module.exports._test = { DNR_LAYER, WHERE, FIELDS, hasValue, optionalNumber, sourceId, reviewStatus, eligibleAttributes, normalizeFeature, normalizeSupplemental, queryUrl };
