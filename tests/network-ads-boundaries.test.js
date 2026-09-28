const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

// Exercise the unmodified generated script through its load/observer lifecycle.
function scenario({ grid = false, cardParent = false, optout = false } = {}) {
  const inserted = [], observed = [];
  const plain = { display: 'block', borderTopLeftRadius: '0px', backgroundColor: 'transparent', boxShadow: 'none' };
  const body = { tagName: 'BODY' };
  const parent = {
    tagName: 'MAIN', parentElement: body, children: [],
    closest: () => cardParent ? parent : null,
    getBoundingClientRect: () => ({ width: 900 }),
    insertBefore: (ad, block) => { ad.getBoundingClientRect = block.getBoundingClientRect; inserted.push({ ad, block }); },
    style: { ...plain, display: grid ? 'grid' : 'block' },
  };
  const sections = [300, 1800, 2000, 3000, 4300, 5600].map(y => ({
    tagName: 'SECTION', parentElement: parent, previousElementSibling: {}, isConnected: true,
    hasAttribute: name => optout && name === 'data-no-ads',
    closest: () => null,
    getBoundingClientRect: () => ({ top: y, width: 900 }),
    style: { ...plain, borderTopLeftRadius: '10px', backgroundColor: 'white' },
  }));
  parent.children = sections;
  const context = {
    location: { hostname: 'picturedrocks.chrisizworski.com', pathname: '/' },
    innerHeight: 800, scrollY: 0,
    getComputedStyle: el => el.style || plain,
    setTimeout: fn => fn(),
    document: {
      currentScript: { dataset: {} }, readyState: 'complete', body,
      documentElement: { clientWidth: 1000, scrollHeight: 7000 },
      head: { appendChild() {} },
      createElement: () => ({ setAttribute() {} }),
      querySelector: () => null,
      querySelectorAll: selector => selector === 'section' ? sections : [],
    },
    IntersectionObserver: class {
      constructor(callback) { this.callback = callback; }
      observe(target) { observed.push(target); this.callback([{ target, isIntersecting: true }]); }
      unobserve() {}
      disconnect() {}
    },
  };
  context.window = { IntersectionObserver: context.IntersectionObserver };
  vm.runInNewContext(fs.readFileSync('public/assets/network-ads-v1.js', 'utf8').replace('"enabled":false', '"enabled":true'), context);
  return { inserted, observed, context, parent };
}
test('whole section cards can be preceded by ads, with spacing and count limits', () => {
  const { inserted, context, parent } = scenario();
  assert.equal(inserted.length, 3);
  assert.deepEqual(inserted.map(x => x.block.getBoundingClientRect().top), [1800, 3000, 4300]);
  assert.ok(inserted.every(x => x.block.parentElement === parent));
  assert.equal(context.window.adsbygoogle.length, 3);
});
test('grid parents, card ancestors and explicit no-ads blocks never receive units', () => {
  for (const options of [{ grid: true }, { cardParent: true }, { optout: true }]) {
    assert.equal(scenario(options).inserted.length, 0);
  }
});
