/**
 * Gooseberry Falls decision contract — official typical outings, not open trail certifications.
 * Primary sources: Minnesota DNR self tour and 2025 summer/winter maps.
 * No stream gauge, no crowds, and no automated park-closure feed.
 */
export const SOURCE = Object.freeze({
  short:'https://www.dnr.state.mn.us/state-parks/gooseberry-falls/self-tour-waterfalls-walk.html',
  park:'https://www.dnr.state.mn.us/state-parks/park.html?id=spk00172',
  tour:'https://www.dnr.state.mn.us/state-parks/gooseberry-falls/self-tour.html',
  summer:'https://files.dnr.state.mn.us/maps/state_parks/spk00172_summer.pdf',
  winter:'https://files.dnr.state.mn.us/maps/state_parks/spk00172_winter.pdf',
  sht:'https://superiorhiking.org/trail-conditions/'
});
export const OUTINGS = Object.freeze({
  short:Object.freeze({
    id:'short',name:'Upper & Middle Falls walk',minutes:'30–45 minutes',terrain:'Paved approaches and switchbacks if you avoid stairs',
    description:'Begin at the visitor center. Follow the river toward Middle Falls, where volcanic ledges step into the gorge. Continue toward Upper Falls and look back from Gateway Plaza.',
    location:'Visitor center wayside parking',permit:'No state vehicle permit for visitor center/wayside lot',
    source:SOURCE.short,map:SOURCE.summer
  }),
  loop:Object.freeze({
    id:'loop',name:'Three-falls view loop',minutes:'45–90 minutes',terrain:'Non-ADA trail with stairs and uneven sections',
    description:'See the river from the Upper and Middle Falls, then continue downstream toward Lower Falls. From the footbridges the gorge opens into the river valley.',
    location:'Visitor center wayside parking',permit:'No state vehicle permit for visitor center/wayside lot',
    source:SOURCE.short,map:SOURCE.summer
  }),
  fifth:Object.freeze({
    id:'fifth',name:'Fifth Falls woodland hike',minutes:'Allow a generous half day; 2-mile loop',terrain:'Hilly gravel and boardwalks; not a step-free outing',
    description:'Leave the busy falls overlooks for a quieter reach of river where the forest encloses the water. This is a different walk from the nearby SHT backcountry approach.',
    location:'Verify the official park map and current access before departure',permit:'Check parking area and permit requirements',
    source:SOURCE.summer,map:SOURCE.summer
  }),
  shoreline:Object.freeze({
    id:'shoreline',name:'Picnic Flow & Lake Superior shore',minutes:'Allow extra time beyond the waterfall walk',terrain:'Uneven rock and shoreline terrain; accessibility not established for the full outing',
    description:'The dark basalt opens onto Lake Superior. Follow the layers of ancient lava toward the lake and watch how the small river meets an immense freshwater horizon.',
    location:'Picnic Flow/lakeshore area, verify exact signed access',permit:'A state park vehicle permit is required if driving into the park to the lakeshore',
    source:SOURCE.tour,map:SOURCE.summer
  }),
  winter:Object.freeze({
    id:'winter',name:'Winter approach to Upper Falls',minutes:'Plan a short visit; walking time varies with ice and snow',terrain:'Upper Falls approach maintained/plowed for winter walking; ice may still be present',
    description:'In winter, the gorge changes character: water sounds beneath ice, spray settles on the dark volcanic rock, and the Upper Falls overlooks become the focus of the walk.',
    location:'Visitor center wayside parking',permit:'No state vehicle permit for visitor center/wayside lot',
    source:SOURCE.winter,map:SOURCE.winter
  })
});
export function normalize(input={}) {
  const permitted=[30,60,90,150];
  const raw=Number(input.minutes);
  return {
    minutes:permitted.includes(raw)?raw:60,
    mobility:input.mobility==='stepfree'?'stepfree':'standard',
    season:input.season==='snow-covered'?'snow-covered':'snow-free',
    interest:['waterfalls','shoreline','long-hike'].includes(input.interest)?input.interest:'waterfalls'
  };
}
/** A weather alert is a *regional* warning, not a closure or a river-level measurement. */
export function chooseOuting(input={},evidence={}) {
  const chosen=normalize(input);
  const {minutes,mobility,season,interest}=chosen;
  let id='short',why='',alternatives=[];
  if(season==='snow-covered'){
    id='winter';
    why='The DNR maintains a winter walking approach to Upper Falls; the full three-falls loop is not a maintained winter walk.';
    alternatives=['Only use ski/snowshoe routes appropriate to their designated activity. Do not walk on groomed ski trails.'];
  } else if(mobility==='stepfree'){
    id='short';
    why='The official Upper/Middle route has an ADA-accessible switchback alternative to its stairs. The longer Lower Falls loop is not ADA accessible.';
    alternatives=['Check with the DNR for current surface conditions, grades and exact access before arrival.'];
  } else if(interest==='shoreline'&&minutes>=60){
    id='shoreline';
    why='You chose time beside Lake Superior. This outing shifts toward the volcanic shore; verify access and vehicle-permit rules before driving past the wayside lot.';
    alternatives=['If you prefer the falls first, the Upper/Middle walk starts from the visitor center.'];
  } else if(interest==='long-hike'&&minutes>=150){
    id='fifth';
    why='A longer visit makes the DNR-described two-mile Fifth Falls loop a plausible outing. It has hills and rougher terrain, not a guaranteed time-to-finish.';
    alternatives=['Check the DNR map and the separate Superior Hiking Trail advisory before any backcountry extension.'];
  } else if(minutes>=60){
    id='loop';
    why='You have room for the DNR 45–90-minute route taking in Upper, Middle and Lower Falls. It includes non-accessible trail sections.';
    alternatives=['Switch to the 30–45-minute Upper/Middle walk if conditions or pace warrant a shorter day.'];
  } else {
    why='The DNR quotes 30–45 minutes for the shorter walk. A 30-minute stop is the lower edge of that estimate; consider a single overlook if running late.';
    alternatives=['If you need longer than 30 minutes, save Lower Falls for another visit.'];
  }
  if(mobility==='stepfree'&&interest==='shoreline')alternatives.unshift('Shoreline terrain is not established as step-free; keep the accessible falls route as the principal choice.');
  if(mobility==='stepfree'&&interest==='long-hike')alternatives.unshift('Fifth Falls has hilly gravel/boardwalk terrain and is not the step-free choice.');
  if(season==='snow-free'&&interest==='long-hike'&&minutes<150&&mobility==='standard')alternatives.unshift('Fifth Falls is a separate two-mile hilly loop; do not squeeze it into a short visit.');
  const route=OUTINGS[id];
  const severe=Array.isArray(evidence.alerts)&&evidence.alerts.some(a=>a&&['Extreme','Severe'].includes(a.severity));
  const warnings=['Park-specific trail access has not been automatically verified. Check DNR visitor alerts and on-site signs before entering any route.'];
  if(severe)warnings.unshift('A serious NWS alert affects the park vicinity. Check the alert and consider postponing exposed activity. This does not establish an official park closure.');
  if(season==='snow-covered')warnings.push('River ice is never safe. Carry traction appropriate to conditions, and stay off groomed ski and snowmobile trails.');
  if(id==='fifth')warnings.push('Superior Hiking Trail hazards are reported in the wider Gooseberry area. Those reports are not blanket closures of the main waterfalls walk.');
  return {input:chosen,outing:route,why,alternatives,warnings,parkAccess:'UNVERIFIED',
    weatherAlert:severe?'SERIOUS_REGIONAL_ALERT':'NOT_EVALUATED_OR_NONE',
    evidenceDate:'2026-10-31',source:route.source};
}
export function serializeInputs(input={}) {
 const c=normalize(input);
 return new URLSearchParams({time:String(c.minutes),mobility:c.mobility,season:c.season,interest:c.interest}).toString();
}
export function fromQuery(search='') {
 const s=new URLSearchParams(search);
 return normalize({minutes:s.get('time'),mobility:s.get('mobility'),season:s.get('season'),interest:s.get('interest')});
}
