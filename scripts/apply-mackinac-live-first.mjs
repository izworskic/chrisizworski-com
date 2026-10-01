import fs from 'node:fs';

const PAGE = 'public/mackinac-bridge-live/index.html';
const MARK = '2026-10-01';

export function prioritizeMackinacLiveStatus(html) {
  const statusNeedle = 'id="statusCard"';
  const directNeedle = 'id="mackinac-conditions-answer"';
  const statusAt = html.indexOf(statusNeedle);
  const directAt = html.indexOf(directNeedle);

  if (statusAt < 0 || directAt < 0) {
    throw new Error('Mackinac live-first enhancer: required status/direct-answer section missing');
  }

  // Already live-first: do nothing. This keeps the deployment transform idempotent.
  if (statusAt < directAt) return html;

  const sectionStart = html.lastIndexOf('<section', statusAt);
  const sectionEndStart = html.indexOf('</section>', statusAt);
  if (sectionStart < 0 || sectionEndStart < 0) {
    throw new Error('Mackinac live-first enhancer: could not bound official status section');
  }

  const sectionEnd = sectionEndStart + '</section>'.length;
  const section = html.slice(sectionStart, sectionEnd)
    .replace('<section', `<section data-live-first="${MARK}"`);
  const withoutStatus = html.slice(0, sectionStart) + html.slice(sectionEnd);

  const newDirectAt = withoutStatus.indexOf(directNeedle);
  const directSectionStart = withoutStatus.lastIndexOf('<section', newDirectAt);
  if (newDirectAt < 0 || directSectionStart < 0) {
    throw new Error('Mackinac live-first enhancer: direct-answer insertion point missing');
  }

  return withoutStatus.slice(0, directSectionStart) + section + '\n\n' + withoutStatus.slice(directSectionStart);
}

export function applyMackinacLiveFirst(root = '.') {
  const file = `${root}/${PAGE}`;
  const before = fs.readFileSync(file, 'utf8');
  const after = prioritizeMackinacLiveStatus(before);
  if (after !== before) fs.writeFileSync(file, after);
  return after !== before;
}
