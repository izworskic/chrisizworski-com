(function () {
  "use strict";

  var ORIGIN = "https://chrisizworski.com";
  var CAMPAIGN = "chris_tool_widget";

  var TOOLS = {
    aurora: {
      title: "Northern Lights Michigan",
      href: ORIGIN + "/northern-lights-michigan/",
      eyebrow: "Michigan aurora",
      description: "Live NOAA-based aurora planning for Michigan tonight.",
      endpoint: ORIGIN + "/api/aurora",
      liveLabel: function (data) {
        var current = Number(data && data.forecast && data.forecast.current);
        var peak = Number(data && data.forecast && data.forecast.peak_24h);
        var parts = [];
        if (Number.isFinite(current)) parts.push("Current Kp " + current.toFixed(1));
        if (Number.isFinite(peak)) parts.push("24h peak Kp " + peak.toFixed(1));
        return parts.join(" · ");
      }
    },
    "mackinac-bridge": {
      title: "Mackinac Bridge Live",
      href: ORIGIN + "/mackinac-bridge-live/",
      eyebrow: "Straits conditions",
      description: "Official bridge status, current wind and approach-road context.",
      endpoint: ORIGIN + "/api/mackinac",
      liveLabel: function (data) {
        var parts = [];
        if (data && data.official && data.official.title) parts.push(String(data.official.title));
        var wind = Number(data && data.current_wind && data.current_wind.wind_mph);
        var gust = Number(data && data.current_wind && data.current_wind.gust_mph);
        if (Number.isFinite(wind)) {
          var windText = "Wind " + Math.round(wind) + " mph";
          if (Number.isFinite(gust) && gust > wind) windText += ", gust " + Math.round(gust);
          parts.push(windText);
        }
        return parts.join(" · ");
      }
    },
    buoys: {
      title: "Great Lakes Buoys",
      href: ORIGIN + "/great-lakes-buoys/",
      eyebrow: "Great Lakes conditions",
      description: "Live NOAA buoy map for waves, wind and water temperature.",
      endpoint: ORIGIN + "/api/buoys",
      liveLabel: function (data) {
        var count = Number(data && data.count);
        return Number.isFinite(count) ? count + " Great Lakes stations in the live feed" : "";
      }
    },
    "fall-color": {
      title: "Michigan Fall Color",
      href: ORIGIN + "/fall-color/",
      eyebrow: "Seasonal conditions",
      description: "Live Michigan fall color map, regional timing and daily field note.",
      secondaryHref: ORIGIN + "/fall-color/rss.xml",
      secondaryLabel: "Daily RSS"
    },
    "soo-locks": {
      title: "Soo Locks Live",
      href: ORIGIN + "/soo-locks/",
      eyebrow: "Ship watching",
      description: "Today’s ship-schedule sources, live vessel map, webcams and visitor planning."
    },
    "ship-tracker": {
      title: "Great Lakes Ship Tracker",
      href: ORIGIN + "/great-lakes-freighter-tracking/",
      eyebrow: "Great Lakes shipping",
      description: "Live freighter tracking and Great Lakes ship-watching tools."
    },
    beaches: {
      title: "Michigan Beach Report",
      href: ORIGIN + "/great-lakes-beaches/",
      eyebrow: "Beach conditions",
      description: "Great Lakes beach conditions and planning across Michigan."
    },
    "boat-launches": {
      title: "Michigan Boat Launch Finder",
      href: ORIGIN + "/michigan-boat-launches/",
      eyebrow: "Boating access",
      description: "Find Michigan boat launches and plan access before the drive."
    },
    manistee: {
      title: "Manistee River Guide",
      href: ORIGIN + "/michigan-paddling/manistee-river/",
      eyebrow: "River planning",
      description: "Manistee River access, paddling and trip-planning guidance."
    },
    "au-sable": {
      title: "Au Sable Field Map",
      href: "https://ausable.chrisizworski.com/",
      eyebrow: "River planning",
      description: "Au Sable access, paddling, fishing and field-map planning."
    }
  };

  function sanitize(value, fallback) {
    var text = String(value || "").toLowerCase().replace(/[^a-z0-9_-]+/g, "_").replace(/^_+|_+$/g, "");
    return text.slice(0, 80) || fallback;
  }

  function taggedUrl(href, source, tool, content) {
    try {
      var url = new URL(href);
      url.searchParams.set("utm_source", source);
      url.searchParams.set("utm_medium", "referral");
      url.searchParams.set("utm_campaign", CAMPAIGN);
      url.searchParams.set("utm_content", content || tool);
      return url.toString();
    } catch (_error) {
      return href;
    }
  }

  function ensureStyles() {
    if (document.getElementById("ci-publisher-widget-style")) return;
    var style = document.createElement("style");
    style.id = "ci-publisher-widget-style";
    style.textContent =
      ".ci-pw{font:14px/1.45 system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#1f2b24;background:#fbfcfa;border:1px solid #d8e1d9;border-radius:10px;padding:16px;max-width:560px;box-sizing:border-box}" +
      ".ci-pw *{box-sizing:border-box}.ci-pw__eyebrow{font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:#58705e;margin-bottom:5px}" +
      ".ci-pw__title{font:600 19px/1.2 Georgia,'Times New Roman',serif;margin:0 0 6px;color:#173c2c}" +
      ".ci-pw__desc{margin:0 0 10px;color:#445148}.ci-pw__live{margin:0 0 10px;padding:8px 10px;background:#eef5ef;border-radius:6px;color:#23432d;font-weight:600}" +
      ".ci-pw__actions{display:flex;flex-wrap:wrap;gap:8px;align-items:center}.ci-pw__link{display:inline-block;text-decoration:none;border:1px solid #2c5f2d;border-radius:5px;padding:7px 10px;color:#2c5f2d;font-weight:600}" +
      ".ci-pw__link--primary{background:#2c5f2d;color:#fff}.ci-pw__credit{margin-top:10px;font-size:11px;color:#68736c}.ci-pw__credit a{color:inherit}";
    document.head.appendChild(style);
  }

  function textNode(tag, className, value) {
    var node = document.createElement(tag);
    node.className = className;
    node.textContent = value;
    return node;
  }

  function buildWidget(host, toolKey, source) {
    var cfg = TOOLS[toolKey];
    if (!cfg) return;

    var card = document.createElement("div");
    card.className = "ci-pw";
    card.setAttribute("data-tool", toolKey);

    card.appendChild(textNode("div", "ci-pw__eyebrow", cfg.eyebrow));
    card.appendChild(textNode("div", "ci-pw__title", cfg.title));
    card.appendChild(textNode("p", "ci-pw__desc", cfg.description));

    var live = textNode("div", "ci-pw__live", "");
    live.hidden = true;
    card.appendChild(live);

    var actions = document.createElement("div");
    actions.className = "ci-pw__actions";

    var primary = document.createElement("a");
    primary.className = "ci-pw__link ci-pw__link--primary";
    primary.href = taggedUrl(cfg.href, source, toolKey, "open_tool");
    primary.textContent = "Open " + cfg.title;
    actions.appendChild(primary);

    if (cfg.secondaryHref) {
      var secondary = document.createElement("a");
      secondary.className = "ci-pw__link";
      secondary.href = taggedUrl(cfg.secondaryHref, source, toolKey, "secondary");
      secondary.textContent = cfg.secondaryLabel || "More";
      actions.appendChild(secondary);
    }

    card.appendChild(actions);

    var credit = document.createElement("div");
    credit.className = "ci-pw__credit";
    credit.appendChild(document.createTextNode("Free Michigan tool by "));
    var creator = document.createElement("a");
    creator.href = taggedUrl(ORIGIN + "/chris-izworski/", source, toolKey, "creator");
    creator.textContent = "Chris Izworski";
    credit.appendChild(creator);
    card.appendChild(credit);

    host.replaceChildren(card);

    if (cfg.endpoint && typeof cfg.liveLabel === "function") {
      fetch(cfg.endpoint, { method: "GET", mode: "cors", credentials: "omit" })
        .then(function (response) {
          if (!response.ok) throw new Error("request failed");
          return response.json();
        })
        .then(function (data) {
          var label = cfg.liveLabel(data);
          if (!label) return;
          live.textContent = label;
          live.hidden = false;
        })
        .catch(function () {
          live.hidden = true;
        });
    }
  }

  function boot() {
    ensureStyles();
    var hosts = document.querySelectorAll("[data-chris-tool-widget]");
    hosts.forEach(function (host) {
      var tool = sanitize(host.getAttribute("data-tool"), "");
      var source = sanitize(host.getAttribute("data-source"), "publisher");
      buildWidget(host, tool, source);
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot, { once: true });
  } else {
    boot();
  }
})();