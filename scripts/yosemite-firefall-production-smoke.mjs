import assert from 'node:assert/strict';

const base = 'https://chrisizworski.com';
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

async function fetchWithRetry(path, validate, label) {
  let lastError;
  for (let attempt = 1; attempt <= 10; attempt += 1) {
    const separator = path.includes('?') ? '&' : '?';
    const url = `${base}${path}${separator}smoke=${Date.now()}-${attempt}`;
    try {
      const response = await fetch(url, {
        headers: {
          'user-agent': 'chrisizworski-production-smoke/1.0',
          'cache-control': 'no-cache',
          pragma: 'no-cache',
          accept: '*/*'
        },
        signal: AbortSignal.timeout(40000)
      });
      const body = await response.text();
      if (!response.ok) throw new Error(`${label} returned ${response.status}: ${body.slice(0, 240)}`);
      const result = await validate(body, response);
      console.log(`${label}: PASS on attempt ${attempt}`);
      return result;
    } catch (error) {
      lastError = error;
      console.warn(`${label}: attempt ${attempt} failed: ${error.message}`);
      if (attempt < 10) await sleep(12000);
    }
  }
  throw lastError;
}

await fetchWithRetry('/yosemite-firefall-live/', async body => {
  assert.match(body, /<h1>Firefall Live<\/h1>/i, 'Firefall hero missing');
  assert.match(body, /Yosemite Firefall Live/i, 'Yosemite title missing');
  assert.match(body, /https:\/\/chrisizworski\.com\/yosemite-firefall-live\//i, 'direct canonical missing');
  return body;
}, 'Yosemite public page');

await fetchWithRetry('/api/yosemite-firefall', async body => {
  const data = JSON.parse(body);
  assert.ok(['preseason', 'season', 'postseason'].includes(data.mode), 'invalid Firefall mode');
  assert.equal(data.seasonYear, 2027, 'unexpected target season');
  assert.ok(Array.isArray(data.days) && data.days.length === 7, 'seven-day outlook missing');
  assert.ok(Array.isArray(data.sources) && data.sources.length >= 4, 'source provenance missing');
  assert.ok(data.methodologyVersion, 'methodology version missing');
  return data;
}, 'Yosemite Firefall API');

await fetchWithRetry('/national-tools/', async body => {
  assert.match(body, /data-tool-id="yosemite-firefall"/i, 'Yosemite directory card missing');
  assert.match(body, /href="https:\/\/chrisizworski\.com\/yosemite-firefall-live\/"/i, 'Yosemite directory link missing');
  assert.match(body, /Yosemite Firefall Live/i, 'Yosemite directory label missing');
  return body;
}, 'National Tools Yosemite card');

console.log('Yosemite Firefall production smoke: PASS');
