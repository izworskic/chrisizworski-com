// Generates /snowmobile/what-you-need/ from lib/snowmobile/rules.mjs.
// Run: node scripts/generate-snowmobile-need-page.mjs   (the output is committed)
import fs from 'node:fs';
import path from 'node:path';
import { FACTS, SOURCES, OPTIONS, NOT_COVERED, CHECKED_ON, CHECKED_ON_LONG } from '../lib/snowmobile/rules.mjs';

const root = process.cwd();
const URL_ = 'https://chrisizworski.com/snowmobile/what-you-need/';
const PERSON = 'https://chrisizworski.com/#person';
const TITLE = 'Michigan Snowmobile Permit & Rules | Chris Izworski';
const DESC = `What you need to ride in Michigan: the ${FACTS.permit.fee} trail permit, registration, safety certificate and gear rules, from the DNR, checked ${CHECKED_ON_LONG}.`;
const IMG = 'https://chrisizworski.com/snowmobile/social/michigan.png';
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const a = (key, text) => `<a href="${esc(SOURCES[key].url)}" target="_blank" rel="noopener">${esc(text ?? SOURCES[key].label)}</a>`;
const plain = (html) => html.replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&#39;/g, "'").replace(/&quot;/g, '"');
const p = FACTS.permit, r = FACTS.registration;

if (TITLE.length > 60) throw new Error(`title ${TITLE.length} > 60`);
if (DESC.length > 158) throw new Error(`description ${DESC.length} > 158`);

// Each answer stands on its own: it still reads correctly when lifted out of the page.
const QA = [
  {
    q: 'Do I need a trail permit to snowmobile in Michigan?',
    a: `Yes, if you ride on public land. Michigan requires a snowmobile trail permit to operate on public land, and it applies to residents and visitors alike. The permit is valid ${p.validFrom} through ${p.validTo}, and the sticker goes ${esc(p.sticker)}. The DNR exempts a snowmobile operated exclusively on land its owner owns or controls, one used entirely in a certified safety-education program, and one used in a special event under a permit from the governing unit. A snowmobile used solely to cross frozen public water for ice fishing is exempt from the permit but not from registration. During the annual Free Snowmobiling Weekend the permit is waived on DNR trails only. Source: ${a('permits', 'Michigan DNR')}.`,
  },
  {
    q: 'How much is a Michigan snowmobile trail permit and where do I buy it?',
    a: `The Michigan snowmobile trail permit costs ${p.fee}, up from ${p.previousFee}, after ${esc(p.feeBasis)}. The DNR says the new fee stays in place for the next five-year period. Permits go on sale ${p.onSale} each year and are valid ${p.validFrom} through ${p.validTo}. You can buy one online through the ${a('elicense', 'DNR eLicense site')}, online through the ${a('misorva', 'Michigan Snowmobile & ORV Association')}, or in person at DNR license agents and dealers. ${esc(p.mailing)} so buy before your trip rather than the week of it. Sources: ${a('fee', 'DNR fee announcement')} and ${a('permits', 'DNR permits page')}.`,
  },
  {
    q: 'Do I have to register my snowmobile in Michigan?',
    a: `Michigan residents must register a snowmobile with the ${r.authority} unless it is used solely on private property. Registration lasts ${r.years} years, you put ${esc(r.decals)}, and a sale means transferring the registration through the Secretary of State. Registration is separate from the ${p.fee} trail permit, so a rider on public land needs both. The DNR page I read does not state the registration fee, so check the Secretary of State for the current amount. A snowmobile used only on land its owner owns or controls is exempt from both. Sources: ${a('permits', 'Michigan DNR')} and ${a('sos', 'Michigan Secretary of State')}.`,
  },
  {
    q: 'Do out-of-state snowmobilers need a Michigan permit or registration?',
    a: `Out-of-state riders need the Michigan trail permit to ride on public land, and their snowmobile must display a valid registration from the operator's home state or province, or be registered in Michigan. The ${p.fee} permit is the same permit residents buy, and the DNR lists no separate nonresident fee. The permit is valid ${p.validFrom} through ${p.validTo} and can be bought online through eLicense or MISORVA before you cross the bridge. The only break is Free Snowmobiling Weekend, when both the permit and the registration requirements are waived on DNR trails only, for visitors as well as residents. Source: ${a('permits', 'Michigan DNR')}.`,
  },
  {
    q: 'How old do you have to be to drive a snowmobile in Michigan?',
    a: `The DNR's rules depend on the rider's age. A child under 12 may operate a snowmobile only under direct adult supervision, meaning an adult 18 or older in constant visual contact with the unaided eye, and may not cross a street or highway. Riders 12 to 16 must pass a Michigan-approved snowmobile safety course and carry the certificate to ride without that supervision or to cross a street or highway. The DNR recommends a safety course for every operator. The online course charges its fee only when you pass. Sources: ${a('age', 'DNR age rules')} and ${a('certificate', 'DNR safety certificate page')}.`,
  },
  {
    q: 'What is Michigan\'s Free Snowmobiling Weekend?',
    a: `Free Snowmobiling Weekend is a two-day event each winter when the DNR waives the snowmobile trail permit and the registration requirement on DNR-managed snowmobile trails only, for residents and out-of-state visitors. Everything else still applies: all other snowmobile rules and regulations, the age and safety-certificate rules, and a Recreation Passport where applicable. The DNR announces the dates each year, so look for them on the DNR page before you plan a trip around it. Outside those two days, and off DNR trails, the ${p.fee} permit and registration apply as usual. Source: ${a('freeWeekend', 'Michigan DNR')}.`,
  },
  {
    q: 'Do you have to wear a helmet on a snowmobile in Michigan?',
    a: `Yes. The DNR Snowmobile Handbook says everyone operating or riding on a snowmobile must wear ${FACTS.helmet}, with an exception for people operating on their own private property. That covers passengers as well as the driver. The Handbook also requires ${FACTS.lights}, and prohibits operating while under the influence of drugs or alcohol or at a speed greater than is reasonable for existing conditions. Mufflers are regulated too: sleds made after July 1, 1980 and sold in Michigan must not exceed 88 decibels. The Handbook covers more equipment rules than this page does. Source: ${a('handbook', 'DNR Snowmobile Handbook')}.`,
  },
  {
    q: 'When do Michigan snowmobile trails open?',
    a: `State-designated snowmobile trails are open ${FACTS.season.opens} to ${FACTS.season.closes}, and trail grooming occurs when there is enough snow on the ground, so opening day on the calendar is not the same as rideable trails. The trail permit is valid from ${p.validFrom}, two months before the trails open. Whether a given region is actually worth the drive depends on current snow, grooming and closures, which is what the <a href="/snowmobile/">Michigan snowmobile trail conditions planner</a> checks region by region. Source: ${a('home', 'Michigan DNR')}.`,
  },
];

const ld = {
  '@context': 'https://schema.org',
  '@graph': [
    { '@type': 'Person', '@id': PERSON, name: 'Chris Izworski', url: 'https://chrisizworski.com/' },
    { '@type': 'WebPage', '@id': `${URL_}#page`, url: URL_, name: 'Michigan Snowmobile Permit, Registration and Rules', description: DESC, inLanguage: 'en-US', dateModified: CHECKED_ON, author: { '@id': PERSON }, publisher: { '@id': PERSON }, isPartOf: { '@id': 'https://chrisizworski.com/snowmobile/#page' }, primaryImageOfPage: { '@type': 'ImageObject', url: IMG, width: 1200, height: 630 } },
    { '@type': 'BreadcrumbList', itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://chrisizworski.com/' },
      { '@type': 'ListItem', position: 2, name: 'Tools', item: 'https://chrisizworski.com/tools/' },
      { '@type': 'ListItem', position: 3, name: 'Michigan Snowmobile Trail Conditions', item: 'https://chrisizworski.com/snowmobile/' },
      { '@type': 'ListItem', position: 4, name: 'What you need to ride', item: URL_ },
    ] },
    { '@type': 'FAQPage', mainEntity: QA.map((x) => ({ '@type': 'Question', name: x.q, acceptedAnswer: { '@type': 'Answer', text: plain(x.a) } })) },
  ],
};

const select = (name, label, opts) => `<label for="need-${name}"><span>${esc(label)}</span><select id="need-${name}" name="${name}">${opts.map((o) => `<option value="${o.id}">${esc(o.label)}</option>`).join('')}</select></label>`;

const html = `<!doctype html><html lang="en-US"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(TITLE)}</title><meta name="description" content="${esc(DESC)}"><link rel="canonical" href="${URL_}"><meta name="robots" content="index,follow,max-image-preview:large,max-snippet:-1"><meta name="google-adsense-account" content="ca-pub-8222782620788075"><meta name="theme-color" content="#123246"><meta name="author" content="Chris Izworski"><meta property="og:type" content="article"><meta property="og:site_name" content="Chris Izworski"><meta property="og:locale" content="en_US"><meta property="og:title" content="${esc(TITLE)}"><meta property="og:description" content="${esc(DESC)}"><meta property="og:url" content="${URL_}"><meta property="og:image" content="${IMG}"><meta property="og:image:width" content="1200"><meta property="og:image:height" content="630"><meta property="og:image:alt" content="Michigan snowmobile trail maps, route planning and conditions — built by Chris Izworski"><meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${esc(TITLE)}"><meta name="twitter:description" content="${esc(DESC)}"><meta name="twitter:image" content="${IMG}"><meta name="twitter:image:alt" content="Michigan snowmobile trail maps, route planning and conditions — built by Chris Izworski"><link rel="stylesheet" href="/assets/snowmobile.css?v=20261005-trip-compare-1"><link rel="stylesheet" href="/assets/snowmobile-need.css?v=20261019-1"><script async src="https://www.googletagmanager.com/gtag/js?id=G-Y5D2V2W7HN"></script><script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}gtag('js',new Date());gtag('config','G-Y5D2V2W7HN');</script><script async crossorigin="anonymous" src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-8222782620788075"></script><script type="application/ld+json">${JSON.stringify(ld)}</script></head>
<body>
<header class="top"><div class="topin"><a class="brand" href="/">Chris Izworski</a></div></header>
<main class="shell need-page">
  <div class="crumb"><a href="/">Home</a> › <a href="/tools/">Tools</a> › <a href="/snowmobile/">Michigan Snowmobile Trail Conditions</a> › What you need to ride</div>
  <div class="eyebrow">Before you load the sleds</div>
  <h1>Michigan snowmobile permit, registration and rules</h1>
  <p class="lede">Tell it who is riding and where, and it lists what Michigan requires: the trail permit, registration, safety certificate and gear. Every rule comes from the Michigan DNR and was checked on ${CHECKED_ON_LONG}. Nothing you choose is saved or sent anywhere.</p>

  <section class="panel need-check" aria-labelledby="need-title">
    <h2 id="need-title">What does my ride need?</h2>
    <form id="need-form" class="origin-controls need-form" autocomplete="off">
      ${select('home', 'Where do you live?', OPTIONS.home)}
      ${select('age', 'Rider’s age', OPTIONS.age)}
      ${select('where', 'Where will you ride?', OPTIONS.where)}
    </form>
    <p id="need-count" class="small need-count" role="status"></p>
    <ul id="need-result" class="need-list" aria-live="polite">
      <li class="need-item need-need"><strong>Trail permit: required on public land</strong><p>${p.fee}, valid ${p.validFrom} through ${p.validTo}. Turn on JavaScript to tailor this list to your ride, or read the full rules below.</p></li>
    </ul>
    <p class="small">This checks the rules the DNR published. It is not legal advice and not an official DNR product; confirm anything that matters with the ${a('home', 'Michigan DNR')} before you ride.</p>
  </section>

  <section class="panel" aria-labelledby="short-title">
    <h2 id="short-title">The short version</h2>
    <div class="need-table-wrap"><table class="need-table">
      <thead><tr><th scope="col">Requirement</th><th scope="col">Who</th><th scope="col">Cost and validity</th><th scope="col">Where to get it</th></tr></thead>
      <tbody>
        <tr><th scope="row">Trail permit</th><td>Anyone riding on public land, resident or visitor</td><td>${p.fee}; valid ${p.validFrom} to ${p.validTo}; on sale ${p.onSale}</td><td>${a('elicense', 'eLicense')}, ${a('misorva', 'MISORVA')} or a DNR license agent or dealer</td></tr>
        <tr><th scope="row">Registration</th><td>Michigan residents (unless used solely on private property); visitors show their home registration</td><td>Lasts ${r.years} years; fee not listed by the DNR</td><td>${a('sos', 'Michigan Secretary of State')}</td></tr>
        <tr><th scope="row">Safety certificate</th><td>Operators 12 to 16 (recommended for all)</td><td>Online course fee is charged only when you pass</td><td>${a('course', 'snowmobile-ed.com/michigan')} or a classroom course</td></tr>
        <tr><th scope="row">Helmet and lights</th><td>Everyone on the sled; lights whenever it runs</td><td>DOT-approved crash helmet; headlight and taillight lit</td><td>${a('handbook', 'DNR Snowmobile Handbook')}</td></tr>
      </tbody>
    </table></div>
  </section>

  <section class="panel need-qa" aria-labelledby="qa-title">
    <h2 id="qa-title">Michigan snowmobile rules, answered</h2>
    ${QA.map((x, i) => `<h3 id="q${i + 1}">${esc(x.q)}</h3><p>${x.a}</p>`).join('\n    ')}
  </section>

  <section class="panel" aria-labelledby="gaps-title">
    <h2 id="gaps-title">What this page does not cover</h2>
    <p class="small">The sources I read did not state these, so I have not guessed:</p>
    <ul class="small">${NOT_COVERED.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>
    <p class="small">Read the full ${a('handbook')} and the ${a('rules')} for everything else. Rules and fees change; the date at the top is when I last checked them.</p>
  </section>

  <section class="panel companion" aria-labelledby="next-title">
    <h2 id="next-title">Then check whether the trails are worth the drive</h2>
    <div class="companion-links">
      <a href="/snowmobile/">Michigan snowmobile trail conditions &amp; route planner</a>
      <a href="/michigan-snow-totals/">Michigan snow totals</a>
      <a href="/michigan-snow-depth/">Michigan snow depth</a>
      <a href="/michigan-ice/ice-safety.html">Ice safety before you cross water</a>
    </div>
  </section>

  <section class="panel snowmobile-credit" aria-labelledby="builder-title"><h2 id="builder-title">Built and maintained by Chris Izworski</h2><p>I built this to answer the questions riders ask before they buy a permit. It is an independent summary of Michigan DNR rules, not an official DNR product. <a href="/chris-izworski/">About Chris Izworski</a> · <a href="/chris-izworski-works/">More tools I built</a> · <a href="/connect/">Report a rule or source problem</a>.</p></section>
</main>
<footer class="footer">Built by <a href="https://chrisizworski.com/chris-izworski/">Chris Izworski</a> · Rules from the Michigan DNR, checked ${CHECKED_ON_LONG}. Not an official DNR product. © 2026 Chris Izworski · <a href="/about/">About Chris</a></footer>
<script type="application/json" id="need-facts">${JSON.stringify({ permit: FACTS.permit, registration: FACTS.registration, season: FACTS.season, certificate: FACTS.certificate, helmet: FACTS.helmet, lights: FACTS.lights })}</script>
<script src="/assets/snowmobile-need.js?v=20261019-1"></script>
</body></html>
`;

const out = path.join(root, 'public/snowmobile/what-you-need/index.html');
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, html);
console.log(`Wrote ${path.relative(root, out)} (${html.length} bytes), title ${TITLE.length} chars, description ${DESC.length} chars.`);
