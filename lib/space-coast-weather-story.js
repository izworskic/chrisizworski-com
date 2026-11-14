'use strict';

// Plain-language interpretation. Never convert favorable % to PoV,
// translate PoV to scrub likelihood, or infer a weather GO call.
const RULES={
  'Cumulus Cloud Rule':'Growing cumulus can carry electric fields along the rocket’s climb, even without thunder at your viewing spot.',
  'Thick Cloud Layers Rule':'A thick cloud along the flight path can create rocket-triggered lightning risk. A clear viewing area does not settle that question.',
  'Flight Through Precipitation':'Rain or other precipitation along the ascent path can violate launch-specific weather criteria.',
  'Liftoff Winds':'Wind near the pad can exceed a rocket’s own liftoff limits. Those limits differ between vehicles.',
  'Lightning Rule':'Natural and rocket-triggered lightning are different dangers; a launch can be affected without a visible storm at the beach.',
  'Anvil Cloud Rules':'Storm anvils can retain electric fields well beyond the obvious storm clouds.',
  'Anvil Cloud Rule':'Storm anvils can retain electric fields well beyond the obvious storm clouds.',
  'Attached Anvil Cloud Rule':'Anvil clouds near thunderstorms can carry charge far from the rain shaft.',
  'Detached Anvil Cloud Rule':'Detached storm anvils may retain electric fields after separating from the parent cloud.',
  'Surface Electric Fields Rule':'Electric-field measurements help determine whether a rocket could trigger lightning.',
  'Disturbed Weather Rule':'Disturbed cloud environments may carry electric fields along the intended flight path.',
  'Triboelectrification Rule':'Flying through particular cloud particles can generate electrical charge on a rocket.'
};
const FORECAST_PAGE='https://45thweathersquadron.nebula.spaceforce.mil/pages/launchForecastSupport.html';
const FIRST_PARTY=['45ws-home','45ws-forecast-support','45ws-sitemap'];
// True only when every first-party squadron page refused the monitor.
function firstPartyBlocked(health){
  const rows=(Array.isArray(health?.sourceChecks)?health.sourceChecks:[])
    .filter(x=>FIRST_PARTY.includes(x?.id));
  return rows.length===FIRST_PARTY.length&&rows.every(x=>x.status==='unavailable');
}
const stamp=x=>{const t=Date.parse(x||'');return Number.isFinite(t)?t:0;};
function weatherRules(concerns) {
  return [...new Set((Array.isArray(concerns)?concerns:[]).filter(s=>RULES[s]))]
    .slice(0,4).map(label=>({label,explanation:RULES[label]}));
}
function floridaDate(iso){
  const t=stamp(iso);
  return t?new Intl.DateTimeFormat('en-US',{timeZone:'America/New_York',
    year:'numeric',month:'long',day:'numeric'}).format(new Date(t)):null;
}
function officialTrend(change) {
  if(change?.kind==='official-pov-revised' &&
    Number.isInteger(change.povPercent)&&Number.isInteger(change.priorPovPercent)) {
    const d=change.povPercent-change.priorPovPercent;
    if(d>0)return 'The published violation probability rose '+d+' percentage points, from '+change.priorPovPercent+'% to '+change.povPercent+'%. That is a forecast change, not a confirmed scrub.';
    if(d<0)return 'The published violation probability fell '+(-d)+' percentage points, from '+change.priorPovPercent+'% to '+change.povPercent+'%. A launch GO still requires separate clearance.';
    return 'The updated forecast reports the same '+change.povPercent+'% violation probability.';
  }
  if(change?.kind==='first-official-forecast')return 'This is the first verified forecast recorded for this mission. An earlier edition is not available for comparison.';
  if(change?.kind==='official-concerns-revised')return 'The latest official document changed the listed weather concerns; the percentage alone does not tell the whole story.';
  if(change?.kind==='official-forecast-update')return 'The official document was updated, with no verified change in its extracted violation percentage.';
  return 'No earlier source-verified forecast is available to compare.';
}
function buildWeatherStory(mission,forecast,now=Date.now()) {
  const t=stamp(mission?.net),health=forecast?.health||{};
  const base={
    stage:'unverified',sourceLabel:'No mission-specific weather assessment verified',
    sourceUrl:null,headline:'The launch-weather picture is incomplete',
    explanation:'There is not enough verified mission-specific evidence to judge this launch weather.',
    changes:'No verified earlier forecast edition is available.',
    rules:[],nextUpdate:'The next official forecast issue time is not verified.',
    decision:'Keep travel arrangements flexible. Spectator sky conditions and actual flight-weather clearance are separate decisions.',
    observedAt:health.checkedAt||null
  };
  if(!mission||!t)return {...base,stage:'no-mission',headline:'Choose a mission to understand its weather',
    explanation:'Weather evidence must be matched to a named launch.'};
  const nasa=forecast?.agencyWeather;
  const agencyReady=nasa?.status==='nasa-reported-current'&&Number.isInteger(nasa.reportedFavorablePercent);
  if(forecast?.status==='mission-matched-current'){
    const numeric=Number.isInteger(forecast.povPercent),rules=weatherRules(forecast.primaryConcerns);
    return {...base,stage:'official-forecast',sourceLabel:'Verified 45th Weather Squadron mission PDF',
      sourceUrl:forecast.officialUrl||null,observedAt:forecast.issuedAt||null,
      headline:numeric?'The official launch-weather forecast is available':
        'The official document was verified, but its probability is unreadable',
      explanation:numeric?'The 45th Weather Squadron reports a '+forecast.povPercent+
        '% chance of violating covered launch-weather constraints during this mission’s window. It is not the probability the rocket will scrub.':
        'The mission PDF is verified, but its probability could not be safely extracted; no numerical claim is made.',
      changes:officialTrend(forecast.latestChange),rules,
      nextUpdate:forecast.nextForecastDate?
        'The original forecast lists '+floridaDate(forecast.nextForecastDate+'T12:00:00Z')+
        ' as the next issue date. Publication may change.':
        'The source does not confirm when another official forecast will be issued.',
      decision:rules.length?'The primary concerns affect the climb out of the spaceport, not just the beach sky. Read the specific rules below and keep the operator’s launch status separate from the NWS viewing forecast.':
        'This mission forecast covers only certain weather constraints. The operator decides whether to proceed; viewing sky conditions are a separate question.',
      agencyComparison:agencyReady?'NASA also has a dated weather report, but its favorable percentage is not compared mathematically with the official PDF PoV.':null};
  }
  if(agencyReady){
    const history=nasa.timeline||[],first=history[0];
    let changes='This is the latest qualifying NASA weather report for this mission.';
    if(first&&Number.isInteger(first.priorFavorablePercent)){
      const delta=nasa.reportedFavorablePercent-first.priorFavorablePercent;
      changes=delta===0?'NASA reported the same favorable-weather percentage as previously.':
        'NASA’s reported favorable percentage '+(delta>0?'rose ':'fell ')+Math.abs(delta)+
        ' points, from '+first.priorFavorablePercent+'% to '+nasa.reportedFavorablePercent+'%.';
    }
    return {...base,stage:'nasa-reported',sourceLabel:'NASA reporting a 45WS outlook · not an original forecast PDF',
      sourceUrl:nasa.sourceUrl,observedAt:nasa.publishedAt,
      headline:'NASA has published a launch-weather update',
      explanation:'NASA reports the 45th Weather Squadron estimated a '+
        nasa.reportedFavorablePercent+'% chance of favorable conditions for this launch. The original official squadron PDF and its PoV have not been verified.',
      changes,rules:weatherRules(nasa.primaryConcerns),
      nextUpdate:'NASA did not establish the next 45WS forecast issue time in this report.',
      decision:'Follow NASA and the launch operator for official updates. A favorable-weather outlook is not a GO call, and the NWS viewing forecast answers a different question.'};
  }
  if(mission.netPrecision==='day'||mission.tbdTime===true){
    return {...base,stage:'day-only',headline:'The date is listed, but the launch hour is not confirmed',
      explanation:'A day-only target is not a reliable flight-weather window. No current mission-specific official PDF or qualifying NASA report has been verified.',
      nextUpdate:'Recheck after the mission publishes a more precise launch window. The next 45WS issue time is not confirmed.'};
  }
  const days=(t-now)/86400000;
  if(days>7)return {...base,stage:'early-planning',
    headline:'It is early for a launch-week weather decision',
    explanation:'The published target is about '+Math.ceil(days)+' days away. No current mission-specific 45WS PDF or NASA-reported update has been verified. No forecast does not mean favorable weather.',
    nextUpdate:'The near-launch monitoring window begins seven days ahead of the current target. An exact 45WS publication time is not verified.'};
  // Inside launch week with an exact time: always hand the visitor the one page
  // where the squadron posts its mission forecast. A person's browser can open
  // it even when automated checks are refused.
  const near={...base,officialPageUrl:FORECAST_PAGE};
  if(['overdue','not-initialized'].includes(health.status))
    return {...near,stage:'monitor-overdue',headline:'Open the official forecast for the latest number',
      explanation:'This page has not read the 45th Weather Squadron forecast recently, so it shows no number rather than an old one.',
      nextUpdate:'The squadron’s launch forecast page lists its newest mission forecast. Open the official launch forecast below, and check the launch operator for any weather call.'};
  if(firstPartyBlocked(health))
    return {...near,stage:'official-site-blocked',headline:'Open the official forecast in one tap',
      explanation:'The 45th Weather Squadron posts each Florida mission forecast on its own site, and that site turns away automated checks like this one. No number is shown here because none could be read, not because the weather looks good or bad.',
      nextUpdate:'The squadron usually posts forecasts a few days ahead and updates them closer to launch. Its launch forecast page has the newest edition.'};
  return {...near,stage:'no-verified-forecast',
    headline:'Weather remains an open launch-day question',
    explanation:'No current mission-matched official PDF or qualified NASA weather report was verified. This cannot be interpreted as favorable or unfavorable weather.',
    nextUpdate:'The 45th Weather Squadron launch forecast page lists its newest mission forecasts.'};
}
module.exports={RULES,FORECAST_PAGE,firstPartyBlocked,weatherRules,officialTrend,buildWeatherStory};
