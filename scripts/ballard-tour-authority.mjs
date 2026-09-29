// Restrained primary-authority layer for the Ballard Locks tour.
// Interpretation remains on-site and human; changing operational facts link to primary sources.

export const BALLARD_AUTHORITIES = {
  usace: 'https://www.nws.usace.army.mil/Missions/Civil-Works/Locks-and-Dams/Chittenden-Locks/Fish-Ladder/',
  wdfw: 'https://wdfw.wa.gov/fishing/reports/counts/lake-washington',
  noaa: 'https://tidesandcurrents.noaa.gov/stationhome.html?id=9447130',
  nws: 'https://forecast.weather.gov/MapClick.php?lat=47.66556&lon=-122.39722',
};

const authorityCss = `
.authority-inline{display:inline-block;margin-top:7px;font:800 .65rem Arial,sans-serif;color:#0a6676;text-decoration:none}.authority-inline:hover{text-decoration:underline}.authority-layer{border-top:1px solid #ddd8ce;padding-top:28px}.authority-layer h2{margin-bottom:7px}.authority-intro{margin:0 0 13px;max-width:850px;color:#5d7378;font-size:.85rem}.authority-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:9px}.authority-link{display:block;padding:12px 13px;background:#fff;border:1px solid #d9d5cd;border-radius:11px;text-decoration:none;color:#24474f;transition:.15s}.authority-link:hover{border-color:#8cadaa;transform:translateY(-1px)}.authority-link strong{display:block;font:800 .78rem Arial,sans-serif;color:#174954}.authority-link span{display:block;margin-top:4px;font:500 .72rem/1.35 Arial,sans-serif;color:#677a7e}.authority-note{margin-top:10px;color:#748589;font:500 .72rem/1.45 Arial,sans-serif}@media(max-width:760px){.authority-grid{grid-template-columns:1fr 1fr}}@media(max-width:480px){.authority-grid{grid-template-columns:1fr}.authority-link{padding:11px 12px}}
`;

function replaceOrThrow(html, needle, replacement, label) {
  if (!html.includes(needle)) throw new Error(`Ballard authority layer: insertion point missing (${label})`);
  return html.replace(needle, replacement);
}

export function enhanceBallardTourAuthority(source) {
  let html = source;
  html = replaceOrThrow(html, '</style>', `${authorityCss}</style>`, 'tour CSS');

  const access = '<div class="cell"><div class="kicker">Access</div><div class="value" id="access">Checking hours</div><div class="detail" id="access-detail">Grounds and viewing room</div></div>';
  const accessWithAuthority = `<div class="cell"><div class="kicker">Access</div><div class="value" id="access">Checking hours</div><div class="detail" id="access-detail">Grounds and viewing room</div><a class="authority-inline" data-authority="usace-access" href="${BALLARD_AUTHORITIES.usace}" target="_blank" rel="noopener noreferrer">Verify access with USACE ↗</a></div>`;
  html = replaceOrThrow(html, access, accessWithAuthority, 'access authority link');

  const research = '<section class="section source"><h2>Research basis</h2>';
  const authority = `<section class="section authority-layer" data-authority-layer="ballard-tour-v1"><div class="kicker">Primary-source truth</div><h2>Official sources</h2><p class="authority-intro">Use the guide to understand what you are seeing. Use these primary sources when you need the latest operating facts, fish counts, tide predictions or weather.</p><div class="authority-grid"><a class="authority-link" data-authority="usace" href="${BALLARD_AUTHORITIES.usace}" target="_blank" rel="noopener noreferrer"><strong>USACE · Locks & access ↗</strong><span>Grounds, fish-ladder viewing, parking, tours and official facility information.</span></a><a class="authority-link" data-authority="wdfw" href="${BALLARD_AUTHORITIES.wdfw}" target="_blank" rel="noopener noreferrer"><strong>WDFW · Salmon counts ↗</strong><span>Published Ballard Locks sockeye, Chinook and coho count data.</span></a><a class="authority-link" data-authority="noaa" href="${BALLARD_AUTHORITIES.noaa}" target="_blank" rel="noopener noreferrer"><strong>NOAA · Tides ↗</strong><span>Official tide observations and predictions for the nearby Seattle station.</span></a><a class="authority-link" data-authority="nws" href="${BALLARD_AUTHORITIES.nws}" target="_blank" rel="noopener noreferrer"><strong>NWS · Weather ↗</strong><span>Official National Weather Service forecast for the Locks area.</span></a></div><p class="authority-note">Interpretation on this tour is explanatory. Posted signs, closures and on-site USACE staff direction always control at the facility.</p></section>\n`;
  html = replaceOrThrow(html, research, `${authority}${research}`, 'official sources strip');

  return html;
}
