/**
 * Network stand-ins for /michigan-soil-temperature/ in tests and the value function. No network.
 *
 * MSU responses are built from the committed measured record (data/garden/msu-soil-2in-daily.json):
 * each day's real 2-inch daily average, with a synthetic low and high 2°F either side. Outside Mar 1 to
 * Jun 30 there is no committed record, so a smooth synthetic seasonal curve stands in (labelled here,
 * never shipped to the page).
 * The Open-Meteo stand-in returns the station's own true future values minus `modelBias` °F, spread over
 * 24 hours with a daily swing, so a correct adjustment recovers the truth exactly.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
export const RAW = JSON.parse(fs.readFileSync(path.join(root, 'data', 'garden', 'msu-soil-2in-daily.json'), 'utf8'));

const utc = iso => { const [y, m, d] = iso.split('-').map(Number); return Date.UTC(y, m - 1, d); };
const iso = ms => new Date(ms).toISOString().slice(0, 10);
const add = (s, n) => iso(utc(s) + n * 864e5);

/** The 2-inch daily average for a station and date: the measured record, or the synthetic curve. */
export function truth(id, day) {
  const y = Number(day.slice(0, 4)), i = Math.round((utc(day) - Date.UTC(y, 2, 1)) / 864e5);
  const rec = RAW.daily[id] && RAW.daily[id][y];
  if (rec && i >= 0 && i < rec.length) return rec[i] === null ? null : rec[i] / 10;
  if (i >= 0 && i < 122) return null; // inside the record window but no record: missing, not invented
  const st = RAW.stations.find(s => s.id === id), doy = (utc(day) - Date.UTC(y, 0, 1)) / 864e5;
  return Math.round((50 - (st.lat - 43) * 1.5 + 24 * Math.sin(2 * Math.PI * (doy - 115) / 365)) * 10) / 10;
}

export function soilFetch({ modelBias = 2, failMSU = false, failModel = false, today = null } = {}) {
  return url => {
    const u = new URL(url);
    if (u.hostname === 'api.enviroweather.msu.edu') {
      if (failMSU) throw new Error('offline');
      if (u.pathname.endsWith('/session')) return { status: 200, body: { firstname: 'Unregistered', roleId: 4, token: '0|test' } };
      const id = u.searchParams.get('stationCode'), md = s => { const [m, d, y] = s.split('/'); return `${y}-${m}-${d}`; };
      const from = md(u.searchParams.get('dateStart')), to = md(u.searchParams.get('selectDate'));
      const Table = [];
      for (let d = from; d <= to; d = add(d, 1)) {
        const t = d < (today || to) ? truth(id, d) : null;
        Table.push({ date: d, stmp_05cm_min: t === null ? null : (t - 2).toFixed(1), stmp_05cm_max: t === null ? null : (t + 2).toFixed(1), stmp_10cm_min: t === null ? null : (t - 2.5).toFixed(1), stmp_10cm_max: t === null ? null : (t + 0.5).toFixed(1) });
      }
      return { status: 200, body: { error: false, message: 'Success', data: { Table } } };
    }
    if (u.hostname === 'api.open-meteo.com') {
      if (failModel) throw new Error('offline');
      const lat = Number(u.searchParams.get('latitude')), lon = Number(u.searchParams.get('longitude'));
      const st = RAW.stations.find(s => Math.abs(s.lat - lat) < 1e-6 && Math.abs(s.lon - lon) < 1e-6);
      const past = Number(u.searchParams.get('past_days') || 0), days = Number(u.searchParams.get('forecast_days') || 7);
      const time = [], vals = [];
      for (let k = -past; k < days; k++) {
        const d = add(today, k); let t = truth(st.id, d);
        if (t === null) { let j = 1; while (t === null && j < 10) { t = truth(st.id, add(d, -j)); j++; } }
        for (let hr = 0; hr < 24; hr++) { time.push(`${d}T${String(hr).padStart(2, '0')}:00`); vals.push(t === null ? null : Math.round((t - modelBias + 3 * Math.sin(2 * Math.PI * (hr - 9) / 24)) * 10) / 10); }
      }
      return { status: 200, body: { latitude: lat, longitude: lon, timezone: 'America/Detroit', hourly_units: { time: 'iso8601', soil_temperature_6cm: '°F' }, hourly: { time, soil_temperature_6cm: vals } } };
    }
    return { status: 404, body: {} };
  };
}
