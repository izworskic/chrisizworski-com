"use strict";
const fs = require("node:fs");
const path = require("node:path");
const { secureHeaders, requireOwner } = require("../lib/growth/owner-auth");

const file = path.join(__dirname, "../ops/growth-command-center/Revenue-Command-Center.html");
// Only the browser UI is included; Google credentials and stored metrics are not.
const script = String.raw`<script>
(function () {
  "use strict";
  var main = document.getElementById("workspace");
  if (!main) return;
  var notice = document.createElement("section");
  notice.setAttribute("role", "status");
  notice.setAttribute("aria-live", "polite");
  notice.style.cssText = "padding:14px 16px;background:#e5eee7;border:1px solid #b6cdbc;margin:16px 0 0;display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:10px";
  var text = document.createElement("span");
  text.textContent = "Checking private daily reports…";
  var button = document.createElement("button");
  button.type = "button"; button.textContent = "Reload saved report";
  button.style.cssText = "padding:8px 12px;border:1px solid #1d5a50;color:#1d5a50;background:#fff;font-weight:750";
  notice.append(text, button);
  main.insertBefore(notice, main.firstChild);
  async function reload() {
    button.disabled = true;
    text.textContent = "Loading latest private report…";
    try {
      var res = await fetch("/api/growth-command-center?view=report", {
        cache: "no-store", credentials: "same-origin",
        headers: { Accept: "application/json" }
      });
      if (res.status === 404) {
        text.textContent = "No automatic report stored yet. Daily collection must run successfully; CSV import still works.";
        return;
      }
      if (!res.ok) throw new Error("Report unavailable (HTTP " + res.status + ")");
      var result = await res.json();
      if (!window.GrowthCommandCenter || !window.GrowthCommandCenter.loadAutoSnapshot) throw new Error("Dashboard adapter unavailable");
      window.GrowthCommandCenter.loadAutoSnapshot(result);
      var states = Object.keys(result.status || {}).map(function (key) {
        var status = result.status[key] || {};
        return key.toUpperCase() + ": " + (status.state === "ok" ? "connected" : "unavailable");
      });
      var time = result.generatedAt && !isNaN(Date.parse(result.generatedAt))
        ? new Date(result.generatedAt).toLocaleString() : "unknown time";
      text.textContent = "Last collected " + time + " · " + states.join(" · ") +
        ". Only verified sources populate figures. The daily collection is scheduled; this button reloads its last saved result.";
    } catch (err) {
      text.textContent = "Automatic data unavailable: " + err.message + ". Use the CSV import until collection is configured.";
    } finally { button.disabled = false; }
  }
  button.addEventListener("click", reload);
  reload();
})();
</script>`;

module.exports = async function growthDashboard(req, res) {
  secureHeaders(res);
  if (req.method !== "GET") return res.status(405).json({ error: "method-not-allowed" });
  if (!requireOwner(req, res)) return;
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.setHeader("Content-Security-Policy",
    "default-src 'none'; base-uri 'none'; object-src 'none'; img-src 'none'; font-src 'none'; " +
    "script-src 'unsafe-inline'; style-src 'unsafe-inline'; connect-src 'self'; " +
    "form-action 'none'; frame-ancestors 'none'");
  try {
    const html = fs.readFileSync(file, "utf8");
    if (!html.includes("</body>")) throw new Error("Dashboard bundle malformed");
    return res.status(200).send(html.replace("</body>", script + "\n</body>"));
  } catch (error) {
    console.error("growth_dashboard_bundle_unavailable");
    return res.status(503).send("Private dashboard bundle unavailable");
  }
};
