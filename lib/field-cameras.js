// Field camera registry.
//
// Public/keyless upstreams plus one authenticated discovery service. Every camera is
// probed and viewed before it is added here; an API status of active is not enough.
//
//   usgs — the USGS National Imagery Management System. GET /nims/cameras is free and
//          unauthenticated, but every per-camera and per-image endpoint under /nims/ answers
//          403 Missing Authentication Token. The way through is to build the image URL from
//          the list itself: smallDir + camId + "___" + newestImageDT + ".jpg". The list is
//          about 1.2 MB, so it is cached in module memory for the life of a warm instance.
//
//   phenocam — PhenoCam research cameras, mounted above the forest canopy and pointed at the
//          woods themselves. These are the best fall colour images available to this network:
//          the Sylvania camera in Michigan's western U.P. looks out over mixed northern
//          hardwood from above, which is exactly what a colour searcher wants to see. The
//          site's primary vegetation code reads evergreen needleleaf, which is why the colour
//          MODEL does not use it, but the actual view is mostly hardwood. Look at the picture
//          before trusting the metadata field.
//
//   mdot — MDOT Mi Drive road weather cameras, served as plain JPEGs. These point at pavement,
//          not at scenery. In the Upper Peninsula the framing takes in forest on both shoulders,
//          which is why they are worth showing during colour season, but they are not overlooks
//          and the copy should not pretend otherwise.
//
//   windy — Windy Webcams API v3. The API key stays server-side. Windy's free-tier image URLs
//           expire quickly and its terms require the browser to use the API-provided URL, link
//           the image to the Windy detail page, avoid upscaling, and show courtesy. Those rules
//           are exposed as metadata for public/assets/field-camera.js rather than proxying the
//           image through this site.
//
// Cameras are an ALLOWLIST. The id in the query string selects a registry entry; it is never
// used to build an upstream URL directly, so this cannot be turned into an open proxy.

const NIMS_LIST = "https://api.waterdata.usgs.gov/nims/cameras";
const MDOT_RWIS = "https://mdotjboss.state.mi.us/docs/drive/camfiles/rwis/";
const PHENOCAM_LATEST = "https://phenocam.nau.edu/data/latest/";
const WINDY_WEBCAMS_API = "https://api.windy.com/webcams/api/v3/webcams";
const WINDY_CREDIT_URL = "https://www.windy.com/";
const WINDY_ADD_URL = "https://www.windy.com/webcams/add";
const USER_AGENT =
  "chrisizworski.com field cameras (+https://chrisizworski.com/; contact: izworski@gmail.com)";

const CAMERAS = Object.freeze({
  // Soo Locks. The single highest value camera available to this network: the page it belongs
  // to carries about 29% of site impressions.
  "st-marys-soo": {
    source: "usgs",
    camId: "MI_St_Marys_River_at_Sault_Ste_Marie",
    label: "St Marys River at Sault Ste Marie",
    credit: "USGS National Imagery Management System",
    creditUrl: "https://apps.usgs.gov/hivis/",
  },
  // Saginaw Bay. Three of these sit essentially ON launches already pinned by the Saginaw Bay
  // Report, and the Holland Avenue camera watches USGS 04157005, the exact gauge at the head of
  // that site's turbidity cascade. So the number and a picture of the same water arrive together.
  // Honest limit, and the pages say it: these look at rivers and river mouths, not at the open
  // bay. They answer "what does the water look like where I launch", not "is the bay fishable".
  "saginaw-river-holland": {
    source: "usgs", camId: "MI_Saginaw_River_at_Holland_Ave_at_Saginaw",
    label: "Saginaw River at Holland Avenue, Saginaw",
    zone: "saginaw-river", credit: "USGS National Imagery Management System", creditUrl: "https://apps.usgs.gov/hivis/",
  },
  "kawkawlin-bay-city": {
    source: "usgs", camId: "MI_Kawkawlin_River_at_State_Park_Dr_at_Bay_City",
    label: "Kawkawlin River at State Park Drive, Bay City",
    zone: "inner-bay", credit: "USGS National Imagery Management System", creditUrl: "https://apps.usgs.gov/hivis/",
  },
  "sebewaing-river": {
    source: "usgs", camId: "MI_Sebewaing_River_at_Center_Street_at_Sebewaing",
    label: "Sebewaing River at Center Street, Sebewaing",
    zone: "eastern-bay", credit: "USGS National Imagery Management System", creditUrl: "https://apps.usgs.gov/hivis/",
  },
  "pine-river-standish": {
    source: "usgs", camId: "MI_Pine_River_at_Pine_River_Road_near_Standish",
    label: "Pine River at Pine River Road, near Standish",
    zone: "lower-bay", credit: "USGS National Imagery Management System", creditUrl: "https://apps.usgs.gov/hivis/",
  },

  // Above-canopy forest cameras. Better colour images than any road camera, because they are
  // pointed at the trees rather than at pavement.
  "sylvania-canopy": {
    source: "phenocam", site: "sylvania",
    label: "Sylvania Wilderness canopy, Gogebic County",
    region: "wup", credit: "PhenoCam Network", creditUrl: "https://phenocam.nau.edu/webcam/sites/sylvania/",
  },
  "kemp-canopy": {
    source: "phenocam", site: "kempnrs",
    label: "Northern hardwood canopy at Kemp Station, just over the Wisconsin line",
    region: "wup", credit: "PhenoCam Network", creditUrl: "https://phenocam.nau.edu/webcam/sites/kempnrs/",
  },

  // Fall colour, north to south, each tied to the region page it belongs on.
  "m26-keweenaw": {
    source: "mdot", file: "712.jpg", label: "M-26 at Poyhonen Road, Houghton County",
    region: "wup", credit: "MDOT Mi Drive", creditUrl: "https://mdotjboss.state.mi.us/MiDrive/map?cameras=true",
  },
  "m28-forest-lake": {
    source: "mdot", file: "700.jpg", label: "M-28 at Forest Lake Road, Alger County",
    region: "wup", credit: "MDOT Mi Drive", creditUrl: "https://mdotjboss.state.mi.us/MiDrive/map?cameras=true",
  },
  "m123-tahquamenon": {
    source: "mdot", file: "2067.jpg", label: "M-123 at the Luce and Chippewa county line",
    region: "eup", credit: "MDOT Mi Drive", creditUrl: "https://mdotjboss.state.mi.us/MiDrive/map?cameras=true",
  },
  "m28-seney": {
    source: "mdot", file: "710.jpg", label: "M-28 at the Seney rest area",
    region: "eup", credit: "MDOT Mi Drive", creditUrl: "https://mdotjboss.state.mi.us/MiDrive/map?cameras=true",
  },
  "m22-leelanau": {
    source: "mdot", file: "2758.jpg", label: "M-22 at North Eagle Highway, Leelanau County",
    region: "nwl", credit: "MDOT Mi Drive", creditUrl: "https://mdotjboss.state.mi.us/MiDrive/map?cameras=true",
  },
  "i75-grayling": {
    source: "mdot", file: "721.jpg", label: "I-75 at the Grayling rest area",
    region: "nel", credit: "MDOT Mi Drive", creditUrl: "https://mdotjboss.state.mi.us/MiDrive/map?cameras=true",
  },

  // Windy fills genuine geographic gaps that the public networks above do not. These eight
  // were checked by eye on 2026-08-17. Traffic-only, mislabeled, stale, duplicate, and poor-angle
  // listings were deliberately excluded from the 83 Michigan records returned by the API.
  "windy-bay-city-yacht-club": {
    source: "windy", webcamId: 1750506347,
    label: "Saginaw Bay at Bay City Yacht Club, Essexville",
    zone: "inner-bay", credit: "Webcams provided by Windy.com", creditUrl: WINDY_CREDIT_URL,
    note: "Looking out over the water from the Bay City Yacht Club in Essexville.",
  },
  "windy-caseville": {
    source: "windy", webcamId: 1511397485,
    label: "Wild Fowl Bay near Caseville",
    zone: "eastern-bay", credit: "Webcams provided by Windy.com", creditUrl: WINDY_CREDIT_URL,
    note: "Looking south over Wild Fowl Bay from Caseville Township.",
  },
  "windy-houghton-lake": {
    source: "windy", webcamId: 1387787415,
    label: "Houghton Lake at Houghton Point",
    credit: "Webcams provided by Windy.com", creditUrl: WINDY_CREDIT_URL,
    note: "Looking out over the lake from Houghton Point.",
  },
  "windy-holland-state-park": {
    source: "windy", webcamId: 1606575521,
    label: "Lake Michigan at Holland State Park",
    credit: "Webcams provided by Windy.com", creditUrl: WINDY_CREDIT_URL,
    note: "Looking down the channel to Lake Michigan at Holland State Park.",
  },
  "windy-south-haven": {
    source: "windy", webcamId: 1466196602,
    label: "Lake Michigan and the South Haven pier",
    credit: "Webcams provided by Windy.com", creditUrl: WINDY_CREDIT_URL,
    note: "Looking out over Lake Michigan from the east side of South Haven.",
  },
  "windy-frankfort": {
    source: "windy", webcamId: 1757625596,
    label: "Lake Michigan at Frankfort harbor",
    credit: "Webcams provided by Windy.com", creditUrl: WINDY_CREDIT_URL,
    note: "Looking out over the harbor and Lake Michigan at Frankfort.",
  },
  "windy-big-sable": {
    source: "windy", webcamId: 1793904123,
    label: "Lake Michigan from Big Sable Point Lighthouse",
    credit: "Webcams provided by Windy.com", creditUrl: WINDY_CREDIT_URL,
    note: "Looking out over Lake Michigan from Big Sable Point, inside Ludington State Park.",
  },
  "windy-calumet-trail": {
    source: "windy", webcamId: 1639589284,
    label: "Trail 14 near Calumet in the Keweenaw",
    region: "wup", credit: "Webcams provided by Windy.com", creditUrl: WINDY_CREDIT_URL,
    note: "Looking along Trail 14 northwest of Calumet, through hardwood forest.",
  },
});

let nimsCache = { at: 0, byId: null };
const NIMS_TTL_MS = 30 * 60 * 1000;

async function nimsIndex() {
  if (nimsCache.byId && Date.now() - nimsCache.at < NIMS_TTL_MS) return nimsCache.byId;
  const res = await fetch(NIMS_LIST, {
    headers: { accept: "application/json", "user-agent": USER_AGENT },
    signal: AbortSignal.timeout(20_000),
  });
  if (!res.ok) throw new Error(`NIMS list returned ${res.status}`);
  const rows = await res.json();
  const byId = new Map();
  for (const row of rows) if (row && row.camId) byId.set(row.camId, row);
  nimsCache = { at: Date.now(), byId };
  return byId;
}

// A camera flagged visible can still be years dead. Michigan has 27 cameras, 22 pass the
// hideCam flag, and only about half carry an image from the last hour. Age is the real test.
function isUsable(capturedAt, maxAgeHours) {
  if (!capturedAt) return false;
  const age = (Date.now() - new Date(capturedAt).getTime()) / 3_600_000;
  return age >= 0 && age <= maxAgeHours;
}

function safeWindyUrl(value, allowedHosts) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && allowedHosts.has(url.hostname) ? url.toString() : null;
  } catch {
    return null;
  }
}

async function resolveWindy(entry, id, maxAgeHours) {
  const key = String(process.env.WINDY_WEBCAMS_API_KEY || "").trim();
  if (!key) {
    // A missing key is OUR deployment state, not a fact about the camera. Saying "this camera is
    // not publishing" here would be false: the camera is fine and this site simply cannot reach
    // it. Flagged so the renderer can drop the block silently instead of printing a wrong notice
    // on a live page. This is also what makes the registry safe to ship before the key exists.
    return { ...entry, id, url: null, capturedAt: null, stale: true, unconfigured: true, reason: "camera access is not configured" };
  }

  const endpoint = new URL(`${WINDY_WEBCAMS_API}/${entry.webcamId}`);
  endpoint.searchParams.set("include", "images,location,player,urls");
  endpoint.searchParams.set("lang", "en");
  const response = await fetch(endpoint, {
    headers: { accept: "application/json", "x-windy-api-key": key, "user-agent": USER_AGENT },
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) throw new Error(`Windy Webcams returned ${response.status}`);
  const webcam = await response.json();
  const imageUrl = safeWindyUrl(webcam?.images?.current?.preview, new Set(["imgproxy.windy.com"]));
  const clickUrl = safeWindyUrl(webcam?.urls?.detail, new Set(["windy.com", "www.windy.com"]));
  const size = webcam?.images?.sizes?.preview || {};
  const capturedAt = webcam?.lastUpdatedOn || null;

  if (webcam?.status !== "active" || !imageUrl || !clickUrl) {
    return { ...entry, id, url: null, capturedAt, stale: true, reason: "camera is not currently publishing" };
  }

  return {
    ...entry,
    id,
    url: imageUrl,
    clickUrl,
    addUrl: WINDY_ADD_URL,
    directImage: true,
    contentType: "image/jpeg",
    capturedAt,
    stale: !isUsable(capturedAt, maxAgeHours),
    latitude: Number.isFinite(Number(webcam?.location?.latitude)) ? Number(webcam.location.latitude) : null,
    longitude: Number.isFinite(Number(webcam?.location?.longitude)) ? Number(webcam.location.longitude) : null,
    imageWidth: Number(size.width) || 400,
    imageHeight: Number(size.height) || 224,
  };
}

async function resolveCamera(id, { maxAgeHours = 26 } = {}) {
  const entry = CAMERAS[id];
  if (!entry) return null;

  if (entry.source === "windy") return resolveWindy(entry, id, maxAgeHours);

  if (entry.source === "phenocam") {
    return { ...entry, id, url: `${PHENOCAM_LATEST}${entry.site}.jpg`, contentType: "image/jpeg", capturedAt: null, stale: false };
  }

  if (entry.source === "mdot") {
    return { ...entry, id, url: MDOT_RWIS + entry.file, contentType: "image/jpeg", capturedAt: null, stale: false };
  }

  const row = (await nimsIndex()).get(entry.camId);
  if (!row || row.hideCam || !row.newestImageDT) {
    return { ...entry, id, url: null, capturedAt: null, stale: true, reason: "camera is not currently publishing" };
  }
  const stamp = String(row.newestImageDT).replace(/:/g, "-").replace(/\.\d+Z$/, "Z");
  const dir = row.smallDir || row.thumbDir;
  return {
    ...entry,
    id,
    url: `${dir}${entry.camId}___${stamp}.jpg`,
    contentType: "image/jpeg",
    capturedAt: row.newestImageDT,
    latitude: row.lat ? Number(row.lat) : null,
    longitude: row.lng ? Number(row.lng) : null,
    stale: !isUsable(row.newestImageDT, maxAgeHours),
  };
}

module.exports = {
  CAMERAS,
  resolveCamera,
  isUsable,
  safeWindyUrl,
  USER_AGENT,
  MDOT_RWIS,
  WINDY_WEBCAMS_API,
};
