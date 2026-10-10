// All national fall-color pages share this ONE daily AI edition, generated on the hub.
// Readers only read Redis. No Anthropic key is needed in the separate national Vercel project.
const NATIONAL_SOURCE = "https://chrisizworski.com/api/national-fall-region"; // public hub rewrite, not protected Vercel preview hostname
const MODEL = "claude-haiku-4-5-20251001";
const { authorizeCronRequest } = require("./../github-actions-oidc.js");
const IDS = ["new-england","great-smoky-mountains","colorado-aspens","adirondacks",
  "north-shore-superior","ozarks","eastern-sierra","wasatch","columbia-river-gorge",
  "door-county","poconos","texas-hill-country","west-virginia-highlands","catskills","shenandoah"];
const REDIS_URL = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL || "https://winning-dogfish-39241.upstash.io";
async function redis(cmd) {
  const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
  if (!token) throw new Error("Redis token missing");
  const r = await fetch(REDIS_URL, {
    method: "POST", headers: { Authorization: "Bearer " + token, "Content-Type": "application/json" },
    body: JSON.stringify(cmd), signal: AbortSignal.timeout(6000),
  });
  if (!r.ok) throw new Error("Redis HTTP " + r.status);
  const j = await r.json();
  if (!j || j.error) throw new Error("Redis command failed");
  return j.result;
}
function dateKey(now = new Date()) {
  const p = Object.fromEntries(new Intl.DateTimeFormat("en-US",
    {timeZone:"America/Detroit",year:"numeric",month:"2-digit",day:"2-digit"})
    .formatToParts(now).map(x => [x.type,x.value]));
  return p.year + "-" + p.month + "-" + p.day;
}
function isSeason(date) {
  const month = Number(date.slice(5,7));
  return month >= 8 && month <= 11; // through the late-season Texas/Ozarks windows
}
function compactRegion(d) {
  if (!d || !d.region || !IDS.includes(d.region.id) || !d.today) return null;
  const w = d.this_weekend && d.this_weekend.weather;
  return {
    id:d.region.id, name:String(d.region.name||"").slice(0,80),
    currentTiming:String(d.today.status||"").slice(0,90),
    timingIndex:Number.isFinite(d.today.planning_index_pct)?d.today.planning_index_pct:null,
    weekendDate:d.this_weekend?.date||null,
    weekendVerdict:String(d.this_weekend?.verdict?.grade||"").slice(0,40),
    forecast:w ? String(w.forecast||"").slice(0,90) : null,
    rainChance:w && Number.isFinite(w.precipitation_risk_pct)?w.precipitation_risk_pct:null,
    drives:(d.drives||[]).slice(0,2).map(x=>String(x.name||"").slice(0,70)),
    forecastAvailable:d.status==="NWS_FORECAST_AVAILABLE"
  };
}
async function regionSnapshot(id) {
  const r = await fetch(NATIONAL_SOURCE + "?region=" + encodeURIComponent(id),
    {headers:{accept:"application/json"},signal:AbortSignal.timeout(11500)});
  if (!r.ok) throw Error("National source " + r.status);
  return compactRegion(await r.json());
}
async function sourceBatch() {
  const out=[];
  // At most 5 parallel source requests; do not hammer NOAA or flood serverless costs.
  for (let i=0;i<IDS.length;i+=5) {
    const result=await Promise.all(IDS.slice(i,i+5).map(id=>regionSnapshot(id).catch(()=>null)));
    out.push(...result.filter(Boolean));
  }
  return out;
}
function parseBriefings(data,evidence) {
  const raw = (data?.content||[]).filter(x=>x.type==="text").map(x=>x.text).join("").trim();
  if (data?.stop_reason==="max_tokens" || raw.length > 11000) return null;
  let value;
  try { value=JSON.parse(raw.replace(/^\x60\x60\x60(?:json)?\s*/i,"").replace(/\s*\x60\x60\x60$/,"")); } catch { return null; }
  if (!value || typeof value!=="object" || Array.isArray(value)) return null;
  const allow = new Set(evidence.map(x=>x.id));
  const output={};
  for (const [id,note] of Object.entries(value)) {
    if (!allow.has(id) || typeof note!=="string") continue;
    const clean=note.replace(/\s+/g," ").trim();
    if (clean.length >= 35 && clean.length <= 360 && !/[<>]/.test(clean)) output[id]=clean;
  }
  return Object.keys(output).length ? output : null;
}
async function generate(evidence) {
  if (!process.env.ANTHROPIC_API_KEY_FALL_COLOR || !evidence.length) return null;
  try {
    const response = await fetch("https://api.anthropic.com/v1/messages",{
      method:"POST",
      headers:{"x-api-key":process.env.ANTHROPIC_API_KEY_FALL_COLOR,
        "anthropic-version":"2023-06-01","content-type":"application/json"},
      signal:AbortSignal.timeout(13000),
      body:JSON.stringify({model:MODEL,max_tokens:1300,temperature:0,
        system:"Write ONE concise daily travel insight (one or two sentences, max 44 words) for each supplied fall-color region. Return ONLY a valid JSON object mapping exact region id to insight string. Never claim that a timing index is observed leaf-color percentage. No fabricated foliage observations, access status, forecasts, peak dates, weather or closures. If forecastAvailable=false, acknowledge that live weather was not available. Every claim must follow the provided evidence. No marketing fluff, markdown, or extra keys.",
        messages:[{role:"user",content:JSON.stringify({publicationDate:dateKey(),regions:evidence})}]
      })
    });
    if(!response.ok)return null; // no 429/billing retry: strict daily cap
    return parseBriefings(await response.json(),evidence);
  } catch { return null; }
}
async function serve(req,res) {
  res.setHeader("Access-Control-Allow-Origin","*");
  res.setHeader("X-Robots-Tag","noindex, nofollow");
  res.setHeader("Cache-Control","public, s-maxage=900, stale-while-revalidate=3600");
  if(!["GET","HEAD"].includes(req.method))return res.status(405).json({error:"GET only"});
  const id=String(req.query?.region||"");
  if(!IDS.includes(id))return res.status(400).json({error:"Unknown region"});
  try {
    const raw=await redis(["GET","fallcolor:national:briefings:latest"]);
    if(!raw)return res.status(200).json({briefing:null});
    const edition=JSON.parse(raw);
    if(!edition.updated || Date.now()-Date.parse(edition.updated)>36*3600000)
      return res.status(200).json({briefing:null}); // never present old notes as live
    return res.status(200).json({
      region:id,date:edition.date,updated:edition.updated,
      briefing:edition.briefings?.[id]||null,
      method:edition.briefings?.[id]?"AI-generated model summary":null,
      disclosure:"Daily AI summary of regional seasonal timing and available NWS weather, not observed leaf color or confirmed access."
    });
  }catch{return res.status(503).json({briefing:null,error:"Daily briefing cache unavailable"});}
}
async function cron(req,res) {
  res.setHeader("X-Robots-Tag","noindex, nofollow");
  const day=dateKey();
  const secret=process.env.CRON_SECRET;
  // The authorized one-time seed workflow may run today's cron via signed OIDC,
  // without copying CRON_SECRET into GitHub or exposing an unauthenticated trigger.
  const seedToday=req.query?.seed==="2026-10-10" && day==="2026-10-10";
  const cronAuthorized=Boolean(secret&&req.headers?.authorization==="Bearer "+secret);
  const oidcAuthorized=seedToday && await authorizeCronRequest({
    authorization:req.headers?.authorization||"",
    isTest:true,
    expectedSha:process.env.VERCEL_GIT_COMMIT_SHA||"",
  });
  if(!cronAuthorized&&!oidcAuthorized)return res.status(401).json({error:"unauthorized"});
  if(req.method!=="GET")return res.status(405).json({error:"GET only"});
  if(!isSeason(day))return res.status(200).json({skipped:"off-season",date:day});
  try {
    if(await redis(["GET","fallcolor:national:briefings:"+day]))
      return res.status(200).json({skipped:"already-published",date:day});
    // The NX reservation limits calls across cron retries, parallel servers and preview environments.
    const lock=await redis(["SET","fallcolor:anthropic:national:attempt:"+day,"1","EX",172800,"NX"]);
    if(lock!=="OK")return res.status(200).json({skipped:"daily-attempt-already-claimed",date:day});
    const evidence=await sourceBatch();
    if(!evidence.length)return res.status(502).json({error:"no-national-source-evidence",date:day});
    const notes=await generate(evidence);
    if(!notes)return res.status(502).json({error:"daily-narrative-unavailable",date:day});
    const edition={date:day,updated:new Date().toISOString(),briefings:notes,
      method:"AI-generated model summary",evidenceRegions:evidence.map(x=>x.id)};
    await redis(["SET","fallcolor:national:briefings:"+day,JSON.stringify(edition),"EX",45*86400]);
    await redis(["SET","fallcolor:national:briefings:latest",JSON.stringify(edition),"EX",3*86400]);
    return res.status(200).json({ok:true,date:day,regions:Object.keys(notes).length,model:MODEL});
  }catch{return res.status(502).json({error:"daily-briefing-failed",date:day});}
}
module.exports=(req,res)=>String(req.query?.view)==="national-briefings-cron"?cron(req,res):serve(req,res);
module.exports._test={dateKey,isSeason,compactRegion,parseBriefings,IDS};
