import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.join(__dirname, '..');

const targets = [
  { name: 'yosemite-horsetail-firefall.jpg', fileTitle: 'File:Yosemite National Park - Fire Falls - Flickr - RuggyBearLA.jpg' },
  { name: 'blue-spring-manatees.jpg', fileTitle: 'File:Manatees in Blue Spring State Park (8501212290).jpg' },
  { name: 'death-valley-superbloom.jpg', fileTitle: 'File:Desert-gold Geraea canescens field-saltflat-mtn.jpg' },
  { name: 'elkmont-synchronous-fireflies.jpg', fileTitle: 'File:Photinus carolinus Great Smoky Mountains.jpg' },
  { name: 'zion-narrows-flash-window.jpg', fileTitle: 'File:The Virgin River at the entrance to The Narrows, Zion National Park, Utah.jpg' },
  { name: 'glacier-going-to-the-sun-opening.jpg', fileTitle: 'File:Clements Mountain Over Logan Pass and Going-to-the-Sun Road (43983637595).jpg' },
  { name: 'katmai-brooks-falls-bears.jpg', fileTitle: 'File:A brown bear at Brooks Falls captures a salmon in its jaws.jpg' },
  { name: 'columbia-salmon-leap.jpg', fileTitle: 'File:Bonneville Dam,OR, Fish Ladder View, 2006 (6512156917).jpg' },
  { name: 'yellowstone-geysers.jpg', fileTitle: 'File:Yellowstone National Park (WY, USA), Old Faithful Geyser -- 2022 -- 2599.jpg' },
  { name: 'rocky-mountain-elk-rut.jpg', fileTitle: 'File:Elk in Rocky Mountain National Park.jpg' },
  { name: 'acadia-cadillac-first-sunrise.jpg', fileTitle: 'File:Cadillac Mountain Sunrise, Acadia National Park.jpg' },
  { name: 'haleakala-summit-inversion.jpg', fileTitle: 'File:Haleakala Sunrise Maui Hawaii Haleakala National Park - Flickr - Mferbfriske.jpg' }
];

async function getImageInfo(title) {
  const url = 'https://commons.wikimedia.org/w/api.php?action=query&titles=' + encodeURIComponent(title) + '&prop=imageinfo&iiprop=url|extmetadata|size&iiurlwidth=1200&format=json';
  const res = await fetch(url, { headers: { 'User-Agent': 'ChrisIzworskiBot/1.0 (https://chrisizworski.com)' } });
  const data = await res.json();
  const pages = data.query.pages;
  for (const k in pages) {
    if (pages[k].imageinfo && pages[k].imageinfo[0]) {
      const info = pages[k].imageinfo[0];
      let artist = info.extmetadata?.Artist?.value || 'Public Domain / Wikimedia Commons';
      artist = artist.replace(/<[^>]+>/g, '').trim();
      return {
        thumburl: info.thumburl || info.url,
        url: info.url,
        artist,
        license: info.extmetadata?.LicenseShortName?.value || 'Public Domain',
        licenseUrl: info.extmetadata?.LicenseUrl?.value || 'https://commons.wikimedia.org'
      };
    }
  }
  return null;
}

async function downloadImage(url, destPath) {
  const res = await fetch(url, { headers: { 'User-Agent': 'ChrisIzworskiBot/1.0 (https://chrisizworski.com)' } });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  const arrayBuffer = await res.arrayBuffer();
  fs.writeFileSync(destPath, Buffer.from(arrayBuffer));
}

async function run() {
  const output = {};
  const imagesDir = path.join(root, 'public', 'assets', 'national-park-phenomena');
  if (!fs.existsSync(imagesDir)) fs.mkdirSync(imagesDir, { recursive: true });

  for (const t of targets) {
    console.log('Querying:', t.fileTitle);
    const info = await getImageInfo(t.fileTitle);
    if (!info) {
      console.error('FAILED TO FIND INFO FOR:', t.fileTitle);
      continue;
    }
    output[t.name] = { ...info, fileTitle: t.fileTitle };
    console.log('Found info for', t.name, '=> downloading thumb...');
    const localDest = path.join(imagesDir, t.name);
    try {
      await downloadImage(info.thumburl, localDest);
      const sz = fs.statSync(localDest).size;
      console.log(`Downloaded ${t.name} (${Math.round(sz / 1024)} KB)`);
    } catch (err) {
      console.error('Download error for', t.name, err.message);
    }
  }

  const outPath = path.join(root, 'scripts', 'national-park-images-data.json');
  fs.writeFileSync(outPath, JSON.stringify(output, null, 2));
  console.log('All done! Saved metadata to', outPath);
}

run().catch(console.error);
