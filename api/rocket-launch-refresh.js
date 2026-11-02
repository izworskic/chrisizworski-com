'use strict';

/**
 * Vercel Cron fallback for GitHub's best-effort schedule.
 * This route NEVER trusts x-vercel-cron or a query parameter: Vercel
 * injects Authorization: Bearer <CRON_SECRET> when configured.
 * Both schedulers call the same Postgres lease/cadence-aware collectors,
 * so a retry cannot double the Launch Library rate-limit workload.
 */
const crypto=require('node:crypto');
const {runNationalWatch}=require('../lib/rocket-launch-national');
const {runLaunchDayWatch}=require('../lib/space-coast-launch-day');
const {runLaunchTruthWatch}=require('../lib/rocket-launch-truth');

function authorized(headers={},env=process.env){
  const secret=typeof env.CRON_SECRET==='string'?env.CRON_SECRET:'';
  const bearer=typeof headers.authorization==='string'?headers.authorization:'';
  if(!secret||secret.length>4096)return false;
  const required='Bearer '+secret;
  if(Buffer.byteLength(bearer)!==Buffer.byteLength(required))return false;
  return crypto.timingSafeEqual(Buffer.from(bearer),Buffer.from(required));
}
function createHandler({
  guard=authorized,refresh=runNationalWatch,
  florida=runLaunchDayWatch,enrich=runLaunchTruthWatch
}={}){
  return async function handler(req,res){
    res.setHeader('Cache-Control','no-store');
    res.setHeader('X-Robots-Tag','noindex, nofollow');
    if(req.method!=='GET'){
      res.setHeader('Allow','GET');
      return res.status(405).json({ok:false,error:'method-not-allowed'});
    }
    if(!guard(req.headers||{}))
      return res.status(401).json({ok:false,error:'unauthorized'});
    try{
      const result=await refresh();
      if(result?.ok!==true||result.snapshot?.version!==2)
        throw new Error('national-snapshot-not-available');
      const snap=result.snapshot;
      // No secondary collector ever makes its own LL2 upcoming call.
      const [a,b]=await Promise.allSettled([
        florida({nationalSnapshot:snap}),
        enrich({nationalSnapshot:snap})
      ]);
      return res.status(200).json({
        ok:true,checkedAt:snap.checkedAt,
        schedule:{status:result.skipped||'checked',count:snap.activeCount,
          complete:snap.complete,health:snap.health},
        florida:{status:a.status==='fulfilled'?
          (a.value.skipped||'checked'):'unavailable'},
        enrichment:{status:b.status==='fulfilled'?
          (b.value.skipped||'checked'):'unavailable'},
        note:'Signed shared Postgres snapshot; original schedule authority remains Launch Library 2.'
      });
    }catch(_err){
      return res.status(503).json({
        ok:false,error:'scheduled-launch-check-unavailable',
        note:'Previously verified launch evidence remains stored and its age is shown to visitors.'
      });
    }
  };
}
module.exports=createHandler();
module.exports._test={createHandler,authorized};
