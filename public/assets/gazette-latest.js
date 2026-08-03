(function () {
  "use strict";

  var API = "https://gazette.chrisizworski.com/api/latest";
  var ORIGIN = "https://gazette.chrisizworski.com";

  function michiganDateKey(date) {
    var parts = new Intl.DateTimeFormat("en-US", {
      timeZone: "America/Detroit",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(date || new Date());
    function value(type) {
      var part = parts.find(function (item) { return item.type === type; });
      return part ? part.value : "";
    }
    return value("year") + "-" + value("month") + "-" + value("day");
  }

  function cleanText(value) {
    return String(value || "").replace(/\s+/g, " ").trim();
  }

  function excerpt(value, maximum) {
    var text = cleanText(value);
    if (text.length <= maximum) return text;
    var shortened = text.slice(0, maximum + 1);
    var sentence = shortened.lastIndexOf(". ");
    if (sentence > maximum * 0.55) return shortened.slice(0, sentence + 1);
    return shortened.slice(0, shortened.lastIndexOf(" ")) + "…";
  }

  function setText(scope, selector, value) {
    scope.querySelectorAll(selector).forEach(function (node) { node.textContent = value; });
  }

  function setHref(scope, selector, value) {
    scope.querySelectorAll(selector).forEach(function (node) { node.href = value; });
  }

  function normalize(payload) {
    payload = payload || {};
    var brief = payload && payload.brief ? payload.brief : {};
    var data = payload && payload.data ? payload.data : {};
    var generatedAt = payload.generated_at || brief.generated_at || "";
    var date = payload.date || generatedAt.slice(0, 10);
    var sections = Array.isArray(brief.sections) ? brief.sections : [];
    var lead = sections.find(function (section) { return !cleanText(section.kicker); });
    var body = lead && lead.body ? lead.body : brief.brief;
    var ais = Array.isArray(data.aisPassages) ? data.aisPassages : [];
    var healthyAis = ais.filter(function (port) { return port && port.status === "ok"; }).length;
    return {
      headline: cleanText(brief.headline),
      deck: cleanText(brief.deck),
      excerpt: excerpt(body, 310),
      date: date,
      generatedAt: generatedAt,
      issueNumber: Number(brief.issueNumber) || null,
      healthyAis: healthyAis,
      issueUrl: /^\d{4}-\d{2}-\d{2}$/.test(date) ? ORIGIN + "/issue/" + date : ORIGIN,
    };
  }

  function render(section, edition) {
    if (!edition.headline) throw new Error("Latest edition has no headline");
    var isToday = edition.date === michiganDateKey(new Date());
    var dateLabel = edition.date
      ? new Intl.DateTimeFormat("en-US", { weekday: "long", month: "long", day: "numeric" })
          .format(new Date(edition.date + "T12:00:00Z"))
      : "Latest edition";
    var issueLabel = edition.issueNumber ? "Issue " + edition.issueNumber : "Daily edition";
    var sourceLabel = edition.healthyAis > 0
      ? edition.healthyAis + " AIS corridors checked"
      : "NOAA and NWS sources checked";

    section.classList.add("is-loaded");
    section.classList.toggle("is-live", isToday);
    setText(section, "[data-gazette-label]", isToday ? "Today's Great Lakes Gazette" : "Latest Great Lakes Gazette");
    setText(section, "[data-gazette-date]", dateLabel);
    setText(section, "[data-gazette-headline]", edition.headline);
    setText(section, "[data-gazette-deck]", edition.deck || "Vessel movements, ports, levels, and weather from across the five lakes.");
    setText(section, "[data-gazette-excerpt]", edition.excerpt || "Open the latest edition for today's Great Lakes shipping desk.");
    setText(section, "[data-gazette-issue]", issueLabel);
    setText(section, "[data-gazette-source-status]", sourceLabel);
    setText(section, "[data-gazette-primary-label]", isToday ? "Read today's edition" : "Read the latest edition");
    setHref(section, "[data-gazette-headline-link], [data-gazette-primary]", edition.issueUrl);
  }

  var widgets = Array.prototype.slice.call(document.querySelectorAll("[data-gazette-latest]"));
  if (!widgets.length) return;

  fetch(API, { headers: { Accept: "application/json" } })
    .then(function (response) {
      if (!response.ok) throw new Error("Gazette API returned " + response.status);
      return response.json();
    })
    .then(normalize)
    .then(function (edition) {
      widgets.forEach(function (widget) { render(widget, edition); });
    })
    .catch(function () {
      widgets.forEach(function (widget) {
        widget.classList.add("is-fallback");
        setText(widget, "[data-gazette-date]", "Latest edition");
      });
    });
})();
