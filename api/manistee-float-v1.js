"use strict";

const addCoverage = require("../public/assets/manistee-river-coverage.js");
const field = addCoverage(require("../public/assets/manistee-river-data.js"));
const graph = require("../public/assets/manistee-route-core.js");
const hydro = require("./manistee-river-hydrography.js");

const CONTRACT = "manistee-float/v1";
const MAP_URL = "https://chrisizworski.com/manistee-river-map/";
const ALLOWED_WATERWAYS = new Set(["manistee", "pine"]);
const SOURCE = {
  name: "USGS National Hydrography Dataset",
  url: "https://hydro.nationalmap.gov/arcgis/rest/services/nhd/MapServer/6",
};
const ACCESS = field.places.filter((point) => point.type === "access" || point.type === "access-camp");
const BY_ID = new Map(ACCESS.map((point) => [point.id, point]));

function finite(value, min, max) {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) && n >= min && n <= max ? n : null;
}
function mapLink(point) {
  return "https://www.google.com/maps/search/?api=1&query=" +
    encodeURIComponent(point.lat + "," + point.lon);
}
function accessRecord(point) {
  return {
    id: point.id,
    name: point.name,
    waterway: point.waterway,
    reach: point.reach,
    type: point.type,
    latitude: point.lat,
    longitude: point.lon,
    confidence: point.confidence,
    accessCaution: point.status || null,
    locationSource: point.locationSource,
    activities: point.activities,
    note: point.note,
    provenance: point.source,
    mapLink: mapLink(point),
    specialistLink: MAP_URL + "#" + encodeURIComponent(point.id),
    currentAccessVerified: false,
  };
}
function catalog() {
  return {
    contract: CONTRACT,
    kind: "access-catalog",
    registryVersion: field.version,
    registryAuditDate: field.coverage?.checked || null,
    owner: MAP_URL,
    status: "published-access-inventory",
    supportedRoutingWaterways: [...ALLOWED_WATERWAYS],
    coverage: "Curated Manistee basin field map; not an exhaustive list of public landings",
    access: ACCESS.map(accessRecord),
    limitations: ["Access and parking must be checked with the site manager", "These are location records, not confirmed open entrances"],
  };
}
function validatePair(fromId, toId) {
  if (!/^[a-z0-9-]{1,60}$/.test(fromId || "") || !/^[a-z0-9-]{1,60}$/.test(toId || ""))
    return {error:"INVALID_ACCESS_ID",detail:"Choose two access IDs from the published catalog",http:400};
  const from = BY_ID.get(fromId), to = BY_ID.get(toId);
  if (!from || !to) return {error:"ACCESS_NOT_FOUND",detail:"One or both access IDs were not in the published catalog",http:404};
  if (from.id === to.id) return {error:"SAME_ACCESS",detail:"Put-in and takeout must be different",http:400};
  if (from.waterway !== to.waterway) return {error:"DIFFERENT_WATERWAYS",detail:"A route cannot cross between separate mapped waterways",http:422};
  if (!ALLOWED_WATERWAYS.has(from.waterway)) return {error:"WATERWAY_UNROUTABLE",detail:"A continuous source-backed route graph is not available for this waterway",http:422};
  return {from,to};
}
function routeResponse(pair, result, payload, speedMph, includeGeometry = false) {
  const rounding = (n, digits) => Math.round(n * 10 ** digits) / 10 ** digits;
  const validPath = Array.isArray(result?.path) && result.path.length >= 2 &&
    result.path.every(point => Array.isArray(point) && point.length === 2 && point.every(Number.isFinite));
  const miles = finite(result?.distance, 0, 500);
  if (!validPath || miles === null || miles <= 0) return null;
  const geometryAvailable = includeGeometry && result.path.length <= 10000;
  return {
    contract: CONTRACT,
    kind: "river-network-route",
    owner: MAP_URL,
    registryVersion: field.version,
    registryAuditDate: field.coverage?.checked || null,
    status: "mapped-route-estimate",
    waterway: pair.from.waterway,
    from: accessRecord(pair.from),
    to: accessRecord(pair.to),
    route: {
      miles: rounding(miles, 2),
      source: SOURCE,
      geometry: geometryAvailable ?
        {type:"LineString",coordinates:result.path.map(point=>[point[1],point[0]])} : null,
      geometryStatus: !includeGeometry ? "not-requested" :
        geometryAvailable ? "available" : "exceeds-geometry-limit",
      startSnapMiles: rounding(result.startSnap, 3),
      endSnapMiles: rounding(result.endSnap, 3),
      planningSpeedMph: speedMph,
      estimatedHoursAtSelectedSpeed: rounding(miles / speedMph, 2),
      estimateOnly: true,
    },
    geometryFetchedAt: payload.fetched_at || null,
    geometryRetrievalMode: payload.retrievalMode || null,
    geometrySourceCompleteness: payload.sourceCompleteness || null,
    currentAccessVerified: false,
    navigabilityVerified: false,
    directionVerified: false,
    limitations: [
      "NHD river-network length is an estimate, not an authoritative float distance",
      "Graph edges are not flow-direction aware; verify that the selected put-in is upstream",
      "Dams, strainers, portages, rapids, water levels, and temporary closures are not checked",
      "Float time is distance divided by a user-selected planning speed, not an arrival prediction",
      "Never interpret the river line or arrival coordinates as permission to launch",
    ],
  };
}
function json(res, code, data, cache = "no-store") {
  res.setHeader("Cache-Control",cache);
  return res.status(code).json(data);
}
module.exports = async function handler(req, res) {
  res.setHeader("X-Robots-Tag","noindex, nofollow");
  res.setHeader("Access-Control-Allow-Origin","*");
  res.setHeader("Access-Control-Allow-Methods","GET, HEAD");
  res.setHeader("Content-Type","application/json; charset=utf-8");
  if (req.method !== "GET" && req.method !== "HEAD") {
    res.setHeader("Allow","GET, HEAD");
    return json(res,405,{contract:CONTRACT,error:"METHOD_NOT_ALLOWED"});
  }
  const mode = typeof req.query?.mode === "string" ? req.query.mode : "access";
  if (mode === "access") {
    res.setHeader("Cache-Control","public, s-maxage=3600, stale-while-revalidate=3600");
    return req.method === "HEAD" ? res.status(200).end() : res.status(200).json(catalog());
  }
  if (mode !== "route") return json(res,400,{contract:CONTRACT,error:"INVALID_MODE"});
  const fromId = typeof req.query?.from === "string" ? req.query.from : "";
  const toId = typeof req.query?.to === "string" ? req.query.to : "";
  const pair = validatePair(fromId,toId);
  if (pair.error) return json(res,pair.http,{contract:CONTRACT,error:pair.error,detail:pair.detail});
  const rawSpeed = req.query?.speedMph;
  const speedMph = rawSpeed == null ? 3 : finite(rawSpeed,1.5,5);
  if (speedMph === null) return json(res,400,{contract:CONTRACT,error:"INVALID_PLANNING_SPEED"});
  const includeGeometry = req.query?.geometry === "1";
  if (req.method === "HEAD") {
    res.setHeader("Cache-Control","no-store");
    return res.status(200).end();
  }
  try {
    const waterwayName = pair.from.waterway === "pine" ? "Pine River" : "Manistee River";
    const payload = await hydro.fetchHydrography({name:waterwayName});
    if (payload.sourceCompleteness !== "complete-retrieved-set")
      return json(res,503,{contract:CONTRACT,status:"unavailable",error:"INCOMPLETE_OFFICIAL_GEOMETRY"});
    const features = (payload.features || []).filter(f=>f.properties?.name===waterwayName);
    if (!features.length) return json(res,503,{contract:CONTRACT,status:"unavailable",error:"WATERWAY_GEOMETRY_MISSING"});
    const result = graph.routeGraph(graph.buildGraph(features),pair.from,pair.to);
    if (!result) return json(res,422,{
      contract:CONTRACT,status:"unavailable",error:"NO_TRUSTWORTHY_NHD_ROUTE",
      detail:"The current hydrography did not connect these access points; no mileage was inferred.",
      from:pair.from.id,to:pair.to.id,
    });
    const output = routeResponse(pair,result,payload,speedMph,includeGeometry);
    if (!output) return json(res,503,{contract:CONTRACT,status:"unavailable",error:"INVALID_SOURCE_GEOMETRY"});
    return json(res,200,output,"public, s-maxage=900, stale-while-revalidate=900");
  } catch {
    return json(res,503,{
      contract:CONTRACT,status:"unavailable",error:"HYDROGRAPHY_UNAVAILABLE",
      detail:"Official river geometry could not be loaded; no fallback distance was created.",
    });
  }
};
module.exports._test = {ACCESS,BY_ID,CONTRACT,SOURCE,accessRecord,catalog,validatePair,routeResponse,finite};
