import 'tsx';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { pathToFileURL } from 'node:url';

const require = createRequire(import.meta.url);
let modelPromise;

async function loadModel() {
  if (!modelPromise) {
    const packageJson = require.resolve('yosemite-firefall-live/package.json');
    const modelPath = join(dirname(packageJson), 'lib', 'model.ts');
    modelPromise = import(pathToFileURL(modelPath).href);
  }
  return modelPromise;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Cache-Control', 'public, s-maxage=600, stale-while-revalidate=1800');
  res.setHeader('X-Robots-Tag', 'noindex, nofollow');

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { buildFirefallSnapshot } = await loadModel();
    const snapshot = await buildFirefallSnapshot();
    return res.status(200).json(snapshot);
  } catch (error) {
    console.error('Yosemite Firefall API failure', error);
    return res.status(503).json({
      error: 'Firefall data temporarily unavailable',
      detail: error instanceof Error ? error.message : 'Unknown error',
      generatedAt: new Date().toISOString(),
    });
  }
}
