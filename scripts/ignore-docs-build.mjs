import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

// Only internal documentation is excluded. Unknown paths and missing history build.
export function documentationOnly(paths) {
  return paths.length > 0 && paths.every(file =>
    file === 'README.md' || file === 'AGENTS.md' ||
    /^docs\/.+\.md$/.test(file));
}

export function shouldSkipBuild({ previous, current = 'HEAD', cwd = process.cwd() } = {}) {
  if (!/^[a-f0-9]{40}$/i.test(previous || '') || !/^(HEAD|[a-f0-9]{40})$/i.test(current)) return false;
  try {
    execFileSync('git', ['merge-base', '--is-ancestor', previous, current], { cwd, stdio: 'pipe' });
    const changed = execFileSync('git', ['diff', '--name-only', '--no-renames', '-z', previous, current], { cwd, encoding: 'utf8' });
    return documentationOnly(changed.split('\0').filter(Boolean));
  } catch { return false; }
}

if (import.meta.url === pathToFileURL(process.argv[1] || '').href) {
  const skip = shouldSkipBuild({ previous: process.env.VERCEL_GIT_PREVIOUS_SHA, current: process.env.VERCEL_GIT_COMMIT_SHA || 'HEAD' });
  console.log(skip ? 'Skip: only internal Markdown documentation changed.' : 'Build: deployable changes or uncertain history.');
  // Vercel's ignored-build contract is inverted: 0 skips, 1 builds.
  process.exit(skip ? 0 : 1);
}
