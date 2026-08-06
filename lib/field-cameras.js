// Field camera registry.
//
// Two upstreams, both public and keyless, both probed live on 2026-08-06:
//
//   usgs — the USGS National Imagery Management System. GET /nims/cameras is free and
//          unauthenticated, but every per-camera and per-image endpoint under /nims/ answers
//          403 Missing Authentication Token. The way through is to build the image URL from
//          the list itself: smallDir + camId + "___" + newestImageDT + ".jpg". The list is
//          about 1.2 MB, so it is cached in module memory for the life of a warm instance.
//
//   mdot — MDOT Mi Drive road weather cameras, served as plain JPEGs. These point at pavement,
//          not at scenery. In the Upper Peninsula the framing takes in forest on both shoulders,
//          which is why they are worth showing during colour season, but they are not overlooks
//          and the copy should not pretend otherwise.
//
// Cameras are an ALLOWLIST. The id in the query string selects a registry entry; it is never
// used to build an upstream URL directly, so this cannot be turned into an open proxy.

const NIMS_LIST = "https://api.waterdata.usgs.gov/nims/cameras";
const MDOT_RWIS = "https://mdotjboss.state.mi.us/docs/drive/camfiles/rwis/";
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

async function resolveCamera(id, { maxAgeHours = 26 } = {}) {
  const entry = CAMERAS[id];
  if (!entry) return null;

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

module.exports = { CAMERAS, resolveCamera, isUsable, USER_AGENT, MDOT_RWIS };
