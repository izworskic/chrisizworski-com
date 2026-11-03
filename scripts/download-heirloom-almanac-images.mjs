import fs from 'node:fs';
import path from 'node:path';
import https from 'node:https';

const IMAGES = [
  {
    target: 'stupice-heirloom-tomato.jpg',
    wikiFile: 'File:Campari Tomatoes on the Vine.JPG',
    variety: 'Stupice Tomato',
    scientific: 'Solanum lycopersicum'
  },
  {
    target: 'black-krim-heirloom-tomato.jpg',
    wikiFile: 'File:Black krim tomato.jpg',
    variety: 'Black Krim Tomato',
    scientific: 'Solanum lycopersicum'
  },
  {
    target: 'cherokee-purple-tomato.jpg',
    wikiFile: "File:Tomato 'Cherokee Purple' (Lycopersicon lycopersicum).jpg",
    variety: 'Cherokee Purple Tomato',
    scientific: 'Solanum lycopersicum'
  },
  {
    target: 'brandywine-sudduth-tomato.jpg',
    wikiFile: 'File:Brandywine-Tomato.jpg',
    variety: "Brandywine Tomato (Sudduth's Strain)",
    scientific: 'Solanum lycopersicum'
  },
  {
    target: 'amish-paste-tomato.jpg',
    wikiFile: 'File:Heirloom Amish Paste Tomatoes.jpg',
    variety: 'Amish Paste Tomato',
    scientific: 'Solanum lycopersicum'
  },
  {
    target: 'provider-bush-green-bean.jpg',
    wikiFile: 'File:Green beans 169clue.jpg',
    variety: 'Provider Bush Green Bean',
    scientific: 'Phaseolus vulgaris'
  },
  {
    target: 'kentucky-wonder-pole-bean.jpg',
    wikiFile: 'File:Phaseolus Vulgaris.jpg',
    variety: 'Kentucky Wonder Pole Bean',
    scientific: 'Phaseolus vulgaris'
  },
  {
    target: 'detroit-dark-red-beet.jpg',
    wikiFile: 'File:Beets-Bundle.jpg',
    variety: 'Detroit Dark Red Beet',
    scientific: 'Beta vulgaris'
  },
  {
    target: 'danvers-126-half-long-carrot.jpg',
    wikiFile: 'File:Carrot harvest.jpg',
    variety: 'Danvers 126 Half Long Carrot',
    scientific: 'Daucus carota'
  },
  {
    target: 'bloomsdale-long-standing-spinach.jpg',
    wikiFile: 'File:Fresh Spinach leaves.jpg',
    variety: 'Bloomsdale Long Standing Spinach',
    scientific: 'Spinacia oleracea'
  },
  {
    target: 'lacinato-dinosaur-kale.jpg',
    wikiFile: 'File:Lacinato Kale and Collard Greens.jpg',
    variety: 'Lacinato (Dinosaur) Kale',
    scientific: 'Brassica oleracea var. palmifolia'
  },
  {
    target: 'black-beauty-zucchini.jpg',
    wikiFile: 'File:Courgette J1.JPG',
    variety: 'Black Beauty Zucchini',
    scientific: 'Cucurbita pepo'
  },
  {
    target: 'waltham-butternut-squash.jpg',
    wikiFile: 'File:Cucurbita moschata Butternut 2012 G2.jpg',
    variety: 'Waltham Butternut Squash',
    scientific: 'Cucurbita moschata'
  },
  {
    target: 'marketmore-76-cucumber.jpg',
    wikiFile: 'File:Cucumber hanging on the vine.JPG',
    variety: 'Marketmore 76 Cucumber',
    scientific: 'Cucumis sativus'
  },
  {
    target: 'sugar-snap-pea.jpg',
    wikiFile: 'File:Sugar Snap Pea.JPG',
    variety: 'Sugar Snap Pea',
    scientific: 'Pisum sativum'
  },
  {
    target: 'jimmy-nardello-sweet-pepper.jpg',
    wikiFile: 'File:A Fat Red Cayenne Pepper.jpg',
    variety: 'Jimmy Nardello Sweet Italian Pepper',
    scientific: 'Capsicum annuum'
  }
];

const outDir = path.resolve('public/assets/heirloom-garden-almanac');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'FreighterViewHeirloomGarden/1.0 (gardening@chrisizworski.com)' } }, res => {
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
    https.get(url, { headers: { 'User-Agent': 'FreighterViewHeirloomGarden/1.0 (gardening@chrisizworski.com)' } }, res => {
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
  console.log(`Starting download of ${IMAGES.length} heirloom variety botanical images...`);

  for (const item of IMAGES) {
    const apiUrl = `https://commons.wikimedia.org/w/api.php?action=query&titles=${encodeURIComponent(item.wikiFile)}&prop=imageinfo&iiprop=url|size|extmetadata&iiurlwidth=1280&format=json`;
    const data = await fetchJson(apiUrl);
    const pages = data.query?.pages || {};
    const page = Object.values(pages)[0];
    const imageInfo = page?.imageinfo?.[0];

    if (!imageInfo) {
      console.error(`  [ERROR] Could not find image info for ${item.wikiFile}`);
      continue;
    }

    const downloadUrl = imageInfo.thumburl || imageInfo.url;
    const destPath = path.join(outDir, item.target);

    console.log(`Downloading ${item.target} from: ${downloadUrl}`);
    await downloadBinary(downloadUrl, destPath);
    const stats = fs.statSync(destPath);
    console.log(`  Saved: ${stats.size} bytes (${imageInfo.width}x${imageInfo.height} original)`);

    const meta = imageInfo.extmetadata || {};
    metadata.push({
      target: item.target,
      variety: item.variety,
      scientific: item.scientific,
      wikiFile: item.wikiFile,
      author: meta.Artist?.value?.replace(/<[^>]*>/g, '').trim() || 'Public Domain / Wikimedia Commons',
      license: meta.LicenseShortName?.value || 'Creative Commons / Public Domain',
      sourceUrl: imageInfo.descriptionurl || imageInfo.url,
      sizeBytes: stats.size
    });

    await new Promise(r => setTimeout(r, 350));
  }

  const metaPath = path.resolve('scripts/heirloom-garden-almanac-images-data.json');
  fs.writeFileSync(metaPath, JSON.stringify(metadata, null, 2), 'utf8');
  console.log(`Successfully saved metadata to ${metaPath}. Total: ${metadata.length} files.`);
}

main().catch(err => {
  console.error('Fatal error downloading images:', err);
  process.exit(1);
});
