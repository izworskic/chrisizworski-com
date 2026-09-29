// Local server for the Mackinac Island tool: static public/ plus the real API handlers,
// so benchmarks exercise the committed engine code instead of production.
//   node scripts/dev-mackinac-server.mjs [port]
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import {createRequire} from "node:module";

const require = createRequire(import.meta.url);
const ROOT = path.resolve("public");
const PORT = Number(process.argv[2] || process.env.PORT || 8790);
const API = {
  "/api/mackinac-island": [require("../api/fall-color.js"), {view: "mackinac-island"}],
  "/api/mackinac-profile": [require("../api/mackinac-profile.js"), {}],
  "/api/mackinac-origin": [require("../api/mackinac-origin.js"), {}],
  "/api/mackinac-media": [require("../api/mackinac-media.js"), {}]
};
const TYPES = {".html": "text/html; charset=utf-8", ".css": "text/css", ".js": "application/javascript", ".json": "application/json", ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg", ".webp": "image/webp", ".xml": "application/xml"};

function vercelRes(res) {
  res.status = code => { res.statusCode = code; return res; };
  res.json = obj => { if (!res.getHeader("content-type")) res.setHeader("content-type", "application/json"); res.end(JSON.stringify(obj)); return res; };
  res.send = body => { res.end(typeof body === "string" || Buffer.isBuffer(body) ? body : JSON.stringify(body)); return res; };
  return res;
}

http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const api = API[url.pathname.replace(/\/$/, "")];
  if (api) {
    const [handler, extra] = api;
    let raw = "";
    for await (const chunk of req) raw += chunk;
    req.query = {...Object.fromEntries(url.searchParams), ...extra};
    try { req.body = raw ? JSON.parse(raw) : undefined; } catch { req.body = raw; }
    try { await handler(req, vercelRes(res)); } catch (e) { res.statusCode = 500; res.end(JSON.stringify({error: String(e?.message || e)})); }
    return;
  }
  let file = path.join(ROOT, decodeURIComponent(url.pathname));
  if (!file.startsWith(ROOT)) { res.statusCode = 403; return res.end(); }
  if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, "index.html");
  else if (!fs.existsSync(file) && fs.existsSync(file + ".html")) file += ".html";
  if (!fs.existsSync(file)) { res.statusCode = 404; return res.end("not found"); }
  res.setHeader("content-type", TYPES[path.extname(file)] || "application/octet-stream");
  res.setHeader("cache-control", "no-store");
  fs.createReadStream(file).pipe(res);
}).listen(PORT, () => console.log(`mackinac dev server http://localhost:${PORT}/mackinac-island/`));
