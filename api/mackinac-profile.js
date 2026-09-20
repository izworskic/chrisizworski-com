const { classifyVisitor, profileWithCachedPrimary, chooseSurfaceFocus, intakeSchema, PROFILE_VERSION } = require("../lib/mackinac-island/intelligence");

function parsedBody(req){
  if(req?.body && typeof req.body==="object")return req.body||{};
  if(typeof req?.body==="string"){
    try{return JSON.parse(req.body)||{};}catch{return{};}
  }
  return{};
}
function answersFromBody(body){
  return body?.answers&&typeof body.answers==="object"&&!Array.isArray(body.answers)?body.answers:(body&&typeof body==="object"?body:{});
}
function surfaceFromBody(body){
  return String(body?.surface||"").trim().slice(0,60);
}

module.exports=async function handler(req,res){
  res.setHeader("Access-Control-Allow-Origin","*");
  res.setHeader("Access-Control-Allow-Headers","content-type");
  res.setHeader("Access-Control-Allow-Methods","GET, POST, OPTIONS");
  res.setHeader("Cache-Control","no-store");
  res.setHeader("X-Robots-Tag","noindex, nofollow");
  res.setHeader("X-Content-Type-Options","nosniff");
  if(req.method==="OPTIONS")return res.status(204).end();
  if(req.method==="GET")return res.status(200).json(intakeSchema());
  if(req.method!=="POST"){res.setHeader("Allow","GET, POST, OPTIONS");return res.status(405).json({error:"Method not allowed"});}
  try{
    const body=parsedBody(req);
    const answers=answersFromBody(body);
    const surfaceOnly=body?.mode==="surface";
    const profile=surfaceOnly
      ? profileWithCachedPrimary(answers,body?.primary_id)
      : await classifyVisitor(answers,{useJev:true});
    const requestedSurface=surfaceFromBody(body);
    const surfaceDecision=requestedSurface
      ? await chooseSurfaceFocus(profile,requestedSurface,{useJev:true})
      : null;
    return res.status(200).json({
      generated_at:new Date().toISOString(),
      profile_version:PROFILE_VERSION,
      profile,
      surface_decision:surfaceDecision
    });
  }catch(e){
    return res.status(503).json({error:"Mackinac visitor profile unavailable",detail:String(e?.message||e).slice(0,180),profile_version:PROFILE_VERSION});
  }
};

module.exports._test={parsedBody,answersFromBody,surfaceFromBody};
