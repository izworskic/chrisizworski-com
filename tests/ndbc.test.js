const test = require("node:test");
const assert = require("node:assert/strict");
const { parseLatestObservations, parseRealtimeObservations } = require("../lib/ndbc");

test("parses the NDBC latest observation format", () => {
  const input = `#STN LAT LON YYYY MM DD hh mm WDIR WSPD GST WVHT DPD APD MWD PRES PTDY ATMP WTMP DEWP VIS TIDE
#text units units yr mo dy hr mn degT m/s m/s m sec sec degT hPa hPa degC degC degC nmi ft
45001 48.061 -87.793 2026 07 19 12 00 240 7.0 8.0 1.0 5.0 MM 230 1015.3 MM 7.7 3.7 MM MM MM`;
  const station = parseLatestObservations(input).get("45001");
  assert.equal(station.obs_time, "2026-07-19T12:00:00.000Z");
  assert.equal(station.wind_spd, 7);
  assert.equal(station.wave_ht, 1);
  assert.equal(station.water_t, 3.7);
  assert.equal(station.wave_dir, 230);
});

test("parses the NDBC realtime format and keeps null measurements", () => {
  const input = `#YY  MM DD hh mm WDIR WSPD GST WVHT DPD APD MWD PRES ATMP WTMP DEWP VIS PTDY TIDE
#yr  mo dy hr mn degT m/s m/s m sec sec degT hPa degC degC degC nmi hPa ft
2026 07 19 12 00 240 7 8 1.0 5 MM 230 1015.3 7.7 3.7 MM MM MM MM
2026 07 19 12 10 MM MM MM MM MM MM MM MM MM 3.8 MM MM MM MM`;
  const samples = parseRealtimeObservations(input);
  assert.equal(samples.length, 2);
  assert.equal(samples[0].t, Date.parse("2026-07-19T12:00:00.000Z"));
  assert.equal(samples[1].wind_spd, null);
  assert.equal(samples[1].water_t, 3.8);
});

test("whole-row fallback never stamps historical values with a fresh live timestamp",()=>{
  const {mergeLatestWithStationMetadata,summarizeStations}=require("../lib/ndbc");
  const now=Date.parse("2026-11-26T12:00:00Z");
  const latest=new Map([["45001",{obs_time:"2026-11-26T11:40:00Z",wave_ht:null,wind_spd:0}]]);
  const result=mergeLatestWithStationMetadata(latest,[{id:"45001",obs_time:"2026-07-19T12:00:00Z",wave_ht:2,water_t:22},{id:"45002",obs_time:"2026-11-26T11:50:00Z",wave_ht:1}]);
  const a=result.find(s=>s.id==="45001"),b=result.find(s=>s.id==="45002");
  assert.equal(a.wave_ht,null);assert.equal(a.water_t,null);assert.equal(a.wind_spd,0);assert.equal(a.observation_source,"latest");
  assert.equal(b.observation_source,"snapshot");assert.equal(b.wave_ht,1);
  const summary=summarizeStations(result,now);
  assert.equal(summary.recent_count,1);assert.equal(summary.recent_wave_count,0);assert.equal(summary.recent_wind_count,1);
  assert.equal(summary.older_count,1);assert.equal(summary.newest_observed_at,a.obs_time);
  assert.equal(summary.recent_count+summary.older_count+summary.unknown_count,result.length);
});
test("invalid calendar timestamps and malformed numbers are not observations",()=>{
  const input="#STN YYYY MM DD hh mm WSPD WVHT\n45001 2026 11 31 12 00 2 3\n45001 2026 11 26 12 00 3oops MM\n45001 2026 11 26 11 00 7 4";
  const s=parseLatestObservations(input).get("45001");
  assert.equal(s.obs_time,"2026-11-26T12:00:00.000Z");assert.equal(s.wind_spd,null);assert.equal(s.wave_ht,null);
});
