#!/usr/bin/env node
"use strict";
const fs=require("node:fs");
const path=require("node:path");
const crypto=require("node:crypto");
const SOURCE_ROOT=path.resolve(__dirname,"../tool-sources/ausable-river-map");

function inspect(root=SOURCE_ROOT){
  const manifest=JSON.parse(fs.readFileSync(path.join(root,"provenance.json"),"utf8"));
  const original=Array.isArray(manifest.originalFiles)?manifest.originalFiles:[];
  const apiFiles=original.filter(x=>/^api\/[a-z0-9-]+\.js$/.test(x.path||""));
  const verification=apiFiles.map(record=>{
    const pathname=path.join(root,record.path);
    if(!fs.existsSync(pathname))return {path:record.path,status:"missing",expectedSha:record.sha};
    const raw=fs.readFileSync(pathname);
    const actualSha=crypto.createHash("sha1").update(raw).digest("hex");
    return {
      path:record.path,
      status:actualSha===record.sha?"original-sha-verified":"sha-mismatch",
      expectedSha:record.sha,actualSha,
    };
  });
  const indexPath=path.join(root,"index.html");
  const indexText=fs.existsSync(indexPath)?fs.readFileSync(indexPath,"utf8"):"";
  const indexPresent=indexText.includes('https://ausable.chrisizworski.com/') &&
    indexText.includes("/api/snapshot")&&indexText.includes("/trip?");
  const ready=indexPresent&&verification.length>=2&&verification.every(x=>x.status==="original-sha-verified");
  return {
    gate:"ausable-owner-source/v1",
    status:ready?"owner-source-verified":"blocked-on-source-recovery",
    ready,
    indexPresent,
    deploymentId:manifest.deploymentId||null,
    projectId:manifest.projectId||null,
    auxiliary:verification,
    limitations:ready?[]:[
      "Original server source cannot be reconstructed from public JSON responses",
      "No source-owned Au Sable route API can be claimed from this manifest",
    ],
  };
}
if(require.main===module){
  try{
    const report=inspect();
    process.stdout.write(JSON.stringify(report,null,2)+"\n");
    if(process.argv.includes("--require-ready")&&!report.ready)process.exitCode=1;
  }catch(error){
    process.stderr.write("Au Sable source recovery audit unavailable: "+String(error.message||error)+"\n");
    process.exitCode=1;
  }
}
module.exports={inspect};
