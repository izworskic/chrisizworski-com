export function redisConfig(env = process.env) {
  return {
    url: env.UPSTASH_REDIS_REST_URL || env.KV_REST_API_URL || '',
    token: env.UPSTASH_REDIS_REST_TOKEN || env.KV_REST_API_TOKEN || '',
  };
}

export async function redisCommand(command, { env = process.env, fetchImpl = fetch } = {}) {
  const { url, token } = redisConfig(env);
  if (!url || !token) throw new Error('missing Upstash Redis configuration');
  const response = await fetchImpl(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(command),
  });
  const json = await response.json().catch(() => ({}));
  if (!response.ok || json.error) throw new Error(`Redis command failed (${response.status}): ${json.error || 'unknown error'}`);
  return json.result;
}

export async function storeReport(report, { env = process.env, fetchImpl = fetch } = {}) {
  const date = report.generatedAt.slice(0, 10);
  const payload = JSON.stringify(report);
  const ttl = 400 * 24 * 60 * 60;
  await redisCommand(['SET', `gsc:analytics:${date}`, payload, 'EX', ttl], { env, fetchImpl });
  await redisCommand(['SET', 'gsc:analytics:latest', payload], { env, fetchImpl });
  await redisCommand(['ZADD', 'gsc:analytics:history', Date.parse(report.generatedAt), date], { env, fetchImpl });
  return { date, bytes: Buffer.byteLength(payload) };
}

export async function getLatestReport(options = {}) {
  const raw = await redisCommand(['GET', 'gsc:analytics:latest'], options);
  return raw ? JSON.parse(raw) : null;
}
