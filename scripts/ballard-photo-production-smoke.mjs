const MAIN = 'https://chrisizworski.com/ballard-locks/';
const TOUR = 'https://chrisizworski.com/ballard-locks/tour/';
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

const IMAGE_URLS = [
  'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c0/Ballard_Locks.jpg/960px-Ballard_Locks.jpg',
  'https://media.defense.gov/2022/Dec/20/2003135612/-1/-1/0/220719-A-VA654-876.JPG',
  'https://media.defense.gov/2022/Dec/20/2003135607/-1/-1/0/220719-A-VA654-372.JPG',
  'https://upload.wikimedia.org/wikipedia/commons/thumb/5/57/Chittenden_Locks_-_salmon_in_ladder_01.jpg/960px-Chittenden_Locks_-_salmon_in_ladder_01.jpg',
  'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4e/Chittenden_Locks_-_fish_ladder_02.jpg/960px-Chittenden_Locks_-_fish_ladder_02.jpg',
  'https://upload.wikimedia.org/wikipedia/commons/thumb/9/98/Ballard_locks_dam.jpg/960px-Ballard_locks_dam.jpg',
  'https://upload.wikimedia.org/wikipedia/commons/thumb/6/69/Chittenden_Locks_from_Carl_P._English_Gardens_01.jpg/960px-Chittenden_Locks_from_Carl_P._English_Gardens_01.jpg',
  'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f0/Ballard_Locks%2C_1917.jpg/960px-Ballard_Locks%2C_1917.jpg',
];

async function fetchText(url) {
  const response = await fetch(`${url}?photoSmoke=${Date.now()}`, {
    redirect: 'follow',
    headers: {
      accept: 'text/html',
      'cache-control': 'no-cache',
      'user-agent': 'ChrisIzworskiBallardPhotoSmoke/2.0',
    },
    signal: AbortSignal.timeout(15000),
  });
  return { response, text: await response.text() };
}

function mainReady(text) {
  return text.includes('data-photo-program="ballard-interpretive-v2"')
    && text.includes('Three views that make the whole place click')
    && text.includes('data-photo-role="water-control"')
    && text.includes('data-photo-role="small-lock"')
    && text.includes('Gulf Cajun commercial vessel')
    && text.includes('salmon at the glass')
    && text.includes('Photo:');
}

function tourReady(text) {
  return text.includes('data-photo-program="ballard-interpretive-v2"')
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
    && text.includes("cavanaugh:{src:")
    && text.includes('data-photo-role="fish-ladder-anatomy"')
    && text.includes('data-photo-role="historic-comparison"')
    && text.includes('Now the word “ladder” makes sense')
    && text.includes('data-authority-layer="ballard-tour-v1"')
    && text.includes('Verify access with USACE')
    && text.includes('data-authority="usace"')
    && text.includes('data-authority="wdfw"')
    && text.includes('data-authority="noaa"')
    && text.includes('data-authority="nws"')
    && text.includes('Posted signs, closures and on-site USACE staff direction always control')
    && !/carousel|slideshow/i.test(text);
}

async function waitForPhotoProgram() {
  let lastMain, lastTour;
  for (let attempt = 1; attempt <= 24; attempt++) {
    try {
      [lastMain, lastTour] = await Promise.all([fetchText(MAIN), fetchText(TOUR)]);
      if (lastMain.response.ok && lastTour.response.ok && mainReady(lastMain.text) && tourReady(lastTour.text)) {
        return { main: lastMain, tour: lastTour, attempt };
      }
      console.log(`Ballard photo/authority program not ready (attempt ${attempt}/24; main=${lastMain.response.status}, tour=${lastTour.response.status}); retrying.`);
    } catch (error) {
      console.log(`Ballard photo/authority readiness attempt ${attempt}/24 failed: ${error.message}`);
    }
    await sleep(5000);
  }
  throw new Error('Ballard interpretive photo v2 + restrained authority programs did not become visible on production');
}

async function checkImage(url) {
  let lastStatus = null;
  let lastType = '';
  for (let attempt = 1; attempt <= 3; attempt++) {
    const response = await fetch(url, {
      method: 'GET',
      redirect: 'follow',
      headers: {
        accept: 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8',
        range: 'bytes=0-1023',
        'user-agent': 'Mozilla/5.0 (compatible; ChrisIzworskiBallardPhotoSmoke/2.0)',
      },
      signal: AbortSignal.timeout(15000),
    });
    lastStatus = response.status;
    lastType = String(response.headers.get('content-type') || '').toLowerCase();
    if (response.ok && lastType.startsWith('image/')) {
      try { await response.body?.cancel(); } catch {}
      return { url, status: response.status, type: lastType, throttled: false };
    }
    try { await response.body?.cancel(); } catch {}
    const providerAutomationBlock = response.status === 403 && (url.includes('media.defense.gov') || url.includes('wikimedia.org'));
    if (![429, 503].includes(response.status) && !providerAutomationBlock) {
      throw new Error(`Ballard interpretive image unavailable: ${url} (${response.status}, ${lastType || 'no content-type'})`);
    }
    await sleep(900 * attempt);
  }
  return { url, status: lastStatus, type: lastType, throttled: true };
}

const live = await waitForPhotoProgram();
const images = [];
for (const url of IMAGE_URLS) {
  images.push(await checkImage(url));
  await sleep(300);
}

console.log(JSON.stringify({
  status: 'ok',
  experience: 'ballard-interpretive-photo-authority-v2',
  attempt: live.attempt,
  mainStatus: live.main.response.status,
  tourStatus: live.tour.response.status,
  mainHasPhotoProgram: mainReady(live.main.text),
  tourHasPhotoAndAuthorityPrograms: tourReady(live.tour.text),
  imageCount: images.length,
  responsiveImages: images.filter(x => !x.throttled).length,
  throttledImages: images.filter(x => x.throttled).length,
  images: images.map(({ url, status, type, throttled }) => ({ url, status, type, throttled })),
}));
