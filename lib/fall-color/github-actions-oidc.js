"use strict";

const crypto = require("node:crypto");

const ISSUER = "https://token.actions.githubusercontent.com";
const JWKS_URL = ISSUER + "/.well-known/jwks";
const AUDIENCE = "https://chrisizworski.com/api/fall-color-writer-test";
const REPOSITORY = "izworskic/chrisizworski-com";
const REPOSITORY_ID = "1305741696";
const REPOSITORY_OWNER = "izworskic";
const REPOSITORY_OWNER_ID = "46615230";
const MAIN_REF = "refs/heads/main";
const JOB_WORKFLOW_REF = REPOSITORY + "/.github/workflows/fall-color-writer-test.yml@" + MAIN_REF;
const MAX_TOKEN_BYTES = 16 * 1024;
const CLOCK_SKEW_SECONDS = 30;
const MAX_TOKEN_AGE_SECONDS = 15 * 60;

let jwksCache = null;

function decodeJsonPart(part) {
  if (!part || !/^[A-Za-z0-9_-]+$/.test(part)) throw new Error("invalid JWT encoding");
  return JSON.parse(Buffer.from(part, "base64url").toString("utf8"));
}

function audienceMatches(aud) {
  if (typeof aud === "string") return aud === AUDIENCE;
  return Array.isArray(aud) && aud.length === 1 && aud[0] === AUDIENCE;
}

function cacheLifetime(response) {
  const value = response.headers && typeof response.headers.get === "function"
    ? response.headers.get("cache-control") || ""
    : "";
  const match = value.match(/(?:^|,)\s*max-age=(\d+)/i);
  const seconds = match ? Number(match[1]) : 300;
  return Math.max(60, Math.min(seconds, 60 * 60)) * 1000;
}

async function fetchSigningKeys(fetchImpl, nowMs, forceRefresh) {
  if (!forceRefresh && jwksCache && jwksCache.expiresAt > nowMs) return jwksCache.keys;

  const response = await fetchImpl(JWKS_URL, {
    headers: { accept: "application/json" },
    signal: typeof AbortSignal !== "undefined" && typeof AbortSignal.timeout === "function"
      ? AbortSignal.timeout(5000)
      : undefined,
  });
  if (!response || !response.ok) throw new Error("GitHub OIDC signing keys unavailable");

  const document = await response.json();
  const keys = document && Array.isArray(document.keys)
    ? document.keys.filter((key) => key && key.kty === "RSA" && typeof key.kid === "string")
    : [];
  if (keys.length === 0) throw new Error("GitHub OIDC signing keys empty");

  jwksCache = { keys, expiresAt: nowMs + cacheLifetime(response) };
  return keys;
}

async function signingKeyFor(kid, fetchImpl, nowMs) {
  let keys = await fetchSigningKeys(fetchImpl, nowMs, false);
  let key = keys.find((candidate) => candidate.kid === kid);
  if (!key) {
    keys = await fetchSigningKeys(fetchImpl, nowMs, true);
    key = keys.find((candidate) => candidate.kid === kid);
  }
  return key || null;
}

function claimsMatch(payload, nowSeconds, expectedSha) {
  if (!payload || payload.iss !== ISSUER || !audienceMatches(payload.aud)) return false;
  if (!Number.isFinite(payload.iat) || !Number.isFinite(payload.exp)) return false;
  if (payload.iat > nowSeconds + CLOCK_SKEW_SECONDS) return false;
  if (payload.exp <= nowSeconds - CLOCK_SKEW_SECONDS) return false;
  if (nowSeconds - payload.iat > MAX_TOKEN_AGE_SECONDS) return false;
  if (payload.nbf != null && (!Number.isFinite(payload.nbf) || payload.nbf > nowSeconds + CLOCK_SKEW_SECONDS)) return false;

  if (payload.repository !== REPOSITORY || String(payload.repository_id) !== REPOSITORY_ID) return false;
  if (payload.repository_owner !== REPOSITORY_OWNER || String(payload.repository_owner_id) !== REPOSITORY_OWNER_ID) return false;
  if (payload.repository_visibility !== "public") return false;
  if (payload.ref !== MAIN_REF || payload.ref_type !== "branch") return false;
  if (payload.job_workflow_ref !== JOB_WORKFLOW_REF || payload.runner_environment !== "github-hosted") return false;
  if (payload.event_name !== "push" && payload.event_name !== "workflow_dispatch") return false;
  if (typeof payload.sha !== "string" || !/^[0-9a-f]{40}$/.test(payload.sha)) return false;
  if (expectedSha && payload.sha !== expectedSha) return false;
  return true;
}

async function verifyGitHubActionsToken(token, options = {}) {
  try {
    if (typeof token !== "string" || token.length === 0 || token.length > MAX_TOKEN_BYTES) return false;
    const parts = token.split(".");
    if (parts.length !== 3 || !parts[2] || !/^[A-Za-z0-9_-]+$/.test(parts[2])) return false;

    const header = decodeJsonPart(parts[0]);
    const payload = decodeJsonPart(parts[1]);
    if (!header || header.alg !== "RS256" || typeof header.kid !== "string" || !header.kid) return false;

    const fetchImpl = options.fetchImpl || globalThis.fetch;
    if (typeof fetchImpl !== "function") return false;
    const nowMs = options.nowMs == null ? Date.now() : options.nowMs;
    const jwk = await signingKeyFor(header.kid, fetchImpl, nowMs);
    if (!jwk) return false;

    const publicKey = crypto.createPublicKey({ key: jwk, format: "jwk" });
    const verified = crypto.verify(
      "RSA-SHA256",
      Buffer.from(parts[0] + "." + parts[1]),
      publicKey,
      Buffer.from(parts[2], "base64url"),
    );
    if (!verified) return false;
    return claimsMatch(payload, Math.floor(nowMs / 1000), options.expectedSha || "");
  } catch (error) {
    return false;
  }
}

async function authorizeCronRequest({
  authorization = "",
  isTest = false,
  cronSecret = "",
  expectedSha = "",
  verifyToken = verifyGitHubActionsToken,
} = {}) {
  if (cronSecret && authorization === "Bearer " + cronSecret) return true;
  if (!isTest || !authorization.startsWith("Bearer ")) return false;
  const token = authorization.slice("Bearer ".length);
  if (!token) return false;
  return verifyToken(token, { expectedSha });
}

module.exports = {
  AUDIENCE,
  authorizeCronRequest,
  verifyGitHubActionsToken,
  _internal: {
    ISSUER,
    JWKS_URL,
    MAIN_REF,
    JOB_WORKFLOW_REF,
    clearJwksCache() { jwksCache = null; },
  },
};
