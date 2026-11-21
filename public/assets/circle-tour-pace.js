/* Lake Superior Circle Tour. Route Rhythm compares published day estimates, not live drive times. */
(function () {
  "use strict";

  const PRESETS = ["7", "10", "15"];
  const ROAD_MPH = 47;
  const ROAD_ALLOWANCE = 1.2;
  const STORIES = {
    "7": {
      name: "Seven days",
      subtitle: "A lap around the lake",
      story: "A full circle with long passages. Choose one major outing on the busiest days."
    },
    "10": {
      name: "Ten days",
      subtitle: "A little room to wander",
      story: "Time around the Keweenaw and Pictured Rocks, with a demanding Ontario travel day."
    },
    "15": {
      name: "Fifteen days",
      subtitle: "Let the shoreline set the pace",
      story: "Stay days and short drives leave room for trails, harbors, and changing lake weather."
    }
  };

  function roadHours(miles) {
    if (!Number.isFinite(miles) || miles < 0 || miles > 600) return null;
    return Math.round((miles / ROAD_MPH) * ROAD_ALLOWANCE * 10) / 10;
  }

  function compareDays(days, targetHours) {
    if (!Array.isArray(days) || !days.length || !Number.isFinite(targetHours) || targetHours < 1) {
      return {complete: false, days: [], over: [], longest: null};
    }
    const modeled = days.map((item) => ({
      day: item.day,
      miles: item.miles,
      hours: roadHours(item.miles)
    }));
    const complete = modeled.every((item, index) =>
      item.day === index + 1 && item.hours !== null);
    const over = modeled.filter((item) => item.hours !== null && item.hours > targetHours);
    const longest = modeled.reduce((max, item) => !max || (item.hours !== null && item.hours > max.hours) ? item : max, null);
    return {complete, days: modeled, over, longest};
  }

  function shortestWithinLimit(comparisons) {
    for (const preset of PRESETS) {
      const result = comparisons[preset];
      if (result && result.complete && result.over.length === 0 && result.days.length === Number(preset)) {
        return preset;
      }
    }
    return null;
  }

  if (typeof module !== "undefined" && module.exports) {
    module.exports = {roadHours, compareDays, shortestWithinLimit};
  }
  if (typeof document === "undefined") return;

  const select = document.getElementById("ctpace-hours");
  const board = document.getElementById("ctpace-routes");
  const verdict = document.getElementById("ctpace-verdict");
  if (!select || !board || !verdict) return;

  function publishedDays(preset) {
    const panel = document.getElementById("itin-" + preset);
    if (!panel) return [];
    return Array.from(panel.querySelectorAll(".itin-day")).map((element) => {
      const miles = element.dataset.miles;
      const day = Number(element.dataset.day);
      return {
        day,
        miles: typeof miles === "string" && /^[0-9]+$/.test(miles) ? Number(miles) : null
      };
    });
  }

  const sources = Object.fromEntries(PRESETS.map((preset) => [preset, publishedDays(preset)]));
  if (PRESETS.some((preset) => sources[preset].length !== Number(preset))) {
    verdict.textContent = "Published day details are incomplete. Use the full written itineraries below.";
    return;
  }

  const element = (tag, className, value) => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (value !== undefined) node.textContent = value;
    return node;
  };

  function selectedPreset() {
    return document.querySelector(".preset-btn.active")?.dataset.preset || "10";
  }

  function syncSelection() {
    const selected = selectedPreset();
    board.querySelectorAll("[data-ctpace-route]").forEach((row) => {
      const active = row.dataset.ctpaceRoute === selected;
      row.classList.toggle("is-selected", active);
      row.querySelector("[data-ctpace-preview]")?.setAttribute("aria-pressed", String(active));
    });
  }

  function render() {
    const budget = Number(select.value);
    if (!Number.isFinite(budget)) return;
    const comparisons = Object.fromEntries(PRESETS.map((preset) =>
      [preset, compareDays(sources[preset], budget)]));
    const incomplete = PRESETS.some((preset) => !comparisons[preset].complete);
    const suitable = incomplete ? null : shortestWithinLimit(comparisons);
    board.replaceChildren();

    if (incomplete) {
      verdict.textContent = "A published driving day has missing mileage. Compare the full written routes before choosing.";
    } else if (suitable) {
      verdict.textContent = STORIES[suitable].name + " is the shortest published route without a modeled day over " +
        budget + " driving hours. This screen only compares road distance, not the time needed to visit the stops.";
    } else {
      verdict.textContent = "None of these published routes stays within a " + budget +
        "-hour daily driving target. Consider additional travel days or a smaller regional journey.";
    }

    PRESETS.forEach((preset) => {
      const model = comparisons[preset];
      const story = STORIES[preset];
      const row = element("article", "ctpace-route");
      row.dataset.ctpaceRoute = preset;

      const top = element("div", "ctpace-route-top");
      const narrative = element("div", "ctpace-route-narrative");
      narrative.append(
        element("span", "ctpace-route-kicker", story.name + " / " + model.days.length + " travel and stay days"),
        element("h4", "", story.subtitle),
        element("p", "", story.story)
      );
      const count = element("div", "ctpace-route-count");
      count.append(
        element("strong", "", model.complete ? String(model.over.length) : "?"),
        element("span", "", "of " + preset + " days above " + budget + " h")
      );
      top.append(narrative, count);

      const ribbon = element("div", "ctpace-day-ribbon");
      ribbon.setAttribute("aria-hidden", "true");
      ribbon.style.gridTemplateColumns = "repeat(" + preset + ",minmax(0,1fr))";
      model.days.forEach((day) => {
        const unit = element("span", "ctpace-day");
        const bar = element("span", "ctpace-day-bar");
        const exceeded = day.hours !== null && day.hours > budget;
        bar.dataset.over = String(exceeded);
        bar.style.height = day.hours === null ? "5px" :
          Math.max(5, Math.min(100, Math.round((day.hours / 9) * 100))) + "%";
        unit.append(bar);
        ribbon.append(unit);
      });

      const bottom = element("div", "ctpace-route-bottom");
      const explanation = element("p", "ctpace-route-detail");
      if (!model.complete) {
        explanation.textContent = "Mileage is incomplete. Review the written itinerary.";
      } else if (model.over.length) {
        explanation.textContent = "Longer road days: " +
          model.over.map((day) => "Day " + day.day + " (~" + day.hours.toFixed(1) + " h)").join(", ") + ".";
      } else {
        explanation.textContent = model.longest && model.longest.hours > 0
          ? "Longest modeled road day: Day " + model.longest.day + " (~" + model.longest.hours.toFixed(1) + " h)."
          : "Published road-time estimates are unavailable.";
      }
      const action = element("button", "ctpace-preview", "Preview " + preset + "-day map");
      action.type = "button";
      action.dataset.ctpacePreview = preset;
      action.addEventListener("click", () => {
        const existing = document.querySelector('.preset-btn[data-preset="' + preset + '"]');
        if (!existing) {
          verdict.textContent = "The map planner is unavailable. The written routes remain below.";
          return;
        }
        existing.click();
        document.querySelector(".planner-controls")?.scrollIntoView({block: "start"});
        if (typeof window.CircleTourPage?.track === "function") {
          window.CircleTourPage.track("route-rhythm-preview", {days: Number(preset), targetHours: budget});
        }
      });
      bottom.append(explanation, action);
      row.append(top, ribbon, bottom);
      board.append(row);
    });

    syncSelection();
  }

  select.addEventListener("change", render);
  window.addEventListener("circle-tour:preset-change", syncSelection);
  render();
})();
