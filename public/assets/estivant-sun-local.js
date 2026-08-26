(() => {
  const LAT = 47.4456;
  const LON = -87.8776;
  const TZ = 'America/Detroit';
  const rad = Math.PI / 180;
  const dayMs = 86400000;
  const J1970 = 2440588;
  const J2000 = 2451545;
  const J0 = 0.0009;
  const e = rad * 23.4397;
  const $ = (id) => document.getElementById(id);

  const toJulian = (date) => date.valueOf() / dayMs - 0.5 + J1970;
  const fromJulian = (j) => new Date((j + 0.5 - J1970) * dayMs);
  const toDays = (date) => toJulian(date) - J2000;
  const solarMeanAnomaly = (d) => rad * (357.5291 + 0.98560028 * d);
  const eclipticLongitude = (M) => {
    const C = rad * (1.9148 * Math.sin(M) + 0.02 * Math.sin(2 * M) + 0.0003 * Math.sin(3 * M));
    return M + C + rad * 102.9372 + Math.PI;
  };
  const declination = (l) => Math.asin(Math.sin(l) * Math.sin(e));
  const julianCycle = (d, lw) => Math.round(d - J0 - lw / (2 * Math.PI));
  const approxTransit = (Ht, lw, n) => J0 + (Ht + lw) / (2 * Math.PI) + n;
  const solarTransitJ = (ds, M, L) => J2000 + ds + 0.0053 * Math.sin(M) - 0.0069 * Math.sin(2 * L);
  const hourAngle = (h, phi, dec) => Math.acos((Math.sin(h) - Math.sin(phi) * Math.sin(dec)) / (Math.cos(phi) * Math.cos(dec)));
  const getSetJ = (h, lw, phi, dec, n, M, L) => solarTransitJ(approxTransit(hourAngle(h, phi, dec), lw, n), M, L);

  function detroitParts(date = new Date()) {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: TZ,
      year: 'numeric', month: 'numeric', day: 'numeric',
      hour: 'numeric', minute: '2-digit', hourCycle: 'h23'
    }).formatToParts(date);
    const get = (type) => Number(parts.find((p) => p.type === type)?.value);
    return { year: get('year'), month: get('month'), day: get('day'), hour: get('hour'), minute: get('minute') };
  }

  function localMinutes(date) {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: TZ, hour: 'numeric', minute: '2-digit', hourCycle: 'h23'
    }).formatToParts(date);
    const get = (type) => Number(parts.find((p) => p.type === type)?.value);
    return get('hour') * 60 + get('minute');
  }

  function solarTimes() {
    const p = detroitParts();
    const anchor = new Date(Date.UTC(p.year, p.month - 1, p.day, 12, 0, 0));
    const d = toDays(anchor);
    const lw = rad * -LON;
    const phi = rad * LAT;
    const n = julianCycle(d, lw);
    const ds = approxTransit(0, lw, n);
    const M = solarMeanAnomaly(ds);
    const L = eclipticLongitude(M);
    const dec = declination(L);
    const Jnoon = solarTransitJ(ds, M, L);
    const sunsetJ = getSetJ(-0.833 * rad, lw, phi, dec, n, M, L);
    const sunriseJ = Jnoon - (sunsetJ - Jnoon);
    const civilEndJ = getSetJ(-6 * rad, lw, phi, dec, n, M, L);
    const civilBeginJ = Jnoon - (civilEndJ - Jnoon);
    return {
      sunrise: localMinutes(fromJulian(sunriseJ)),
      sunset: localMinutes(fromJulian(sunsetJ)),
      civilBegin: localMinutes(fromJulian(civilBeginJ)),
      civilEnd: localMinutes(fromJulian(civilEndJ)),
      now: p.hour * 60 + p.minute
    };
  }

  function fmtClock(minutes) {
    let m = Math.round(minutes) % 1440;
    if (m < 0) m += 1440;
    const h24 = Math.floor(m / 60);
    const mins = m % 60;
    const suffix = h24 >= 12 ? 'PM' : 'AM';
    return `${h24 % 12 || 12}:${String(mins).padStart(2, '0')} ${suffix}`;
  }

  function durationText(minutes) {
    const total = Math.max(0, Math.round(minutes));
    const h = Math.floor(total / 60);
    const m = total % 60;
    return h ? `${h}h ${m ? `${m}m` : ''}`.trim() : `${m}m`;
  }

  function render() {
    const { sunrise, sunset, civilEnd, now } = solarTimes();
    const remaining = sunset - now;
    const level = remaining <= 0 ? 'hold' : remaining < 180 ? 'watch' : 'good';
    const card = $('sunCard');
    if (card) card.dataset.level = level;
    if ($('sunValue')) $('sunValue').textContent = `${fmtClock(sunrise)} → ${fmtClock(sunset)}`;
    if ($('sunDetail')) {
      $('sunDetail').textContent = now < sunrise
        ? `Sunrise is in ${durationText(sunrise - now)}.`
        : remaining > 0
          ? `${durationText(remaining)} of daylight remain.`
          : `Sunset was ${durationText(now - sunset)} ago.`;
    }
    if ($('sunTimes')) {
      $('sunTimes').innerHTML = `<strong>Today at the trailhead:</strong> sunrise ${fmtClock(sunrise)} · sunset ${fmtClock(sunset)} · civil twilight ends ${fmtClock(civilEnd)}. The route clock keeps a 30-minute margin before sunset.`;
    }

    const routes = [
      { name: 'Cathedral Grove', allowance: 75, note: '75-minute planning allowance' },
      { name: 'Bertha Daubendiek', allowance: 90, note: '90-minute planning allowance' },
      { name: 'Both loops', allowance: 150, note: '150-minute planning allowance' }
    ];
    if ($('routeTiming')) {
      $('routeTiming').innerHTML = routes.map((r) => {
        const latest = sunset - r.allowance - 30;
        const status = now > latest ? 'Past daylight-buffer start' : `Start by ${fmtClock(latest)}`;
        const finishNow = now + r.allowance;
        const nowLine = now < sunset
          ? (finishNow <= sunset - 30
            ? `Starting now leaves about ${durationText(sunset - 30 - finishNow)} spare before the buffer.`
            : finishNow <= sunset
              ? 'Starting now may finish before sunset, but not with the 30-minute margin.'
              : 'Starting now projects past sunset.')
          : 'It is already after sunset.';
        return `<div class="timing"><span>${r.name}</span><strong>${status}</strong><span>${r.note} + 30-minute buffer. ${nowLine}</span></div>`;
      }).join('');
    }
  }

  function simplifySnowUI() {
    const snowCard = $('snowCard');
    const snowSection = $('snow-read');
    if (snowCard) snowCard.hidden = true;
    if (snowSection) snowSection.hidden = true;
    if (!document.getElementById('estivant-four-card-grid')) {
      const style = document.createElement('style');
      style.id = 'estivant-four-card-grid';
      style.textContent = '@media(min-width:1001px){.status-grid{grid-template-columns:repeat(4,minmax(0,1fr))}}';
      document.head.appendChild(style);
    }
  }

  // Snowfall is intentionally not a headline decision card here. In the Keweenaw,
  // persistent winter snow makes a generic snow read noisy; seasonal access guidance
  // remains on the page where snow materially changes the hike decision.
  simplifySnowUI();

  // Local calculation is authoritative for this UI so the hike clock does not depend
  // on a cross-site astronomy request. Re-apply briefly in case the older async call
  // finishes after this script while cached clients transition to the local calculator.
  [0, 750, 2500, 7500, 20000, 60000].forEach((delay) => setTimeout(render, delay));
})();
