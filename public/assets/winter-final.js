(function () {
  "use strict";

  var pathname = window.location.pathname.replace(/\/+$/, "") || "/";
  if (pathname !== "/michigan-cross-country-skiing") return;
  if (document.getElementById("xc-decision-desk")) return;

  var decisionStrip = document.querySelector(".decision-strip");
  var cameraSection = document.querySelector(".camera-section");
  if (!decisionStrip || !cameraSection) return;

  var style = document.createElement("style");
  style.textContent =
    ".xc-decision-desk{padding-top:46px}.decision-shortcuts,.region-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:15px;margin-top:25px}" +
    ".decision-shortcuts article,.region-grid article{background:#fff;border:1px solid var(--line);border-radius:18px;padding:20px;box-shadow:0 8px 24px rgba(13,53,47,.05)}" +
    ".decision-shortcuts article>span{font:800 11px/1.2 system-ui,sans-serif;letter-spacing:.09em;text-transform:uppercase;color:#55716d}" +
    ".decision-shortcuts h3,.region-grid h3{font-size:22px;margin:12px 0 8px}.decision-shortcuts p,.region-grid p{font-size:15px;color:var(--muted)}" +
    ".decision-shortcuts a,.region-grid a{font:800 12px/1.35 system-ui,sans-serif}.regional-intent{border-block:1px solid var(--line);background:rgba(255,255,255,.58)}" +
    "@media(max-width:760px){.decision-shortcuts,.region-grid{grid-template-columns:1fr}}";
  document.head.appendChild(style);

  decisionStrip.insertAdjacentHTML(
    "afterend",
    '<section class="section xc-decision-desk" id="xc-decision-desk"><div class="wrap">' +
      '<p class="eyebrow">Today’s Michigan XC decision desk</p>' +
      '<h2>Start with the constraint that can change the drive</h2>' +
      '<p class="section-intro">This is a shortlist, not a weather-generated trail rating. Check the live regional snow signal first, then use the named operator or groomer as trail truth before leaving.</p>' +
      '<div class="decision-shortcuts">' +
        '<article><span>Low-snow Lower Peninsula</span><h3>Lower Peninsula snow is marginal</h3><p>Start with Huron Meadows or Forbush Corner because both publish current trail information and have snowmaking capability. Weather can screen the trip; the facility confirms the surface.</p><p><a href="https://xcski.chrisizworski.com/" data-track-tool="xc-ski-live" data-placement="xc-decision-low-snow">Check live snow →</a> · <a href="#trail-picks">Compare the two options ↓</a></p></article>' +
        '<article><span>Northern Lower Peninsula</span><h3>Grayling, Frederic or Roscommon</h3><p>Use the Grayling-area snow signal to decide whether the snowbelt is plausible, then compare Forbush Corner and Tisdale Triangle and open the latest operator or groomer report.</p><p><a href="https://xcski.chrisizworski.com/" data-track-tool="xc-ski-live" data-placement="xc-decision-grayling">Check live snow →</a> · <a href="#trail-picks">Compare nearby trails ↓</a></p></article>' +
        '<article><span>Grand Traverse</span><h3>Traverse City</h3><p>Vasa Pathway is the primary reference in this statewide set. Check regional snow, then use TART Trails for the latest maintained-pathway information before the drive.</p><p><a href="https://xcski.chrisizworski.com/" data-track-tool="xc-ski-live" data-placement="xc-decision-traverse">Check live snow →</a> · <a href="https://traversetrails.org/trails/vasa-pathway/" target="_blank" rel="noopener" data-placement="xc-decision-traverse-source">Open Vasa source ↗</a></p></article>' +
        '<article><span>Upper Peninsula</span><h3>Upper Peninsula trip</h3><p>Blueberry Ridge gives Marquette a groomed reference with a lighted loop; Algonquin covers Sault Ste. Marie. Use the live snow tool to screen the region, then verify the chosen trail locally.</p><p><a href="https://xcski.chrisizworski.com/" data-track-tool="xc-ski-live" data-placement="xc-decision-up">Check live snow →</a> · <a href="#trail-picks">Compare U.P. trails ↓</a></p></article>' +
      '</div></div></section>'
  );

  cameraSection.insertAdjacentHTML(
    "beforebegin",
    '<section class="section regional-intent" id="ski-by-region"><div class="wrap">' +
      '<p class="eyebrow">Michigan XC by region</p><h2>Where to cross-country ski in Michigan by region</h2>' +
      '<p class="section-intro">Use these regional starting points to narrow the drive, then use the live snow signal and the trail’s own condition source. These shortcuts reinforce the existing statewide authority page instead of creating thin competing URLs.</p>' +
      '<div class="region-grid">' +
        '<article><h3>Cross-country skiing near Traverse City</h3><p>Start with the Vasa Pathway, where TART Trails maintains the ski system. The trail page below carries the fixed system facts; TART is the better place for the latest maintained-trail information.</p><a href="#trail-picks">See Vasa in the Michigan comparison ↓</a></article>' +
        '<article><h3>Cross-country skiing near Grayling, Frederic and Roscommon</h3><p>Forbush Corner and Tisdale Triangle cover two different northern Lower Peninsula choices, with a regional Grayling camera available as snow context. Confirm grooming separately.</p><a href="#live-visual-heading">Check the Grayling snow view ↓</a></article>' +
        '<article><h3>Cross-country skiing near Marquette and in the Upper Peninsula</h3><p>Blueberry Ridge is the Marquette reference in this set, while Algonquin covers Sault Ste. Marie. Both belong in the U.P. shortlist when the live snow signal supports the drive.</p><a href="#trail-picks">Compare U.P. trail systems ↓</a></article>' +
        '<article><h3>Cross-country skiing in southeast Michigan</h3><p>Huron Meadows is the strongest southern reference here because it combines classic and skate grooming with a snowmaking loop. Use its official winter report for the actual trail surface.</p><a href="#trail-picks">See the southeast Michigan option ↓</a></article>' +
      '</div></div></section>'
  );

  if (!document.querySelector('script[data-winter-funnel-loader]')) {
    var funnel = document.createElement("script");
    funnel.src = "/assets/winter-funnel.js";
    funnel.defer = true;
    funnel.dataset.winterFunnelLoader = "xc";
    document.body.appendChild(funnel);
  }
})();
