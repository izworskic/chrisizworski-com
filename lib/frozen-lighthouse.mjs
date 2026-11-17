// Official locations: USCG Light List Volume VII, 2024, identifiers below.
// https://www.navcen.uscg.gov/sites/default/files/pdf/lightLists/LightList_V7_2024.pdf
// Onshore axes use the bearing from the listed inner aid toward the listed outer aid.
// The South Haven axis uses the west-facing Lake Michigan shoreline, not a surveyed pier axis.
const dms=(d,m,s,west=false)=>(west?-1:1)*(d+m/60+s/3600);
const point=(a,b,c,d,e,f)=>({lat:dms(a,b,c),lon:dms(d,e,f,true)});
const site=(id,name,town,listNumber,coordinate,shoreward,station=null)=>({
 id,name,town,listNumber,...coordinate,shoreward,station,
 onshoreBearing:shoreward?bearing(shoreward,coordinate):270
});
export function bearing(a,b){
 const r=Math.PI/180, y=Math.sin((b.lon-a.lon)*r)*Math.cos(b.lat*r);
 const x=Math.cos(a.lat*r)*Math.sin(b.lat*r)-Math.sin(a.lat*r)*Math.cos(b.lat*r)*Math.cos((b.lon-a.lon)*r);
 return (Math.atan2(y,x)/r+360)%360;
}
const stOuter=point(42,6,59.098,86,29,40.350), stInner=point(42,6,57.819,86,29,36.510);
const hollandOuter=point(42,46,21.130,86,12,56.930), hollandInner=point(42,46,21.550,86,12,45.023);
const grandOuter=point(43,3,24.940,86,15,21.450), grandInner=point(43,3,25.965,86,15,13.661);
const muskOuter=point(43,13,26.727,86,20,48.834), muskInner=point(43,13,35.981,86,20,28.574);
const ludOuter=point(43,57,13.032,86,28,9.768), ludInner=point(43,57,10.592,86,27,45.062);
const manOuter=point(44,15,6.532,86,20,48.726),manInner=point(44,15,0.393,86,20,39.909);
const frankOuter=point(44,37,51.158,86,15,7.739),frankInner=point(44,37,47.721,86,14,49.256);

export const LIGHTS=[
 site('st-joseph-outer','St. Joseph North Pierhead Light','St. Joseph','19515',stOuter,stInner),
 site('st-joseph-inner','St. Joseph North Pier Inner Light','St. Joseph','19520',stInner,stOuter),
 site('south-haven','South Haven South Pierhead Light','South Haven','19505',point(42,24,4.859,86,17,16.669),null,'9087031'),
 site('holland','Holland Harbor South Pierhead Light (Big Red)','Holland','19295',hollandInner,hollandOuter,'9087031'),
 site('grand-haven','Grand Haven South Pierhead Entrance Light','Grand Haven','18965',grandOuter,grandInner,'9087031'),
 site('muskegon','Muskegon South Breakwater Light','Muskegon','18705',muskOuter,muskInner,'9087031'),
 site('ludington','Ludington North Breakwater Light','Ludington','18530',ludOuter,ludInner),
 site('manistee','Manistee North Pierhead Light','Manistee','18450',manOuter,manInner),
 site('frankfort','Frankfort North Breakwater Light','Frankfort','18375',frankOuter,frankInner)
];
// North Pier Inner Light uses the outer light axis, not a fabricated third coordinate.
LIGHTS[1].onshoreBearing=LIGHTS[0].onshoreBearing;
LIGHTS[1].shoreward=stOuter;
LIGHTS[3].onshoreBearing=bearing(hollandInner,hollandOuter);
// Manistee is a west-facing shoreline estimate. The south light is across the channel, not an inner aid on the north pier.
LIGHTS[7].onshoreBearing=270;

// Official NWS Lake Michigan coastal forecast zones and town boundary pairs:
// https://www.weather.gov/marine/greatlakestext
// https://www.weather.gov/marine/grrmz
// https://www.weather.gov/marine/apxmz
export const MARINE_ZONES=Object.freeze({
 'st-joseph-outer':['LMZ843','LMZ844'],
 'st-joseph-inner':['LMZ843','LMZ844'],
 'south-haven':['LMZ844','LMZ845'],
 'holland':['LMZ845','LMZ846'],
 'grand-haven':['LMZ846','LMZ847'],
 'muskegon':['LMZ847'],
 'ludington':['LMZ849'],
 'manistee':['LMZ849','LMZ346'],
 'frankfort':['LMZ346']
});
export const OVERLAND={light:0,moderate:22.4,heavy:53.3,extreme:83};
// Original: Overland (1990), NOAA PMEL Contribution 1104.
// https://www.pmel.noaa.gov/public/pmel/publications-search/search_abstract.php?fmContributionNum=1104
// Navy vessel-icing summary, freshwater freezing point 0 C:
// https://data.ntsb.gov/Docket/Document/docBLOB?FileExtension=.PDF&FileName=Paper+--+Vessel+Icing%3A+Prediction_U.S.+Navy-Master.PDF&ID=40383214
export function overlandPR(windMph,airF,waterF){
 if(![windMph,airF,waterF].every(Number.isFinite))return null;
 const va=windMph*0.44704,ta=(airF-32)*5/9,tw=(waterF-32)*5/9,tf=0;
 const denominator=1+0.3*(tw-tf);
 return denominator>0 ? va*(tf-ta)/denominator : null;
}
export function intensity(pr){
 if(!Number.isFinite(pr))return null;
 if(pr<=0)return 'none';
 if(pr<OVERLAND.moderate)return 'light';
 if(pr<OVERLAND.heavy)return 'moderate';
 if(pr<OVERLAND.extreme)return 'heavy';
 return 'extreme';
}
export function degreesFrom(compass){
 if(typeof compass==='number')return Number.isFinite(compass)?(compass%360+360)%360:null;
 const keys=['N','NNE','NE','ENE','E','ESE','SE','SSE','S','SSW','SW','WSW','W','WNW','NW','NNW'];
 return keys.includes(String(compass||'').toUpperCase())?keys.indexOf(String(compass).toUpperCase())*22.5:null;
}
export function onshore(windFrom,bearingDegrees,halfWidth=55){
 const wd=degreesFrom(windFrom);
 if(wd===null||!Number.isFinite(bearingDegrees))return false;
 const difference=Math.abs(((wd-bearingDegrees+540)%360)-180);
 return difference<=halfWidth;
}
export function mph(text){
 if(typeof text==='number')return Number.isFinite(text)?text:null;
 const x=String(text||'').match(/(\d+(?:\.\d+)?)\s*(?:to\s*\d+(?:\.\d+)?\s*)?(mph|kt|knots|km\/h)/i);
 if(!x)return null;
 return Number(x[1])*({mph:1,kt:1.15078,knots:1.15078,'km/h':0.621371}[x[2].toLowerCase()]);
}
export function scoreHour({windMph,airF,waterF,windFrom,icePct=null},pier){
 const values=[windMph,airF,waterF];
 if(values.some(v=>v===null||!Number.isFinite(v))||degreesFrom(windFrom)===null){
  return {score:null,category:null,reason:'Missing wind, air, water or direction evidence',pr:null};
 }
 if(icePct!==null&&(!Number.isFinite(icePct)||icePct<0||icePct>100)){
  return {score:null,category:null,reason:'Invalid lake ice observation',pr:null};
 }
 if(icePct!==null&&icePct>=80)return {score:0,category:'suppressed',reason:'Widespread lake ice may block wave-driven spray; pier ice is unverified',pr:null};
 if(!onshore(windFrom,pier.onshoreBearing))return {score:0,category:'none',reason:'Wind is offshore or cross-shore, without the necessary onshore fetch',pr:null};
 if(windMph<15)return {score:0,category:'none',reason:'Wind below the 15 mph freezing-spray gate',pr:null};
 if(airF>=32)return {score:0,category:'none',reason:'Air at or above freezing',pr:null};
 if(waterF>=40)return {score:0,category:'none',reason:'Source water temperature at or above 40 F',pr:null};
 const pr=overlandPR(windMph,airF,waterF),category=intensity(pr);
 if(pr===null)return {score:null,category:null,reason:'Formula inputs invalid',pr:null};
 const base={none:0,light:25,moderate:55,heavy:80,extreme:100}[category];
 const adjustment=icePct===null?1:Math.max(0,1-icePct/100);
 return {score:Math.round(base*adjustment),category,pr:Math.round(pr*10)/10,reason:'All spray gates met; relative Overland vessel-icing signal only'};
}
export function isFresh(when,now,maxHours){
 const stamp=Date.parse(when||'');return Number.isFinite(stamp)&&now-stamp>=-3600000&&now-stamp<=maxHours*3600000;
}
export function bestWindow(hours){
 const eligible=(hours||[]).filter(h=>Number.isFinite(h.score)&&h.score>0);
 if(!eligible.length)return null;
 eligible.sort((a,b)=>b.score-a.score||Date.parse(a.startTime)-Date.parse(b.startTime));
 return eligible[0];
}
export function persistence(hours,best){
 if(!best)return {estimate:'No buildup window identified',reason:'A persistence estimate requires an identified spray window.'};
 const later=(hours||[]).filter(h=>Date.parse(h.startTime)>Date.parse(best.startTime));
 if(!later.length)return {estimate:'Unknown beyond the modeled hours',reason:'No later air forecast is available.'};
 const thaw=later.find(h=>Number.isFinite(h.airF)&&h.airF>=32);
 const rain=later.find(h=>/\brain\b/i.test(h.shortForecast||''));
 const first=[thaw,rain].filter(Boolean).sort((a,b)=>Date.parse(a.startTime)-Date.parse(b.startTime))[0];
 return first?{estimate:'May diminish after '+first.startTime,reason:'Forecast thaw or rain favors melting. Sun, changing waves and shade are not measured.'}:
 {estimate:'May remain during continued freezing air',reason:'Available forecast hours stay below freezing without reported rain. Sun, splash and waves can change ice sooner.'};
}
