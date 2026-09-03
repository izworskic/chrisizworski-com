#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import path from "node:path";

const root=path.resolve(import.meta.dirname,"..");
const [dedicated,main,winter,robots,vercel]=await Promise.all([
  readFile(path.join(root,"public/sitemap-white-christmas.xml"),"utf8"),
  readFile(path.join(root,"public/sitemap.xml"),"utf8"),
  readFile(path.join(root,"public/sitemap-winter.xml"),"utf8"),
  readFile(path.join(root,"public/robots.txt"),"utf8"),
  readFile(path.join(root,"vercel.json"),"utf8").then(JSON.parse)
]);
const urls=[...dedicated.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m=>m[1]);
const failures=[];
if(urls.length!==43) failures.push(`dedicated White Christmas sitemap must contain 43 canonical URLs; found ${urls.length}`);
if(new Set(urls).size!==urls.length) failures.push("dedicated White Christmas sitemap contains duplicate URLs");
for(const url of urls){
  if(!url.startsWith("https://chrisizworski.com/")) failures.push(`non-canonical host in White Christmas sitemap: ${url}`);
  if(url.includes("?")) failures.push(`query-string URL must not be indexed: ${url}`);
  if(url.includes("vercel.app")||url.includes("/api/")||url.includes("/assets/")) failures.push(`non-indexable surface in White Christmas sitemap: ${url}`);
  if(!main.includes(`<loc>${url}</loc>`)) failures.push(`White Christmas URL missing from main sitemap: ${url}`);
  if(!winter.includes(`<loc>${url}</loc>`)) failures.push(`White Christmas URL missing from winter sitemap: ${url}`);
}
if(!robots.includes("Sitemap: https://chrisizworski.com/sitemap-white-christmas.xml")) failures.push("robots.txt does not advertise dedicated White Christmas sitemap");

const rewrites=vercel.rewrites||[];
const bySource=new Map(rewrites.map(r=>[r.source,r.destination]));
for(const source of [
  "/national-tools/white-christmas/cities",
  "/national-tools/white-christmas/cities/",
  "/national-tools/white-christmas/cities/:slug",
  "/national-tools/white-christmas/cities/:slug/",
  "/national-tools/white-christmas/regions",
  "/national-tools/white-christmas/regions/",
  "/national-tools/white-christmas/regions/:slug",
  "/national-tools/white-christmas/regions/:slug/",
  "/national-tools/white-christmas/forecast",
  "/national-tools/white-christmas/forecast/"
]){
  if(!bySource.has(source)) failures.push(`indexed White Christmas family lacks explicit shell rewrite: ${source}`);
}
const result={status:failures.length?"failed":"passed",urlCount:urls.length,failures};
console.log(JSON.stringify(result,null,2));
if(failures.length) process.exit(1);
