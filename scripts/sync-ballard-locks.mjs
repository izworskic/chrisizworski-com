import fs from 'node:fs';
import path from 'node:path';

const sourceRoot = path.resolve('node_modules/national-ballard-locks');
const sourcePage = path.join(sourceRoot, 'public', 'ballard-locks');
const sourceApi = path.join(sourceRoot, 'api', 'ballard-locks.js');
const destPage = path.resolve('public/ballard-locks');
const destApi = path.resolve('api/ballard-locks.js');

if (!fs.existsSync(sourcePage)) throw new Error(`Ballard sync: missing ${sourcePage}`);
if (!fs.existsSync(sourceApi)) throw new Error(`Ballard sync: missing ${sourceApi}`);

fs.rmSync(destPage, { recursive: true, force: true });
fs.mkdirSync(path.dirname(destPage), { recursive: true });
fs.cpSync(sourcePage, destPage, { recursive: true });
fs.copyFileSync(sourceApi, destApi);

const page = fs.readFileSync(path.join(destPage, 'index.html'), 'utf8');
if (!page.includes('https://chrisizworski.com/ballard-locks/')) throw new Error('Ballard sync: canonical production URL missing');
if (!page.includes('/api/ballard-locks')) throw new Error('Ballard sync: live API hook missing');

console.log('Synced Ballard Locks from national-ballard-locks authoritative repo.');
