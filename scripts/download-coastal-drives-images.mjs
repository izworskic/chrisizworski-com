import fs from 'node:fs';
import path from 'node:path';
import https from 'node:https';

const IMAGES = [
  {
    target: 'm22-leelanau-scenic-byway.jpg',
    wikiFile: 'File:Dune Overlook in the Sleeping Bear Dunes National Lakeshore.jpg',
    title: 'M-22 Leelanau Peninsula & Sleeping Bear Dunes',
    route: 'M-22'
  },
  {
    target: 'm119-tunnel-of-trees.jpg',
    wikiFile: 'File:Road curve in the autumn (Unsplash).jpg',
    title: 'M-119 Tunnel of Trees',
    route: 'M-119'
  },
  {
    target: 'm26-brockway-mountain-drive.jpg',
    wikiFile: 'File:Copper Harbor from BWMD.jpg',
    title: 'M-26 & Brockway Mountain Drive',
    route: 'M-26 / Brockway'
  },
  {
    target: 'us2-cut-river-bridge-coast.jpg',
    wikiFile: 'File:Cut River Bridge 2.JPG',
    title: 'US-2 Top of the Lake Scenic Byway',
    route: 'US-2'
  },
  {
    target: 'us23-tawas-point-sunrise-coast.jpg',
    wikiFile: 'File:Tawaspoint3.jpg',
    title: 'US-23 Huron Shores Sunrise Byway',
    route: 'US-23'
  },
  {
    target: 'm28-seney-stretch-boreal-drive.jpg',
    wikiFile: 'File:Sunset over Lake Superior, near Marquette, Michigan.jpg',
    title: 'M-28 Superior Heartland & Coastal Shore',
    route: 'M-28'
  },
  {
    target: 'm123-tahquamenon-scenic-byway.jpg',
    wikiFile: 'File:Upper Tahquamenon Falls (27927183951).jpg',
    title: 'M-123 Tahquamenon Byway & Whitefish Bay',
    route: 'M-123'
  },
  {
    target: 'm134-les-cheneaux-islands-byway.jpg',
    wikiFile: 'File:Morning - Les Cheneaux Islands.jpg',
    title: 'M-134 Les Cheneaux Islands Scenic Byway',
    route: 'M-134'
  },
  {
    target: 'm107-porcupine-mountains-escarpment.jpg',
    wikiFile: 'File:Lake of the Clouds, Porcupine Mountains, MI.jpg',
    title: 'M-107 & Porkies Escarpment Coastal Drive',
    route: 'M-107'
  },
  {
    target: 'm37-old-mission-peninsula-drive.jpg',
    wikiFile: 'File:Mission Point Lighthouse (84490305).jpeg',
    title: 'M-37 Old Mission Peninsula Ridge Drive',
    route: 'M-37'
  },
  {
    target: 'm64-black-river-harbor-scenic-drive.jpg',
    wikiFile: 'File:Black River Harbor Michigan.jpg',
    title: 'M-64 & Black River Harbor Scenic Byway',
    route: 'M-64'
  },
  {
    target: 'us31-charlevoix-grand-traverse-coast.jpg',
    wikiFile: 'File:Charlevoix South Pier Light (45346455522).jpg',
    title: 'US-31 Grand Traverse & Little Traverse Bays',
    route: 'US-31'
  }
];

const outDir = path.resolve('public/assets/michigan-coastal-drives');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'MichiganCoastalDrivesBot/1.0 (travel@chrisizworski.com)' } }, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); } catch (e) { reject(e); }
      });
    }).on('error', reject);
  });
}

function downloadBinary(url, dest) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'MichiganCoastalDrivesBot/1.0 (travel@chrisizworski.com)' } }, res => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return downloadBinary(res.headers.location, dest).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) {
        return reject(new Error(`Failed to download ${url}: status ${res.statusCode}`));
      }
      const stream = fs.createWriteStream(dest);
      res.pipe(stream);
      stream.on('finish', () => stream.close(resolve));
      stream.on('error', reject);
    }).on('error', reject);
  });
}

async function main() {
  const metadata = [];
  for (const item of IMAGES) {
    const apiUrl = `https://commons.wikimedia.org/w/api.php?action=query&titles=${encodeURIComponent(item.wikiFile)}&prop=imageinfo&iiprop=url|size|extmetadata&iiurlwidth=1280&format=json`;
    const data = await fetchJson(apiUrl);
    const pages = data.query?.pages || {};
    const page = Object.values(pages)[0];
    const imageInfo = page?.imageinfo?.[0];

    if (!imageInfo) {
      console.error(`  Could not find image info for ${item.wikiFile}`);
      continue;
    }

    // Prefer the 1280px thumb if available to keep fast load times
    const downloadUrl = imageInfo.thumburl || imageInfo.url;
    const destPath = path.join(outDir, item.target);

    console.log(`Downloading ${item.target} from: ${downloadUrl}`);
    await downloadBinary(downloadUrl, destPath);
    const stats = fs.statSync(destPath);
    console.log(`  Saved: ${stats.size} bytes`);

    const meta = imageInfo.extmetadata || {};
    metadata.push({
      target: item.target,
      route: item.route,
      title: item.title,
      wikiFile: item.wikiFile,
      author: meta.Artist?.value?.replace(/<[^>]*>/g, '').trim() || 'Public Domain / Wikimedia',
      license: meta.LicenseShortName?.value || 'Creative Commons / Public Domain',
      sourceUrl: imageInfo.descriptionurl || imageInfo.url,
      sizeBytes: stats.size
    });

    await new Promise(r => setTimeout(r, 400));
  }

  const metaPath = path.resolve('scripts/michigan-coastal-drives-images-data.json');
  fs.writeFileSync(metaPath, JSON.stringify(metadata, null, 2), 'utf8');
  console.log(`Saved metadata to ${metaPath}. Total: ${metadata.length} files.`);
}

main().catch(err => {
  console.error('Fatal error in downloader:', err);
  process.exit(1);
});
