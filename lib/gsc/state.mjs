import privateState from '../tool-state.js';
const { stateCommand } = privateState;

export async function storeReport(report, { env = process.env, fetchImpl = fetch } = {}) {
  const date = report.generatedAt.slice(0, 10);
  const payload = JSON.stringify(report);
  const ttl = 400 * 24 * 60 * 60;
  await stateCommand(['SET', `gsc:analytics:${date}`, payload, 'EX', ttl], { env, fetchImpl });
  await stateCommand(['SET', 'gsc:analytics:latest', payload], { env, fetchImpl });
  await stateCommand(['ZADD', 'gsc:analytics:history', Date.parse(report.generatedAt), date], { env, fetchImpl });
  return { date, bytes: Buffer.byteLength(payload) };
}

export async function getLatestReport(options = {}) {
  const raw = await stateCommand(['GET', 'gsc:analytics:latest'], options);
  return raw ? JSON.parse(raw) : null;
}
