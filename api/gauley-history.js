'use strict';
// Deployment wrapper only. Gauley business logic remains authoritative in izworskic/gauley-release-live-.
let handlerPromise;
module.exports = async function gauleyHistory(req,res){
  handlerPromise ||= import('gauley-release-live/api/history.js').then(m=>m.default);
  const handler=await handlerPromise;
  return handler(req,res);
};
