/* Annual Mackinac Bridge Walk.
 *
 * The walk is held every Labor Day, which is the first Monday in September.
 * That rule has not changed since the event began in 1958, so the date is
 * computed rather than stored. Nothing here needs editing from one year to the
 * next: after the walk day passes, the section rolls itself to the next year.
 *
 * The static HTML states only the recurring facts, so a reader with JavaScript
 * disabled still gets a correct answer. This file adds the dated specifics.
 *
 * The Mackinac Bridge Authority confirms the details each spring and remains
 * the controlling source. This is planning context, not an official notice.
 */
(function () {
  "use strict";

  var ZONE = "America/Detroit";

  function michiganParts(date) {
    var parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: ZONE, year: "numeric", month: "2-digit", day: "2-digit",
    }).formatToParts(date).reduce(function (acc, part) {
      acc[part.type] = part.value;
      return acc;
    }, {});
    return { year: Number(parts.year), month: Number(parts.month), day: Number(parts.day) };
  }

  function dayKey(p) {
    return p.year + "-" + String(p.month).padStart(2, "0") + "-" + String(p.day).padStart(2, "0");
  }

  // First Monday in September of the given year.
  function laborDay(year) {
    var day = new Date(Date.UTC(year, 8, 1));
    while (day.getUTCDay() !== 1) day.setUTCDate(day.getUTCDate() + 1);
    return { year: year, month: 9, day: day.getUTCDate() };
  }

  // The walk the reader cares about: this year's until it has passed, then next year's.
  function upcomingWalk(today) {
    var thisYear = laborDay(today.year);
    return dayKey(today) <= dayKey(thisYear) ? thisYear : laborDay(today.year + 1);
  }

  function daysUntil(today, walk) {
    var a = Date.UTC(today.year, today.month - 1, today.day);
    var b = Date.UTC(walk.year, walk.month - 1, walk.day);
    return Math.round((b - a) / 86400000);
  }

  function longDate(walk) {
    return new Intl.DateTimeFormat("en-US", {
      timeZone: "UTC", weekday: "long", month: "long", day: "numeric", year: "numeric",
    }).format(new Date(Date.UTC(walk.year, walk.month - 1, walk.day)));
  }

  function countdown(days) {
    if (days === 0) return "That is today.";
    if (days === 1) return "That is tomorrow.";
    if (days < 30) return "That is in " + days + " days.";
    return "That is in " + days + " days, so plan a crossing around it.";
  }

  function setText(selector, value) {
    document.querySelectorAll(selector).forEach(function (node) { node.textContent = value; });
  }

  function eventSchema(walk) {
    var iso = walk.year + "-09-" + String(walk.day).padStart(2, "0");
    return {
      "@context": "https://schema.org",
      "@type": "Event",
      name: "Annual Mackinac Bridge Walk",
      description:
        "The Mackinac Bridge closes to public traffic from 6:30 a.m. to noon on Labor Day for the " +
        "Annual Bridge Walk. The walk is free, requires no registration, and starts from both ends of the bridge.",
      startDate: iso + "T07:00:00-04:00",
      endDate: iso + "T12:00:00-04:00",
      eventStatus: "https://schema.org/EventScheduled",
      eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
      isAccessibleForFree: true,
      location: {
        "@type": "Place",
        name: "Mackinac Bridge",
        address: {
          "@type": "PostalAddress",
          addressLocality: "Mackinaw City",
          addressRegion: "MI",
          addressCountry: "US",
        },
      },
      organizer: {
        "@type": "Organization",
        name: "Mackinac Bridge Authority",
        url: "https://www.mackinacbridge.org/",
      },
      url: "https://chrisizworski.com/mackinac-bridge-live/#bridge-walk",
    };
  }

  var section = document.querySelector("[data-bridge-walk]");
  if (!section) return;

  try {
    var today = michiganParts(new Date());
    var walk = upcomingWalk(today);
    var days = daysUntil(today, walk);
    var isToday = days === 0;

    setText("[data-walk-date]", longDate(walk));
    setText("[data-walk-countdown]", countdown(days));
    setText("[data-walk-year]", String(walk.year));
    section.classList.add("is-dated");
    section.classList.toggle("is-walk-day", isToday);

    if (isToday) {
      setText(
        "[data-walk-state]",
        "The bridge is closed to public traffic until noon today. The live status card above reports the " +
          "official condition once it reopens."
      );
    }

    var ld = document.createElement("script");
    ld.type = "application/ld+json";
    ld.textContent = JSON.stringify(eventSchema(walk));
    document.head.appendChild(ld);
  } catch (_error) {
    // The static copy already answers the question. Leave it alone.
  }
})();
