"use strict";
const crypto = require("node:crypto");

function configured(env = process.env) {
  return typeof env.GROWTH_DASHBOARD_PASSWORD === "string" && Buffer.byteLength(env.GROWTH_DASHBOARD_PASSWORD) >= 24;
}
function same(a, b) {
  const aa = crypto.createHash("sha256").update(a).digest();
  const bb = crypto.createHash("sha256").update(b).digest();
  return crypto.timingSafeEqual(aa, bb);
}
function authorized(header, env = process.env) {
  if (!configured(env) || typeof header !== "string" || !header.startsWith("Basic ") || header.length > 2048) return false;
  const raw = header.slice(6);
  if (!/^[a-z0-9+/]+=*$/i.test(raw)) return false;
  let plain;
  try { plain = Buffer.from(raw, "base64").toString("utf8"); } catch { return false; }
  const cut = plain.indexOf(":");
  if (cut < 0) return false;
  const user = plain.slice(0, cut);
  const pass = plain.slice(cut + 1);
  return same(user, env.GROWTH_DASHBOARD_USER || "owner") && same(pass, env.GROWTH_DASHBOARD_PASSWORD);
}
function secureHeaders(res) {
  res.setHeader("X-Robots-Tag", "noindex, nofollow, noarchive");
  res.setHeader("Cache-Control", "private, no-store, max-age=0");
  res.setHeader("Referrer-Policy", "no-referrer");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  res.setHeader("Vary", "Authorization");
}
function requireOwner(req, res, env = process.env) {
  if (authorized(req?.headers?.authorization || "", env)) return true;
  res.setHeader("WWW-Authenticate", 'Basic realm="Private Growth Command Center", charset="UTF-8"');
  res.status(401).json({ error: "owner-authentication-required" });
  return false;
}
module.exports = { authorized, configured, secureHeaders, requireOwner };
