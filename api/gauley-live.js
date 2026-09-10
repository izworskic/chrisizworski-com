'use strict';
// Deployment wrapper only. Gauley business logic remains authoritative in izworskic/gauley-release-live-.
let handlerPromise;
module.exports = async function gauleyLive(req,res){
  handlerPromise ||= import('gauley-release-live/api/live.js').then(m=>m.default);
  const handler=await handlerPromise;
  return handler(req,res);
};
