const DNR_LAYER = "https://services3.arcgis.com/Jdnp1TjADvSDxMAX/arcgis/rest/services/PRDBASPublicView/FeatureServer/0";

const WHERE = [
  "bas_type='Boating Access Site'",
  "launch_status='Open'",
  "greatlakesaccess LIKE 'Yes%'",
  "facilityid IS NOT NULL",
  "latitude IS NOT NULL",
  "longitude IS NOT NULL",
].join(" AND ");

const FIELDS = [
  "facilityid","legacyid","name","labelname","waterbody","waterbodytype","bas_type","descrip","condition",
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
    f: "json",
  });
  return `${DNR_LAYER}/query?${params}`;
}

function validFeature(feature) {
  const a = feature?.attributes || {};
  if (!a.facilityid || !a.name) return false;
  if (!Number.isFinite(Number(a.latitude)) || !Number.isFinite(Number(a.longitude))) return false;
  if (String(a.referenceonly || "").toLowerCase() === "yes") return false;
  if (String(a.flag || "").trim()) return false;
  return true;
}

async function fetchJson(url) {
  const response = await fetch(url, {
    headers: {
      accept: "application/json",
      "user-agent": "ChrisIzworskiBoatLaunchFinder/2.0 (+https://chrisizworski.com/michigan-boat-launches/)",
    },
    signal: AbortSignal.timeout(8_000),
  });
  if (!response.ok) throw new Error(`Michigan DNR returned ${response.status}`);
  const data = await response.json();
  if (data?.error) throw new Error(data.error.message || "Michigan DNR query error");
  return data;
}

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("X-Robots-Tag", "noindex, nofollow");
  res.setHeader("Cache-Control", "public, s-maxage=1800");

  if (req.method !== "GET" && req.method !== "HEAD") {
    res.setHeader("Allow", "GET, HEAD");
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const [query, metadata] = await Promise.all([
      fetchJson(queryUrl()),
      fetchJson(`${DNR_LAYER}?f=json`).catch(() => null),
    ]);

    const features = (query.features || []).filter(validFeature);
    if (!features.length) throw new Error("Michigan DNR returned no qualifying open Great Lakes-access sites");

    return res.status(200).json({
      source: "Michigan DNR Parks and Recreation boating access data",
      source_url: DNR_LAYER,
      fetched_at: new Date().toISOString(),
      source_updated_at: metadata?.editingInfo?.lastEditDate || metadata?.lastEditDate || null,
      qualification: {
        bas_type: "Boating Access Site",
        launch_status: "Open",
        great_lakes_access: "Yes*",
        requires_facility_id: true,
        excludes_reference_only: true,
        excludes_flagged_records: true,
      },
      count: features.length,
      features,
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

module.exports._test = { DNR_LAYER, WHERE, FIELDS, validFeature, queryUrl };
