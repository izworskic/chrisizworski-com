const { classifyVisitor, intakeSchema, PROFILE_VERSION } = require("../lib/mackinac-island/intelligence");
const { shapeSurface } = require("../lib/mackinac-island/platform");
const harness = require("../lib/mackinac-island/harness");

function bodyObject(req){
  if(req?.body && typeof req.body==="object")return req.body;
  if(typeof req?.body==="string"){
    try{return JSON.parse(req.body)||{};}catch{return{};}
  }
  return{};
}
function answerObject(body){
  return body?.answers&&typeof body.answers==="object"?body.answers:(body&&typeof body==="object"?body:{});
}

module.exports=async function handler(req,res){
  res.setHeader("Access-Control-Allow-Origin","*");
  res.setHeader("Access-Control-Allow-Headers","content-type");
  res.setHeader("Access-Control-Allow-Methods","GET, POST, OPTIONS");
  res.setHeader("Cache-Control","no-store");
  res.setHeader("X-Robots-Tag","noindex, nofollow");
  res.setHeader("X-Content-Type-Options","nosniff");
  if(req.method==="OPTIONS")return res.status(204).end();
  if(req.method==="GET"){
    if(String(req.query?.health||"")==="1"){
      const health=await harness.health();
      return res.status(health.ok?200:503).json({service:"mackinac-jev",...health});
    }
    return res.status(200).json(intakeSchema());
  }
  if(req.method!=="POST"){res.setHeader("Allow","GET, POST, OPTIONS");return res.status(405).json({error:"Method not allowed"});}
  try{
    const body=bodyObject(req);
    const profile=await classifyVisitor(answerObject(body),{useJev:true});
    const surface=body?.surface?await shapeSurface(body.surface,profile,{date:body?.trip_date||profile?.answers?.trip_date||null}):null;
    return res.status(200).json({generated_at:new Date().toISOString(),profile_version:PROFILE_VERSION,profile,surface});
  }catch(e){
    return res.status(503).json({error:"Mackinac visitor profile unavailable",detail:String(e?.message||e).slice(0,180),profile_version:PROFILE_VERSION});
  }
};

module.exports._test={bodyObject,answerObject};
