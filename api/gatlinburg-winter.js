"use strict";

const handler = require("../lib/gatlinburg-winter/route-v7.js");

module.exports = async function gatlinburgWinter(req, res) {
  res.setHeader("X-Robots-Tag", "noindex, nofollow");
  return handler(req, res);
};
