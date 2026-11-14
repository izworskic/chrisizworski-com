'use strict';
// Michigan Snowmobile: source-labeled LOCAL club report desk, separate from
// statewide DNR legal status and route-quality scoring. Never infer that an
// old club report applies to an entire region. Third-party reports are not
// warranted by the Michigan DNR.
const SOURCES=Object.freeze({
  'eastern-up':[{key:'sault',name:'Sault Snowmobile Association',area:'Sault Ste. Marie, Kinross, Raco and nearby club-maintained trails only',kind:'misorva',url:'https://misorva.org/trail-reports/sault-snowmobile-association/'}],
  'keweenaw-copper-country':[{key:'keweenaw',name:'Keweenaw Snowmobile Club',area:'Keweenaw club-managed trails, not every Houghton, Ontonagon or Baraga County route',kind:'club',url:'https://www.keweenawsnowmobileclub.com/trail-conditions/'}],
  'central-western-up':[{key:'moose-country',name:'Moose Country Snowmobile Club',area:'Republic and Michigamme area only; not all western U.P. routes',kind:'misorva',url:'https://misorva.org/trail-reports/moose-country-snowmobile-club/'}],
  'northeast-sunrise':[{key:'cheboygan',name:'Cheboygan Trail Blazers',area:'Cheboygan, Mackinaw City and Black Mountain local trails, not Mio, Oscoda or all Sunrise Side routes',kind:'misorva',url:'https://misorva.org/trail-reports/cheboygan-trail-blazers/'}],
  'northwest-michigan':[{key:'petoskey',name:'Petoskey Snowmobile Club',area:'Petoskey club area; not all Traverse City, Kalkaska or northern Lower Michigan trails',kind:'misorva',url:'https://misorva.org/trail-reports/petoskey-snowmobile-club/'}],
  'west-michigan':[{key:'cadillac',name:'Cadillac Winter Promotions',area:'Cadillac area; not all Manistee, Baldwin or western Lower Michigan trails',kind:'misorva',url:'https://misorva.org/trail-reports/cadillac-winter-promotions/'}]
});
const PERIOD_MS=86400000,MAX_REPORT_BYTES=850000;
const MONTHS={january:1,february:2,march:3,april:4,may:5,june:6,july:7,august:8,september:9,october:10,november:11,december:12};
function htmlText(html=''){
  return String(html).replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,' ')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi,' ')
    .replace(/<noscript\b[^>]*>[\s\S]*?<\/noscript>/gi,' ')
    .replace(/<(?:br|p|div|li|h[1-6])\b[^>]*>/gi,' ')
    .replace(/<[^>]+>/g,' ').replace(/&(?:nbsp|#160);/gi,' ').replace(/&amp;/gi,'&')
    .replace(/&quot;/gi,'"').replace(/&#(?:39|x27);/gi,"'").replace(/\s+/g,' ').trim();
}
function isoDate(y,m,d){
  if(!Number.isInteger(y)||y<2000||y>2100||!Number.isInteger(m)||m<1||m>12||!Number.isInteger(d)||d<1||d>31)return null;
  const t=Date.UTC(y,m-1,d,12);
  const check=new Date(t);
  if(check.getUTCFullYear()!==y||check.getUTCMonth()!==m-1||check.getUTCDate()!==d)return null;
  return check.toISOString().slice(0,10);
}
function monthDate(str){
  const match=String(str||'').match(/(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2})(?:st|nd|rd|th)?,?\s+(\d{4})/i);
  return match?isoDate(Number(match[3]),MONTHS[match[1].toLowerCase()],Number(match[2])):null;
}
function shortDate(str){
  const match=String(str||'').match(/\b(\d{1,2})\/(\d{1,2})\/(\d{2,4})\b/);
  if(!match)return null;
  const y=Number(match[3]);return isoDate(y<100?2000+y:y,Number(match[1]),Number(match[2]));
}
function dateAgeDays(value,now=new Date()){
  if(!value||!/^\d{4}-\d{2}-\d{2}$/.test(value))return null;
  const t=Date.parse(value+'T12:00:00Z'),at=new Date(now).getTime();
  if(!Number.isFinite(at)||!Number.isFinite(t))return null;
  return Math.max(0,Math.floor((at-t)/PERIOD_MS));
}
function seasonActive(now=new Date()){
  const parts=new Intl.DateTimeFormat('en-US',{timeZone:'America/Detroit',month:'numeric'}).formatToParts(now);
  const m=Number(parts.find(p=>p.type==='month')?.value);
  return m===12||m<=3;
}
function normalizeCondition(raw){
  const text=String(raw||'').trim().slice(0,50);
  return /^(excellent|good|fair|poor|closed|marginal)$/i.test(text)?text:null;
}
function parseMisOrva(html,source,now){
  const text=htmlText(html);
  // Require the provider's own report block to avoid mistakenly reading a
  // login, search page, CAPTCHA or sidebar as a valid condition report.
  const head=text.indexOf(source.name);
  if(head<0||!text.slice(head,head+90).toLowerCase().includes('trail report'))throw Error('Expected source report block not found');
  const section=text.slice(head,head+12000);
  const reported=(section.match(/Reported\s+On:\s*((?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2}(?:st|nd|rd|th)?,?\s+\d{4}(?:\s*@\s*\d{1,2}:\d{2}\s*(?:am|pm))?)/i)||[])[1]||null;
  const grooming=(section.match(/Last\s+Groomed:\s*((?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2}(?:st|nd|rd|th)?,?\s+\d{4})/i)||[])[1]||null;
  const condition=(section.match(/Trail\s+Condition:\s*(.{1,52}?)(?=\s+Last\s+Groomed:|\s+Reported\s+On:|\s+Groomer\s+Report)/i)||[])[1]||null;
  const body=(section.split(/Groomer\s+Report/i)[1]||'').split(/Poor Trail Complaint|Contact Us\s+Michigan Snowmobile/i)[0].trim().slice(0,2400);
  const published=monthDate(reported);
  const firstDate=shortDate(body.slice(0,80));
  // A wrapper timestamp later than the narrative by >2 weeks is NOT
  // evidence that the narrative itself was updated. Eg 2026 Jan header
  // with body starting 1/13/25.
  const bodyOlder=Boolean(firstDate&&published&&(Date.parse(published)-Date.parse(firstDate))>14*PERIOD_MS);
  return {reportedDate:published,groomedDate:monthDate(grooming),sourceCondition:normalizeCondition(condition),
    reportDateRaw:reported,groomedDateRaw:grooming,bodyDate:firstDate,bodyOlder,sourceBodyHasText:body.length>=30};
}
function parseClub(html,source,now){
  const text=htmlText(html);
  // A club's season-end note is historical by definition; its April status
  // is NOT a winter 2026/27 open-trail statement.
  const match=text.match(/Trail Conditions\s+(\d{1,2}\/\d{1,2}\/\d{2,4})(?=\s|\b)/i);
  if(!match)throw Error('Dated club trail conditions block not found');
  const date=shortDate(match[1]);
  return {reportedDate:date,groomedDate:null,sourceCondition:null,reportDateRaw:match[1],
    groomedDateRaw:null,bodyDate:null,bodyOlder:false,sourceBodyHasText:true};
}
function parseReport(html,source,now=new Date()){
  if(!source||!['club','misorva'].includes(source.kind))throw Error('Unknown club source type');
  if(typeof html!=='string'||html.length<100||html.length>MAX_REPORT_BYTES)throw Error('Invalid report document');
  const parsed=source.kind==='misorva'?parseMisOrva(html,source,now):parseClub(html,source,now);
  const ageDays=dateAgeDays(parsed.reportedDate,now);
  const future=parsed.reportedDate&&Date.parse(parsed.reportedDate+'T00:00:00Z')>new Date(now).getTime()+PERIOD_MS;
  let state=ageDays===null||future?'UNVERIFIED_DATE':parsed.bodyOlder?'DATE_CONFLICT':ageDays>7?'ARCHIVED':ageDays>2?'AGING':'RECENT';
  if(!parsed.reportedDate)state='UNVERIFIED_DATE';
  // Last groomed 1970 and years-old fields do not become current grooming.
  const groomingAgeDays=dateAgeDays(parsed.groomedDate,now);
  const groomingVerified=groomingAgeDays!==null&&groomingAgeDays<=2&&state==='RECENT';
  const currentCondition=state==='RECENT'&&seasonActive(now)?parsed.sourceCondition:null;
  return {key:source.key,name:source.name,area:source.area,kind:source.kind,url:source.url,
    reportedDate:parsed.reportedDate,reportDateRaw:parsed.reportDateRaw,groomedDate:groomingAgeDays===null?null:parsed.groomedDate,
    reportAgeDays:ageDays,bodyDate:parsed.bodyDate||null,state,
    statusReason:state==='DATE_CONFLICT'?'The source report header and dated narrative do not agree':state==='UNVERIFIED_DATE'?'A trustworthy report date could not be established':state==='ARCHIVED'?'Report is more than seven days old':state==='AGING'?'Report is three to seven days old': 'Report field dated within two days; still local and third-party',
    currentCondition,archivedCondition:state==='ARCHIVED'||state==='DATE_CONFLICT'?parsed.sourceCondition:null,
    groomingVerified,groomedWithinDays:groomingVerified?groomingAgeDays:null,
    verifiedForRegionWideScore:false,verifiedLegalStatus:false,
    sourceBodyHasText:parsed.sourceBodyHasText};
}
function reportUnavailable(source,reason){
  return {key:source.key,name:source.name,area:source.area,kind:source.kind,url:source.url,
    reportedDate:null,reportAgeDays:null,state:'UNAVAILABLE',statusReason:reason||'Source could not be checked',
    currentCondition:null,groomingVerified:false,verifiedForRegionWideScore:false,verifiedLegalStatus:false};
}
module.exports={SOURCES,MAX_REPORT_BYTES,htmlText,isoDate,monthDate,shortDate,dateAgeDays,seasonActive,parseReport,reportUnavailable};
