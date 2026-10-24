/**
 * Runs a garden tool page (inline scripts plus /assets/garden-tools/ scripts) against a small DOM
 * stand-in, so tests and value functions score what a visitor sees after each action.
 * Only the DOM surface the garden tools use is implemented. No dependencies.
 *
 * loadTool(file, { search, today: 'YYYY-MM-DD', width, fetch })   fetch: (url) => ({ status, body })
 */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const VOID = new Set(['input', 'img', 'br', 'hr', 'meta', 'link', 'source', 'area', 'col', 'wbr']);

class Node {
  constructor(tag, attrs = {}, doc = null) {
    this.tagName = String(tag).toUpperCase();
    this.attrs = { ...attrs };
    this.children = [];
    this.parent = null;
    this.listeners = {};
    this.ownerDocument = doc;
    this.hidden = 'hidden' in attrs;
    this._checked = 'checked' in attrs;
    this._value = attrs.value;
    this.style = {};
    const self = this;
    this.classList = {
      contains: c => self.className.split(/\s+/).includes(c),
      add: (...cs) => { for (const c of cs) if (!self.classList.contains(c)) self.className = (self.className + ' ' + c).trim(); },
      remove: (...cs) => { self.className = self.className.split(/\s+/).filter(x => x && !cs.includes(x)).join(' '); },
      toggle: (c, force) => { const on = force === undefined ? !self.classList.contains(c) : !!force; on ? self.classList.add(c) : self.classList.remove(c); return on; }
    };
  }
  get checked() { return this._checked; }
  set checked(v) {
    this._checked = !!v;
    if (v && this.attrs.type === 'radio' && this.ownerDocument) for (const r of this.ownerDocument.all()) if (r !== this && r.attrs.type === 'radio' && r.attrs.name === this.attrs.name) r._checked = false;
  }
  get id() { return this.attrs.id || ''; }
  get className() { return this.attrs.class || ''; }
  set className(v) { this.attrs.class = v; }
  get name() { return this.attrs.name || ''; }
  get type() { return this.attrs.type || ''; }
  get href() { return this.attrs.href || ''; }
  set href(v) { this.attrs.href = String(v); }
  get disabled() { return 'disabled' in this.attrs; }
  set disabled(v) { if (v) this.attrs.disabled = ''; else delete this.attrs.disabled; }
  get dataset() { const d = {}; for (const [k, v] of Object.entries(this.attrs)) if (k.startsWith('data-')) d[k.slice(5).replace(/-(\w)/g, (_, c) => c.toUpperCase())] = v; return d; }
  setAttribute(k, v) { this.attrs[k] = String(v); if (k === 'value') this._value = String(v); if (k === 'hidden') this.hidden = true; }
  getAttribute(k) { return k in this.attrs ? this.attrs[k] : null; }
  hasAttribute(k) { return k in this.attrs; }
  removeAttribute(k) { delete this.attrs[k]; if (k === 'hidden') this.hidden = false; }
  append(...kids) { for (const k of kids) { if (k === null || k === undefined) continue; const n = k instanceof Node || k instanceof Text ? k : new Text(String(k)); if (n.parent) n.parent.children = n.parent.children.filter(x => x !== n); n.parent = this; if (n instanceof Node && !n.ownerDocument) n.ownerDocument = this.ownerDocument; this.children.push(n); } }
  appendChild(k) { this.append(k); return k; }
  replaceChildren(...kids) { for (const c of this.children) c.parent = null; this.children = []; this.append(...kids); }
  remove() { if (this.parent) this.parent.children = this.parent.children.filter(x => x !== this); this.parent = null; }
  get textContent() { return this.children.map(c => c.textContent).join(''); }
  set textContent(v) { this.children = []; if (v !== '' && v !== null && v !== undefined) this.append(String(v)); }
  get innerText() { return this.textContent; }
  set innerHTML(v) { this.children = []; if (v) this.append(String(v).replace(/<[^>]+>/g, '')); }
  get innerHTML() { return this.textContent; }
  descendants() { const out = []; for (const c of this.children) if (c instanceof Node) { out.push(c, ...c.descendants()); } return out; }
  querySelectorAll(sel) { return select(this.descendants(), sel); }
  querySelector(sel) { return this.querySelectorAll(sel)[0] || null; }
  closest(sel) { let n = this; while (n) { if (n instanceof Node && matches(n, sel)) return n; n = n.parent; } return null; }
  get options() { return this.descendants().filter(n => n.tagName === 'OPTION'); }
  get selectedOptions() { return this.options.filter(o => o.value === this.value); }
  get selectedIndex() { return this.options.findIndex(o => o.value === this.value); }
  get value() {
    if (this.tagName === 'OPTION') return this._value !== undefined ? this._value : this.textContent;
    if (this.tagName === 'SELECT') { const o = this.options; if (this._value !== undefined && o.some(x => x.value === this._value)) return this._value; const sel = o.find(x => 'selected' in x.attrs); return sel ? sel.value : o.length ? o[0].value : ''; }
    return this._value === undefined ? '' : this._value;
  }
  set value(v) { this._value = String(v); }
  get valueAsNumber() { return this.value === '' ? NaN : Number(this.value); }
  addEventListener(type, fn) { (this.listeners[type] ||= []).push(fn); }
  removeEventListener(type, fn) { this.listeners[type] = (this.listeners[type] || []).filter(f => f !== fn); }
  dispatch(type, extra = {}) { const e = { type, target: this, currentTarget: this, preventDefault() {}, stopPropagation() {}, key: '', ...extra }; let n = this; while (n) { for (const fn of (n.listeners && n.listeners[type]) || []) fn.call(n, e); n = n.parent; } }
  dispatchEvent(e) { this.dispatch(e.type); return true; }
  click() { this.dispatch('click'); }
  getBoundingClientRect() { const w = this.ownerDocument ? this.ownerDocument.width : 0; return { left: 0, top: 0, width: w, height: 0, right: w, bottom: 0 }; }
  get offsetWidth() { return 0; } get offsetHeight() { return 0; }
  focus() { if (this.ownerDocument) this.ownerDocument.focused = this; } select() {} blur() {}
  scrollIntoView() { if (this.ownerDocument) this.ownerDocument.lastScroll = this.id; }
}
class Text { constructor(t) { this.text = t; this.parent = null; } get textContent() { return this.text; } }

function parseAttrs(src) {
  const attrs = {};
  for (const m of src.matchAll(/([\w:-]+)(?:\s*=\s*("([^"]*)"|'([^']*)'|[^\s>]+))?/g)) attrs[m[1]] = (m[3] ?? m[4] ?? (m[2] === undefined ? '' : m[2])).replace(/&amp;/g, '&').replace(/&quot;/g, '"');
  return attrs;
}
const decode = t => t.replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&#x2197;/g, '↗').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&#39;/g, "'").replace(/&quot;/g, '"');

// Simple selectors only: tag, #id, .class, [attr], [attr="v"], :checked, comma lists.
function matches(n, sel) {
  return sel.split(',').some(part => {
    const s = part.trim(); const m = s.match(/^([a-zA-Z][\w-]*)?((?:#[\w-]+|\.[\w-]+|\[[^\]]+\]|:checked)*)$/);
    if (!m) return false;
    if (m[1] && n.tagName !== m[1].toUpperCase()) return false;
    for (const t of m[2].match(/#[\w-]+|\.[\w-]+|\[[^\]]+\]|:checked/g) || []) {
      if (t[0] === '#' && n.id !== t.slice(1)) return false;
      if (t[0] === '.' && !n.classList.contains(t.slice(1))) return false;
      if (t === ':checked' && !n.checked) return false;
      if (t[0] === '[') { const a = t.slice(1, -1).match(/^([\w-]+)(?:([~^$*]?=)"?([^"]*)"?)?$/); if (!a) return false; const v = n.attrs[a[1]]; if (v === undefined) return false; if (a[2] === '=' && v !== a[3]) return false; if (a[2] === '~=' && !v.split(/\s+/).includes(a[3])) return false; }
    }
    return true;
  });
}
function select(list, sel) {
  const parts = sel.trim().split(/\s+(?![^\[]*\])/);
  if (parts.length === 1) return list.filter(n => matches(n, sel));
  // descendant combinator: last part matches, and some ancestor matches each earlier part in order
  return list.filter(n => { if (!matches(n, parts.at(-1))) return false; let i = parts.length - 2, a = n.parent; while (a && i >= 0) { if (a instanceof Node && matches(a, parts[i])) i--; a = a.parent; } return i < 0; });
}

/** Parse the body into a real tree so static markup and script-built nodes live together. */
function buildTree(html, doc) {
  const body = new Node('body', {}, doc);
  let cur = body;
  const src = html.slice(html.indexOf('<body')).replace(/^<body[^>]*>/, '');
  const re = /<!--[\s\S]*?-->|<(script|style)\b[^>]*>[\s\S]*?<\/\1>|<\/(\w+)\s*>|<(\w+)((?:\s[^>]*?)?)(\/?)>|([^<]+)/g;
  for (const m of src.matchAll(re)) {
    if (m[1] || m[0].startsWith('<!--')) continue;
    if (m[2]) { const t = m[2].toUpperCase(); let n = cur; while (n && n.tagName !== t) n = n.parent; if (n && n.parent) cur = n.parent; continue; }
    if (m[3]) { const tag = m[3].toLowerCase(); const el = new Node(tag, parseAttrs(m[4] || ''), doc); cur.append(el); if (!m[5] && !VOID.has(tag)) cur = el; continue; }
    if (m[6] && m[6].trim()) cur.append(decode(m[6]));
  }
  return body;
}

/* A thenable that settles at once, so fetch stubs keep the harness synchronous: page code that chains
 * .then() and .catch() runs to completion before the next harness call. (No Promise.all or await.) */
function settled(ok, value) {
  const t = {
    then(onOk, onErr) {
      try {
        const f = ok ? onOk : onErr; if (!f) return t;
        const r = f(value); return r && typeof r.then === 'function' ? r : settled(true, r);
      } catch (e) { return settled(false, e); }
    },
    catch(onErr) { return t.then(null, onErr); },
    finally(fn) { try { fn(); } catch (e) { /* ignore */ } return t; }
  };
  return t;
}
/* fetchStub(url) returns { status, body } (body is parsed JSON) or throws to simulate a network error. */
function makeFetch(fetchStub, calls) {
  return (url, init) => {
    calls.push(String(url));
    try { const r = fetchStub(String(url), init); return settled(true, { ok: r.status < 400, status: r.status, json: () => settled(true, r.body) }); }
    catch (e) { return settled(false, e); }
  };
}

export function loadTool(file, { search = '', today = '2026-04-20', width = 760, root = path.resolve(path.dirname(file), '..', '..'), fetch: fetchStub = null } = {}) {
  const html = fs.readFileSync(file, 'utf8');
  const doc = { width, lastScroll: null, focused: null, downloads: [], replaced: [], fetched: [], all: () => body.descendants() };
  const body = buildTree(html, doc);
  const route = '/' + path.basename(path.dirname(file)) + '/';
  const document = {
    body,
    getElementById: id => body.descendants().find(n => n.id === id) || null,
    createElement: tag => new Node(tag, {}, doc),
    createElementNS: (_ns, tag) => new Node(tag, {}, doc),
    createTextNode: t => new Text(t),
    querySelectorAll: sel => body.querySelectorAll(sel),
    querySelector: sel => body.querySelector(sel),
    addEventListener() {},
    documentElement: { scrollWidth: width }
  };
  const [y, mo, d] = today.split('-').map(Number);
  const RealDate = Date;
  class FixedDate extends RealDate { constructor(...a) { if (a.length) super(...a); else super(y, mo - 1, d, 12); } static now() { return new RealDate(y, mo - 1, d, 12).getTime(); } }
  const location = { href: 'https://chrisizworski.com' + route + search, search, hash: '', pathname: route, origin: 'https://chrisizworski.com' };
  const Blob = class extends globalThis.Blob { constructor(parts, o) { super(parts, o); doc.downloads.push(parts.join('')); } };
  const ctx = vm.createContext({ document, location, navigator: {}, URL, URLSearchParams, Blob, Date: FixedDate, Math, JSON, Intl, setTimeout: fn => { fn(); return 0; }, clearTimeout() {}, console, history: { replaceState: (_s, _t, u) => doc.replaced.push(String(u)) }, print() { doc.printed = true; }, isSecureContext: false });
  if (fetchStub) ctx.fetch = makeFetch(fetchStub, doc.fetched);
  ctx.window = ctx; ctx.innerWidth = width; ctx.addEventListener = () => {}; ctx.matchMedia = () => ({ matches: false, addEventListener() {} });
  // Scripts in document order: local garden-tool assets and inline code. Analytics and ad loaders are skipped.
  for (const m of html.matchAll(/<script(\s[^>]*)?>([\s\S]*?)<\/script>/g)) {
    const attrs = parseAttrs(m[1] || '');
    if (attrs.type && attrs.type !== 'text/javascript' && attrs.type !== 'module') continue;
    if (attrs.src) { if (!/^\/assets\/garden-tools\//.test(attrs.src)) continue; vm.runInContext(fs.readFileSync(path.join(root, 'public', attrs.src.split('?')[0]), 'utf8'), ctx, { filename: attrs.src, timeout: 4000 }); continue; }
    if (/googlesyndication|adsbygoogle|_vercel|window\.va/.test(m[2])) continue;
    vm.runInContext(m[2], ctx, { filename: route, timeout: 4000 });
  }
  const $ = id => document.getElementById(id);
  const text = id => ($(id) ? $(id).textContent.replace(/\s+/g, ' ').trim() : '');
  const api = {
    ctx, doc, document, $, text, html,
    set(id, value, ev = 'change') { const n = $(id); n.value = value; n.dispatch(ev); },
    choose(name, value) { const r = body.querySelectorAll('input[name="' + name + '"]'); for (const x of r) x.checked = x.attrs.value === value; r.find(x => x.attrs.value === value).dispatch('change'); },
    click(id) { $(id).dispatch('click'); },
    texts: sel => body.querySelectorAll(sel).map(n => n.textContent.replace(/\s+/g, ' ').trim()),
    svgText: id => $(id).descendants().filter(n => n.tagName === 'TEXT' || n.tagName === 'TSPAN').map(n => n.textContent).join(' | '),
    visible(id) { let n = $(id); while (n) { if (n.hidden || (n.classList && n.classList.contains('gk-hidden'))) return false; n = n.parent; } return true; }
  };
  return api;
}
