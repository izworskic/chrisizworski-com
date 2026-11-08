/**
 * Circle Tour independent connection compiler.
 * No network calls, no specialist-code mutation, no status/availability inference.
 * The canonical Tool Network Registry remains the only URL/intent authority.
 */
export const ROUTE_ORDER = Object.freeze(
  ['1','2','3','4','5','6','7','8','9','10','11','12','31','13','14','15','16','17','18','19','20','21','22','23','24','25','26','27','28','29','30']
);
export const STOP_REGION = Object.freeze(Object.fromEntries(ROUTE_ORDER.map(id=>[
  id, ['1','21','22','23','24','25','26','27','28','29','30'].includes(id)?'mn':
      ['2','3','4'].includes(id)?'wi':
      ['14','15','16','17','18','19','20'].includes(id)?'on':'mi'
])));
const STOP_SET = new Set(ROUTE_ORDER);
const THEMES = new Set(['parks','falls','water','ships','history','logistics','seasonal']);
const ROAD_HOSTS = new Set(['511wi.gov','mdotjboss.state.mi.us','511on.ca','511mn.org']);
const CANDIDATE_AREAS = new Set(['lake-superior','ontario-lake-superior','minnesota-north-shore','keweenaw','eastern-upper-peninsula','western-upper-peninsula','isle-royale','duluth-superior','pukaskwa-national-park']);
const at = id => ROUTE_ORDER.indexOf(id);

function fail(message) { throw new Error('Circle Tour connection registry: '+message); }
function uniqueStrings(values, name) {
  if(!Array.isArray(values)||!values.length)fail(name+' must be a nonempty array');
  if(values.some(v=>typeof v!=='string')||new Set(values).size!==values.length)fail(name+' must contain unique strings');
  return values;
}
function cleanText(value,name,min=8,max=220) {
  if(typeof value!=='string'||value.trim().length<min||value.length>max||/[<>]/.test(value))fail(name+' is missing, malformed or too long');
  return value.trim();
}
function firstPartyUrl(value) {
  let url;
  try { url=new URL(value); } catch { fail('invalid tool canonical '+value); }
  if(url.protocol!=='https:'||url.username||url.password||url.search||url.hash||url.port||!(url.hostname==='chrisizworski.com'||url.hostname.endsWith('.chrisizworski.com')))
    fail('unapproved cross-domain or parameterized tool URL '+value);
  return url.toString();
}
function checkedRoadUrl(value) {
  let url;try{url=new URL(value);}catch{fail('invalid road-check URL '+value);}
  if(url.protocol!=='https:'||!ROAD_HOSTS.has(url.hostname)||url.username||url.password||url.hash||url.port)fail('unapproved road source '+value);
  return url.toString();
}
function validateConnection(spec,tool,source) {
  if(!tool)fail('unregistered tool '+spec.toolId);
  if(tool.id==='circle-tour')fail('cannot link Circle Tour to itself');
  if(spec.approval!=='approved')fail('invalid approved connection '+spec.toolId);
  uniqueStrings(spec.stopIds,'stopIds for '+spec.toolId);
  if(spec.stopIds.some(id=>!STOP_SET.has(id)))fail('invalid Circle Tour stop for '+spec.toolId);
  if(!THEMES.has(spec.theme))fail('invalid theme for '+spec.toolId);
  const decision=cleanText(spec.decision,'decision for '+spec.toolId,12,160);
  const caveat=cleanText(spec.caveat,'caveat for '+spec.toolId,12,180);
  const seasons=Array.isArray(tool.seasons)?[...new Set(tool.seasons)]:[];
  if(!seasons.length||seasons.some(n=>!Number.isInteger(n)||n<1||n>12))fail('invalid seasonal registry metadata for '+spec.toolId);
  return {
    toolId:tool.id,name:cleanText(tool.name,'registry name',3,130),
    url:firstPartyUrl(tool.canonical),
    stopIds:spec.stopIds.slice().sort((a,b)=>at(a)-at(b)),
    theme:spec.theme,decision,caveat,seasons:seasons.slice().sort((a,b)=>a-b),
    source, evidence:'specialist-owned; current access and availability not asserted'
  };
}
export function compileCircleTourCatalog(registry,configuration) {
  if(!registry||!Array.isArray(registry.tools)||registry.tools.length<1)fail('missing tool registry');
  if(configuration?.schemaVersion!==1||configuration.routeId!=='circle-tour')fail('unsupported configuration version or owner');
  if(!Array.isArray(configuration.connections)||!Array.isArray(configuration.roadChecks))fail('missing connection or road inventories');
  const owners=new Map();
  for(const tool of registry.tools) {
    if(!tool||!tool.id||owners.has(tool.id))fail('duplicate or missing tool ID');
    owners.set(tool.id,tool);
  }
  const approved=[],assigned=new Set(),candidates=[];
  for(const seed of configuration.connections) {
    if(seed.approval!=='approved')fail('seed requires explicit approval '+seed.toolId);
    if(assigned.has(seed.toolId))fail('duplicate tool placement '+seed.toolId);
    assigned.add(seed.toolId);
    approved.push(validateConnection(seed,owners.get(seed.toolId),'curated'));
  }
  for(const tool of registry.tools) {
    const policy=tool.circleTour;
    if(!policy)continue;
    if(assigned.has(tool.id))fail('tool '+tool.id+' is in seed and embedded metadata; use one owner');
    if(policy.approval==='approved'){
      // A candidate must never be promoted by geography alone or an unverified preview URL.
      if(typeof policy.productionVerifiedAt!=='string'||!/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(policy.productionVerifiedAt))
        fail('approved future tool requires a reviewed productionVerifiedAt date: '+tool.id);
      const connection=validateConnection({...policy,toolId:tool.id},tool,'registry-approved');
      approved.push(connection);assigned.add(tool.id);
    }else if(policy.approval==='candidate'){
      candidates.push({toolId:tool.id,reason:'explicit candidate; publication requires review and approval'});
    }else fail('unknown approval on '+tool.id);
  }
  for(const tool of registry.tools) {
    if(assigned.has(tool.id)||candidates.some(x=>x.toolId===tool.id)||tool.id==='circle-tour')continue;
    if((tool.geographies||[]).some(area=>CANDIDATE_AREAS.has(String(area).toLowerCase())))
      candidates.push({toolId:tool.id,reason:'geography suggests Circle Tour relevance; stop and visitor decision not independently approved'});
  }
  approved.sort((a,b)=>at(a.stopIds[0])-at(b.stopIds[0])||a.toolId.localeCompare(b.toolId));
  const roadChecks=configuration.roadChecks.map(item=>{
    if(!['wi','mi','on','mn'].includes(item.region)||!item.id||item.id!==item.region)fail('invalid road-check region');
    return {id:item.id,region:item.region,name:cleanText(item.label,'road-check label',4,80),
      url:checkedRoadUrl(item.url),note:cleanText(item.note,'road-check caveat',12,180),
      evidence:'official source link; no live route status fetched'};
  });
  if(new Set(roadChecks.map(x=>x.region)).size!==4||roadChecks.length!==4)fail('four distinct official region checks required');
  return {
    catalog:{
      schemaVersion:1,owner:'circle-tour',registryVersion:registry.version||'unversioned',
      connectionPolicy:'approved-only',routeOrder:[...ROUTE_ORDER],stopRegion:STOP_REGION,
      connections:approved,roadChecks
    },
    report:{approved:approved.length,candidates:candidates.sort((a,b)=>a.toolId.localeCompare(b.toolId)),sources:{curated:approved.filter(x=>x.source==='curated').length,registryApproved:approved.filter(x=>x.source==='registry-approved').length}}
  };
}
