'use strict';
/* Source-locked Rust/WebAssembly adapter for the U.P. waterfall decision desk.
 * Rust decides publication eligibility, seasonal caution, time-budget filtering
 * and ranking. The guide/source text and fall-feature map remain HTML/JS.
 * Fail closed on source-policy divergence; run the original verified JS planner.
 * Neither path declares a waterfall open today or supplies a parking route.
 */
(function (root) {
  if (!root || root.UPWaterfallsRust) return;
  let active = null;
  let promise = null;
  const statuses = Object.freeze({verify:0,seasonal:1,restricted:2,closed:3,research:4});
  const bits = Object.freeze({gabbro:1,scott:2,houghton:4,mex:8,bond:16,mdot:32,porkies:64,blackRiver:128});

  function flags(c) {
    const id = c.dataset.id;
    let mask = 0;
    if (id === 'gabbro-falls') mask |= bits.gabbro;
    if (id === 'scott-falls') mask |= bits.scott;
    if (id === 'houghton-douglass-falls') mask |= bits.houghton;
    if (id === 'mex-i-min-e-falls') mask |= bits.mex;
    if (id === 'bond-falls') mask |= bits.bond;
    if (['fumee-falls','agate-falls','tioga-park-falls'].includes(id)) mask |= bits.mdot;
    const isPorkies = (c.dataset.place || '').toLowerCase().includes('porcupine') ||
      /porkies|south boundary|pinkerton/i.test((c.dataset.arrivalParking || '') + ' ' + (c.dataset.arrivalTrail || ''));
    if (isPorkies) mask |= bits.porkies;
    if (['potawatomi-falls','gorge-falls','sandstone-falls','rainbow-falls','great-conglomerate-falls'].includes(id)) mask |= bits.blackRiver;
    return mask;
  }
  async function load(cards, legacyGuidance, officialSource, duration) {
    if (promise) return promise;
    promise = (async () => {
      if (!Array.isArray(cards) || cards.length !== 80 ||
        typeof legacyGuidance !== 'function' ||
        typeof officialSource !== 'function' ||
        typeof duration !== 'function' ||
        typeof WebAssembly === 'undefined' || typeof atob !== 'function') return null;
      const response = await fetch('/assets/up-waterfalls-visitability.wasm.b64', {
        credentials:'same-origin', signal:AbortSignal.timeout(7000)
      });
      if (!response.ok) throw new Error('Waterfall WASM missing');
      const source = (await response.text()).trim();
      if (source.length < 150 || source.length > 50000 || !/^[A-Za-z0-9+/]+=*$/.test(source)) {
        throw new Error('Waterfall WASM invalid');
      }
      const bytes = Uint8Array.from(atob(source),c=>c.charCodeAt(0));
      if (bytes[0] !== 0 || bytes[1] !== 97 || bytes[2] !== 115 || bytes[3] !== 109) {
        throw new Error('Not a WebAssembly binary');
      }
      const {instance} = await WebAssembly.instantiate(bytes, {});
      const e = instance.exports;
      if (e.wf_version?.() !== 2 ||
        !['wf_policy','wf_budget_allows','wf_compare'].every(name => typeof e[name] === 'function')) {
        throw new Error('Unknown Rust waterfall policy ABI');
      }
      const policy = (c,when) => {
        const status = statuses[c.dataset.status];
        const month = when.getMonth() + 1;
        const p = e.wf_policy(status === undefined ? 99 : status,
          c.dataset.arrivalVerified === 'verified' ? 1 : 0, flags(c), month);
        return {excluded:p === 0, level:p === 2 ? 'extra-check' : p === 1 ? 'check' : 'unverified'};
      };
      // The JS planner is the separately reviewed comparison oracle.
      // All dates and all eighty waterfall records must agree; stale binaries
      // or newly introduced closure rules are not allowed to drive choices.
      for (const c of cards) for (let month=1; month<=12; month++) {
        const day=new Date(2026,month-1,15);
        const legacy=legacyGuidance(c,day), native=policy(c,day);
        if (legacy.excluded !== native.excluded ||
          (!legacy.excluded && legacy.level !== native.level)) {
          throw new Error('Rust source-policy divergence at '+c.dataset.id+'/'+month);
        }
      }
      const toMinute = effort => Number.isInteger(effort) && effort >= 0 ? effort : -1;
      const budgetAllows = (max,limit) => e.wf_budget_allows(
        toMinute(max),Number.isFinite(limit) ? toMinute(limit) : -1) === 1;
      const compare = (x,y) => {
        const a = x.access.level === 'check' ? 1 : 2;
        const b = y.access.level === 'check' ? 1 : 2;
        const native = e.wf_compare(a,officialSource(x.c)?1:0,toMinute(x.effort.max),
          b,officialSource(y.c)?1:0,toMinute(y.effort.max));
        return native || x.c.dataset.name.localeCompare(y.c.dataset.name);
      };
      // Every date/range transition in the old planner is retained.
      for (const c of cards) {
        const effort = duration(c);
        for (const limit of [30,60,90,180,Infinity]) {
          const expected = Number.isFinite(limit) ? effort.max !== null && effort.max <= limit : true;
          if (budgetAllows(effort.max,limit) !== expected) {
            throw new Error('Rust time-budget divergence: '+c.dataset.id);
          }
        }
      }
      const wrapper = Object.freeze({engine:'rust-wasm',policy,budgetAllows,compare});
      active=wrapper;
      return wrapper;
    })().catch(() => null);
    return promise;
  }
  root.UPWaterfallsRust=Object.freeze({load,current:()=>active});
})(window);
