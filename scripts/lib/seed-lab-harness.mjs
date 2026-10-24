/**
 * Runs the Seed Saving Lab page scripts against a tiny DOM stand-in so tests and the usability
 * benchmark can check behaviour (what a visitor sees after each action), not source strings.
 * Only the DOM surface the page uses is implemented. No dependencies.
 */
import fs from 'node:fs';
import vm from 'node:vm';

class Node {
  constructor(tag, attrs = {}) {
    this.tagName = String(tag).toUpperCase();
    this.attrs = { ...attrs };
    this.children = [];
    this.parent = null;
    this.listeners = {};
    this.hidden = 'hidden' in attrs;
    this._checked = 'checked' in attrs;
    this._value = attrs.value;
    const self = this;
    this.classList = {
      contains: c => self.className.split(/\s+/).includes(c),
      add: c => { if (!self.classList.contains(c)) self.className = (self.className + ' ' + c).trim(); },
      remove: c => { self.className = self.className.split(/\s+/).filter(x => x && x !== c).join(' '); },
      toggle: (c, force) => { const on = force === undefined ? !self.classList.contains(c) : !!force; on ? self.classList.add(c) : self.classList.remove(c); return on; }
    };
  }
  get checked() { return this._checked; }
  set checked(v) {
    this._checked = !!v;
    // like a browser: checking one radio unchecks the rest of its group
    if (v && this.attrs.type === 'radio' && this.ownerDocument) for (const r of this.ownerDocument.radios) if (r !== this && r.attrs.name === this.attrs.name) r._checked = false;
  }
  get id() { return this.attrs.id || ''; }
  get className() { return this.attrs.class || ''; }
  set className(v) { this.attrs.class = v; }
  get dataset() { const d = {}; for (const [k, v] of Object.entries(this.attrs)) if (k.startsWith('data-')) d[k.slice(5).replace(/-(\w)/g, (_, c) => c.toUpperCase())] = v; return d; }
  setAttribute(k, v) { this.attrs[k] = String(v); if (k === 'value') this._value = String(v); if (k === 'hidden') this.hidden = true; }
  getAttribute(k) { return k in this.attrs ? this.attrs[k] : null; }
  removeAttribute(k) { delete this.attrs[k]; }
  append(...kids) { for (const k of kids) { if (k === null || k === undefined) continue; const n = typeof k === 'object' && k instanceof Node ? k : new Text(String(k)); n.parent = this; this.children.push(n); } }
  replaceChildren(...kids) { this.children = []; this.append(...kids); }
  remove() { if (this.parent) this.parent.children = this.parent.children.filter(x => x !== this); }
  get textContent() { return this.children.map(c => c.textContent).join(''); }
  set textContent(v) { this.children = []; if (v !== '' && v !== null && v !== undefined) this.append(String(v)); }
  get innerHTML() { return this.textContent; }
  descendants() { const out = []; for (const c of this.children) if (c instanceof Element) { out.push(c, ...c.descendants()); } return out; }
  get options() { return this.descendants().filter(n => n.tagName === 'OPTION'); }
  get selectedOptions() { return this.options.filter(o => o.value === this.value); }
  get value() {
    if (this.tagName === 'OPTION') return this._value !== undefined ? this._value : this.textContent;
    if (this.tagName === 'SELECT') { const o = this.options; if (this._value !== undefined && o.some(x => x.value === this._value)) return this._value; return o.length ? o[0].value : ''; }
    return this._value === undefined ? '' : this._value;
  }
  set value(v) { this._value = String(v); }
  addEventListener(type, fn) { (this.listeners[type] ||= []).push(fn); }
  dispatch(type) { for (const fn of this.listeners[type] || []) fn({ target: this, preventDefault() {}, key: '' }); }
  dispatchEvent(e) { this.dispatch(e.type); return true; }
  click() { this.dispatch('click'); }
  focus() {} select() {} blur() {} scrollIntoView() { this.ownerDocument && (this.ownerDocument.lastScroll = this.id); }
}
class Element extends Node {}
class Text { constructor(t) { this.text = t; this.parent = null; } get textContent() { return this.text; } }

function parseAttrs(src) {
  const attrs = {};
  for (const m of src.matchAll(/([\w:-]+)(?:\s*=\s*("([^"]*)"|'([^']*)'|[^\s>]+))?/g)) attrs[m[1]] = m[3] ?? m[4] ?? (m[2] === undefined ? '' : m[2]);
  return attrs;
}

/** Load the page and return helpers. `search` simulates a query string. */
export function loadSeedLab(file, { search = '' } = {}) {
  const html = fs.readFileSync(file, 'utf8');
  const doc = { byId: new Map(), radios: [], examples: [], lastScroll: null };
  const body = html.slice(html.indexOf('<body'));
  for (const m of body.matchAll(/<(\w+)(\s[^>]*)?>/g)) {
    const tag = m[1]; if (tag === 'script' || tag === 'style') continue;
    const attrs = parseAttrs(m[2] || '');
    if (!attrs.id && !(tag === 'input' && attrs.type === 'radio') && !('data-example' in attrs)) continue;
    const el = new Element(tag, attrs); el.ownerDocument = doc;
    if (attrs.id) doc.byId.set(attrs.id, el);
    if (tag === 'input' && attrs.type === 'radio') doc.radios.push(el);
    if ('data-example' in attrs) doc.examples.push(el);
  }
  // radio label text, so tests can tap by visible label
  for (const m of body.matchAll(/<input type="radio" name="(\w+)" value="([^"]+)"[^>]*><span>([^<]+)<\/span>/g)) {
    const r = doc.radios.find(x => x.attrs.name === m[1] && x.attrs.value === m[2]); if (r) r.label = m[3];
  }
  const radioSel = /^input\[name="(\w+)"\](?:\[value="([^"]+)"\])?(:checked)?$/;
  const document = {
    getElementById: id => doc.byId.get(id) || null,
    createElement: tag => { const e = new Element(tag); e.ownerDocument = doc; return e; },
    querySelector(sel) { return this.querySelectorAll(sel)[0] || null; },
    querySelectorAll(sel) {
      if (sel === '#compare-form input[type=radio]') return doc.radios;
      if (sel === '[data-example]') return doc.examples;
      const m = sel.match(radioSel);
      if (m) return doc.radios.filter(r => r.attrs.name === m[1] && (!m[2] || r.attrs.value === m[2]) && (!m[3] || r.checked));
      throw new Error('mini DOM does not support selector ' + sel);
    },
    body: new Element('body')
  };
  const location = { href: 'https://chrisizworski.com/seed-saving-lab/' + search, search, hash: '', pathname: '/seed-saving-lab/', origin: 'https://chrisizworski.com' };
  const ctx = vm.createContext({ document, location, navigator: {}, URL, URLSearchParams, Blob: class {}, setTimeout: fn => { fn(); return 0; }, clearTimeout() {}, console });
  ctx.window = ctx;
  const scripts = html.split('<script>').slice(1).map(x => x.split('</script>')[0]);
  for (const src of scripts) vm.runInContext(src, ctx, { timeout: 2000 });
  const $ = id => doc.byId.get(id);
  const text = id => $(id).textContent.replace(/\s+/g, ' ').trim();
  const api = {
    ctx, $, text, doc,
    data: ctx.SeedLabData, engine: ctx.SeedLabEngine,
    plantId: name => ctx.SeedLabData.plants.find(p => p.name === name).id,
    pick(which, name) { const s = $(which === 'a' ? 'plant-a' : 'plant-b'); s.value = api.plantId(name); s.dispatch('change'); },
    choose(name, value) { for (const r of doc.radios.filter(x => x.attrs.name === name)) r.checked = r.attrs.value === value; doc.radios.find(x => x.attrs.name === name && x.attrs.value === value).dispatch('change'); },
    type(id, value) { $(id).value = value; $(id).dispatch('input'); },
    click(id) { $(id).dispatch('click'); },
    example(key) { doc.examples.find(x => x.attrs['data-example'] === key).dispatch('click'); },
    answer: () => ({ badge: text('status-label'), heading: text('result-heading'), why: text('result-detail'), options: $('result-options').children.filter(c => c instanceof Element).map(c => c.textContent), also: $('result-steps').children.filter(c => c instanceof Element).map(c => c.textContent), cls: $('results').className, live: text('live-verdict') }),
    garden: () => {
      const groups = $('garden-results').children.filter(c => c instanceof Element);
      return groups.map(g => ({ cls: g.className, text: g.textContent.replace(/\s+/g, ' ').trim(), buttons: g.descendants().filter(n => n.tagName === 'BUTTON') }));
    },
    gardenPlants: () => $('garden-plants').children.filter(c => c instanceof Element).map(li => ({ name: li.children[0].textContent, remove: li.children[1] }))
  };
  return api;
}
