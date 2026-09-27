// Shared chrome for every generated Mackinac sub-page (hub surfaces + intent pages).
//
// One header, one nav, one hero system and one trip strip, so moving between Mackinac
// pages keeps the frame still and only the content changes. The header and nav markup
// match /mackinac-island/ exactly; cross-document view transitions pin them in place.
//
// The trip strip is rendered in the HTML, not injected after load. A tiny synchronous
// head script marks <html class="has-trip"> from the saved profile before first paint,
// so the correct variant (build prompt vs. saved trip) is on screen from the first frame
// and nothing is pushed down when mackinac-hub.js finishes.

export const INTENT_CSS = "/assets/mackinac-intent.css?v=20260927-pages2";
export const HUB_JS = "/assets/mackinac-hub.js?v=20260927-pages2";

export const HERO_IMG = "https://thumb.wikimedia.org/wikipedia/commons/thumb/6/6e/Mackinac_Island_July_2010_05_%28harbor_from_Fort_Street%29.JPG/1280px-Mackinac_Island_July_2010_05_%28harbor_from_Fort_Street%29.JPG";

const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));

// Tone = tint over the shared harbor photo + which part of the frame shows.
// Each surface gets its own colour and crop so no page reads as a repeat of My Trip.
const TONES = {
  ferries:  {label:"Ferries",  icon:"ferry",    pos:"50% 78%"},
  stay:     {label:"Stay",     icon:"bed",      pos:"30% 40%"},
  eat:      {label:"Eat",      icon:"fork",     pos:"70% 55%"},
  explore:  {label:"Explore",  icon:"compass",  pos:"20% 60%"},
  events:   {label:"Events",   icon:"calendar", pos:"85% 35%"},
  straits:  {label:"Straits",  icon:"bridge",   pos:"100% 70%"},
  plan:     {label:"Trip guide", icon:"map",    pos:"50% 50%"}
};

const ICONS = {
  ferry:'<path d="M3 17c1.5 1.2 3 1.2 4.5 0s3-1.2 4.5 0 3 1.2 4.5 0 3-1.2 4.5 0"/><path d="M5 14l1.2-4h11.6L19 14"/><path d="M9 10V6h6v4"/><path d="M12 3v3"/>',
  bed:'<path d="M3 18V7"/><path d="M3 14h18v4"/><path d="M21 14v-2a3 3 0 0 0-3-3h-7v5"/><circle cx="7" cy="11" r="2"/>',
  fork:'<path d="M7 3v8"/><path d="M4.5 3v5a2.5 2.5 0 0 0 5 0V3"/><path d="M7 11v10"/><path d="M17 21V3c-2 1.5-3 4-3 7h3"/>',
  compass:'<circle cx="12" cy="12" r="9"/><path d="M15.5 8.5l-2 5-5 2 2-5z"/>',
  calendar:'<rect x="3.5" y="5" width="17" height="15" rx="2.5"/><path d="M3.5 10h17M8 3v4M16 3v4"/>',
  bridge:'<path d="M2 16h20"/><path d="M6 16V6M18 16V6"/><path d="M2 8c3 0 4 5 4 5M22 8c-3 0-4 5-4 5"/><path d="M6 6c2.5 4 9.5 4 12 0"/><path d="M10 16v-3M14 16v-3"/>',
  map:'<path d="M9 4L3 6.5v13L9 17l6 2.5 6-2.5v-13L15 6.5z"/><path d="M9 4v13M15 6.5v13"/>'
};

export function icon(name, cls="ico") {
  return `<svg class="${cls}" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name]||ICONS.map}</svg>`;
}

export function toneFor(key) { return TONES[key] || TONES.plan; }

// Head assets: fonts (same request as My Trip, so it is already cached on the way in),
// stylesheet, and the pre-paint trip flag.
export function headAssets() {
  return `<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,400;0,9..144,500;0,9..144,600;1,9..144,400&family=Inter:wght@400;500;600;700;800&display=swap"><link rel="preload" as="image" href="${HERO_IMG}" fetchpriority="high"><link rel="stylesheet" href="${INTENT_CSS}"><script>try{var t=JSON.parse(localStorage.getItem("mackinac-trip-profile-v1")||"null");if(t&&t.profile&&t.profile.complete&&t.answers)document.documentElement.classList.add("has-trip")}catch(e){}</script>`;
}

export function siteHeader(nav) {
  return `<header class="sitebar"><div class="shell sitebar-inner"><a class="brand" href="/">Chris Izworski</a><nav aria-label="Breadcrumb"><a href="/tools/">Michigan tools</a><span aria-hidden="true">/</span><span>Mackinac Island Trip Planner</span></nav></div></header>
<div class="destination-nav-wrap"><div class="shell">${nav}</div></div>`;
}

// The saved-trip strip. Both states are in the markup; CSS picks one from the
// <html class="has-trip"> flag set in <head>, and the inline script fills the saved
// trip's label from localStorage in the same frame.
export function tripStrip(plannerHref) {
  return `<div class="trip-strip" data-trip-strip>
<div class="trip-strip-empty"><span class="strip-dot" aria-hidden="true"></span><div><strong>This page can rank itself for your trip.</strong><span>Four taps on My Trip and your dates, starting city and priorities follow you here.</span></div><a class="btn light" data-mackinac-planner-cta href="${plannerHref}">Build my trip</a></div>
<aside class="trip-context" data-trip-context><div><span>Using your saved Mackinac plan</span><strong data-trip-context-title>Your trip continues here</strong><p class="trip-context-facts" data-trip-context-summary></p></div><a class="btn light" data-mackinac-planner-cta href="/mackinac-island/#trip-intake">Edit my trip</a></aside>
</div><script>(function(){try{var s=JSON.parse(localStorage.getItem("mackinac-trip-profile-v1")||"null");if(!s||!s.profile||!s.profile.complete)return;var p=null;try{p=(JSON.parse(localStorage.getItem("mackinac-trip-plan-v1")||"null")||{}).plan||null}catch(e){}var el=document.currentScript.previousElementSibling,t=el.querySelector("[data-trip-context-title]"),f=el.querySelector("[data-trip-context-summary]");t.textContent=(s.profile.primary&&s.profile.primary.label)||"Your Mackinac trip";var x=[];if(p){if(p.trip_date){var d=new Date(p.trip_date+"T12:00:00");x.push(isNaN(d)?p.trip_date:d.toLocaleDateString("en-US",{month:"short",day:"numeric"}))}if(p.origin_text)x.push("from "+p.origin_text);if(p.trip==="overnight"){var n=Number(p.nights||1);x.push(n+" night"+(n===1?"":"s"))}else if(p.trip)x.push("day trip")}f.textContent=x.length?x.join(" · "):((s.profile.primary&&s.profile.primary.summary)||"Your choices shape every Mackinac page.")}catch(e){}})();</script>`;
}

export function pageHero({toneKey, crumbs, h1, lede, primaryHref, primaryLabel, plannerHref}) {
  const tone = toneFor(toneKey);
  return `<section class="page-hero tone-${esc(toneKey in TONES?toneKey:"plan")}" aria-labelledby="page-title">
<figure class="page-hero-photo" style="--focus:${tone.pos}"><img src="${HERO_IMG}" alt="Mackinac Island harbor viewed from above downtown" width="1280" height="853" fetchpriority="high"><figcaption>Harbor view from Fort Street · <a href="https://commons.wikimedia.org/wiki/File:Mackinac_Island_July_2010_05_(harbor_from_Fort_Street).JPG" target="_blank" rel="noopener">Michael Barera / Wikimedia Commons</a> · CC BY-SA 4.0</figcaption></figure>
<div class="shell page-hero-inner"><div class="crumbs">${crumbs}</div><div class="page-hero-copy"><div class="eyebrow surface-mark">${icon(tone.icon)}<span>${esc(tone.label)}</span></div><h1 id="page-title">${esc(h1)}</h1><p class="lede">${esc(lede)}</p><div class="cta-row"><a class="btn primary" data-mackinac-planner-cta href="${primaryHref}">${esc(primaryLabel)}</a><a class="btn ghost" href="/mackinac-island/">Open My Trip</a></div></div>
${tripStrip(plannerHref||primaryHref)}</div></section>`;
}

// Numbered decision cards that overlap the bottom of the hero.
export function decisionStrip(rows) {
  return `<section class="shell decision-strip" aria-label="The decisions this page settles">${rows.map((x,i)=>`<article class="hub-decision"><span class="decision-num">${String(i+1).padStart(2,"0")}<em>${esc(String(x[0]).replace(/^\d+\s*·\s*/,""))}</em></span><h3>${esc(x[1])}</h3><p>${esc(x[2])}</p></article>`).join("")}</section>`;
}

// Personalised focus lands here. Empty (and collapsed) for visitors without a trip;
// reserved with a skeleton for visitors with one, so arrival never shifts content.
export function focusSlot() {
  return `<section class="shell platform-focus-wrap" data-mackinac-platform-focus aria-live="polite"></section>`;
}

export function faqSection(faq, title) {
  return `<section class="hub-section faq"><div class="shell"><div class="section-head"><div class="eyebrow">Common questions</div><h2>${esc(title)}</h2></div><div class="faq-list">${faq.map(x=>`<details><summary>${esc(x[0])}</summary><p>${esc(x[1])}</p></details>`).join("")}</div></div></section>`;
}

export function plannerBand({title, body, href, label}) {
  return `<div class="planner-cta"><div><div class="eyebrow">One trip, every page</div><h2>${esc(title)}</h2><p>${esc(body)}</p></div><a class="btn light" data-mackinac-planner-cta href="${href}">${esc(label)}</a></div>`;
}

export function siteFooter(text) {
  return `<footer class="footer"><div class="shell"><p>Built by <a href="/">Chris Izworski</a>. ${esc(text)}</p><p><a href="/privacy/">Privacy</a> · <a href="/terms/">Terms</a></p></div></footer>`;
}

// Hub bodies are hand-written section strings without an inner .shell, which left
// them flush against the viewport edge. Wrap each section's contents once.
export function shellSections(html) {
  return html.replace(/<section class="hub-section([^"]*)">([\s\S]*?)<\/section>/g, (whole, extra, inner) =>
    inner.trimStart().startsWith('<div class="shell') ? whole : `<section class="hub-section${extra}"><div class="shell${/<(div|article|a) class="(?!eyebrow)/.test(inner)?"":" prose-row"}">${inner}</div></section>`);
}
