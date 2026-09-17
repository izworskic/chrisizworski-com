const test=require('node:test');
const assert=require('node:assert/strict');
const {normalizeWeather,getWeatherAll}=require('../lib/fall-color/data');
const {weatherFeel}=require('../lib/fall-color/model');

test('missing weather never becomes clear sky, zero rain or an observed warm spell',()=>{
  const daily={time:Array.from({length:17},(_,i)=>'2026-09-'+String(i+1).padStart(2,'0'))};
  const normalized=normalizeWeather({daily});
  assert.equal(normalized.summary,null);
  assert.equal(normalized.forecast.length,3);
  for(const day of normalized.forecast)for(const key of ['hi','lo','code','pop'])assert.equal(day[key],null);
  assert.equal(weatherFeel(normalized.forecast),null);
  assert.equal(normalizeWeather({}).summary,null);
  assert.equal(normalizeWeather({daily:{temperature_2m_min:[40]}}).summary,null);
});
test('real zero rain and clear-sky codes survive without turning missing temperatures into observations',()=>{
  const normalized=normalizeWeather({daily:{time:Array(17).fill('2026-09-17'),temperature_2m_min:Array(17).fill(40),temperature_2m_max:Array(17).fill(60),weather_code:Array(17).fill(0),precipitation_probability_max:Array(17).fill(0)}});
  assert.equal(normalized.summary.coolNights,15);
  assert.equal(normalized.summary.frostRecent,false);
  assert.equal(normalized.forecast[0].code,0);
  assert.equal(normalized.forecast[0].pop,0);
  assert.match(weatherFeel(normalized.forecast),/mostly clear skies/);
  assert.match(weatherFeel([{hi:60,lo:40,code:null}]),/sky forecast unavailable/);
});
test('weather provider errors are rejected before an empty payload can appear current',async t=>{
  t.mock.method(globalThis,'fetch',async()=>new Response('{"error":true}',{status:429}));
  await assert.rejects(getWeatherAll(),/Weather provider returned 429/);
});
