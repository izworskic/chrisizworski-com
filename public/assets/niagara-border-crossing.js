(() => {
  "use strict";

  const crossingOrder = ["peace", "rainbow", "whirlpool", "lewiston-queenston"];
  const destinationLabels = {
    peace: {
      to_canada: "Fort Erie, Ontario and the QEW",
      to_us: "Buffalo, New York and I-190",
    },
    rainbow: {
      to_canada: "Niagara Falls, Ontario and Highway 420",
      to_us: "Niagara Falls, New York and I-190",
    },
    whirlpool: {
      to_canada: "Niagara Falls, Ontario",
      to_us: "Niagara Falls, New York",
    },
    "lewiston-queenston": {
      to_canada: "Queenston, Ontario and Highway 405",
      to_us: "Lewiston, New York and I-190",
    },
  };

  const state = {
    direction: "to_canada",
    traveler: "passenger",
    preferred: "rainbow",
    oversize: false,
    requestId: 0,
  };

  let latestPayload = null;
  let latestApproach = null;

  const $ = (id) => document.getElementById(id);
  const directionButtons = [...document.querySelectorAll("[data-direction]")];
  const travelerSelect = $("travelerSelect");
  const preferredSelect = $("preferredSelect");
  const oversizeToggle = $("oversizeToggle");
  const commercialOptions = $("commercialOptions");
  const decisionState = $("decisionState");
  const decisionHeadline = $("decisionHeadline");
  const decisionReason = $("decisionReason");
  const decisionSceneNote = $("decisionSceneNote");
  const freshnessTime = $("freshnessTime");
  const crossingGrid = $("crossingGrid");
  const compareGrid = $("compareGrid");
  const realityGrid = $("realityGrid");
  const realityHeading = $("realityHeading");
  const realityIntro = $("realityIntro");
  const journeyHeading = $("journeyHeading");
  const journeyRole = $("journeyRole");
  const journeySteps = $("journeySteps");
  const journeyActions = $("journeyActions");
  const journeySummary = $("journeySummary");
  const journeyWatch = $("journeyWatch");
  const eligibilityBody = $("eligibilityBody");
  const weatherAlerts = $("weatherAlerts");
  const sourceStatus = $("sourceStatus");
  const approachSummary = $("approachSummary");
  const approachEvents = $("approachEvents");
  const liveDot = $("liveDot");
  const ribbonStatus = $("ribbonStatus");
  const ribbonTime = $("ribbonTime");
  const refreshButton = $("refreshButton");

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function formatCheckedAt(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "Time unavailable";
    return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit", timeZoneName: "short" });
  }

  function formatUpdated(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "timestamp unavailable";
    return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit", timeZoneName: "short" });
  }

  function freshnessText(result) {
    const freshness = result?.freshness;
    if (!freshness) return "No current timestamp";
    if (freshness.state === "fresh") return freshness.age_minutes == null ? "Current report" : `${freshness.age_minutes} min old`;
    if (freshness.state === "stale") return `Stale · ${freshness.age_minutes ?? "?"} min old`;
    if (freshness.state === "expired") return `Expired · ${freshness.age_minutes ?? "?"} min old`;
    return "Current age unknown";
  }

  function rawWaitLabel(result) {
    if (!result) return "Not available";
    if (Number.isFinite(result.wait_minutes)) return result.wait_minutes === 0 ? "No delay" : `${Math.round(result.wait_minutes)} min`;
    if (result.display && result.display !== "Not reported") return result.display;
    return "Not reported";
  }

  function shortWait(result) {
    if (!result) return "—";
    if (result.state === "CROSSING_CLOSED") return "Closed";
    if (result.eligibility?.requires_approval || result.state === "RESTRICTION_ACTIVE") return "Approval required";
    if (result.state === "SOURCE_CONFLICT") return "Reports disagree";
    if (result.state === "SOURCE_STALE" || ["stale", "expired"].includes(result.freshness?.state)) return "Stale — recheck";
    if (result.context_only) return Number.isFinite(result.wait_minutes) ? `${rawWaitLabel(result)} context` : "Operator context";
    if (!result.usable_for_recommendation) return "Unavailable";
    return rawWaitLabel(result);
  }

  function focusId(payload) {
    return payload?.decision?.recommended_id || state.preferred;
  }

  function getResult(payload, id) {
    return (payload?.decision?.results || []).find((item) => item.id === id) || null;
  }

  function getCrossing(payload, id) {
    return (payload?.crossings || []).find((item) => item.id === id) || null;
  }

  function focusPair(payload) {
    const id = focusId(payload);
    return { id, result: getResult(payload, id), crossing: getCrossing(payload, id) };
  }

  function resultKicker(result, decision) {
    if (!result?.eligibility?.eligible) return "Not for this trip";
    if (result.state === "CROSSING_CLOSED") return "Closed";
    if (result.eligibility?.requires_approval || result.state === "RESTRICTION_ACTIVE") return "Approval required";
    if (result.state === "SOURCE_CONFLICT") return "Reports disagree";
    if (result.state === "SOURCE_STALE") return "Wait is stale";
    if (result.context_only) return "Limited operator context";
    if (result.id === decision?.recommended_id) return result.id === state.preferred ? "Recommended · stay on route" : "Recommended · switch";
    if (result.id === state.preferred) return "Your usual route";
    if (!result.usable_for_recommendation) return "Live wait unavailable";
    return "Alternate";
  }

  function bridgeChoiceClass(result, decision) {
    const classes = ["bridge-choice"];
    if (result?.id === state.preferred) classes.push("is-natural");
    if (result?.id === decision?.recommended_id && decision?.state !== "INSUFFICIENT_DATA") classes.push("is-recommended");
    if (!result?.eligibility?.eligible || result?.state === "CROSSING_CLOSED") classes.push("is-ineligible");
    return classes.join(" ");
  }

  function travelerLabel() {
    const labels = {
      passenger: "passenger vehicle",
      nexus: "NEXUS auto traveler",
      commercial: state.oversize ? "oversize commercial vehicle" : "commercial truck",
      bus: "bus",
      tow: "vehicle with trailer",
      pedestrian: "pedestrian",
      bicycle: "bicycle",
    };
    return labels[state.traveler] || "traveler";
  }

  function selectedTravelerKey() {
    if (state.traveler === "commercial") return "commercial";
    if (state.traveler === "nexus") return "nexus";
    if (state.traveler === "passenger") return "passenger";
    return null;
  }

  function operatorContext(crossing) {
    if (!crossing) return null;
    const key = selectedTravelerKey();
    if (!key) return null;
    return crossing?.waits?.[state.direction]?.operator_validation?.[key] || null;
  }

  function destinationSide(crossing) {
    return destinationLabels[crossing?.id]?.[state.direction] || "the other side of the Niagara River";
  }

  function currentRule(crossing, result) {
    if (result?.state === "CROSSING_CLOSED") return "Closed right now. Do not enter this crossing until the bridge operator reports it open.";
    if (!result?.eligibility?.eligible) return result?.eligibility?.reason || "This crossing is not available for your selected trip.";
    if (result?.eligibility?.requires_approval || result?.state === "RESTRICTION_ACTIVE") return result?.eligibility?.reason || "Operator approval is required before this trip can use the crossing.";
    if (crossing?.nexus_required) return "NEXUS is required for this crossing.";
    if (state.traveler === "commercial" && !crossing?.eligibility?.commercial) return "Commercial trucks cannot use this crossing.";
    if (state.traveler === "pedestrian" && !crossing?.eligibility?.pedestrian) return "Pedestrians cannot use this crossing.";
    if (state.traveler === "bicycle" && !crossing?.eligibility?.bicycle) return "Bicycles cannot use this crossing.";
    if (state.traveler === "tow" && !crossing?.eligibility?.tow) return "Vehicles towing are not permitted here.";
    return crossing?.restrictions?.[0] || "Your selected traveler type is allowed under the published crossing rules.";
  }

  function tripStatus(result) {
    if (!result) return { label: "Verify", tone: "warn" };
    if (result.state === "CROSSING_CLOSED") return { label: "Closed", tone: "warn" };
    if (!result.eligibility?.eligible) return { label: "Not eligible", tone: "warn" };
    if (result.eligibility?.requires_approval || result.state === "RESTRICTION_ACTIVE") return { label: "Approval required", tone: "warn" };
    if (result.state === "SOURCE_STALE") return { label: "Eligible · live wait stale", tone: "warn" };
    return { label: "Allowed for your trip", tone: "good" };
  }

  function decisionTone(decision) {
    if (["USE_PRIMARY_CROSSING", "ALTERNATE_CROSSING_BETTER"].includes(decision?.state)) return "good";
    if (decision?.state === "COMPARABLE_OPTIONS") return "caution";
    return "stop";
  }

  function humanDecisionReason(payload) {
    const decision = payload?.decision || {};
    const preferred = getResult(payload, state.preferred);
    const recommended = getResult(payload, decision.recommended_id);
    if (decision.state === "USE_PRIMARY_CROSSING") {
      return "Stay on the route you were already going to use. None of the eligible alternates saves enough border time to make leaving that corridor worthwhile.";
    }
    if (decision.state === "ALTERNATE_CROSSING_BETTER") {
      if (!preferred?.eligibility?.eligible) return `${preferred?.short_name || "Your usual bridge"} does not work for this trip. ${recommended?.short_name || "The recommended bridge"} is the strongest current eligible option.`;
      if (preferred?.state === "CROSSING_CLOSED") return `${preferred?.short_name || "Your usual bridge"} is closed. Use ${recommended?.short_name || "the recommended alternate"} if its approach works for your trip.`;
      return `${recommended?.short_name || "The alternate"} has a large enough current advantage to justify leaving your usual Niagara route.`;
    }
    if (decision.state === "COMPARABLE_OPTIONS") return "The reported differences are small enough that your starting point and destination matter more than chasing the lowest number.";
    return decision.reason || "The official live reports are not strong enough to make a confident bridge choice right now.";
  }

  function choiceNote(result, crossing) {
    if (result?.state === "CROSSING_CLOSED") return "Bridge operator reports this crossing closed.";
    if (!result?.eligibility?.eligible) return result?.eligibility?.reason || "Not eligible for this trip.";
    if (result?.eligibility?.requires_approval || result?.state === "RESTRICTION_ACTIVE") return "Special / oversize movement requires operator approval.";
    if (result?.state === "SOURCE_STALE") return `${freshnessText(result)}. Recheck before using this number.`;
    return crossing?.experience?.role || crossing?.route || "Niagara River crossing";
  }

  function renderDecision(payload) {
    const decision = payload?.decision || {};
    const tone = decisionTone(decision);
    const focus = focusPair(payload);
    decisionState.textContent = decision.state === "USE_PRIMARY_CROSSING" ? "Stay on route"
      : decision.state === "ALTERNATE_CROSSING_BETTER" ? "Switch bridge"
        : decision.state === "COMPARABLE_OPTIONS" ? "Routes are close"
          : "Check before leaving";
    decisionState.className = `trip-state${tone === "caution" ? " is-caution" : tone === "stop" ? " is-stop" : ""}`;
    decisionHeadline.textContent = decision.headline || "Current crossing comparison is unavailable";
    decisionReason.textContent = humanDecisionReason(payload);
    decisionSceneNote.textContent = focus.crossing
      ? `${focus.crossing.short_name || focus.crossing.name} · ${travelerLabel()} · ${state.direction === "to_canada" ? "entering Canada" : "entering the United States"}`
      : "Check the official bridge and border links before committing.";

    const checked = formatCheckedAt(payload?.fetched_at);
    freshnessTime.textContent = checked;
    ribbonTime.textContent = checked;
    liveDot.className = `live-dot${payload?.degraded || tone === "stop" ? " is-degraded" : " is-live"}`;
    ribbonStatus.textContent = decision.headline || "Official crossing data checked.";

    const ordered = [...(decision.results || [])].sort((a, b) => crossingOrder.indexOf(a.id) - crossingOrder.indexOf(b.id));
    crossingGrid.innerHTML = ordered.map((result) => {
      const crossing = getCrossing(payload, result.id);
      return `<article class="${bridgeChoiceClass(result, decision)}">
        <p class="bridge-choice-kicker">${escapeHtml(resultKicker(result, decision))}</p>
        <h3>${escapeHtml(result.short_name || result.name)}</h3>
        <strong class="bridge-choice-wait">${escapeHtml(shortWait(result))}</strong>
        <p class="bridge-choice-note">${escapeHtml(choiceNote(result, crossing))}</p>
        <span class="bridge-choice-route">${escapeHtml(result.route || "")}</span>
      </article>`;
    }).join("");
  }

  function realityItem(label, value, detail, tone = "") {
    return `<div class="reality-item${tone ? ` is-${tone}` : ""}"><span class="reality-label">${escapeHtml(label)}</span><strong class="reality-value">${escapeHtml(value)}</strong><span class="reality-detail">${escapeHtml(detail)}</span></div>`;
  }

  function weatherState(payload) {
    const alerts = Array.isArray(payload?.warnings?.weather) ? payload.warnings.weather : [];
    const available = Boolean(payload?.sources?.nws_weather?.available || payload?.sources?.eccc_weather?.available);
    if (!available) return { value: "Weather check unavailable", detail: "NWS / Environment Canada feeds did not return usable data.", tone: "warn" };
    if (alerts.length) return { value: `${alerts.length} active alert${alerts.length === 1 ? "" : "s"}`, detail: alerts[0]?.headline || "Official weather alert active.", tone: "warn" };
    return { value: "No active alert returned", detail: "Official NWS / Environment Canada checks responded.", tone: "good" };
  }

  function renderReality(payload) {
    const { result, crossing } = focusPair(payload);
    if (!crossing) return;
    const operator = operatorContext(crossing);
    const approach = latestApproach;
    const weather = weatherState(payload);
    const status = tripStatus(result);

    let waitValue = shortWait(result);
    let waitDetail = "No matching current official wait is available.";
    if (result?.context_only) {
      waitDetail = `${result?.source?.name || crossing.operator || "Bridge operator"} · operator context only · ${freshnessText(result)}.`;
    } else if (result?.usable_for_recommendation) {
      waitDetail = `${result?.source?.name || "Official border agency"} · updated ${formatUpdated(result?.source?.updated_at)} · ${freshnessText(result)}.`;
    } else if (result?.state === "SOURCE_STALE") {
      waitValue = "Stale — recheck";
      waitDetail = `${result?.source?.name || "Official source"} last reported a value, but ${freshnessText(result).toLowerCase()}; it is not treated as current.`;
    } else if (result?.state === "SOURCE_CONFLICT") {
      waitValue = "Reports disagree";
      waitDetail = result.note || "Current official observations materially disagree.";
    }

    const operatorValue = operator?.available ? (operator.wait_minutes === 0 ? "No delay" : operator.display || `${operator.wait_minutes} min`) : "No matching report";
    const operatorDetail = operator?.available
      ? `${crossing.operator} plaza / traffic context; not a substitute for the authoritative processing wait.`
      : "Use the bridge-operator traffic link before entering the approach.";

    let approachValue = "Open live maps";
    let approachDetail = "511 New York, Ontario 511 and NITTEC";
    if (approach?.available) {
      const count = Number(approach?.summary?.event_count || 0);
      approachValue = count ? `${count} nearby event${count === 1 ? "" : "s"}` : "No matching event returned";
      approachDetail = "Filtered official 511 corridor context; this is not a travel-time estimate.";
    }

    const toll = crossing?.toll?.[state.direction] || "Check operator";
    realityHeading.textContent = `${crossing.short_name || crossing.name} right now`;
    realityIntro.textContent = crossing.experience?.human_summary || crossing.route || "Current bridge and border context.";
    realityGrid.innerHTML = [
      realityItem("Border wait", waitValue, waitDetail, result?.usable_for_recommendation ? "good" : "warn"),
      realityItem("Bridge traffic", operatorValue, operatorDetail, operator?.available ? "good" : "warn"),
      realityItem("Approach", approachValue, approachDetail),
      realityItem("Weather", weather.value, weather.detail, weather.tone),
      realityItem("Toll / hours", toll, `${crossing.hours || "Check hours"} · ${status.label}`, status.tone),
    ].join("");
  }

  function exactCameraLink(crossing) {
    const exact = crossing?.experience?.official_links?.find((link) => /camera|webcam/i.test(link.label || ""));
    if (exact?.url) return exact;
    const fallback = crossing?.cameras?.[0];
    return fallback?.url ? { label: fallback.label || "Live camera / traffic view", url: fallback.url } : null;
  }

  function plazaNarrative(result, crossing, operator) {
    if (result?.state === "CROSSING_CLOSED") return "The bridge operator reports this crossing closed. Do not enter the approach until it is reported open.";
    if (result?.eligibility?.requires_approval || result?.state === "RESTRICTION_ACTIVE") return "This trip requires operator approval before you enter the approach; there is no unconditional live wait comparison for it.";
    if (result?.context_only || result?.source?.kind === "operator") {
      const context = Number.isFinite(result?.wait_minutes) ? rawWaitLabel(result).toLowerCase() : "an operator status";
      return `${result?.source?.name || crossing.operator || "The bridge operator"} is showing ${context} as operator context. Whirlpool does not have equivalent real-time wait technology, so this value is not used to justify a bridge switch.`;
    }
    if (result?.usable_for_recommendation) {
      const base = `${result?.source?.name || "The border agency"} is currently reporting ${rawWaitLabel(result).toLowerCase()} for your selected trip${result?.source?.updated_at ? `, updated ${formatUpdated(result.source.updated_at)}` : ""}.`;
      const operatorText = operator?.available ? ` ${crossing.operator} also reports ${String(operator.display || rawWaitLabel(operator)).toLowerCase()} as plaza / traffic context, not customs-processing time.` : "";
      return `${base}${operatorText}`;
    }
    if (result?.state === "SOURCE_STALE") return `The last official wait is ${freshnessText(result).toLowerCase()}. Recheck the official source before using a numeric wait.`;
    if (result?.state === "SOURCE_CONFLICT") return "Current official reports materially disagree, so this page is not presenting either number as the current answer.";
    return "A matching current border wait is not available for this traveler. Do not substitute a passenger-car number.";
  }

  function renderJourney(payload) {
    const { result, crossing } = focusPair(payload);
    if (!crossing) return;
    const exp = crossing.experience || {};
    const operator = operatorContext(crossing);
    const steps = [
      ["Approach", exp.approach_character || crossing.route || "Follow the signed bridge approach for this corridor."],
      ["Plaza", plazaNarrative(result, crossing, operator)],
      ["Cross", `${exp.role || "Niagara River crossing"}. ${currentRule(crossing, result)}`],
      ["Come off the bridge", `You emerge toward ${destinationSide(crossing)}. ${exp.on_the_ground || "Stay with the route that matches your destination."}`],
    ];

    journeyHeading.textContent = `If you take ${crossing.short_name || crossing.name} right now`;
    journeyRole.textContent = exp.role || crossing.route || "Niagara River crossing";
    journeySteps.innerHTML = steps.map(([title, text], index) => `<article class="journey-step"><span class="journey-step-num">${index + 1}</span><h3>${escapeHtml(title)}</h3><p>${escapeHtml(text)}</p></article>`).join("");

    const camera = exactCameraLink(crossing);
    const actions = [];
    if (camera?.url) actions.push(`<a class="primary" href="${escapeHtml(camera.url)}" target="_blank" rel="noopener">Open ${escapeHtml(camera.label || "live camera / traffic view")} ↗</a>`);
    if (crossing.traffic_url) actions.push(`<a href="${escapeHtml(crossing.traffic_url)}" target="_blank" rel="noopener">Open ${escapeHtml(crossing.short_name || crossing.name)} traffic ↗</a>`);
    if (result?.source?.url) actions.push(`<a href="${escapeHtml(result.source.url)}" target="_blank" rel="noopener">Open official border wait ↗</a>`);
    journeyActions.innerHTML = actions.join("");

    journeySummary.textContent = exp.watch_for || "Check the live camera and bridge operator immediately before entering the approach.";
    const watch = [
      ["Your traveler", currentRule(crossing, result)],
      ["Hours", crossing.hours || "Check operator"],
      ["Toll this direction", crossing.toll?.[state.direction] || "Check operator"],
    ];
    journeyWatch.innerHTML = watch.map(([label, text]) => `<li><strong>${escapeHtml(label)}</strong>${escapeHtml(text)}</li>`).join("");
  }

  function renderCompare(payload) {
    const decision = payload?.decision || {};
    const ordered = [...(decision.results || [])].sort((a, b) => crossingOrder.indexOf(a.id) - crossingOrder.indexOf(b.id));
    compareGrid.innerHTML = ordered.map((result) => {
      const crossing = getCrossing(payload, result.id);
      const exp = crossing?.experience || {};
      const classes = ["compare-bridge"];
      if (result.id === decision.recommended_id && decision.state !== "INSUFFICIENT_DATA") classes.push("is-recommended");
      if (!result.eligibility?.eligible || result.state === "CROSSING_CLOSED") classes.push("is-ineligible");
      let action = result.eligibility?.reason || result.note || "Check this crossing before departure.";
      if (result.eligibility?.requires_approval || result.state === "RESTRICTION_ACTIVE") action = "Operator approval is required before this crossing can be treated as available for your oversize trip.";
      else if (result.id === decision.recommended_id && decision.state !== "INSUFFICIENT_DATA") action = result.id === state.preferred ? "Best fit now: stay on the route you were already going to use." : "Best fit now: the current advantage is large enough to justify changing crossings.";
      else if (result.id === state.preferred && result.eligibility?.eligible) action = "This is your natural route; the tool only moves you off it for a meaningful reason.";
      return `<article class="${classes.join(" ")}"><div class="compare-head"><div><p class="bridge-choice-kicker">${escapeHtml(resultKicker(result, decision))}</p><h3>${escapeHtml(result.short_name || result.name)}</h3></div><strong class="compare-wait">${escapeHtml(shortWait(result))}</strong></div><p class="compare-role">${escapeHtml(exp.human_summary || exp.role || result.route || "Niagara River crossing")}</p><div class="compare-meta"><span>${escapeHtml(result.route || "")}</span><span>${escapeHtml(crossing?.hours || "Hours vary")}</span></div><p class="compare-action">${escapeHtml(action)}</p></article>`;
    }).join("");
  }

  function renderEligibility(payload) {
    const results = new Map((payload?.decision?.results || []).map((item) => [item.id, item]));
    const crossings = [...(payload?.crossings || [])].sort((a, b) => crossingOrder.indexOf(a.id) - crossingOrder.indexOf(b.id));
    eligibilityBody.innerHTML = crossings.map((crossing) => {
      const result = results.get(crossing.id);
      const rule = currentRule(crossing, result);
      let status = "Eligible";
      let statusClass = "yes";
      if (result?.state === "CROSSING_CLOSED") {
        status = "Closed";
        statusClass = "no";
      } else if (!result?.eligibility?.eligible) {
        status = "Not eligible";
        statusClass = "no";
      } else if (result?.eligibility?.requires_approval || result?.state === "RESTRICTION_ACTIVE") {
        status = "Approval required";
        statusClass = "caution";
      }
      return `<tr><td><strong>${escapeHtml(crossing.short_name || crossing.name)}</strong><br><span class="scene-note">${escapeHtml(crossing.experience?.role || crossing.route || "")}</span></td><td class="${statusClass}">${escapeHtml(status)}</td><td>${escapeHtml(crossing.hours || "Check operator")}</td><td>${escapeHtml(crossing.toll?.[state.direction] || "Check operator")}</td><td>${escapeHtml(rule)}</td></tr>`;
    }).join("");
  }

  function renderWeather(payload) {
    const alerts = Array.isArray(payload?.warnings?.weather) ? payload.warnings.weather : [];
    const available = Boolean(payload?.sources?.nws_weather?.available || payload?.sources?.eccc_weather?.available);
    if (!available) {
      weatherAlerts.innerHTML = `<p class="weather-unavailable">Official weather checks are unavailable right now. Do not read the absence of alerts as an all-clear; open NWS or Environment Canada before departure.</p>`;
      return;
    }
    if (!alerts.length) {
      weatherAlerts.innerHTML = `<p class="all-clear">No active weather alert was returned by the current NWS / Environment Canada checks. Recheck before departure.</p>`;
      return;
    }
    weatherAlerts.innerHTML = alerts.slice(0, 5).map((alert) => `<div class="weather-alert"><strong>${escapeHtml(alert.headline || "Weather alert")}</strong><span>${escapeHtml(alert.source || "Official weather authority")}</span></div>`).join("");
  }

  function renderSources(payload) {
    const s = payload?.sources || {};
    const entries = [
      ["CBP · entering the U.S.", s.to_us_waits?.available],
      ["CBSA · entering Canada", s.to_canada_waits?.available],
      ["Niagara Falls Bridge Commission", s.nfbc_operations?.available],
      ["Peace Bridge Authority", s.peace_operations?.available],
      ["NWS / Environment Canada", Boolean(s.nws_weather?.available || s.eccc_weather?.available)],
      ["511 approach feeds", Boolean(latestApproach?.available)],
    ];
    sourceStatus.innerHTML = entries.map(([name, available]) => `<div><strong>${escapeHtml(name)}</strong>${available ? "Available" : "Unavailable / not connected"}</div>`).join("");
  }

  function renderApproachContext(payload) {
    latestApproach = payload;
    if (payload?.available) {
      const events = Array.isArray(payload.events) ? payload.events.slice(0, 3) : [];
      const count = Number(payload?.summary?.event_count || 0);
      const cameras = Number(payload?.summary?.camera_count || 0);
      approachSummary.textContent = count
        ? `Official 511 feeds returned ${count} matching corridor event${count === 1 ? "" : "s"} near the Niagara crossings, plus ${cameras} camera${cameras === 1 ? "" : "s"}. These are approach conditions, not customs wait time.`
        : `The connected 511 feeds returned no matching corridor events in the filtered Niagara area and ${cameras} camera${cameras === 1 ? "" : "s"}. That is not a guarantee of clear roads—check the live maps before leaving.`;
      approachEvents.innerHTML = events.length
        ? events.map((event) => `<div class="approach-event"><strong>${escapeHtml(event.full_closure ? "Full closure · " : "")}${escapeHtml(event.roadway || event.provider || "Road event")}</strong><span>${escapeHtml(event.description || event.location || "Official corridor event")}</span><span>${escapeHtml(event.provider || "Official 511")}</span></div>`).join("")
        : `<div class="approach-event"><strong>No matching event returned</strong><span>Use the live 511 maps and NITTEC cameras immediately before entering the bridge approach.</span></div>`;
    } else {
      approachSummary.textContent = payload?.configured
        ? "The configured structured 511 feed did not return usable data. Use the official live maps and NITTEC cameras below before entering the approach."
        : "Structured 511 data is not connected on this deployment. Use the official live maps and NITTEC cameras below for the road picture before you commit.";
      approachEvents.innerHTML = `<div class="approach-event"><strong>Use the live approach views</strong><span>The crossing recommendation is still based on border and bridge authority data; no road-delay estimate is being invented.</span></div>`;
    }
    if (latestPayload) {
      renderReality(latestPayload);
      renderSources(latestPayload);
    }
  }

  function renderApproachFailure() {
    renderApproachContext({ available: false, configured: true });
  }

  function renderAll(payload) {
    latestPayload = payload;
    renderDecision(payload);
    renderReality(payload);
    renderJourney(payload);
    renderCompare(payload);
    renderEligibility(payload);
    renderWeather(payload);
    renderSources(payload);
  }

  function renderFailure(error) {
    latestPayload = null;
    decisionState.textContent = "Live data unavailable";
    decisionState.className = "trip-state is-stop";
    decisionHeadline.textContent = "Check the official bridge reports before leaving";
    decisionReason.textContent = "The live Niagara comparison failed. Do not assume the lowest-looking route or substitute an old wait time.";
    decisionSceneNote.textContent = "Static crossing restrictions still apply; verify them with the bridge operator if your trip is unusual.";
    crossingGrid.innerHTML = `<article class="bridge-choice is-ineligible"><p class="bridge-choice-kicker">Live comparison unavailable</p><h3>Use official reports</h3><strong class="bridge-choice-wait">Verify</strong><span class="bridge-choice-route">CBP / CBSA / bridge operator</span></article>`;
    realityHeading.textContent = "Live crossing picture unavailable";
    realityIntro.textContent = "The live request failed, so no previous wait, weather or approach state is being left on screen as if it were current.";
    realityGrid.innerHTML = [
      realityItem("Border wait", "Unavailable", "Open CBP / CBSA directly.", "warn"),
      realityItem("Bridge traffic", "Unavailable", "Open the bridge operator traffic page.", "warn"),
      realityItem("Approach", "Verify live", "Open 511 New York / Ontario 511 / NITTEC.", "warn"),
      realityItem("Weather", "Verify live", "Open NWS / Environment Canada.", "warn"),
      realityItem("Toll / hours", "Verify", "Use the bridge operator before departure.", "warn"),
    ].join("");
    journeyHeading.textContent = "Live route walkthrough unavailable";
    journeyRole.textContent = "Use official bridge and border sources";
    journeySteps.innerHTML = `<article class="journey-step"><span class="journey-step-num">!</span><h3>Verify before entering the approach</h3><p>The last successful live state has been cleared because this refresh failed.</p></article>`;
    journeyActions.innerHTML = "";
    journeySummary.textContent = "Use the official links on this page before committing to a bridge.";
    journeyWatch.innerHTML = "";
    compareGrid.innerHTML = `<article class="compare-bridge is-ineligible"><div class="compare-head"><div><p class="bridge-choice-kicker">Unavailable</p><h3>No current comparison</h3></div><strong class="compare-wait">Verify</strong></div><p class="compare-action">The previous live comparison has been cleared.</p></article>`;
    eligibilityBody.innerHTML = `<tr><td colspan="5">Live refresh failed. Published restrictions still apply, but verify your crossing with the official operator links before departure.</td></tr>`;
    weatherAlerts.innerHTML = `<p class="weather-unavailable">Weather state unavailable with the failed live refresh. Open the official weather source before departure.</p>`;
    sourceStatus.innerHTML = `<div><strong>Live refresh failed</strong>Use the official source links below.</div>`;
    liveDot.className = "live-dot is-degraded";
    ribbonStatus.textContent = "Live crossing comparison is temporarily unavailable.";
    ribbonTime.textContent = "";
    console.error("[niagara-border-crossing] live refresh failed", error);
  }

  function queryString() {
    const params = new URLSearchParams({ direction: state.direction, traveler: state.traveler, preferred: state.preferred });
    if (state.oversize) params.set("oversize", "1");
    return params.toString();
  }

  function syncUrl() {
    const url = new URL(window.location.href);
    url.searchParams.set("direction", state.direction);
    url.searchParams.set("traveler", state.traveler);
    url.searchParams.set("preferred", state.preferred);
    if (state.oversize) url.searchParams.set("oversize", "1"); else url.searchParams.delete("oversize");
    window.history.replaceState(null, "", url);
  }

  async function refresh(track = false) {
    const requestId = ++state.requestId;
    syncUrl();
    decisionHeadline.textContent = "Checking the bridges that fit your trip…";
    liveDot.className = "live-dot is-loading";
    ribbonStatus.textContent = "Checking official border and bridge reports…";
    try {
      const response = await fetch(`/api/niagara-border-crossings?${queryString()}`, { headers: { accept: "application/json" }, cache: "no-store" });
      if (!response.ok) throw new Error(`API returned ${response.status}`);
      const payload = await response.json();
      if (requestId !== state.requestId) return;
      renderAll(payload);
      if (track && typeof window.va === "function") {
        window.va("event", { name: "niagara_crossing_decision", data: { direction: state.direction, traveler: state.traveler, preferred: state.preferred, decision_state: payload.decision?.state, recommended: payload.decision?.recommended_id } });
      }
    } catch (error) {
      if (requestId !== state.requestId) return;
      renderFailure(error);
    }
  }

  async function loadApproachContext() {
    try {
      const response = await fetch("/api/niagara-approach-context", { headers: { accept: "application/json" }, cache: "no-store" });
      if (!response.ok) throw new Error(`Approach API returned ${response.status}`);
      renderApproachContext(await response.json());
    } catch (error) {
      renderApproachFailure();
      console.error("[niagara-border-crossing] approach context failed", error);
    }
  }

  function applyControls() {
    directionButtons.forEach((button) => {
      const selected = button.dataset.direction === state.direction;
      button.classList.toggle("is-selected", selected);
      button.setAttribute("aria-pressed", String(selected));
    });
    travelerSelect.value = state.traveler;
    preferredSelect.value = state.preferred;
    commercialOptions.hidden = state.traveler !== "commercial";
    oversizeToggle.checked = state.oversize;
  }

  function readInitialState() {
    const params = new URLSearchParams(window.location.search);
    if (["to_canada", "to_us"].includes(params.get("direction"))) state.direction = params.get("direction");
    if (["passenger", "nexus", "commercial", "pedestrian", "bicycle", "bus", "tow"].includes(params.get("traveler"))) state.traveler = params.get("traveler");
    if (["peace", "rainbow", "whirlpool", "lewiston-queenston"].includes(params.get("preferred"))) state.preferred = params.get("preferred");
    state.oversize = state.traveler === "commercial" && params.get("oversize") === "1";
  }

  directionButtons.forEach((button) => button.addEventListener("click", () => {
    state.direction = button.dataset.direction;
    applyControls();
    refresh(true);
  }));
  travelerSelect.addEventListener("change", () => {
    state.traveler = travelerSelect.value;
    if (state.traveler !== "commercial") state.oversize = false;
    applyControls();
    refresh(true);
  });
  preferredSelect.addEventListener("change", () => {
    state.preferred = preferredSelect.value;
    refresh(true);
  });
  oversizeToggle.addEventListener("change", () => {
    state.oversize = oversizeToggle.checked;
    refresh(true);
  });
  refreshButton.addEventListener("click", () => refresh(true));

  readInitialState();
  applyControls();
  refresh(false);
  loadApproachContext();
  window.setInterval(() => {
    if (!document.hidden) refresh(false);
  }, 60_000);

  // Whirlpool operator observations remain OPERATOR_CONTEXT_ONLY by backend contract.
})();