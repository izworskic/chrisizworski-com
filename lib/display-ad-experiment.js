'use strict';

const { eligible } = require('./adsense-eligibility');
const config = require('../config/display-ad-experiment.json');
const MARKER = /<!-- display-ad-pilot:(?:head|placement):start -->[\s\S]*?<!-- display-ad-pilot:(?:head|placement):end -->\n?/g;

// These are inline intentionally: Google's exact-size responsive-ad guidance
// does not officially support sizing the ad unit in an external stylesheet.
const styles = `<style id="display-ad-pilot-style">
.display-ad-pilot{display:none;box-sizing:border-box;width:100%;margin:32px auto;padding:12px 0 16px;border-top:1px solid #cbd5df;border-bottom:1px solid #cbd5df;text-align:center;clear:both}
.display-ad-pilot__label{display:block;margin:0 0 8px;font:10px/14px system-ui,sans-serif;letter-spacing:.08em;text-transform:uppercase;color:#64748b}
.display-ad-pilot ins.display-ad-pilot__unit{display:block;width:300px;height:50px;margin:0 auto;background:transparent;text-decoration:none}
@media(min-width:360px){.display-ad-pilot{display:block;min-height:102px}}
@media(min-width:380px){.display-ad-pilot ins.display-ad-pilot__unit{width:320px}}
@media(min-width:540px){.display-ad-pilot{min-height:112px}.display-ad-pilot ins.display-ad-pilot__unit{width:468px;height:60px}}
@media(min-width:800px){.display-ad-pilot{min-height:142px}.display-ad-pilot ins.display-ad-pilot__unit{width:728px;height:90px}}
.display-ad-pilot[hidden]{display:none}
@media print{.display-ad-pilot{display:none}}
</style>`;

function strip(html) { return html.replace(MARKER, ''); }

function render(html, route, settings = config) {
  const clean = strip(html);
  const placement = settings.placements.find(p => p.route === route && p.enabled);
  if (!settings.enabled || !placement || !eligible(clean, route)) return clean;
  if (!/^ca-pub-\d+$/.test(settings.publisherId) || !/^\d+$/.test(settings.slotId) ||
      !/^[a-z0-9-]+$/.test(settings.id) || !/^[a-z0-9-]+$/.test(placement.id)) {
    throw new Error('Invalid display-ad pilot configuration');
  }
  if (clean.split(placement.before).length !== 2 || !clean.includes('</head>')) {
    throw new Error(`Display-ad anchor missing or ambiguous: ${route}. Review placement before release.`);
  }
  if (clean.includes(`data-ad-slot="${settings.slotId}"`)) {
    throw new Error(`Unmanaged copy of pilot ad slot on ${route}; consolidate it first.`);
  }
  const head = `<!-- display-ad-pilot:head:start -->${styles}
<script defer src="/assets/display-ad-pilot.js?v=1"></script>
<!-- display-ad-pilot:head:end -->\n`;
  const block = `<!-- display-ad-pilot:placement:start -->
<aside class="display-ad-pilot" aria-label="Advertisement" data-ad-experiment="${settings.id}" data-ad-placement="${placement.id}">
  <span class="display-ad-pilot__label">Advertisement</span>
  <ins class="adsbygoogle display-ad-pilot__unit" style="display:block" data-ad-client="${settings.publisherId}" data-ad-slot="${settings.slotId}"></ins>
</aside>
<!-- display-ad-pilot:placement:end -->\n`;
  return clean.replace('</head>', head + '</head>').replace(placement.before, block + placement.before);
}

module.exports = { render, strip, config };
