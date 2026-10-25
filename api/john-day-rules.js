'use strict';
const {decide}=require('../lib/john-day-rules');
module.exports=function handler(req,res){
 res.setHeader('X-Robots-Tag','noindex,nofollow');
 res.setHeader('Access-Control-Allow-Origin','https://chrisizworski.com');
 res.setHeader('Cache-Control','public,s-maxage=3600');
 if(req.method&&req.method!=='GET'){res.setHeader('Allow','GET');return res.status(405).json({ok:false,error:'Method not allowed'});}
 const {date,direction,craft}=req.query||{};
 const out=decide({date,direction,craft});
 return res.status(out.kind==='invalid'?400:200).json({ok:out.kind!=='invalid',...out});
};
