const { classifyVisitor, intakeSchema, PROFILE_VERSION } = require("../lib/mackinac-island/intelligence");

function bodyObject(req){
  if(req?.body && typeof req.body==="object")return req.body.answers&&typeof req.body.answers==="object"?req.body.answers:req.body;
  if(typeof req?.body==="string"){
    try{const parsed=JSON.parse(req.body);return parsed?.answers&&typeof parsed.answers==="object"?parsed.answers:parsed||{};}catch{return{};}
  }
  return{};
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
    const profile=await classifyVisitor(bodyObject(req),{useJev:true});
    return res.status(200).json({generated_at:new Date().toISOString(),profile_version:PROFILE_VERSION,profile});
  }catch(e){
    return res.status(503).json({error:"Mackinac visitor profile unavailable",detail:String(e?.message||e).slice(0,180),profile_version:PROFILE_VERSION});
  }
};

module.exports._test={bodyObject};
