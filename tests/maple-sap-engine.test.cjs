const test=require('node:test');
const assert=require('node:assert/strict');
const E=require('../lib/maple-sap-engine.cjs');
test('all locations are unique and legitimate Michigan coordinates',()=>{
  assert.equal(new Set(E.LOCATIONS.map(x=>x.id)).size,E.LOCATIONS.length);
  assert.ok(E.LOCATIONS.length>=28);
  E.LOCATIONS.forEach(x=>{assert.ok(x.lat>41.6&&x.lat<48&&x.lon<-82&&x.lon>-91);});
  E.BOARD_IDS.forEach(id=>assert.ok(E.lookup(id)));
});
test('strict seasonal state: October is off season; April and some UP May are eligible',()=>{
  assert.equal(E.season(E.lookup('bay-city'),new Date('2026-10-14T10:00:00Z')),'OFF_SEASON');
  assert.equal(E.season(E.lookup('bay-city'),new Date('2027-03-12T10:00:00Z')),'WEATHER_WINDOW');
  assert.equal(E.season(E.lookup('bay-city'),new Date('2027-05-03T10:00:00Z')),'OFF_SEASON');
  assert.equal(E.season(E.lookup('marquette'),new Date('2027-05-03T10:00:00Z')),'WEATHER_WINDOW');
});
test('favorable freeze-thaw requires both components',()=>{
  const good=E.dailyOpportunity([22,24,26,27,28,29,30],[35,38,42,45,46,47,44,40]);
  assert.equal(good.level,'FAVORABLE');
  assert.equal(E.dailyOpportunity([37,38,39,40,40],[42,43,45,48]).level,'LOW');
  assert.equal(E.dailyOpportunity([15,17,20,25,26],[20,21,23,26]).level,'LOW');
  assert.equal(E.dailyOpportunity([],[38,40,42,44]).level,'INSUFFICIENT');
});
test('time zone and partial first days never fabricate conditions',()=>{
  const start=Date.parse('2027-03-14T13:00:00Z');
  const periods=Array.from({length:7*24},(_,i)=>{
    const t=new Date(start+i*3600000);
    const h=Number(new Intl.DateTimeFormat('en-US',{timeZone:'America/Detroit',hour:'2-digit',hourCycle:'h23'}).format(t));
    return {startTime:t.toISOString(),temperatureUnit:'F',temperature:h<9?26:43};
  });
  const daily=E.evaluate(periods,E.lookup('bay-city'),new Date('2027-03-14T13:00:00Z'));
  assert.ok(daily.length>=6);
  assert.equal(daily[0].score,null);
  assert.equal(daily[1].level,'FAVORABLE');
  assert.ok(E.summarize(daily).bestDay);
});