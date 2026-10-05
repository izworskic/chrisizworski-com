import crypto from 'node:crypto';

const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const SCOPE = 'https://www.googleapis.com/auth/webmasters.readonly';
let cached = null;

export function base64url(input) {
  return Buffer.from(input).toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

export function readServiceAccount(env = process.env) {
  if (env.GSC_SERVICE_ACCOUNT_JSON) {
    let raw = env.GSC_SERVICE_ACCOUNT_JSON.trim();
    if (!raw.startsWith('{')) {
      try { raw = Buffer.from(raw, 'base64').toString('utf8'); } catch {}
    }
    const parsed = JSON.parse(raw);
    if (!parsed.client_email || !parsed.private_key) throw new Error('GSC_SERVICE_ACCOUNT_JSON is missing client_email/private_key');
    return { clientEmail: parsed.client_email, privateKey: parsed.private_key.replace(/\\n/g, '\n') };
  }
  const clientEmail = env.GSC_CLIENT_EMAIL || '';
  const privateKey = (env.GSC_PRIVATE_KEY || '').replace(/\\n/g, '\n');
  if (!clientEmail || !privateKey) throw new Error('missing GSC credentials: set GSC_SERVICE_ACCOUNT_JSON or GSC_CLIENT_EMAIL + GSC_PRIVATE_KEY');
  return { clientEmail, privateKey };
}

export function createServiceAccountJwt({ clientEmail, privateKey, nowSec = Math.floor(Date.now() / 1000) }) {
  const header = base64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const claims = base64url(JSON.stringify({
    iss: clientEmail,
    scope: SCOPE,
    aud: TOKEN_URL,
    iat: nowSec,
    exp: nowSec + 3600,
  }));
  const unsigned = `${header}.${claims}`;
  const signature = crypto.createSign('RSA-SHA256').update(unsigned).end().sign(privateKey);
  return `${unsigned}.${base64url(signature)}`;
}

export async function getGoogleAccessToken({ env = process.env, fetchImpl = fetch, force = false } = {}) {
  const now = Date.now();
  if (!force && cached && cached.expiresAt - 60_000 > now) return cached.token;
  const creds = readServiceAccount(env);
  const assertion = createServiceAccountJwt(creds);
  const body = new URLSearchParams({
    grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
    assertion,
  });
  const response = await fetchImpl(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  const json = await response.json().catch(() => ({}));
  if (!response.ok || !json.access_token) {
    throw new Error(`Google OAuth failed (${response.status}): ${json.error_description || json.error || 'no access token'}`);
  }
  cached = { token: json.access_token, expiresAt: now + Number(json.expires_in || 3600) * 1000 };
  return cached.token;
}
