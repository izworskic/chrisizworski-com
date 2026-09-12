const test=require('node:test');
const assert=require('node:assert/strict');
const { _test:m }=require('../api/thunder-hole.js');

test('preferred pre-high tide scores above low-value timing',()=>{
  assert.ok(m.tideFit(-90)>90);
  assert.ok(m.tideFit(-90)>m.tideFit(180));
  assert.ok(m.tideFit(-90)>m.tideFit(-140));
});

test('wave forcing rewards height and period without pretending probability',()=>{
  assert.ok(m.waveForcing(2.0,10)>m.waveForcing(0.5,6));
  assert.equal(m.waveForcing(null,10),null);
});

test('south-of-east directional exposure is favored broadly',()=>{
  assert.ok(m.directionFit(120)>m.directionFit(300));
});

test('current model requires tide and waves',()=>{
  assert.equal(m.computePotential({minutesToHigh:-90}).score,null);
  const strong=m.computePotential({minutesToHigh:-90,waveHeightM:2,wavePeriodS:10,waveDirectionDeg:120,waterResidualFt:.4,windSpeedMs:6,windDirectionDeg:120});
  const calm=m.computePotential({minutesToHigh:-90,waveHeightM:.4,wavePeriodS:6,waveDirectionDeg:120,waterResidualFt:0,windSpeedMs:2,windDirectionDeg:120});
  assert.ok(strong.score>calm.score);
  assert.ok(strong.score>=70);
});

test('stale observations cannot drive a current score',()=>{
  const fresh={ageMin:20,heightM:1.8,periodS:10};
  const degraded={ageMin:120,heightM:1.8,periodS:10};
  const stale={ageMin:181,heightM:1.8,periodS:10};
  assert.equal(m.observationStatus(fresh.ageMin),'ok');
  assert.equal(m.observationStatus(degraded.ageMin),'degraded');
  assert.equal(m.observationStatus(stale.ageMin),'stale');
  assert.equal(m.usableCurrent(stale),null);
  assert.equal(m.usableCurrent(degraded),degraded);
});

test('closure and high surf override visitor recommendation without changing phenomenon score',()=>{
  const potential=m.computePotential({minutesToHigh:-90,waveHeightM:2.2,wavePeriodS:11,waveDirectionDeg:120}).score;
  assert.ok(potential>=70);
  const closed=m.classifySafety({npsVerified:true,npsAlerts:[{category:'Closure',title:'Thunder Hole closed',description:'Thunder Hole lower viewing area closed'}],nwsAlerts:[]});
  assert.equal(closed.status,'CLOSED');
  assert.equal(m.visitStatus({potential,safety:closed,minutesToBest:0}),'CLOSED');
  const hazard=m.classifySafety({npsVerified:false,npsAlerts:[],nwsAlerts:[{event:'High Surf Advisory'}]});
  assert.equal(hazard.status,'HAZARDOUS CONDITIONS');
});

test('far-future opportunity does not masquerade as an approaching same-day window',()=>{
  const safety={status:'OPEN / VERIFY ONSITE'};
  assert.equal(m.visitStatus({potential:30,safety,minutesToBest:180}),'GOOD WINDOW APPROACHING');
  assert.equal(m.visitStatus({potential:30,safety,minutesToBest:900}),'BETTER LATER');
});

test('missing or stale source data lowers confidence',()=>{
  const high=m.confidence({waveAgeMin:20,waveDirectionDeg:120,waterAgeMin:10,npsVerified:true,hasForecastWave:true});
  const low=m.confidence({waveAgeMin:240,waveDirectionDeg:null,waterAgeMin:200,npsVerified:false,hasForecastWave:false,forecastHorizonHours:24});
  assert.ok(high.score>low.score);
  assert.equal(low.label,'Insufficient');
});

test('NDBC parser preserves missing values as null rather than zero',()=>{
  const text='#YY MM DD hh mm WDIR WSPD GST WVHT DPD APD MWD PRES ATMP WTMP DEWP VIS PTDY TIDE\n#yr mo dy hr mn degT m/s m/s m sec sec degT hPa degC degC degC nmi hPa ft\n2026 09 12 18 00 120 5 7 1.5 9 MM 115 MM 15 MM MM MM MM MM';
  const p=m.parseNdbc(text);
  assert.equal(p.wave.heightM,1.5);
  assert.equal(p.wave.periodS,9);
  assert.equal(p.wave.directionDeg,115);
  assert.equal(p.wind.speedMs,5);
});

test('score bands remain ordinal',()=>{
  assert.equal(m.band(10),'Quiet');
  assert.equal(m.band(30),'Limited');
  assert.equal(m.band(50),'Fair');
  assert.equal(m.band(70),'Good');
  assert.equal(m.band(82),'Strong');
  assert.equal(m.band(95),'Exceptional');
});
