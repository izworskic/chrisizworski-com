import { collectGscAnalytics, compactLogSummary } from '../lib/gsc/collector.mjs';

const persist = !process.argv.includes('--no-persist');
const { report, stored } = await collectGscAnalytics({ persist });
console.log(JSON.stringify({ ...compactLogSummary(report), stored }, null, 2));
