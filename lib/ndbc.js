const stationMetadata = require("../data/buoy-stations.json");

const MISSING = new Set(["MM", "N/A", "", "999", "9999", "999.0", "9999.0"]);

function numberOrNull(value) {
  if (value == null || MISSING.has(String(value).trim())) return null;
  const number = Number.parseFloat(value);
  return Number.isFinite(number) ? number : null;
}

function parseUtc(parts) {
  const [year, month, day, hour, minute] = parts.map((part) => Number.parseInt(part, 10));
  if (![year, month, day, hour, minute].every(Number.isFinite)) return null;
  return new Date(Date.UTC(year, month - 1, day, hour, minute)).toISOString();
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
    output.set(String(row.STN).toUpperCase(), {
      id: String(row.STN).toUpperCase(),
      obs_time: parseUtc([row.YYYY, row.MM, row.DD, row.hh, row.mm]),
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

function mergeLatestWithStationMetadata(observations, fallbackStations = []) {
  const fallbackById = new Map(fallbackStations.map((station) => [String(station.id).toUpperCase(), station]));
  return stationMetadata.map((metadata) => {
    const id = String(metadata.id).toUpperCase();
    const live = observations.get(id) || {};
    const fallback = fallbackById.get(id) || {};
    return {
      ...metadata,
      obs_time: live.obs_time ?? fallback.obs_time ?? null,
      wind_dir: live.wind_dir ?? fallback.wind_dir ?? null,
      wind_spd: live.wind_spd ?? fallback.wind_spd ?? null,
      wind_gst: live.wind_gst ?? fallback.wind_gst ?? null,
      wave_ht: live.wave_ht ?? fallback.wave_ht ?? null,
      wave_per: live.wave_per ?? fallback.wave_per ?? null,
      wave_dir: live.wave_dir ?? fallback.wave_dir ?? null,
      pres: live.pres ?? fallback.pres ?? null,
      air_t: live.air_t ?? fallback.air_t ?? null,
      water_t: live.water_t ?? fallback.water_t ?? null,
    };
  });
}

module.exports = {
  mergeLatestWithStationMetadata,
  numberOrNull,
  parseLatestObservations,
  parseRealtimeObservations,
};
