import { execFileSync, spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const BASE = String(process.env.CBBT_BASE_URL || 'https://chrisizworski.com').replace(/\/$/, '');
const PAGE_URL = `${BASE}/chesapeake-bay-bridge-tunnel/`;
const PORT = Number(process.env.CBBT_BROWSER_DEBUG_PORT || 9227);
const TIMEOUT_MS = Number(process.env.CBBT_BROWSER_TIMEOUT_MS || 45_000);

function findChrome() {
  const candidates = [
    process.env.CHROME_BIN,
    'google-chrome',
    'google-chrome-stable',
    'chromium',
    'chromium-browser',
  ].filter(Boolean);

  for (const candidate of candidates) {
    try {
      if (candidate.includes('/')) {
        if (fs.existsSync(candidate)) return candidate;
      } else {
        const resolved = execFileSync('which', [candidate], { encoding: 'utf8' }).trim();
        if (resolved) return resolved;
      }
    } catch (_error) {
      // Try the next installed browser.
    }
  }
  throw new Error('Chrome/Chromium is not installed on this runner');
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function waitForTarget() {
  const deadline = Date.now() + 15_000;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`http://127.0.0.1:${PORT}/json/list`);
      if (response.ok) {
        const targets = await response.json();
        const page = targets.find((target) => target.type === 'page' && target.webSocketDebuggerUrl);
        if (page) return page;
      }
    } catch (_error) {
      // Chrome is still starting.
    }
    await sleep(150);
  }
  throw new Error('Chrome DevTools endpoint did not become ready');
}

async function connectCdp(target) {
  const socket = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    socket.addEventListener('open', resolve, { once: true });
    socket.addEventListener('error', reject, { once: true });
  });

  let nextId = 0;
  const pending = new Map();
  const events = [];
  const requests = new Map();

  socket.addEventListener('message', (event) => {
    const message = JSON.parse(String(event.data));
    if (message.id && pending.has(message.id)) {
      const waiter = pending.get(message.id);
      pending.delete(message.id);
      if (message.error) waiter.reject(new Error(JSON.stringify(message.error)));
      else waiter.resolve(message.result);
      return;
    }

    if (message.method === 'Network.requestWillBeSent') {
      requests.set(message.params.requestId, message.params.request?.url || '');
    }
    if (message.method === 'Network.responseReceived') {
      const url = message.params.response?.url || requests.get(message.params.requestId) || '';
      if (/cbbt-media\?asset=radar|radar\.weather\.gov\/ridge\/standard\/KAKQ/i.test(url)) {
        events.push({
          type: 'response',
          url,
          status: message.params.response?.status,
          mimeType: message.params.response?.mimeType,
          fromDiskCache: Boolean(message.params.response?.fromDiskCache),
          fromServiceWorker: Boolean(message.params.response?.fromServiceWorker),
        });
      }
    }
    if (message.method === 'Network.loadingFailed') {
      const url = requests.get(message.params.requestId) || '';
      if (/cbbt-media\?asset=radar|radar\.weather\.gov\/ridge\/standard\/KAKQ/i.test(url)) {
        events.push({
          type: 'failed',
          url,
          errorText: message.params.errorText,
          blockedReason: message.params.blockedReason || null,
          corsErrorStatus: message.params.corsErrorStatus || null,
        });
      }
    }
  });

  function send(method, params = {}) {
    return new Promise((resolve, reject) => {
      const id = ++nextId;
      pending.set(id, { resolve, reject });
      socket.send(JSON.stringify({ id, method, params }));
    });
  }

  return { socket, send, events };
}

function radarExpression() {
  return `(() => {
    const image = document.getElementById('radarImage');
    const fallback = document.getElementById('radarFallback');
    return {
      pageUrl: location.href,
      readyState: document.readyState,
      imagePresent: Boolean(image),
      complete: Boolean(image && image.complete),
      naturalWidth: image ? image.naturalWidth : 0,
      naturalHeight: image ? image.naturalHeight : 0,
      currentSrc: image ? image.currentSrc || image.src : '',
      imageHidden: image ? image.hidden : null,
      fallbackPresent: Boolean(fallback),
      fallbackHidden: fallback ? fallback.hidden : null,
      fallbackDisplay: fallback ? getComputedStyle(fallback).display : null,
      fallbackText: fallback ? fallback.textContent.trim() : ''
    };
  })()`;
}

const chrome = findChrome();
const profileDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cbbt-browser-smoke-'));
const chromeLog = [];
const browser = spawn(
  chrome,
  [
    '--headless=new',
    '--no-sandbox',
    '--disable-dev-shm-usage',
    '--disable-gpu',
    '--disable-background-networking',
    '--disable-default-apps',
    '--disable-extensions',
    '--no-first-run',
    `--remote-debugging-port=${PORT}`,
    `--user-data-dir=${profileDir}`,
    'about:blank',
  ],
  { stdio: ['ignore', 'ignore', 'pipe'] },
);

browser.stderr?.on('data', (chunk) => {
  if (chromeLog.length < 40) chromeLog.push(String(chunk).trim());
});

let cdp;
try {
  const target = await waitForTarget();
  cdp = await connectCdp(target);
  await cdp.send('Page.enable');
  await cdp.send('Runtime.enable');
  await cdp.send('Network.enable');
  await cdp.send('Page.navigate', { url: PAGE_URL });

  const deadline = Date.now() + TIMEOUT_MS;
  let state = null;
  while (Date.now() < deadline) {
    const result = await cdp.send('Runtime.evaluate', {
      expression: radarExpression(),
      returnByValue: true,
      awaitPromise: true,
    });
    state = result?.result?.value || null;

    if (
      state?.readyState === 'complete' &&
      state?.imagePresent &&
      state?.complete &&
      state?.naturalWidth > 0 &&
      state?.naturalHeight > 0 &&
      state?.imageHidden === false &&
      state?.fallbackPresent &&
      state?.fallbackHidden === true &&
      state?.fallbackDisplay === 'none'
    ) {
      console.log(
        `CBBT browser radar PASS | ${state.naturalWidth}x${state.naturalHeight} | src=${state.currentSrc}`,
      );
      if (cdp.events.length) console.log(`CBBT browser radar network | ${JSON.stringify(cdp.events)}`);
      process.exitCode = 0;
      break;
    }

    await sleep(500);
  }

  if (process.exitCode !== 0) {
    console.error(`CBBT browser radar FAIL | state=${JSON.stringify(state)} | network=${JSON.stringify(cdp.events)}`);
    if (chromeLog.length) console.error(`Chrome stderr: ${chromeLog.join(' | ')}`);
    process.exitCode = 1;
  }
} finally {
  try {
    cdp?.socket?.close();
  } catch (_error) {
    // Ignore cleanup errors.
  }
  try {
    browser.kill('SIGTERM');
  } catch (_error) {
    // Ignore cleanup errors.
  }
  fs.rmSync(profileDir, { recursive: true, force: true });
}
