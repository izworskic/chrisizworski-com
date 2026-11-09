"use strict";
const { secureHeaders, requireOwner } = require("../lib/growth/owner-auth");
const { authorizeGscRequest } = require("../lib/gsc/github-actions-oidc.js");
const { stateReady } = require("../lib/tool-state");

module.exports = async function growthCommandCenter(req, res) {
  res.setHeader("X-Robots-Tag", "noindex, nofollow, noarchive");
  secureHeaders(res);
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  const view = String(req.query?.view || "report");
  const method = String(req.method || "GET").toUpperCase();

  if (method === "GET" && ["report", "health"].includes(view)) {
    if (!requireOwner(req, res)) return;
    try {
      if (view === "health") {
        return res.status(200).json({ ok: true,
          collectorConfigured: stateReady(),
          ga4Configured: /^\d{6,20}$/.test(String(process.env.GROWTH_GA4_PROPERTY_ID || "")),
          adsenseConfigured: Boolean(process.env.GROWTH_ADSENSE_ACCOUNT && process.env.GROWTH_ADSENSE_CLIENT_ID &&
            process.env.GROWTH_ADSENSE_CLIENT_SECRET && process.env.GROWTH_ADSENSE_REFRESH_TOKEN) });
      }
      const { readGrowthSnapshot } = await import("../lib/growth/auto-ingest.mjs");
      const snapshot = await readGrowthSnapshot();
      if (!snapshot) return res.status(404).json({ error: "no-private-growth-report-yet" });
      return res.status(200).json(snapshot);
    } catch (error) {
      console.error("growth_private_report_error", error?.code || "storage-read-failure");
      return res.status(503).json({ error: "growth-private-report-unavailable" });
    }
  }

  if (method === "POST" && view === "collect") {
    const valid = await authorizeGscRequest({
      authorization: req.headers.authorization || "",
      cronSecret: process.env.CRON_SECRET || "",
    });
    if (!valid) return res.status(401).json({ error: "collector-authorization-required" });
    if (!stateReady()) return res.status(503).json({ error: "private-tool-state-not-configured" });
    try {
      const { createGrowthSnapshot, storeGrowthSnapshot } = await import("../lib/growth/auto-ingest.mjs");
      const snapshot = await createGrowthSnapshot();
      const written = await storeGrowthSnapshot(snapshot);
      return res.status(200).json({
        ok: true, collectedAt: written.collectedAt,
        sources: written.statuses, stored: written.stored,
      });
    } catch (error) {
      console.error("growth_collect_error", error?.code || "collector-failure");
      return res.status(503).json({ error: "growth-collection-failed" });
    }
  }
  res.setHeader("Allow", "GET, POST");
  return res.status(405).json({ error: "unsupported-method-or-view" });
};
