"use strict";

const handler = require("../lib/gatlinburg-winter/route-v7.js");

async function gatlinburgWinter(req, res) {
  res.setHeader("X-Robots-Tag", "noindex");
  return handler(req, res);
}

gatlinburgWinter.buildDecision = handler.buildDecision;
gatlinburgWinter._test = handler._test;

module.exports = gatlinburgWinter;
