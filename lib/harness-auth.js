'use strict';

// Credential for the shared AgentBase decision harness (JEV).
//
// On Vercel the OIDC token is delivered per request, not as an environment
// variable, so reading it from the process environment inside a function returns
// nothing in production and every JEV call silently falls back to the
// deterministic pick. @vercel/oidc reads the token from the request context.
// This is the same approach lib/mackinac-island/harness.js uses; its live
// health check reports auth=vercel-oidc.
let oidcModule = null;

async function harnessToken(explicit = '') {
  if (explicit) return { token: String(explicit), source: 'explicit' };
  if (process.env.HARNESS_ACCESS_KEY) return { token: String(process.env.HARNESS_ACCESS_KEY), source: 'shared-key' };
  try {
    oidcModule ||= import('@vercel/oidc');
    const token = await (await oidcModule).getVercelOidcToken();
    if (token) return { token: String(token), source: 'vercel-oidc' };
  } catch (error) {
    return { token: '', source: 'none', error: String(error?.message || error).slice(0, 200) };
  }
  return { token: '', source: 'none', error: 'Vercel OIDC token unavailable' };
}

module.exports = { harnessToken };
