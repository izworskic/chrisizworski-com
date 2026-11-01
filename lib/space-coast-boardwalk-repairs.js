'use strict';

// This file catalogs *published evidence*, not current physical inspections.
// Current NPS closures are handled separately by /api/space-coast-launch.
// Never upgrade a boardwalk to open based on a historical press release,
// construction award, photograph, proposal, or absence of a closure notice.
const NPS_NEWS_ENDPOINT='https://developer.nps.gov/api/v1/newsreleases?parkCode=cana&limit=75&sort=-releaseDate';
const NPS_NEWS_INDEX='https://www.nps.gov/cana/learn/news/';
const EVIDENCE_REVIEW_DATE='2026-11-01';
const MAX_RELEASES=18;
const MIN_RELEASE_DATE='2024-01-01';
const CURATED=[
  {
    id:'nps-2026-playalinda-storm-plan',
    publishedOn:'2026-09-04',
    title:'Playalinda storm resilience: proposals under review',
    description:'NPS invited comment on possible redesign, repair or removal of roads, boardwalks and beach access. A proposed plan is not a finished construction or reopening notice.',
    category:'planning',scope:'playalinda-district',boardwalkNumbers:[],
    facilityClaim:'planning-only',
    url:'https://www.nps.gov/cana/learn/news/canaveral-national-seashore-invites-public-feedback-on-plans-to-strengthen-storm-resilience-in-playalinda-district.htm'
  },
  {
    id:'nps-2025-playalinda-limited-access',
    publishedOn:'2025-11-19',
    title:'Limited reopening after storms; NPS photo identifies boardwalk #3',
    description:'NPS announced limited visitor access beginning November 14, 2025, with lots 8–13 and the road north of Eddy Creek then closed. Its published photograph labels a new Playalinda boardwalk #3. This is historical documentation, not an inspection or opening confirmation for any lot today.',
    category:'historic-access',scope:'playalinda-district',boardwalkNumbers:[3],
    facilityClaim:'historic-photo-caption-only',
    url:'https://www.nps.gov/cana/learn/news/limited-access-to-playalinda-beach.htm'
  },
  {
    id:'nps-2024-boardwalk-contract',
    publishedOn:'2024-12-04',
    title:'NPS awards contract to replace and harden storm-damaged boardwalks',
    description:'NPS announced an awarded construction contract for replacement boardwalks after hurricane damage. A contract award does not establish construction completion or current structural condition for any numbered boardwalk.',
    category:'contract',scope:'canaveral-seashore',boardwalkNumbers:[],
    facilityClaim:'contract-award-only',
    url:'https://www.nps.gov/cana/learn/news/boardwalk-replacement.htm'
  }
];
const dateOk=(s,now=Date.now())=>typeof s==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(s)&&
  s>=MIN_RELEASE_DATE&&Number.isFinite(Date.parse(s+'T00:00:00Z'))&&
  Date.parse(s+'T00:00:00Z')<=now;
function verifiedNpsNewsUrl(value) {
  try{
    const u=new URL(value);
    return u.protocol==='https:' && ['www.nps.gov','home.nps.gov'].includes(u.hostname)&&
      u.pathname.startsWith('/cana/learn/news/') && u.pathname.length>20 ? u.href:null;
  }catch{return null;}
}
function textClean(v,max=300) {
  return String(v??'').replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim().slice(0,max);
}
function numbersInBoardwalkMentions(value){
  const valueText=textClean(value,800);
  const matched=new Set();
  const re=/\bboardwalks?\s*(?:#|no\.?\s*|number\s*)?(\d{1,2})(?:\s*(?:[-–]|\bto\b|\bthrough\b)\s*(\d{1,2}))?/gi;
  for(const m of valueText.matchAll(re)){
    const a=Number(m[1]),b=m[2]?Number(m[2]):a;
    if(a<1||a>14||b<a||b>14)continue;
    for(let n=a;n<=b;n++)matched.add(n);
  }
  return [...matched].sort((a,b)=>a-b);
}
function kindFor(text){
  if(/\b(?:proposal|proposed|public\s+comment|environmental\s+assessment|planning|storm\s+adaptive\s+management\s+plan)\b/i.test(text))return 'planning';
  if(/\b(?:contract\s+award|awarded\s+(?:a\s+)?contract|procurement)\b/i.test(text))return 'contract';
  if(/\b(?:reopen|re-opening|restored\s+access)\b/i.test(text))return 'historic-access';
  if(/\b(?:repaired|completed|replacement\s+completed|built|constructed|restored)\b/i.test(text))return 'historic-work';
  if(/\b(?:damaged|damage|flooding|erosion|closed|closure)\b/i.test(text))return 'historical-restriction';
  return 'official-announcement';
}
function normalizeNewsRelease(r,now=Date.now()){
  if(!r||typeof r!=='object')return null;
  // The requested NPS endpoint filters cana, but still verify cross-park
  // records when the response supplies an explicit park identity.
  const identity=String(r.parkCode||'').toLowerCase();
  const parks=Array.isArray(r.relatedParks)?r.relatedParks.map(x=>String(x?.parkCode||'').toLowerCase()):[];
  if(identity && !identity.split(',').includes('cana')&&!parks.includes('cana'))return null;
  if(!identity&&parks.length&&!parks.includes('cana'))return null;
  const url=verifiedNpsNewsUrl(r.url);
  const date=String(r.releaseDate||r.releasedate||'').slice(0,10);
  if(!url||!dateOk(date,now))return null;
  const title=textClean(r.title,180),abstract=textClean(r.abstract,440);
  if(!/playalinda|boardwalk|canaveral.*(?:beach|storm|access)|beach.*(?:access|closure|reopen)/i.test(title+' '+abstract))return null;
  const nums=numbersInBoardwalkMentions(title+' '+abstract);
  const category=kindFor(title+' '+abstract);
  return {
    id:'nps-news-'+String(r.id||date+'-'+title).slice(0,120),
    publishedOn:date,title,description:abstract||'Official NPS publication. Read the original before deciding whether a facility was repaired.',
    category,scope:nums.length?'specific-boardwalk-mention':'district-or-park',
    boardwalkNumbers:nums,
    facilityClaim:'publication-metadata-only-not-inspection',
    url,origin:'nps-news-api'
  };
}
function repairNewsResponse(raw, now=Date.now()){
  if(!raw||!Array.isArray(raw.data))throw Error('NPS news release response does not have data array');
  const filtered=raw.data.map(x=>normalizeNewsRelease(x,now)).filter(Boolean);
  const byUrl=new Map();
  // Curated original NPS articles include interpreted scope checked against
  // full official page, so their detailed interpretation beats the API abstract.
  for(const r of CURATED)if(dateOk(r.publishedOn,now))byUrl.set(r.url,{...r,origin:'reviewed-nps-source'});
  for(const r of filtered)if(!byUrl.has(r.url))byUrl.set(r.url,r);
  const history=[...byUrl.values()]
    .sort((a,b)=>b.publishedOn.localeCompare(a.publishedOn)||a.title.localeCompare(b.title))
    .slice(0,MAX_RELEASES);
  return {
    version:1,
    officialNewsSource:NPS_NEWS_ENDPOINT,
    officialParkNewsIndex:NPS_NEWS_INDEX,
    latestPublicationDate:history[0]?.publishedOn||null,
    evidenceReviewDate:EVIDENCE_REVIEW_DATE,
    currentFacilityInspectionFeedVerified:false,
    currentBoardwalkOpeningFeedVerified:false,
    canDeterminePresentWalkability:false,
    newsApiStatus:'verified',
    history,
    facilityEvidence:facilityEvidence(history),
    note:'Official NPS news releases document past announcements. An award, plan, historic photo or reopening announcement does not confirm current boardwalk condition, wheelchair access or launch-day permission.'
  };
}
function facilityEvidence(history){
  return Array.from({length:14},(_,i)=>{
    const number=i+1;
    const evidence=history.filter(x=>x.boardwalkNumbers.includes(number))
      .map(x=>({id:x.id,publishedOn:x.publishedOn,title:x.title,url:x.url,
        category:x.category,facilityClaim:x.facilityClaim}));
    return {
      number,
      currentInspectionStatus:'not-verified',
      currentOpeningStatus:'not-verified',
      currentAccessiblePassageStatus:'not-verified',
      historicalSpecificEvidence:evidence,
      latestHistoricMentionAt:evidence[0]?.publishedOn||null,
      conclusion:evidence.length?
        'Dated NPS documentation mentions this numbered boardwalk; its current structural condition and public opening remain unverified.':
        'No boardwalk-numbered repair or inspection confirmation was found in the checked sources. This does not prove no work occurred.'
    };
  });
}
function archivedOnlyResponse(now=Date.now(),status='unavailable'){
  const history=CURATED.filter(x=>dateOk(x.publishedOn,now))
    .map(x=>({...x,origin:'reviewed-nps-source'}))
    .sort((a,b)=>b.publishedOn.localeCompare(a.publishedOn));
  return {
    version:1,officialNewsSource:NPS_NEWS_ENDPOINT,
    officialParkNewsIndex:NPS_NEWS_INDEX,
    evidenceReviewDate:EVIDENCE_REVIEW_DATE,
    latestPublicationDate:history[0]?.publishedOn||null,
    currentFacilityInspectionFeedVerified:false,
    currentBoardwalkOpeningFeedVerified:false,
    canDeterminePresentWalkability:false,
    newsApiStatus:status,
    history,facilityEvidence:facilityEvidence(history),
    note:'The current NPS news API could not be verified. These reviewed dated NPS pages are historical context only; check official NPS restrictions before traveling.'
  };
}
module.exports={NPS_NEWS_ENDPOINT,NPS_NEWS_INDEX,CURATED,EVIDENCE_REVIEW_DATE,
  verifiedNpsNewsUrl,numbersInBoardwalkMentions,kindFor,normalizeNewsRelease,
  repairNewsResponse,facilityEvidence,archivedOnlyResponse};
