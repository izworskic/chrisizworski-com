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
    src: 'https://media.defense.gov/2022/Dec/20/2003135612/-1/-1/0/220719-A-VA654-876.JPG',
    alt: 'The Gulf Cajun commercial vessel approaching the large chamber at Ballard Locks from the Puget Sound side.',
    credit: 'Nicole L. Celestine · U.S. Army Corps of Engineers',
    source: 'https://www.nws.usace.army.mil/Media/Images/igphoto/2003135612/',
  },
  small: {
    src: 'https://media.defense.gov/2022/Dec/20/2003135607/-1/-1/0/220719-A-VA654-372.JPG',
    alt: 'Several recreational vessels waiting to pass through the small chamber at Ballard Locks.',
    credit: 'Nicole L. Celestine · U.S. Army Corps of Engineers',
    source: 'https://www.nws.usace.army.mil/Media/Images/igphoto/2003135607/',
  },
  fish: {
    src: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/57/Chittenden_Locks_-_salmon_in_ladder_01.jpg/960px-Chittenden_Locks_-_salmon_in_ladder_01.jpg',
    alt: 'Salmon swimming upstream past the underwater viewing window in the Ballard Locks fish ladder.',
    credit: 'Joe Mabel · CC BY-SA 3.0 · Wikimedia Commons',
    source: 'https://commons.wikimedia.org/wiki/File:Chittenden_Locks_-_salmon_in_ladder_01.jpg',
  },
  fishLadder: {
    src: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4e/Chittenden_Locks_-_fish_ladder_02.jpg/960px-Chittenden_Locks_-_fish_ladder_02.jpg',
    alt: 'Concrete steps and L-shaped baffles inside the Ballard Locks fish ladder creating resting water for migrating salmon.',
    credit: 'Joe Mabel · CC BY-SA 3.0 · Wikimedia Commons',
    source: 'https://commons.wikimedia.org/wiki/File:Chittenden_Locks_-_fish_ladder_02.jpg',
  },
  spillway: {
    src: 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/98/Ballard_locks_dam.jpg/960px-Ballard_locks_dam.jpg',
    alt: 'Ballard Locks dam and water-control structure beside the lock complex.',
    credit: 'Ursacascadia · CC0 · Wikimedia Commons',
    source: 'https://commons.wikimedia.org/wiki/File:Ballard_locks_dam.jpg',
  },
  garden: {
    src: 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/69/Chittenden_Locks_from_Carl_P._English_Gardens_01.jpg/960px-Chittenden_Locks_from_Carl_P._English_Gardens_01.jpg',
    alt: 'The Ballard Locks seen through the Carl S. English Jr. Botanical Garden, connecting the landscaped grounds to the working waterway.',
    credit: 'Joe Mabel · CC BY-SA 3.0 · Wikimedia Commons',
    source: 'https://commons.wikimedia.org/wiki/File:Chittenden_Locks_from_Carl_P._English_Gardens_01.jpg',
  },
  history: {
    src: 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f0/Ballard_Locks%2C_1917.jpg/960px-Ballard_Locks%2C_1917.jpg',
    alt: 'Historic westward view of Ballard Locks on July 4, 1917, showing the newly opened lock complex before the English Gardens matured.',
    credit: 'Seattle Municipal Archives · CC BY 2.0 · Wikimedia Commons',
    source: 'https://commons.wikimedia.org/wiki/File:Ballard_Locks,_1917.jpg',
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
.popphoto{margin:0 0 10px;border:1px solid #dde0da;border-radius:9px;overflow:hidden;background:#f5f3ed}.popphoto img{display:block;width:100%;height:138px;object-fit:cover}.popphoto figcaption{padding:8px 9px;font:500 11px/1.35 Arial,sans-serif;color:#526a70}.popphoto figcaption strong{display:block;color:#174954;margin-bottom:2px}.popcredit{display:block;margin-top:5px;font-size:9px;color:#7a888b}.popcredit a{color:inherit}.tour-photo-key{margin:0 0 16px;padding:11px 13px;border:1px solid #d9ded8;border-radius:11px;background:#f8fbf8;color:#547076;font:600 .76rem/1.45 Arial,sans-serif}.tour-photo-key strong{color:#174954}.tour-story-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:14px}.tour-story-grid .interpretive-photo{margin:0;background:#fff;border:1px solid #dad6cd;border-radius:13px;overflow:hidden}.tour-story-grid .photo-frame{aspect-ratio:16/10;overflow:hidden;background:#e3ebe8}.tour-story-grid img{width:100%;height:100%;object-fit:cover;display:block}.tour-story-grid .photo-copy{padding:14px}.tour-story-grid .photo-copy strong{display:block;color:#174954;margin:3px 0 6px}.tour-story-grid .photo-copy p{margin:0;color:#5b7176;font:500 .8rem/1.45 Arial,sans-serif}.tour-story-grid .photo-tag{font:900 .63rem Arial,sans-serif;letter-spacing:.08em;color:#17616a}.tour-story-grid .photo-credit{display:block;margin-top:7px;font:500 .62rem Arial,sans-serif;color:#748488;text-decoration:none}@media(max-width:700px){.tour-story-grid{grid-template-columns:1fr}}@media(max-width:620px){.popphoto img{height:122px}}
`;

export function enhanceBallardMain(source) {
  let html = source;
  html = replaceOrThrow(html, '</style>', `${mainCss}</style>`, 'main CSS');

  const activityMarker = '<section class="section"><div class="section-head"><div><div class="kicker">Trackable activity now</div>';
  const photoStrip = `<section class="section photo-program" data-photo-program="ballard-interpretive-v2"><div class="photo-program-head"><div><div class="kicker">See it before you walk it</div><h2>Three views that make the whole place click</h2></div><p>These are not scenery cards. Each one gives you something specific to recognize when you arrive.</p></div><div class="photo-grid">${card(PHOTOS.overview,'ORIENT','See the entire system at once','From above, the two lock chambers, dam/spillway side and Salmon Bay become one connected machine instead of separate attractions.','First-time visitors',true)}${card(PHOTOS.large,'WATCH','See the scale before you reach the wall','A working commercial vessel turns the large lock from an abstract structure into a piece of active navigation infrastructure. Then watch the waterline against the chamber wall.','Boat watchers')}${card(PHOTOS.fish,'NOTICE','This is the moment the counts are trying to help you catch','The number on your screen cannot promise a salmon at the glass. When the run is active, this is what you are waiting for: a fish moving past only a few feet away.','Families + salmon watchers')}</div></section>`;
  html = replaceOrThrow(html, activityMarker, `${photoStrip}\n${activityMarker}`, 'main photo strip');

  const metricsMarker = '<div class="metrics">';
  const spillway = `<figure class="interpretive-photo photo-wide" data-photo-role="water-control"><div class="photo-frame"><img src="${PHOTOS.spillway.src}" alt="${PHOTOS.spillway.alt}" loading="lazy" decoding="async"></div><figcaption class="photo-copy"><span class="photo-tag">UNDERSTAND</span><strong>No boat required. The Locks are still working.</strong><p>When the chambers look calm, look toward the dam and spillway side. Water management continues whether a vessel happens to be inside a chamber or not.</p><span class="photo-persona">Best for · Engineering + systems-curious visitors</span><a class="photo-credit" href="${PHOTOS.spillway.source}" target="_blank" rel="noopener noreferrer">Photo: ${PHOTOS.spillway.credit}</a></figcaption></figure>`;
  html = replaceOrThrow(html, metricsMarker, `${spillway}\n${metricsMarker}`, 'spillway interpretation');

  const stepsMarker = '<div class="explain" id="steps">';
  const smallLock = `<figure class="interpretive-photo photo-wide photo-note" data-photo-role="small-lock"><div class="photo-frame"><img src="${PHOTOS.small.src}" alt="${PHOTOS.small.alt}" loading="lazy" decoding="async"></div><figcaption class="photo-copy"><span class="photo-tag">COMPARE</span><strong>This is why there are two chambers</strong><p>Smaller traffic can use this lock without cycling the enormous large chamber beside it. Same elevation problem. Same physics. Far less water and space.</p><span class="photo-persona">Best for · First-timers + recreational boaters</span><a class="photo-credit" href="${PHOTOS.small.source}" target="_blank" rel="noopener noreferrer">Photo: ${PHOTOS.small.credit}</a></figcaption></figure>`;
  html = replaceOrThrow(html, stepsMarker, `${smallLock}\n${stepsMarker}`, 'small-lock interpretation');

  return html;
}

export function enhanceBallardTour(source) {
  let html = source;
  html = replaceOrThrow(html, '</style>', `${tourCss}</style>`, 'tour CSS');
  const mapMarker = '<div class="tour"><div class="toolbar">';
  const key = `<div class="tour-photo-key" data-photo-program="ballard-interpretive-v2"><strong>Photo guide:</strong> these images are chosen to help you recognize a mechanism, moment or relationship when you look up from the map—not to turn the walk into a gallery.</div>`;
  html = replaceOrThrow(html, mapMarker, `${key}${mapMarker}`, 'tour photo key');

  const ideasMarker = '<section class="section"><h2>Three ideas worth carrying through the whole walk</h2>';
  const storyPhotos = `<section class="section" data-photo-role="deep-interpretation"><div class="kicker">Two views the map cannot explain by itself</div><h2>See the mechanism. Then see the century.</h2><div class="tour-story-grid"><figure class="interpretive-photo" data-photo-role="fish-ladder-anatomy"><div class="photo-frame"><img src="${PHOTOS.fishLadder.src}" alt="${PHOTOS.fishLadder.alt}" loading="lazy" decoding="async"></div><figcaption class="photo-copy"><span class="photo-tag">UNDERSTAND THE LADDER</span><strong>Now the word “ladder” makes sense</strong><p>The fish are not making one giant climb. Concrete baffles break the elevation change into smaller pushes and create quieter water where salmon can hold before moving again.</p><a class="photo-credit" href="${PHOTOS.fishLadder.source}" target="_blank" rel="noopener noreferrer">Photo: ${PHOTOS.fishLadder.credit}</a></figcaption></figure><figure class="interpretive-photo" data-photo-role="historic-comparison"><div class="photo-frame"><img src="${PHOTOS.history.src}" alt="${PHOTOS.history.alt}" loading="lazy" decoding="async"></div><figcaption class="photo-copy"><span class="photo-tag">THEN · 1917</span><strong>The structure is old. The job is not.</strong><p>This westward view is from opening day. When you reach the historic part of the route, compare the basic geometry with what is still operating around you more than a century later.</p><a class="photo-credit" href="${PHOTOS.history.source}" target="_blank" rel="noopener noreferrer">Photo: ${PHOTOS.history.credit}</a></figcaption></figure></div></section>`;
  html = replaceOrThrow(html, ideasMarker, `${storyPhotos}\n${ideasMarker}`, 'deep interpretation photos');

  const popupMarker = 'function popup(s){return `<div class="pop"><h3>';
  const photoCode = `const stopImages={\nvisitor:{src:'${PHOTOS.overview.src}',alt:'${PHOTOS.overview.alt}',label:'ORIENT',caption:'Use this aerial view to place the two chambers, dam/spillway side and west approach before you start walking.',credit:'${PHOTOS.overview.credit}',source:'${PHOTOS.overview.source}'},\nlarge:{src:'${PHOTOS.large.src}',alt:'${PHOTOS.large.alt}',label:'WATCH',caption:'This commercial vessel gives you the scale. At the chamber, stop watching only the boat and pick a fixed mark on the wall.',credit:'${PHOTOS.large.credit}',source:'${PHOTOS.large.source}'},\nsmall:{src:'${PHOTOS.small.src}',alt:'${PHOTOS.small.alt}',label:'COMPARE',caption:'Several recreational boats make the small lock’s purpose obvious: same lockage physics without cycling the enormous large chamber.',credit:'${PHOTOS.small.credit}',source:'${PHOTOS.small.source}'},\nfish:{src:'${PHOTOS.fish.src}',alt:'${PHOTOS.fish.alt}',label:'NOTICE',caption:'This is the payoff. If a salmon appears, watch how it holds, pushes and settles instead of treating the window like a quick aquarium stop.',credit:'${PHOTOS.fish.credit}',source:'${PHOTOS.fish.source}'},\nspillway:{src:'${PHOTOS.spillway.src}',alt:'${PHOTOS.spillway.alt}',label:'UNDERSTAND',caption:'This is the visual reminder that the Locks manage water even while the chambers are quiet.',credit:'${PHOTOS.spillway.credit}',source:'${PHOTOS.spillway.source}'},\ngarden:{src:'${PHOTOS.garden.src}',alt:'${PHOTOS.garden.alt}',label:'LOOK BACK',caption:'Turn around here. The garden and the working Locks belong to the same visitor landscape; this view makes that relationship visible.',credit:'${PHOTOS.garden.credit}',source:'${PHOTOS.garden.source}'},\ncavanaugh:{src:'${PHOTOS.history.src}',alt:'${PHOTOS.history.alt}',label:'THEN · 1917',caption:'Compare this opening-day geometry with the working site around you. The machinery has evolved; the core navigation problem has not.',credit:'${PHOTOS.history.credit}',source:'${PHOTOS.history.source}'}\n};\nfunction photoForStop(id){const p=stopImages[id];if(!p)return '';return '<figure class="popphoto"><img src="'+esc(p.src)+'" alt="'+esc(p.alt)+'" loading="lazy" decoding="async"><figcaption><strong>'+esc(p.label)+'</strong>'+esc(p.caption)+'<span class="popcredit">Photo: <a href="'+esc(p.source)+'" target="_blank" rel="noopener noreferrer">'+esc(p.credit)+'</a></span></figcaption></figure>';}\nfunction popup(s){return \`<div class="pop">\${photoForStop(s.id)}<h3>`;
  html = replaceOrThrow(html, popupMarker, photoCode, 'tour stop photos');
  return html;
}

export { PHOTOS };
