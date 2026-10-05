'use strict';

const ZONE = Object.freeze({
  peak: { label: 'Peak', passenger: 900, motorcycle: 450, smallTruck: 1440, largeTruck: 2160, overnight: false },
  overnight: { label: 'Overnight', passenger: 225, motorcycle: 105, smallTruck: 360, largeTruck: 540, overnight: true },
});

const CROSSINGS = Object.freeze([
  { id: 'gwb', name: 'George Washington Bridge', agency: 'Port Authority', corridor: 'Upper Manhattan', direction: 'nyc', basePeak: 1679, baseOffPeak: 1473, zone: false, commercial: true, cameraUrl: 'https://511ny.org/' },
  { id: 'lincoln', name: 'Lincoln Tunnel', agency: 'Port Authority', corridor: 'Midtown West', direction: 'nyc', basePeak: 1679, baseOffPeak: 1473, zone: true, credit: 300, commercial: true, cameraUrl: 'https://511ny.org/' },
  { id: 'holland', name: 'Holland Tunnel', agency: 'Port Authority', corridor: 'Lower Manhattan', direction: 'nyc', basePeak: 1679, baseOffPeak: 1473, zone: true, credit: 300, commercial: true, cameraUrl: 'https://511ny.org/' },
  { id: 'queens-midtown', name: 'Queens–Midtown Tunnel', agency: 'MTA Bridges & Tunnels', corridor: 'Midtown East', direction: 'nyc', basePeak: 746, baseOffPeak: 746, zone: true, credit: 300, commercial: true, cameraUrl: 'https://511ny.org/' },
  { id: 'hugh-carey', name: 'Hugh L. Carey Tunnel', agency: 'MTA Bridges & Tunnels', corridor: 'Lower Manhattan', direction: 'nyc', basePeak: 746, baseOffPeak: 746, zone: true, credit: 300, commercial: true, cameraUrl: 'https://511ny.org/' },
  { id: 'brooklyn', name: 'Brooklyn Bridge', agency: 'NYC DOT', corridor: 'Lower Manhattan', direction: 'nyc', basePeak: 0, baseOffPeak: 0, zone: true, credit: 0, commercial: false, cameraUrl: 'https://511ny.org/' },
  { id: 'manhattan', name: 'Manhattan Bridge', agency: 'NYC DOT', corridor: 'Lower Manhattan', direction: 'nyc', basePeak: 0, baseOffPeak: 0, zone: true, credit: 0, commercial: false, cameraUrl: 'https://511ny.org/' },
  { id: 'williamsburg', name: 'Williamsburg Bridge', agency: 'NYC DOT', corridor: 'Lower East Side', direction: 'nyc', basePeak: 0, baseOffPeak: 0, zone: true, credit: 0, commercial: false, cameraUrl: 'https://511ny.org/' },
  { id: 'rfk', name: 'Robert F. Kennedy Bridge', agency: 'MTA Bridges & Tunnels', corridor: 'Upper East Side / Bronx', direction: 'nyc', basePeak: 746, baseOffPeak: 746, zone: false, commercial: true, cameraUrl: 'https://511ny.org/' },
  { id: 'verrazzano', name: 'Verrazzano–Narrows Bridge', agency: 'MTA Bridges & Tunnels', corridor: 'Staten Island / Brooklyn', direction: 'nyc', basePeak: 746, baseOffPeak: 746, zone: false, commercial: true, cameraUrl: 'https://511ny.org/' },
]);

function bool(value) { return /^(1|true|yes)$/i.test(String(value ?? '')); }
function number(value) { if (value == null || value === '') return null; const n = Number(value); return Number.isFinite(n) ? n : null; }
function periodFor(date) {
  const d = date instanceof Date ? date : new Date(date || Date.now());
  if (Number.isNaN(d.getTime())) return { key: 'peak', ...ZONE.peak };
  const day = d.getDay(); const hour = d.getHours();
  const peak = day === 0 || day === 6 ? hour >= 9 && hour < 21 : hour >= 5 && hour < 21;
  return peak ? { key: 'peak', ...ZONE.peak } : { key: 'overnight', ...ZONE.overnight };
}
function vehicleClass(vehicle = {}) {
  const type = String(vehicle.type || 'car');
  if (type === 'motorcycle') return 'motorcycle';
  if (type === 'small-truck' || type === 'small-commercial') return 'smallTruck';
  if (type === 'large-truck' || type === 'bus') return 'largeTruck';
  return 'passenger';
}
function chargeFor(crossing, input = {}) {
  const when = input.travelAt ? new Date(input.travelAt) : new Date();
  const period = periodFor(when);
  const klass = vehicleClass(input.vehicle);
  const ezPass = input.payment === 'ny-ezpass';
  const base = crossing.agency === 'Port Authority'
    ? (period.key === 'peak' ? crossing.basePeak : crossing.baseOffPeak)
    : crossing[`base${period.key === 'peak' ? 'Peak' : 'OffPeak'}`];
  const toll = crossing.agency === 'NYC DOT' ? 0 : (ezPass ? base : Math.round(base * 1.61));
  const entersZone = crossing.zone && input.destinationZone !== false;
  const zoneBase = entersZone ? ZONE[period.key][klass] : 0;
  const credit = entersZone && period.key === 'peak' && ezPass && crossing.credit ? Math.min(crossing.credit, zoneBase) : 0;
  const zone = Math.max(0, zoneBase - credit);
  const total = toll + zone;
  const lines = [];
  if (toll) lines.push({ label: `${crossing.agency} crossing toll`, cents: toll });
  if (entersZone && zoneBase) lines.push({ label: `Congestion Relief Zone (${period.label.toLowerCase()})`, cents: zone });
  if (credit) lines.push({ label: 'Peak crossing credit', cents: -credit });
  return { crossingId: crossing.id, period: period.key, periodLabel: period.label, toll, zone, credit, total, entersZone, lines, source: crossing.agency === 'Port Authority' ? 'https://www.panynj.gov/bridges-tunnels/en/tolls.html' : 'https://www.mta.info/fares-tolls/tolls/vehicle-types' };
}
function routeEligibility(crossing, vehicle = {}) {
  const type = String(vehicle.type || 'car');
  if (!crossing.commercial && ['small-truck', 'small-commercial', 'large-truck', 'bus'].includes(type)) return { state: 'PROHIBITED', reason: 'Commercial vehicles require a validated truck route and are not evaluated on this city bridge.' };
  const height = number(vehicle.heightFt);
  if (height != null && height > 13.5 && ['lincoln', 'holland'].includes(crossing.id)) return { state: 'REVIEW', reason: 'Vehicle height requires official facility confirmation.' };
  return { state: 'ELIGIBLE', reason: 'No engine-level prohibition found; verify posted signs and the complete approach route.' };
}
function buildSnapshot(input = {}) {
  const vehicle = input.vehicle || { type: 'car' };
  const destinationZone = input.destinationZone !== false;
  const costs = CROSSINGS.map(crossing => ({ crossing, cost: chargeFor(crossing, { ...input, vehicle, destinationZone }), eligibility: routeEligibility(crossing, vehicle) }));
  const traffic = input.traffic && Array.isArray(input.traffic.routes) ? input.traffic : { state: 'UNAVAILABLE', reason: 'Live full-trip travel times are not configured. No ETA is fabricated.', routes: [] };
  const routes = costs.map(item => {
    const live = traffic.routes.find(r => r.crossingId === item.crossing.id);
    return { id: item.crossing.id, name: item.crossing.name, corridor: item.crossing.corridor, cost: item.cost, eligibility: item.eligibility, etaMinutes: number(live?.etaMinutes), etaState: live ? 'LIVE' : 'UNAVAILABLE', etaScope: live?.scope || null, reportedAt: live?.reportedAt || null, approach: live?.approach || null, lane: live?.lane || null, incident: live?.incident || null, cameraUrl: item.crossing.cameraUrl };
  });
  const eligible = routes.filter(r => r.eligibility.state === 'ELIGIBLE');
  const crossingOnly = traffic.scope === 'CROSSING_APPROACH';
  return { generatedAt: new Date().toISOString(), query: { payment: input.payment || 'ny-ezpass', destinationZone }, trafficState: traffic.state || 'UNAVAILABLE', trafficReason: traffic.reason || null, recommendationState: traffic.routes?.length ? (crossingOnly ? 'PARTIAL_CROSSING_TIMES' : 'READY') : 'COST_ONLY', routes, fastest: crossingOnly ? null : eligible.filter(r => r.etaMinutes != null).sort((a,b)=>a.etaMinutes-b.etaMinutes)[0] || null, lowestToll: eligible.sort((a,b)=>a.cost.total-b.cost.total)[0] || null, sources: { congestion: 'https://www.mta.info/fares-tolls/tolls/congestion-relief-zone/about', mta: 'https://www.mta.info/fares-tolls/tolls/vehicle-types', portAuthority: 'https://www.panynj.gov/bridges-tunnels/en/tolls.html', traffic: traffic.source || 'https://www.511ny.org/developers/resources' } };
}
module.exports = { CROSSINGS, ZONE, buildSnapshot, chargeFor, periodFor, routeEligibility, vehicleClass };
