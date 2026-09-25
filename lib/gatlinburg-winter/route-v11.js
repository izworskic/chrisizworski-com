"use strict";

const v12 = require("./route-v12.js");

function setFreshHeaders(res) {
  res.setHeader("X-Robots-Tag", "noindex");
  res.setHeader("Cache-Control", "no-store, max-age=0");
  res.setHeader("CDN-Cache-Control", "no-store");
  res.setHeader("Vercel-CDN-Cache-Control", "no-store");
}

async function handler(req, res) {
  setFreshHeaders(res);
  try {
    if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });
    return res.status(200).json(await v12.buildDecision(req.query || {}));
  } catch (error) {
    return res.status(500).json({
      ok: false,
      error: "Gatlinburg winter planner failed",
      detail: String(error?.message || error).slice(0, 220),
      generatedAt: new Date().toISOString()
    });
  }
}

module.exports = handler;
module.exports.buildDecision = v12.buildDecision;
module.exports._test = { setFreshHeaders };
