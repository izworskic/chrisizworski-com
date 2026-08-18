#!/usr/bin/env node
import {readFile,writeFile} from 'node:fs/promises';
import path from 'node:path';
const root=path.resolve(import.meta.dirname,'..');
const file=path.join(root,'public/sitemap.xml');
let xml=await readFile(file,'utf8');
const url='https://chrisizworski.com/great-lakes/';
const escaped=url.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
const re=new RegExp(`(<loc>${escaped}<\\/loc>\\s*<lastmod>)[^<]+(<\\/lastmod>)`);
if(!re.test(xml))throw new Error(`Missing sitemap entry for ${url}`);
xml=xml.replace(re,'$12026-08-18$2');
await writeFile(file,xml);
console.log('Great Lakes sitemap freshness aligned');
