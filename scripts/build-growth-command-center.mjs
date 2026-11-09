import { readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve, join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const directory = resolve(dirname(fileURLToPath(import.meta.url)), "../ops/growth-command-center");
const output = process.argv.find((v) => v.startsWith("--output="))?.slice("--output=".length)
  || join(tmpdir(), "chris-revenue-command-center-private.html");

let html = await readFile(join(directory, "index.html"), "utf8");
const styles = await readFile(join(directory, "style.css"), "utf8");
const engine = await readFile(join(directory, "engine.js"), "utf8");
const app = await readFile(join(directory, "app.js"), "utf8");

const replaceExactlyOnce = (needle, replacement) => {
  if (html.split(needle).length !== 2) throw new Error("Unexpected HTML template: " + needle);
  html = html.replace(needle, replacement);
};

replaceExactlyOnce('<link rel="stylesheet" href="./style.css">', "<style>\n" + styles + "\n</style>");
replaceExactlyOnce('<script defer src="./engine.js"></script>', "<script>\n" + engine + "\n</script>");
replaceExactlyOnce('<script defer src="./app.js"></script>', "<script>\n" + app + "\n</script>");

if (html.includes('src="./') || html.includes('href="./')) throw new Error("Unbundled external assets");
await writeFile(output, html, { mode: 0o600, flag: "w" });
console.log("Private Revenue Command Center generated: " + output);
console.log("Open this local file in a browser. Do not upload it to the public site.");
