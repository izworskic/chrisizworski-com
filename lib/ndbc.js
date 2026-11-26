const stationMetadata = require("../data/buoy-stations.json");

const MISSING = new Set(["MM", "N/A", "", "999", "9999", "999.0", "9999.0"]);

function numberOrNull(value) {
  if (value == null || MISSING.has(String(value).trim())) return null;
  if (!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(String(value).trim())) return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function parseUtc(parts) {
  const [year, month, day, hour, minute] = parts.map((part) => Number.parseInt(part, 10));
  if (![year, month, day, hour, minute].every(Number.isFinite)) return null;
  if (parts.some(part => !/^\d+$/.test(String(part))) || year < 1900 || year > 2200) return null;
  const d = new Date(Date.UTC(year, month - 1, day, hour, minute));
  if (d.getUTCFullYear() !== year || d.getUTCMonth()+1 !== month || d.getUTCDate() !== day || d.getUTCHours() !== hour || d.getUTCMinutes() !== minute) return null;
  return d.toISOString();
}

function rows(text) {
  return String(text)
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function parseLatestObservations(text) {
  const lines = rows(text);
  const header = lines.find((line) => line.startsWith("#STN"));
  if (!header) throw new Error("NDBC latest-observations header was not found");
  const fields = header.replace(/^#/, "").trim().split(/\s+/);
  const output = new Map();

  for (const line of lines) {
    if (line.startsWith("#")) continue;
    const values = line.split(/\s+/);
    if (values.length < fields.length) continue;
    const row = Object.fromEntries(fields.map((field, index) => [field, values[index]]));
    const id = String(row.STN).toUpperCase();
    const obs_time = parseUtc([row.YYYY, row.MM, row.DD, row.hh, row.mm]);
    if (!obs_time) continue;
    const prior = output.get(id);
    if (prior && Date.parse(prior.obs_time) >= Date.parse(obs_time)) continue;
    output.set(id, {
      id,
      obs_time,
      wind_dir: numberOrNull(row.WDIR),
      wind_spd: numberOrNull(row.WSPD),
      wind_gst: numberOrNull(row.GST),
      wave_ht: numberOrNull(row.WVHT),
      wave_per: numberOrNull(row.DPD),
      wave_dir: numberOrNull(row.MWD),
      pres: numberOrNull(row.PRES),
      air_t: numberOrNull(row.ATMP),
      water_t: numberOrNull(row.WTMP),
    });
  }

  return output;
}

function parseRealtimeObservations(text) {
  const lines = rows(text);
  const header = lines.find((line) => /^#YY\s/.test(line));
  if (!header) throw new Error("NDBC realtime header was not found");
  const fields = header.replace(/^#/, "").trim().split(/\s+/);
  const samples = [];

  for (const line of lines) {
    if (line.startsWith("#")) continue;
    const values = line.split(/\s+/);
    if (values.length < fields.length) continue;
    const row = Object.fromEntries(fields.map((field, index) => [field, values[index]]));
    const iso = parseUtc([row.YY, row.MM, row.DD, row.hh, row.mm]);
    if (!iso) continue;
    samples.push({
      t: Date.parse(iso),
      wind_dir: numberOrNull(row.WDIR),
      wind_spd: numberOrNull(row.WSPD),
      wind_gst: numberOrNull(row.GST),
      wave_ht: numberOrNull(row.WVHT),
      wave_per: numberOrNull(row.DPD),
      pres: numberOrNull(row.PRES),
      air_t: numberOrNull(row.ATMP),
      water_t: numberOrNull(row.WTMP),
    });
  }

  return samples.sort((a, b) => a.t - b.t);
}

const OBS_FIELDS = ["wind_dir","wind_spd","wind_gst","wave_ht","wave_per","wave_dir","pres","air_t","water_t"];
function observationState(station, now = Date.now()) {
  const t = Date.parse(station?.obs_time || "");
  if (station?.observation_source === "none" || !Number.isFinite(t) || t > now + 600000) return "unknown";
  if (station.observation_source === "snapshot" || now-t > 7200000) return "older";
  return OBS_FIELDS.some(k => typeof station[k] === "number" && Number.isFinite(station[k])) ? "recent" : "unknown";
}
function mergeLatestWithStationMetadata(observations, fallbackStations = []) {
  const fallbackById = new Map(fallbackStations.map(station => [String(station.id).toUpperCase(), station]));
  return stationMetadata.map(metadata => {
    const id = String(metadata.id).toUpperCase();
    const live = observations.get(id);
    const fallback = fallbackById.get(id);
    // Never lend a snapshot value a live timestamp.
    const row = live || fallback || {};
    const result = {...metadata, obs_time:row.obs_time ?? null, observation_source:live ? "latest" : fallback ? "snapshot" : "none"};
    for (const key of OBS_FIELDS) result[key] = typeof row[key] === "number" && Number.isFinite(row[key]) ? row[key] : null;
    return result;
  });
}
function summarizeStations(stations, now = Date.now()) {
  const result = {catalog_count:stations.length,recent_count:0,older_count:0,unknown_count:0,recent_wave_count:0,recent_wind_count:0,recent_water_count:0,newest_observed_at:null};
  for (const s of stations) {
    const state=observationState(s,now);
    result[state+"_count"]++;
    if(state!=="recent") continue;
    if(Number.isFinite(s.wave_ht))result.recent_wave_count++;
    if(Number.isFinite(s.wind_spd))result.recent_wind_count++;
    if(Number.isFinite(s.water_t))result.recent_water_count++;
    if(!result.newest_observed_at || Date.parse(s.obs_time)>Date.parse(result.newest_observed_at))result.newest_observed_at=s.obs_time;
  }
  return result;
}

module.exports = {
  mergeLatestWithStationMetadata,
  numberOrNull,
  observationState,
  summarizeStations,
  parseLatestObservations,
  parseRealtimeObservations,
};
