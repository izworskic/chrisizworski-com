'use strict';

// The verified Yosemite Firefall decision engine lives in and is owned by
// izworskic/yosemite-firefall-live (see AGENTS.md section 0: tool-specific
// business logic belongs in the owning repo, not here). Requiring that
// engine's TypeScript source as a github: npm dependency was never resolvable
// at runtime (it was declared in package.json but never landed in
// package-lock.json, so every call threw MODULE_NOT_FOUND). This proxies to
// the owner's own live, deployed JSON endpoint instead, matching the pattern
// already used for every other sibling national tool (e.g. /api/national-aurora,
// /api/national-rivers) in vercel.json.
const UPSTREAM_URL = 'https://yosemite-firefall-live.vercel.app/api/forecast';

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Cache-Control', 'public, s-maxage=600, stale-while-revalidate=1800');
  res.setHeader('X-Robots-Tag', 'noindex, nofollow');

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const upstream = await fetch(UPSTREAM_URL, {
      headers: { accept: 'application/json' },
      signal: AbortSignal.timeout(8000),
    });
    const text = await upstream.text();
    let snapshot;
    try {
      snapshot = JSON.parse(text);
    } catch {
      throw new Error(`Owner returned ${upstream.status} with a non-JSON body`);
    }
    if (!upstream.ok) {
      throw new Error(snapshot?.error || `Owner returned ${upstream.status}`);
    }
    return res.status(200).json(snapshot);
  } catch (error) {
    console.error('Yosemite Firefall API failure', error);
    return res.status(503).json({
      error: 'Firefall data temporarily unavailable',
      detail: error instanceof Error ? error.message : 'Unknown error',
      generatedAt: new Date().toISOString(),
    });
  }
};
