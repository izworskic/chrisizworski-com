#!/usr/bin/env node
// Forward an agent's browser command to our pinned, ignored local installation.
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const binary=path.join(root,'.agent-tools','agent-browser','node_modules','.bin',process.platform==='win32'?'agent-browser.cmd':'agent-browser');
if(!fs.existsSync(binary)) {
  console.error('Agent Browser is missing. Run: node scripts/setup-agent-browser.mjs');
  process.exitCode=2;
} else {
  const result=spawnSync(binary,process.argv.slice(2),{cwd:root,stdio:'inherit',env:{...process.env,AGENT_BROWSER_NO_WEBMCP:'1'},shell:process.platform==='win32'});
  if(result.error) console.error(result.error.message);
  process.exitCode=result.status ?? 1;
}
