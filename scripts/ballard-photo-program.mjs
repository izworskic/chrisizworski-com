// Curated visual interpretation layer for Ballard Locks.
// Photos are used only when they orient, reveal, preview, or explain something a visitor can notice on site.

const PHOTOS = {
  overview: {
    src: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c0/Ballard_Locks.jpg/960px-Ballard_Locks.jpg',
    alt: 'Aerial view of the Ballard Locks showing the lock chambers, spillway, Salmon Bay and surrounding grounds.',
    credit: 'Seachaz · CC BY-SA 4.0 · Wikimedia Commons',
    source: 'https://commons.wikimedia.org/wiki/File:Ballard_Locks.jpg',
  },
  large: {
    src: 'https://upload.wikimedia.org/wikipedia/commons/1/19/Hiram_M._Chittenden_Locks-3.JPG',
    alt: 'Tug and barge inside the large lock chamber at the Hiram M. Chittenden Locks.',
    credit: 'Wikimedia Commons contributor · CC BY-SA 3.0',
    source: 'https://commons.wikimedia.org/wiki/File:Hiram_M._Chittenden_Locks-3.JPG',
  },
  small: {
    src: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/32/Chittenden_Locks_-_sailboat_in_small_lock.jpg/960px-Chittenden_Locks_-_sailboat_in_small_lock.jpg',
    alt: 'Sailboat inside the small lock chamber at the Ballard Locks.',
    credit: 'Joe Mabel · CC BY-SA 3.0 · Wikimedia Commons',
    source: 'https://commons.wikimedia.org/wiki/File:Chittenden_Locks_-_sailboat_in_small_lock.jpg',
  },
  fish: {
    src: 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/92/Chittenden_Locks_-_fish_ladder_viewing_01.jpg/960px-Chittenden_Locks_-_fish_ladder_viewing_01.jpg',
    alt: 'Visitors inside the Ballard Locks fish ladder viewing room looking through the underwater window.',
    credit: 'Joe Mabel · CC BY-SA 3.0 · Wikimedia Commons',
    source: 'https://commons.wikimedia.org/wiki/File:Chittenden_Locks_-_fish_ladder_viewing_01.jpg',
  },
  spillway: {
    src: 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/98/Ballard_locks_dam.jpg/960px-Ballard_locks_dam.jpg',
    alt: 'Ballard Locks dam and water-control structure beside the lock complex.',
    credit: 'Ursacascadia · CC0 · Wikimedia Commons',
    source: 'https://commons.wikimedia.org/wiki/File:Ballard_locks_dam.jpg',
  },
  garden: {
    src: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4e/Carl_S._English_Gardens_01.jpg/960px-Carl_S._English_Gardens_01.jpg',
    alt: 'Carl S. English Jr. Botanical Garden on the Ballard Locks grounds.',
    credit: 'Joe Mabel · CC BY-SA 3.0 · Wikimedia Commons',
    source: 'https://commons.wikimedia.org/wiki/File:Carl_S._English_Gardens_01.jpg',
  },
};

function replaceOrThrow(html, needle, replacement, label) {
  if (!html.includes(needle)) throw new Error(`Ballard photo program: insertion point missing (${label})`);
  return html.replace(needle, replacement);
}

function card(photo, tag, title, copy, persona, eager = false) {
  return `<figure class="interpretive-photo"><div class="photo-frame"><img src="${photo.src}" alt="${photo.alt}" ${eager ? 'fetchpriority="high"' : 'loading="lazy"'} decoding="async"></div><figcaption class="photo-copy"><span class="photo-tag">${tag}</span><strong>${title}</strong><p>${copy}</p><span class="photo-persona">Best for · ${persona}</span><a class="photo-credit" href="${photo.source}" target="_blank" rel="noopener noreferrer">Photo: ${photo.credit}</a></figcaption></figure>`;
}

const mainCss = `
.photo-program{margin-top:22px}.photo-program-head{display:flex;justify-content:space-between;gap:18px;align-items:end;margin-bottom:12px}.photo-program-head p{max-width:610px;margin:0;color:#60767b}.photo-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:13px}.interpretive-photo{margin:0;background:#fff;border:1px solid #d9d5cd;border-radius:15px;overflow:hidden;box-shadow:0 8px 26px rgba(18,53,61,.07)}.photo-frame{aspect-ratio:4/3;background:#dce7e4;overflow:hidden}.photo-frame img{width:100%;height:100%;object-fit:cover;display:block}.photo-copy{padding:14px 15px 15px}.photo-copy strong{display:block;font-size:1.02rem;line-height:1.25;margin:3px 0 6px;color:#173f49}.photo-copy p{margin:0;color:#5c7075;font-size:.84rem}.photo-tag{font:900 .64rem Arial,sans-serif;letter-spacing:.08em;text-transform:uppercase;color:#17616a}.photo-persona{display:block;margin-top:9px;font:800 .67rem Arial,sans-serif;color:#4f6b70}.photo-credit{display:block;margin-top:7px;font:500 .64rem Arial,sans-serif;color:#748488;text-decoration:none}.photo-wide{display:grid;grid-template-columns:minmax(260px,.8fr) 1.2fr;margin:13px 0 15px}.photo-wide .photo-frame{aspect-ratio:16/10}.photo-wide .photo-copy{display:flex;flex-direction:column;justify-content:center;padding:18px}.photo-note{margin:13px 0}.photo-note .photo-copy{padding:16px 18px}@media(max-width:820px){.photo-grid{grid-template-columns:1fr}.photo-program-head{display:block}.photo-program-head p{margin-top:7px}.photo-wide{grid-template-columns:1fr}.photo-wide .photo-frame{aspect-ratio:16/9}}@media(max-width:620px){.photo-frame{aspect-ratio:16/10}.photo-copy{padding:12px 13px 14px}.photo-wide .photo-copy{padding:14px}.photo-persona{margin-top:7px}}
`;

const tourCss = `
.popphoto{margin:0 0 10px;border:1px solid #dde0da;border-radius:9px;overflow:hidden;background:#f5f3ed}.popphoto img{display:block;width:100%;height:128px;object-fit:cover}.popphoto figcaption{padding:8px 9px;font:500 11px/1.35 Arial,sans-serif;color:#526a70}.popphoto figcaption strong{display:block;color:#174954;margin-bottom:2px}.popcredit{display:block;margin-top:5px;font-size:9px;color:#7a888b}.popcredit a{color:inherit}.tour-photo-key{margin:0 0 16px;padding:11px 13px;border:1px solid #d9ded8;border-radius:11px;background:#f8fbf8;color:#547076;font:600 .76rem/1.45 Arial,sans-serif}.tour-photo-key strong{color:#174954}@media(max-width:620px){.popphoto img{height:112px}}
`;

export function enhanceBallardMain(source) {
  let html = source;
  html = replaceOrThrow(html, '</style>', `${mainCss}</style>`, 'main CSS');

  const activityMarker = '<section class="section"><div class="section-head"><div><div class="kicker">Trackable activity now</div>';
  const photoStrip = `<section class="section photo-program" data-photo-program="ballard-interpretive-v1"><div class="photo-program-head"><div><div class="kicker">See it before you walk it</div><h2>Three views that make the whole place click</h2></div><p>These are not scenery cards. Each one gives you something specific to recognize when you arrive.</p></div><div class="photo-grid">${card(PHOTOS.overview,'ORIENT','See the entire system at once','From above, the two lock chambers, dam/spillway side and Salmon Bay become one connected machine instead of separate attractions.','First-time visitors',true)}${card(PHOTOS.large,'WATCH','Watch the chamber, not only the boat','A tug and barge make the scale obvious. Pick a fixed point on the wall and watch how the water moves around the vessel during a lockage.','Boat watchers')}${card(PHOTOS.fish,'NOTICE','Give the viewing window a few minutes','The fish ladder is not an aquarium. Current run data can tell you migration is active, but a patient watch is still part of the experience.','Families + salmon watchers')}</div></section>`;
  html = replaceOrThrow(html, activityMarker, `${photoStrip}\n${activityMarker}`, 'main photo strip');

  const metricsMarker = '<div class="metrics">';
  const spillway = `<figure class="interpretive-photo photo-wide" data-photo-role="water-control"><div class="photo-frame"><img src="${PHOTOS.spillway.src}" alt="${PHOTOS.spillway.alt}" loading="lazy" decoding="async"></div><figcaption class="photo-copy"><span class="photo-tag">UNDERSTAND</span><strong>The quiet part of the Locks is still doing work</strong><p>When the chambers look calm, look toward the dam and spillway side. The site is also managing the freshwater system behind the Locks; boat movement is only one part of the job.</p><span class="photo-persona">Best for · Engineering + systems-curious visitors</span><a class="photo-credit" href="${PHOTOS.spillway.source}" target="_blank" rel="noopener noreferrer">Photo: ${PHOTOS.spillway.credit}</a></figcaption></figure>`;
  html = replaceOrThrow(html, metricsMarker, `${spillway}\n${metricsMarker}`, 'spillway interpretation');

  const stepsMarker = '<div class="explain" id="steps">';
  const smallLock = `<figure class="interpretive-photo photo-wide photo-note" data-photo-role="small-lock"><div class="photo-frame"><img src="${PHOTOS.small.src}" alt="${PHOTOS.small.alt}" loading="lazy" decoding="async"></div><figcaption class="photo-copy"><span class="photo-tag">COMPARE</span><strong>Same physics, much smaller chamber</strong><p>The small lock lets you see the same enter → close → change water level → leave sequence at a scale that is often easier to follow. Compare it with the large-lock vessel above.</p><span class="photo-persona">Best for · First-timers + recreational boaters</span><a class="photo-credit" href="${PHOTOS.small.source}" target="_blank" rel="noopener noreferrer">Photo: ${PHOTOS.small.credit}</a></figcaption></figure>`;
  html = replaceOrThrow(html, stepsMarker, `${smallLock}\n${stepsMarker}`, 'small-lock interpretation');

  return html;
}

export function enhanceBallardTour(source) {
  let html = source;
  html = replaceOrThrow(html, '</style>', `${tourCss}</style>`, 'tour CSS');
  const mapMarker = '<div class="tour"><div class="toolbar">';
  const key = `<div class="tour-photo-key" data-photo-program="ballard-interpretive-v1"><strong>Photo guide:</strong> core stops now show one reference image chosen to help you recognize the thing the guide is asking you to notice—not to turn the map into a gallery.</div>`;
  html = replaceOrThrow(html, mapMarker, `${key}${mapMarker}`, 'tour photo key');

  const popupMarker = 'function popup(s){return `<div class="pop"><h3>';
  const photoCode = `const stopImages={\nvisitor:{src:'${PHOTOS.overview.src}',alt:'${PHOTOS.overview.alt}',label:'ORIENT',caption:'Use this aerial view to place the two chambers, dam/spillway side and the west approach before you start walking.',credit:'${PHOTOS.overview.credit}',source:'${PHOTOS.overview.source}'},\nlarge:{src:'${PHOTOS.large.src}',alt:'${PHOTOS.large.alt}',label:'WATCH',caption:'Use the vessel for scale, then shift your attention to a fixed mark on the chamber wall.',credit:'${PHOTOS.large.credit}',source:'${PHOTOS.large.source}'},\nsmall:{src:'${PHOTOS.small.src}',alt:'${PHOTOS.small.alt}',label:'COMPARE',caption:'The same lockage sequence is easier to read here at recreational-boat scale.',credit:'${PHOTOS.small.credit}',source:'${PHOTOS.small.source}'},\nfish:{src:'${PHOTOS.fish.src}',alt:'${PHOTOS.fish.alt}',label:'NOTICE',caption:'This is the viewing-room experience. Stay long enough to watch behavior, not just to check whether a fish is present.',credit:'${PHOTOS.fish.credit}',source:'${PHOTOS.fish.source}'},\nspillway:{src:'${PHOTOS.spillway.src}',alt:'${PHOTOS.spillway.alt}',label:'UNDERSTAND',caption:'This is the visual reminder that the Locks manage water even while the chambers are quiet.',credit:'${PHOTOS.spillway.credit}',source:'${PHOTOS.spillway.source}'},\ngarden:{src:'${PHOTOS.garden.src}',alt:'${PHOTOS.garden.alt}',label:'RESET',caption:'The garden is a deliberate change of pace inside the same working federal site.',credit:'${PHOTOS.garden.credit}',source:'${PHOTOS.garden.source}'}\n};\nfunction photoForStop(id){const p=stopImages[id];if(!p)return '';return '<figure class="popphoto"><img src="'+esc(p.src)+'" alt="'+esc(p.alt)+'" loading="lazy" decoding="async"><figcaption><strong>'+esc(p.label)+'</strong>'+esc(p.caption)+'<span class="popcredit">Photo: <a href="'+esc(p.source)+'" target="_blank" rel="noopener noreferrer">'+esc(p.credit)+'</a></span></figcaption></figure>';}\nfunction popup(s){return \`<div class="pop">\${photoForStop(s.id)}<h3>`;
  html = replaceOrThrow(html, popupMarker, photoCode, 'tour stop photos');
  return html;
}

export { PHOTOS };
