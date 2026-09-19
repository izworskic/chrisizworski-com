const INJECTION_PATTERNS = [
  /ignore\s+(all\s+)?(previous|prior|system|developer)\s+instructions?/i,
  /(?:system|developer)\s+(?:message|prompt)/i,
  /reveal\s+(?:the\s+)?(?:api\s*key|token|credentials?|secret)/i,
  /send\s+(?:the\s+)?(?:api\s*key|token|credentials?|secret)/i,
  /override\s+(?:your|the|all)?\s*(?:rules|policy|instructions?)/i,
  /169\.254\.169\.254|localhost|127\.0\.0\.1/i,
  /<script\b/i,
  /javascript:/i
];

export function injectionSignals(text = '') {
  const value = String(text).slice(0, 12000);
  return INJECTION_PATTERNS.filter((re) => re.test(value)).map((re) => re.source);
}

export function safeText(text, max = 1600) {
  return String(text ?? '')
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, ' ')
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max);
}

export function assertHttps(url) {
  const parsed = new URL(url);
  if (parsed.protocol !== 'https:') throw new Error('Only HTTPS upstreams are allowed');
  if (parsed.username || parsed.password) throw new Error('Embedded credentials are not allowed');
  return parsed;
}
