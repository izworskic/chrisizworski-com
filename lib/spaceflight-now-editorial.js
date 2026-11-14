'use strict';

/**
 * Spaceflight Now is an independent editorial source, NOT a range authority.
 * Its WordPress RSS feed is used for dated, attributed *links* to reporting.
 * We never import its launch time, weather verdict, status, photos, body text
 * or editorial descriptions as an authoritative replacement for LL2/NWS/45WS.
 *
 * Matching is intentionally conservative; missing coverage never means that
 * the mission is not being reported or that its LL2 time is verified.
 */
const FEED = 'https://spaceflightnow.com/feed/';
const SCHEDULE = 'https://spaceflightnow.com/launch-schedule/';
const LIVE = 'https://spaceflightnow.com/live/';
const REPORTS = 'https://spaceflightnow.com/mission-reports/';
const MAX_BYTES = 180000;
const MAX_ITEMS = 40;
const GOOD_TTL = 20 * 60000;
const ERROR_TTL = 2 * 60000;
const USER_AGENT = 'ChrisIzworskiLaunchEvidence/1.0 (https://chrisizworski.com/)';
const ARTICLE_PATH = /^\/20\d\d\/(?:0[1-9]|1[0-2])\/(?:0[1-9]|[12]\d|3[01])\/[a-z0-9-]+\/$/i;

let cached = null;
let pending = null;

const parsedTime = value => {
  const at = Date.parse(value || '');
  return Number.isFinite(at) ? at : null;
};
function articleUrl(candidate) {
  if (typeof candidate !== 'string' || candidate.length > 450) return null;
  try {
    const u = new URL(candidate);
    if (u.protocol !== 'https:' || !['spaceflightnow.com','www.spaceflightnow.com'].includes(u.hostname) ||
        u.port || u.username || u.password || u.search || u.hash ||
        !ARTICLE_PATH.test(u.pathname)) return null;
    return u.href;
  } catch { return null; }
}
function decodeXml(value) {
  return String(value || '').replace(/^<!\[CDATA\[/,'').replace(/\]\]>$/,'')
    .replace(/&#(x[0-9a-f]+|\d+);/gi, (_, n) => {
      const code = n[0].toLowerCase() === 'x' ?
        Number.parseInt(n.slice(1), 16) : Number.parseInt(n, 10);
      return Number.isInteger(code) && code >= 32 && code <= 0x10ffff ?
        String.fromCodePoint(code) : '';
    })
    .replace(/&(amp|lt|gt|quot|apos|nbsp|#39);/gi, (_, n) => ({
      amp:'&',lt:'<',gt:'>',quot:'"',apos:"'",nbsp:' ', '#39':"'"
    }[n.toLowerCase()] || ' '));
}
function field(item, name) {
  const match = item.match(new RegExp('<'+name+'(?:\\s[^>]*)?>([\\s\\S]*?)<\\/'+name+'>','i'));
  return match ? decodeXml(match[1]).trim() : '';
}
function plain(value) {
  return decodeXml(String(value || '').replace(/<[^>]+>/g,' '))
    .replace(/\s+/g,' ').trim().slice(0,1200);
}
function parseRss(xml, now=Date.now()) {
  if (typeof xml !== 'string' || xml.length > MAX_BYTES ||
      !/<rss\b/i.test(xml) || !/<channel>/i.test(xml)) throw new Error('invalid-sfn-rss');
  const items = xml.match(/<item\b[^>]*>[\s\S]*?<\/item>/gi) || [];
  const seen = new Set(), result = [];
  for(const item of items.slice(0,MAX_ITEMS)) {
    const title = plain(field(item,'title')).slice(0,170);
    const url = articleUrl(field(item,'link'));
    const date = parsedTime(field(item,'pubDate'));
    if (!url || !title || title.length < 9 || !date ||
        date > now+2*3600000 || now-date>60*86400000 || seen.has(url)) continue;
    seen.add(url);
    result.push({
      title, url, publishedAt:new Date(date).toISOString(),
      // This is used for identity matching only. Never rendered to visitors.
      matchingExcerpt:plain(field(item,'description')).slice(0,750)
    });
  }
  return result.sort((a,b)=>parsedTime(b.publishedAt)-parsedTime(a.publishedAt));
}
function missionKey(text) {
  const s = String(text||'').toLowerCase().replace(/[–—]/g,'-');
  const patterns = [
    [/starlink(?:\s+(?:group|g))?\s+(\d{1,2}-\d{1,3})\b/,'starlink'],
    [/\bussf[-\s]*(\d{2,4})\b/,'ussf'],
    [/\bnrol[-\s]*(\d{2,4})\b/,'nrol'],
    [/\bcrew[-\s]*(\d{1,2})\b/,'crew'],
    [/\bcrs[-\s]*(\d{2})\b/,'crs'],
    [/\b(?:cygnus\s+)?ng[-\s]*(\d{2})\b/,'ng'],
    [/\b(?:starship\s*)?(?:flight|ift)[-\s]*(\d{1,2})\b/,'starship-flight'],
    [/\b(?:transporter)[-\s]*(\d{1,2})\b/,'transporter'],
    [/\b(?:bandwagon)[-\s]*(\d{1,2})\b/,'bandwagon'],
    [/\b(?:lv|le)[-\s]*(\d{2})\b/,'amazon-leo'],
  ];
  for(const [pattern,kind] of patterns) {
    const m = s.match(pattern);
    if(m)return kind + ':' + m[1];
  }
  return null;
}
function containsOne(text, pattern) { return pattern.test(text); }
function fallbackContextKey(mission) {
  const name=(mission?.name||'')+' '+(mission?.mission||'');
  const rocket=String(mission?.rocket||'');
  if(/\bamazon\s+leo\b/i.test(name) && /\bvulcan\b/i.test(rocket+' '+name))
    return 'vulcan+amazon-leo';
  if(/\b(?:dream\s*chaser)\b/i.test(name) && /\bvulcan\b/i.test(rocket+' '+name))
    return 'vulcan+dream-chaser';
  if(/\b(?:new\s+glenn)\b/i.test(rocket) && /\b(?:bluebird|ast\s*spacemobile)\b/i.test(name))
    return 'new-glenn+ast';
  return null;
}
function contextInArticle(kind,item) {
  const title=item.title.toLowerCase(), text=(title+' '+item.matchingExcerpt.toLowerCase());
  if(kind==='vulcan+amazon-leo')return /\bvulcan\b/.test(title) &&
    /\bamazon\s+leo\b/.test(text);
  if(kind==='vulcan+dream-chaser')return /\bvulcan\b/.test(title) &&
    /\bdream\s*chaser\b/.test(text);
  if(kind==='new-glenn+ast')return /\bnew\s+glenn\b/.test(title) &&
    /\b(?:bluebird|ast\s*spacemobile)\b/.test(text);
  return false;
}
function matchArticle(item, mission, otherLaunches, now=Date.now()) {
  const target=parsedTime(mission?.net);
  const published=parsedTime(item?.publishedAt);
  if(!target||!published||target<now-3*86400000)return null;
  if(Math.abs(target-published)>90*86400000)return null;
  const missionIdentity=missionKey((mission?.name||'')+' '+(mission?.mission||''));
  const articleIdentity=missionKey(item.title+' '+item.matchingExcerpt);
  if(missionIdentity && articleIdentity===missionIdentity)
    return {match:'mission-identifier',label:'Mission-specific reporting'};
  // A different explicit mission designator is definitive counter-evidence.
  // Do not fall back to generic rocket + payload matching in that case.
  if(articleIdentity && articleIdentity!==missionIdentity)return null;
  // A generic provider article is context, not proof it describes this
  // exact launch. Never use this rule for Starlink, Crew, or generic Falcon 9.
  const context=fallbackContextKey(mission);
  if(!context || !contextInArticle(context,item) ||
     target-published>35*86400000 || published-target>4*86400000)
    return null;
  const peers=(otherLaunches||[]).filter(l=>
    l?.id!==mission.id && fallbackContextKey(l)===context &&
    Math.abs((parsedTime(l.net)||0)-target)<45*86400000);
  if(peers.length) return null;
  return {match:'related-context',label:'Related provider and payload reporting'};
}
function selectCoverage(mission, launches, articles, now=Date.now()) {
  if(!mission)return [];
  const matches=[];
  for(const article of articles||[]){
    const match=matchArticle(article,mission,launches,now);
    if(!match)continue;
    matches.push({title:article.title,url:article.url,
      publishedAt:article.publishedAt,...match});
  }
  matches.sort((a,b)=>
    (a.match==='mission-identifier'?0:1)-(b.match==='mission-identifier'?0:1) ||
    parsedTime(b.publishedAt)-parsedTime(a.publishedAt));
  return matches.slice(0,3);
}
async function readFeed(fetcher=fetch, now=Date.now()) {
  if(cached && cached.expires>now)return cached.value;
  if(pending)return pending;
  pending=(async()=>{
    const checkedAt=new Date(now).toISOString();
    try{
      const response=await fetcher(FEED,{
        headers:{Accept:'application/rss+xml, application/xml;q=0.9',
          'User-Agent':USER_AGENT},
        signal:AbortSignal.timeout(6500)
      });
      if(!response?.ok)throw new Error('sfn-feed-unavailable');
      const size=Number(response.headers?.get?.('content-length')||0);
      if(size>MAX_BYTES)throw new Error('sfn-feed-oversized');
      const body=await response.text();
      if(body.length>MAX_BYTES)throw new Error('sfn-feed-oversized');
      const items=parseRss(body,now);
      const value={status:'ok',checkedAt,articles:items};
      cached={value,expires:now+GOOD_TTL};
      return value;
    }catch(_){
      const value={status:'unavailable',checkedAt,articles:[]};
      cached={value,expires:now+ERROR_TTL};
      return value;
    }finally{pending=null;}
  })();
  return pending;
}
async function editorialDesk(mission, launches, options={}) {
  const now=options.now??Date.now();
  const data=await readFeed(options.fetcher||fetch,now);
  const stories=selectCoverage(mission,launches,data.articles,now);
  return {
    source:'Spaceflight Now',sourceType:'independent-editorial-reporting',
    status:data.status,checkedAt:data.checkedAt,
    scheduleUrl:SCHEDULE,liveUrl:LIVE,reportsUrl:REPORTS,
    stories,matchedCount:stories.length,
    note:data.status==='unavailable'?
      'Spaceflight Now RSS could not be checked. This says nothing about launches or current coverage.':
      stories.length?
        'Dated reporting is editorial context, not launch authorization, an independent confirmation of the current LL2 time, or a flight-weather approval.':
        'No recent Spaceflight Now story about this exact flight yet. That does not mean they have not covered it; browse their launch coverage.'
  };
}
module.exports={FEED,SCHEDULE,LIVE,REPORTS,MAX_BYTES,articleUrl,parseRss,
  missionKey,fallbackContextKey,matchArticle,selectCoverage,readFeed,editorialDesk};
