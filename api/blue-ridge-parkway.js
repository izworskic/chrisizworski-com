"use strict";

const handler=require("../lib/blue-ridge-parkway/engine.js");

module.exports=async function blueRidgeParkway(req,res){
  res.setHeader("X-Robots-Tag","noindex, nofollow");
  return handler(req,res);
};
