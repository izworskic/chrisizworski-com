"use strict";

const handler = require("../lib/gatlinburg-winter/route-v8.js");

function gatlinburgWinter(req, res) {
  res.setHeader("X-Robots-Tag", "noindex");
  return handler(req, res);
}

Object.assign(gatlinburgWinter, handler);
module.exports = gatlinburgWinter;
