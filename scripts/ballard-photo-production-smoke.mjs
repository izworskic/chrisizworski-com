const MAIN = 'https://chrisizworski.com/ballard-locks/';
const TOUR = 'https://chrisizworski.com/ballard-locks/tour/';
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

const IMAGE_URLS = [
  'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c0/Ballard_Locks.jpg/960px-Ballard_Locks.jpg',
  'https://upload.wikimedia.org/wikipedia/commons/1/19/Hiram_M._Chittenden_Locks-3.JPG',
  'https://upload.wikimedia.org/wikipedia/commons/thumb/3/32/Chittenden_Locks_-_sailboat_in_small_lock.jpg/960px-Chittenden_Locks_-_sailboat_in_small_lock.jpg',
  'https://upload.wikimedia.org/wikipedia/commons/thumb/9/92/Chittenden_Locks_-_fish_ladder_viewing_01.jpg/960px-Chittenden_Locks_-_fish_ladder_viewing_01.jpg',
  'https://upload.wikimedia.org/wikipedia/commons/thumb/9/98/Ballard_locks_dam.jpg/960px-Ballard_locks_dam.jpg',
  'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4e/Carl_S._English_Gardens_01.jpg/960px-Carl_S._English_Gardens_01.jpg',
];

async function fetchText(url) {
  const response = await fetch(`${url}?photoSmoke=${Date.now()}`, {
    redirect: 'follow',
    headers: {
      accept: 'text/html',
      'cache-control': 'no-cache',
      'user-agent': 'ChrisIzworskiBallardPhotoSmoke/1.0',
    },
    signal: AbortSignal.timeout(15000),
  });
  return { response, text: await response.text() };
}

function mainReady(text) {
  return text.includes('data-photo-program="ballard-interpretive-v1"')
    && text.includes('Three views that make the whole place click')
    && text.includes('data-photo-role="water-control"')
    && text.includes('data-photo-role="small-lock"')
    && text.includes('Best for · First-time visitors')
    && text.includes('Best for · Boat watchers')
    && text.includes('upload.wikimedia.org')
    && text.includes('Photo:');
}

function tourReady(text) {
  return text.includes('data-photo-program="ballard-interpretive-v1"')
    && text.includes('Photo guide:')
    && text.includes('const stopImages=')
    && text.includes('photoForStop(s.id)')
    && text.includes('popphoto')
    && text.includes("visitor:{src:")
    && text.includes("large:{src:")
    && text.includes("small:{src:")
    && text.includes("fish:{src:")
    && text.includes("spillway:{src:")
    && text.includes("garden:{src:")
    && !/carousel|slideshow/i.test(text);
}

async function waitForPhotoProgram() {
  let lastMain, lastTour;
  for (let attempt = 1; attempt <= 18; attempt++) {
    try {
      [lastMain, lastTour] = await Promise.all([fetchText(MAIN), fetchText(TOUR)]);
      if (lastMain.response.ok && lastTour.response.ok && mainReady(lastMain.text) && tourReady(lastTour.text)) {
        return { main: lastMain, tour: lastTour, attempt };
      }
      console.log(`Ballard photo program not ready (attempt ${attempt}/18; main=${lastMain.response.status}, tour=${lastTour.response.status}); retrying.`);
    } catch (error) {
      console.log(`Ballard photo readiness attempt ${attempt}/18 failed: ${error.message}`);
    }
    await sleep(5000);
  }
  throw new Error('Ballard interpretive photo program did not become visible on both production pages');
}

async function checkImage(url) {
  const response = await fetch(url, {
    method: 'HEAD',
    redirect: 'follow',
    headers: { 'user-agent': 'ChrisIzworskiBallardPhotoSmoke/1.0' },
    signal: AbortSignal.timeout(15000),
  });
  const type = String(response.headers.get('content-type') || '').toLowerCase();
  if (!response.ok || !type.startsWith('image/')) {
    throw new Error(`Ballard interpretive image unavailable: ${url} (${response.status}, ${type || 'no content-type'})`);
  }
  return { url, status: response.status, type };
}

const live = await waitForPhotoProgram();
const images = await Promise.all(IMAGE_URLS.map(checkImage));

console.log(JSON.stringify({
  status: 'ok',
  experience: 'ballard-interpretive-photo-v1',
  attempt: live.attempt,
  mainStatus: live.main.response.status,
  tourStatus: live.tour.response.status,
  mainHasPhotoProgram: mainReady(live.main.text),
  tourHasPhotoProgram: tourReady(live.tour.text),
  imageCount: images.length,
  images: images.map(({ url, status, type }) => ({ url, status, type })),
}));
