/* Local navigation acceptance. AIS outages are deliberate; no simulated live claims. */
const { chromium } = require('playwright');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const assert = require('node:assert/strict');
const root = path.resolve('public');
const output = path.resolve('docs/shipping-growth-2026-11-09');
const server = http.createServer((req, res) => {
  let file = path.resolve(root, '.' + new URL(req.url, 'http://local').pathname);
  if (!file.startsWith(root + path.sep)) return res.writeHead(403).end();
  try {
    if (fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');
    res.setHeader('Content-Type', ({'.html':'text/html','.css':'text/css','.js':'text/javascript','.json':'application/json'})[path.extname(file)] || 'application/octet-stream');
    res.end(fs.readFileSync(file));
  } catch (_) { res.writeHead(404).end(); }
});

(async () => {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = 'http://127.0.0.1:' + server.address().port;
  const browser = await chromium.launch({executablePath:process.env.CHROME_PATH || undefined, headless:true, args:['--no-sandbox','--disable-dev-shm-usage']});
  fs.mkdirSync(output, {recursive:true});
  const results = [];
  try {
    for (const width of [360, 390, 1440]) {
      for (const javaScriptEnabled of [true, false]) {
        const context = await browser.newContext({viewport:{width,height:1000},javaScriptEnabled,reducedMotion:'reduce'});
        await context.route('**/*', route => {
          const u = new URL(route.request().url());
          if (u.pathname.startsWith('/api/')) return route.fulfill({status:503,contentType:'application/json',body:'{}'});
          return u.origin === base ? route.continue() : route.abort();
        });
        const page = await context.newPage();
        if (javaScriptEnabled) await page.addInitScript(() => {
          window.shippingEvents = [];
          window.gtag = (...args) => window.shippingEvents.push(args);
        });
        await page.goto(base + '/great-lakes-freighter-tracking/', {waitUntil:'domcontentloaded'});
        const nav = page.getByRole('navigation', {name:'Local ship-watching tools'});
        await nav.scrollIntoViewIfNeeded();
        assert.equal(await nav.locator('a').count(), 3);
        for (const [tool, heading] of [['duluth-canal-park','Duluth'],['welland-canal','Welland'],['soo-locks','Soo Locks']]) {
          await nav.locator('[data-track-tool="' + tool + '"]').click();
          assert.equal(new URL(page.url()).pathname, '/' + tool + '/');
          assert.match(await page.locator('h1').innerText(), new RegExp(heading));
          await page.goBack({waitUntil:'domcontentloaded'});
        }
        if (javaScriptEnabled) {
          // Cancel just this navigation to inspect the actual delegated GA4 event.
          await nav.locator('a').first().evaluate(a => a.addEventListener('click', e => e.preventDefault(), {once:true}));
          await nav.locator('a').first().click();
          const events = await page.evaluate(() => window.shippingEvents.filter(e => e[1] === 'tool_open'));
          assert.equal(events.length, 1);
          assert.equal(events[0][2].placement, 'tracker-map-watch');
          assert.equal(events[0][2].tool_id, 'soo-locks');
        }
        assert.ok(await nav.evaluate(el => el.getBoundingClientRect().right <= innerWidth), 'handoff fits viewport');
        if (width === 390 && javaScriptEnabled) await nav.screenshot({path:path.join(output,'tracker-handoff-mobile.png')});

        await page.goto(base + '/soo-locks/', {waitUntil:'domcontentloaded'});
        const soo = page.getByRole('navigation', {name:'Follow Great Lakes shipping beyond the Soo'});
        assert.ok(await soo.evaluate(el => document.querySelector('#soo-schedule-answer').compareDocumentPosition(el) & Node.DOCUMENT_POSITION_FOLLOWING));
        for (const target of ['great-lakes-freighter-tracking','great-lakes-winter-freighter-guide','great-lakes-freighter-winter-layup']) {
          await soo.locator('a[href="/' + target + '/"]').click();
          assert.equal(new URL(page.url()).pathname, '/' + target + '/');
          await page.locator('h1').waitFor({state:'visible'});
          await page.goBack({waitUntil:'domcontentloaded'});
        }
        assert.ok(await soo.evaluate(el => el.getBoundingClientRect().right <= innerWidth));
        if (width === 390 && javaScriptEnabled) await soo.screenshot({path:path.join(output,'soo-handoff-mobile.png')});

        await page.goto(base + '/tools/', {waitUntil:'domcontentloaded'});
        const winter = page.locator('[data-placement="season-desk-winter"]');
        assert.equal(await winter.count(), 2);
        assert.equal(await winter.nth(0).getAttribute('href'), '/michigan-snow-totals/');
        assert.equal(await winter.nth(1).getAttribute('href'), '/white-christmas-michigan/');
        await winter.nth(0).click();
        assert.match(await page.locator('h1').innerText(), /Snow/i);
        // White Christmas is a production rewrite to its owning repo, not this static server.
        results.push({width,javaScriptEnabled,ais:'deliberate-503',navigation:'pass',tracking:javaScriptEnabled?'pass':'not-applicable'});
        await context.close();
      }
    }
    fs.writeFileSync(path.join(output,'browser-acceptance.json'), JSON.stringify({checkedAt:new Date().toISOString(),scope:'local static navigation; external scripts blocked; no live AIS/video or ad delivery claims',results},null,2)+'\n');
    console.log('Shipping handoffs: six mobile/desktop and JavaScript/no-JavaScript scenarios passed.');
  } finally { await browser.close(); server.close(); }
})().catch(error => { console.error(error); server.close(); process.exitCode = 1; });
