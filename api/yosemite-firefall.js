'use strict';

// The main site is a CommonJS Vercel project. Register tsx's CommonJS hook so
// the verified Yosemite TypeScript engine can be required without turning the
// entire site into ESM (which would break existing serverless handlers).
require('tsx/cjs');

let model;
function loadModel() {
  if (!model) {
    // Keep the specifier literal so Vercel's Node File Trace can include the
    // Yosemite model and its transitive source files in this function bundle.
    model = require('yosemite-firefall-live/lib/model.ts');
  }
  return model;
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Cache-Control', 'public, s-maxage=600, stale-while-revalidate=1800');
  res.setHeader('X-Robots-Tag', 'noindex, nofollow');

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { buildFirefallSnapshot } = loadModel();
    const snapshot = await buildFirefallSnapshot();
    return res.status(200).json(snapshot);
  } catch (error) {
    console.error('Yosemite Firefall API failure', error);
    return res.status(503).json({
      error: 'Firefall data temporarily unavailable',
      detail: error instanceof Error ? error.message : 'Unknown error',
      code: error && typeof error === 'object' && 'code' in error ? error.code : undefined,
      generatedAt: new Date().toISOString(),
    });
  }
};
