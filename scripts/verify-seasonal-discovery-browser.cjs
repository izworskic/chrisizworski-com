/* Isolated CI acceptance: shipped HTML + JS; no production services needed. */
const { chromium } = require('playwright');
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');

(async () => {
  const root = path.resolve('public');
  const out = path.resolve('artifacts/seasonal-discovery');
  fs.mkdirSync(out, { recursive: true });
  const server = http.createServer((req, res) => {
    let file = path.resolve(root, '.' + decodeURIComponent(new URL(req.url, 'http://local').pathname));
    if (!file.startsWith(root + path.sep)) { res.writeHead(403).end(); return; }
    if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');
    if (!fs.existsSync(file)) { res.writeHead(404).end(); return; }
    res.setHeader('Content-Type', file.endsWith('.js') ? 'text/javascript' : file.endsWith('.css') ? 'text/css' : file.endsWith('.html') ? 'text/html' : 'application/octet-stream');
    res.end(fs.readFileSync(file));
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = 'http://127.0.0.1:' + server.address().port;
  const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || undefined, args: ['--no-sandbox'] });
  const report = { generatedAt: new Date().toISOString(), scenarios: [] };
  try {
    for (const width of [360, 390, 768, 1440]) {
      const context = await browser.newContext({ viewport: { width, height: 1000 }, timezoneId: 'America/Detroit', reducedMotion: 'reduce' });
      await context.route('**/*', route => route.request().url().startsWith(base) ? route.continue() : route.abort());
      const page = await context.newPage();
      for (const surface of ['tools', 'guides']) {
        await page.goto(base + '/' + surface + '/', { waitUntil: 'domcontentloaded' });
        const desk = page.locator('[data-seasonal-discovery]');
        await page.locator('[data-season-id]').first().waitFor();
        const selector = page.locator('[data-season-month]');
        assert.equal(await desk.locator('[data-season-id]').count(), 6);
        const currentMonth = await selector.inputValue();
        const initial = await desk.innerText();
        await selector.selectOption('1');
        const january = await desk.locator('[data-season-picks]').innerText();
        await selector.selectOption('7');
        const july = await desk.locator('[data-season-picks]').innerText();
        assert.notEqual(july, january);
        assert.match(july, /garden|shore|river|island/i);
        await selector.selectOption('1');
        assert.equal(await desk.locator('[data-season-picks]').innerText(), january);
        await selector.selectOption(currentMonth === '7' ? '1' : '7');
        await page.getByRole('button', { name: 'Back to this month' }).click();
        assert.equal(await selector.inputValue(), currentMonth);
        assert.equal(await desk.innerText(), initial);
        assert.equal(await selector.evaluate(el => document.activeElement === el), true);
        const sizes = await desk.evaluate(el => ({
          overflow: el.scrollWidth > el.clientWidth,
          textSize: parseFloat(getComputedStyle(el.querySelector('.season-pick > p:last-child')).fontSize),
          top: el.getBoundingClientRect().top + scrollY,
          controlHeight: el.querySelector('select').getBoundingClientRect().height
        }));
        assert.equal(sizes.overflow, false);
        assert.ok(sizes.textSize >= 14);
        assert.ok(sizes.controlHeight >= 44);
        await selector.selectOption('7');
        await desk.screenshot({ path: path.join(out, surface + '-' + width + '-july.png') });
        await selector.selectOption(currentMonth);
        await page.screenshot({ path: path.join(out, surface + '-' + width + '-top.png') });
        report.scenarios.push({ surface, width, initialMonth: currentMonth, status: 'PASS', ...sizes });
      }
      await context.close();
    }
    for (const surface of ['tools', 'guides']) {
      for (const failure of ['no-js', 'no-data']) {
        const context = await browser.newContext({ javaScriptEnabled: failure !== 'no-js', viewport: { width: 390, height: 1000 } });
        await context.route('**/*', route => {
          const url = route.request().url();
          return !url.startsWith(base) || (failure === 'no-data' && url.includes('seasonal-discovery-data.js')) ? route.abort() : route.continue();
        });
        const page = await context.newPage();
        await page.goto(base + '/' + surface + '/', { waitUntil: 'load' });
        const desk = page.locator('[data-seasonal-discovery]');
        assert.equal(await desk.locator('.season-pick').count(), 4);
        assert.equal(await page.locator('[data-season-controls]').isVisible(), false);
        assert.ok(await desk.getByRole('link').count() >= 4);
        await desk.screenshot({ path: path.join(out, surface + '-' + failure + '.png') });
        report.scenarios.push({ surface, failure, status: 'PASS' });
        await context.close();
      }
    }
    fs.writeFileSync(path.join(out, 'report.json'), JSON.stringify(report, null, 2));
    console.log(JSON.stringify(report, null, 2));
  } finally {
    await browser.close();
    await new Promise(resolve => server.close(resolve));
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
