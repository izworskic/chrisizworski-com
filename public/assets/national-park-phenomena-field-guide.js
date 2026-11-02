/**
 * National Park Phenomenon Atlas — Interactive Timeline & Map Engine
 * Curated by Chris Izworski (Chief NPS Interpretive Ranger Voice)
 */

(function () {
  'use strict';

  var PHENOMENA = [
    {
      id: 'yosemite-horsetail-firefall',
      name: 'Yosemite Horsetail Fall "Firefall"',
      park: 'Yosemite National Park, California',
      lat: 37.7282,
      lng: -119.6247,
      months: [2],
      peakLabel: 'Feb 10–28 (Peak Feb 15–26) · Sunset 15-Min Window',
      permitType: 'open',
      permitName: '2026 entrance: no reservation',
      permitLead: 'NPS: no February 2026 entrance or Firefall viewing reservation. Parking and traffic restrictions apply; 2027 unconfirmed.',
      accessRules: {season: 2026, entrance: 'NOT_REQUIRED', parking: 'RESTRICTED', activity: 'NO_RESERVATION', future: 'UNCONFIRMED', official: 'https://www.nps.gov/yose/planyourvisit/horsetailfall.htm'},
      category: 'optical',
      activeIntel: 'Feb sunset solar angle reflects through ephemeral Horsetail Fall spray on El Capitan, creating an intense molten lava glow for 10–15 minutes before twilight.',
      leadAlert: 'NPS required no Yosemite or Horsetail Fall reservation in February 2026; designated parking, walking and traffic rules applied. Check for a new NPS announcement before planning 2027.',
      toolUrl: '/yosemite-firefall-live/',
      toolLabel: 'Yosemite Firefall Live Conditions Engine'
    },
    {
      id: 'blue-spring-manatees',
      name: 'Blue Spring West Indian Manatee Gathering',
      park: 'Blue Spring State Park, Orange City, Florida',
      lat: 28.9458,
      lng: -81.3403,
      months: [11, 12, 1, 2, 3],
      peakLabel: 'Nov–Mar (Peak Dec–Feb Mornings <68°F River)',
      permitType: 'open',
      permitName: 'Open Park Entry (Gate Capacity Rules)',
      permitLead: 'No lottery required. Gate fills to capacity by 7:30–8:00 AM on cold front mornings.',
      category: 'wildlife',
      activeIntel: '700+ manatees seek constant 72°F aquifer boil waters when St. Johns River drops below 68°F. All human water activities closed for herd protection.',
      leadAlert: 'Cold-front mornings trigger massive surges into the spring run; arrive by 7:30 AM before park gates close for capacity.',
      toolUrl: '/national-tools/blue-spring-live/',
      toolLabel: 'Blue Spring Manatee Live Counter & Water Temp Engine'
    },
    {
      id: 'death-valley-superbloom',
      name: 'Death Valley Superbloom & Badwater Salt Crusts',
      park: 'Death Valley National Park, California / Nevada',
      lat: 36.2503,
      lng: -116.8258,
      months: [2, 3, 4],
      peakLabel: 'Late Feb–Mid Apr (Lower Fans Feb/Mar · Canyons Apr)',
      permitType: 'open',
      permitName: 'Standard National Park Pass',
      permitLead: 'No vehicle reservation. Furnace Creek & Stovepipe Wells lodging books 4–6 months ahead.',
      category: 'optical',
      activeIntel: 'Rare 10-to-15 year phenomenon triggered by >3 inches of autumn soaking rain, erupting into carpeted fields of Desert Gold and evaporating Badwater polygon salts.',
      leadAlert: 'Book valley lodging 4–6 months in advance; superbloom alerts are confirmed by late January.',
      toolUrl: '/synced-national-tools/',
      toolLabel: 'Death Valley Live Conditions & Weather Engine'
    },
    {
      id: 'elkmont-synchronous-fireflies',
      name: 'Elkmont Synchronous Fireflies (Photinus carolinus)',
      park: 'Great Smoky Mountains National Park, Tennessee / North Carolina',
      lat: 35.6539,
      lng: -83.5806,
      months: [5, 6],
      peakLabel: 'Late May–Early Jun (~May 25–Jun 6 · 10–14 Day Display)',
      permitType: 'lottery',
      permitName: 'Recreation.gov Vehicle Lottery',
      permitLead: '2026 Elkmont event May 20–27; vehicle reservation lottery Apr 24 at 10 AM EDT through Apr 27 at 11:59 PM EDT. Registered Elkmont campers had separate pedestrian access. Park entry outside the restricted Elkmont event is a different question.',
      accessRules: {season:2026, eventStart:'2026-05-20',eventEnd:'2026-05-27',lotteryStart:'2026-04-24',lotteryEnd:'2026-04-27', eventVehicle:'LOTTERY_RESERVATION_REQUIRED', registeredElkmontCamping:'PEDESTRIAN_ACCESS', future:'UNCONFIRMED',official:'https://www.nps.gov/grsm/learn/news/great-smoky-mountains-national-park-announces-dates-for-2026-annual-firefly-viewing-event.htm'},
      category: 'wildlife',
      activeIntel: 'Thousands of male Photinus carolinus beetles flash in simultaneous concert: 5–8 rapid flashes followed by 6–8 seconds of total darkness echoing across forested hillsides.',
      leadAlert: '2026 Elkmont vehicle lottery was April 24 at 10 AM EDT to April 27 at 11:59 PM EDT; viewing dates May 20–27. Registered Elkmont campers had different access. 2027 dates unconfirmed.',
      toolUrl: '/synced-national-tools/appalachia/',
      toolLabel: 'Smoky Mountains & Appalachia Outdoor Engine'
    },
    {
      id: 'zion-narrows-flash-window',
      name: 'Zion Narrows Summer/Fall Slot Canyon Window',
      park: 'Zion National Park, Springdale, Utah',
      lat: 37.2852,
      lng: -112.9475,
      months: [5, 6, 7, 8, 9, 10],
      peakLabel: 'Late May–Oct (Goldilocks: Sep–Oct Post-Monsoon)',
      permitType: 'open',
      permitName: 'Bottom-up: no permit / top-down: wilderness permit',
      permitLead: 'NPS: bottom-up as far as Big Spring needs no wilderness permit; top-down 16-mile day/overnight trips require route-specific Wilderness permits. Permit availability and release rules must be checked for the visit year.',
      accessRules: {season:2026, bottomUp:'NO_WILDERNESS_PERMIT', topDown:'WILDERNESS_PERMIT_REQUIRED', currentStatus:'CHECK_CURRENT_CONDITIONS', future:'UNCONFIRMED', official:'https://www.nps.gov/zion/planyourvisit/narrowspermits.htm'},
      category: 'optical',
      activeIntel: 'Virgin River North Fork wades between 1,000-ft Navajo sandstone walls. NPS closes the Narrows above 150 CFS and during NWS Flash Flood Warnings; closures continue at least two hours after warnings end.',
      leadAlert: 'Bottom-up to Big Spring: no permit. Top-down from Chamberlain’s Ranch: Wilderness permit required. Check NPS current conditions and official future-season permit releases; do not assume a fixed calendar.',
      toolUrl: '/synced-national-tools/zion-narrows-conditions/',
      toolLabel: 'Zion Narrows Live USGS Flow & Flash-Flood Engine'
    },
    {
      id: 'glacier-going-to-the-sun-opening',
      name: 'Going-to-the-Sun Road Alpine Opening & Logan Pass',
      park: 'Glacier National Park, West Glacier, Montana',
      lat: 48.6961,
      lng: -113.7178,
      months: [6, 7, 8, 9, 10],
      peakLabel: 'Late Jun/Early Jul–Mid Oct (Peak Alpine Blooms Jul–Aug)',
      permitType: 'open',
      permitName: '2026 entrance: no vehicle reservation',
      permitLead: '2026: no park vehicle reservation; Logan Pass had ticketed shuttles and a 3-hour parking limit July 1–Sept 7. 2027 unconfirmed.',
      accessRules: {season: 2026, entrance: 'NOT_REQUIRED', shuttle: 'TICKET_REQUIRED', parking: 'THREE_HOUR_LIMIT', dateRange: ['2026-07-01','2026-09-07'], future: 'UNCONFIRMED', official: 'https://www.nps.gov/glac/planyourvisit/visiting-loganpass-2026.htm'},
      category: 'optical',
      activeIntel: 'Plowing 40–80 foot avalanche drifts along the Continental Divide takes 10+ weeks. Opening unveils Logan Pass glacier lilies, bighorn sheep, and sheer hanging valleys.',
      leadAlert: '2026: no vehicle reservations anywhere in Glacier. Logan Pass shuttles required tickets, and parking was limited to 3 hours July 1–September 7. 2027 rules have not been confirmed.',
      toolUrl: '/synced-national-tools/going-to-the-sun-road-status/',
      toolLabel: 'Glacier Sun Road Live Plowing & Logan Pass Engine'
    },
    {
      id: 'katmai-brooks-falls-bears',
      name: 'Katmai Brooks Falls Brown Bear Sockeye Feeding',
      park: 'Katmai National Park & Preserve, King Salmon, Alaska',
      lat: 58.5553,
      lng: -155.7797,
      months: [7],
      peakLabel: 'July 1–31 (Peak Migration July 5–25)',
      permitType: 'open',
      permitName: 'Brooks Falls platform: no advance viewing reservation',
      permitLead: 'NPS: Brooks Falls viewing platform requires no advance reservation. Separate Brooks Camp campground stays require reservations: 2026 releases Jan 7 (May–Jun), Feb 7 (Jul–Aug), Mar 7 (Sep–Oct), at 8 AM AKST.',
      accessRules: {season:2026, bearViewing:'NO_ADVANCE_RESERVATION', platform:'CAPACITY_MANAGED', campground:'RESERVATION_REQUIRED', campgroundReleases:['2026-01-07','2026-02-07','2026-03-07'], riverCorridor:'SEPARATE_ACTIVITY_PERMIT', future:'UNCONFIRMED', official:'https://www.nps.gov/katm/planyourvisit/campingbcdv.htm'},
      category: 'wildlife',
      activeIntel: 'Millions of sockeye salmon battle up the Brooks River; up to 40+ coastal brown bears line the falls and lip to snatch leaping 6-pound fish mid-air.',
      leadAlert: 'Bear viewing at Brooks Falls needs no advance platform reservation. For 2026 campground stays, July/Aug nights released February 7 at 8 AM AKST; 2027 campground booking dates are unconfirmed.',
      toolUrl: '/synced-national-tools/',
      toolLabel: 'National Park Decision Tools Hub'
    },
    {
      id: 'columbia-salmon-leap',
      name: 'Columbia River Sockeye & Chinook Salmon Run',
      park: 'Columbia River Gorge / Bonneville Lock & Dam, Oregon / Washington',
      lat: 45.6442,
      lng: -121.9406,
      months: [6, 7, 8, 9, 10],
      peakLabel: 'Jun–Oct (Sockeye Jun/Jul · Fall Chinook/Coho Sep)',
      permitType: 'open',
      permitName: 'Free Public Visitor Center Access',
      permitLead: 'No permit required. Underwater viewing rooms and fish ladders open daily 9 AM–5 PM.',
      category: 'wildlife',
      activeIntel: 'Hundreds of thousands of wild and hatchery salmon leap fish ladder weirs navigating 140 miles upstream from the Pacific Ocean through the Cascade Mountain gap.',
      leadAlert: 'Peak viewing occurs on September mornings when fall Chinook and Coho counts exceed 15,000 fish per day.',
      toolUrl: '/synced-national-tools/columbia-salmon-run/',
      toolLabel: 'Columbia River Daily Salmon Count & Ladder Engine'
    },
    {
      id: 'yellowstone-geysers',
      name: 'Yellowstone Upper Geyser Basin & Steamboat Cycles',
      park: 'Yellowstone National Park, Wyoming / Montana / Idaho',
      lat: 44.4605,
      lng: -110.8281,
      months: [5, 6, 7, 8, 9, 10],
      peakLabel: 'May–Oct Prime Access (Accessible Year-Round)',
      permitType: 'open',
      permitName: 'Standard Yellowstone Entrance Pass',
      permitLead: 'No reservation for geyser boardwalks. Peak park lodging (Old Faithful Inn) opens May 1 for following year.',
      category: 'optical',
      activeIntel: 'Over 150 active geysers powered by superheated rhyolitic groundwater. Steamboat erupts 300+ feet into the sky; Old Faithful, Grand, and Castle follow rhythmic pressure cycles.',
      leadAlert: 'Park concessioner lodging inside the park opens for reservations 12 months in advance on May 1.',
      toolUrl: '/synced-national-tools/yellowstone-geysers/',
      toolLabel: 'Yellowstone Geysers Live Prediction & Hydrothermal Engine'
    },
    {
      id: 'rocky-mountain-elk-rut',
      name: 'Rocky Mountain Moraine Park Bull Elk Bugling Rut',
      park: 'Rocky Mountain National Park, Estes Park, Colorado',
      lat: 40.3601,
      lng: -105.5975,
      months: [9, 10],
      peakLabel: 'Sep 15–Oct 25 (Peak Dusk Bugling Sep 20–Oct 10)',
      permitType: 'lottery',
      permitName: 'Recreation.gov Timed Entry + Bear Lake Corridor',
      permitLead: '2026 park 9 AM–2 PM through Oct 12; Bear Lake 5 AM–6 PM through Oct 18. Sep permits Aug 1; Oct permits Sep 1; last-minute 7 PM MDT prior night.',
      accessRules: {season: 2026, generalEnd: '2026-10-12', bearLakeEnd: '2026-10-18', future:'UNCONFIRMED', elkMeadowFootClosure:{start:'2026-09-01',end:'2026-10-31',from:'17:00',to:'10:00',appliesTo:'named meadows only'}, official:'https://www.nps.gov/romo/planyourvisit/timed-entry-permit-system.htm'},
      category: 'wildlife',
      activeIntel: 'Diminishing autumn photoperiod triggers harem-gathering, antler battles, and piercing bugles echoing across Moraine Park and Horseshoe Park meadows.',
      leadAlert: '2026: September reservations released August 1, October reservations September 1; next-day releases 7 PM MDT. General entry ended October 12; Bear Lake ended October 18. Named elk meadows prohibit foot travel 5 PM–10 AM Sep 1–Oct 31; roadside viewing differs. 2027 rules unconfirmed.',
      toolUrl: '/national-tools/elk-rut/',
      toolLabel: 'Rocky Mountain Elk Rut Live Meadow & Bugling Engine'
    },
    {
      id: 'acadia-cadillac-first-sunrise',
      name: 'Acadia Cadillac Mountain First U.S. Sunrise',
      park: 'Acadia National Park, Bar Harbor, Maine',
      lat: 44.3526,
      lng: -68.2246,
      months: [10, 11, 12, 1, 2, 3],
      peakLabel: 'Oct 7–Mar 6 (Astronomical First Solar Beam in U.S.)',
      permitType: 'lottery',
      permitName: 'Recreation.gov Cadillac Summit Vehicle Reservation',
      permitLead: '2026 Cadillac Summit Road vehicle reservation May 20–Oct 25; sunrise and daytime, 30% released 90 days and 70% two days in advance at 10 AM ET. Other park areas do not require vehicle reservations.',
      accessRules: {season: 2026, summitStart:'2026-05-20', summitEnd:'2026-10-25', otherParkVehicleReservation:'NOT_REQUIRED', future:'UNCONFIRMED', official:'https://www.nps.gov/acad/planyourvisit/vehicle_reservations.htm'},
      category: 'optical',
      activeIntel: 'Earth axial tilt aligns solar declination so Cadillac Mountain 1,530-ft granite summit catches morning sunlight before any other point in the United States from October to March.',
      leadAlert: '2026: Cadillac Summit Road vehicle reservations applied May 20–Oct 25, including sunrise and daytime (30% released 90 days ahead, 70% two days ahead). 2027 unconfirmed.',
      toolUrl: '/synced-national-tools/cadillac-mountain-sunrise/',
      toolLabel: 'Cadillac Mountain Solar Alignment & First Sunrise Engine'
    },
    {
      id: 'haleakala-summit-inversion',
      name: 'Haleakalā Summit Cloud Inversion Sunrise',
      park: 'Haleakalā National Park, Kula, Maui, Hawaii',
      lat: 20.7097,
      lng: -156.2534,
      months: [4, 5, 6, 7, 8, 9, 10],
      peakLabel: 'Year-Round (Crisp Inversions Apr–Oct · 10,023 Ft)',
      permitType: 'lottery',
      permitName: 'Recreation.gov Haleakalā Sunrise Vehicle Ticket',
      permitLead: 'Strictly required for 3:00 AM–7:00 AM vehicle entry. Tickets release 60 days advance at 7 AM HST + 2-day rolling.',
      category: 'optical',
      activeIntel: 'Pacific trade-wind inversion traps dense marine clouds at 5,000–7,000 feet, leaving the 10,023-ft volcanic crater rim suspended above a rolling sea of golden clouds.',
      leadAlert: '⚠️ Book Haleakalā Sunrise vehicle tickets 60 days in advance at 7:00 AM HST (1:00 PM EDT) on Recreation.gov.',
      toolUrl: '/synced-national-tools/haleakala-sunrise/',
      toolLabel: 'Haleakalā Summit Inversion & Trade-Wind Live Tracker'
    }
  ];

  // Never carry a season's permit policy into a later year without a new official source.
  function getSeasonPolicy(phenomenon, year) {
    var targetYear = Number(year);
    if (targetYear !== 2026) return {status:'UNCONFIRMED', text:'Access and reservation rules for ' + targetYear + ' are unconfirmed. Check official land-manager guidance before booking.'};
    return {status:'HISTORICAL_2026', text:phenomenon.permitLead};
  }

  var MONTH_NAMES = [
    'All Months',
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December'
  ];

  var MONTH_INTEL = {
    0: {
      badge: 'Annual Cycle Overview',
      title: 'Full 12-Month Phenomenon Almanac',
      details: 'Explore 12 audited narrow-window national park phenomena across all 50 states. Use the timeline buttons above to scrub through the calendar and discover which natural spectacles are unfolding right now, alongside urgent booking deadlines.',
      leadAlert: 'Select a month for natural windows. Reservation details are historical 2026 examples, not confirmed future booking instructions; check the responsible agency.'
    },
    1: {
      badge: 'Winter Aggregations & Separate Campground Bookings',
      title: 'January: Cold-Water Manatees & Critical Summer Lotteries',
      details: 'Blue Spring manatee numbers peak during January Arctic cold fronts. Acadia Cadillac Mountain continues its astronomical run as the first point in the United States to greet the sunrise.',
      leadAlert: '2026 Katmai campground: Jan 7 release for May/Jun, Feb 7 for Jul/Aug, Mar 7 for Sep/Oct; not a bear viewing reservation. Yosemite required no February 2026 Firefall entrance reservation. 2027 dates unconfirmed.'
    },
    2: {
      badge: 'Peak Firefall & Manatee Surge',
      title: 'February: Yosemite Firefall & Death Valley Superbloom Early Flashes',
      details: 'Yosemite Horsetail Fall achieves peak solar alignment between Feb 10 and Feb 28, glowing molten orange for 15 minutes before sunset. Florida manatee counts remain at seasonal records.',
      leadAlert: 'Check Yosemite sunset cloud and flow conditions. Glacier had no park vehicle reservations in 2026; check future NPS rules before booking.'
    },
    3: {
      badge: 'Desert Wildflowers & High Spring Runoff',
      title: 'March: Death Valley Superbloom & Badwater Evaporation Pools',
      details: 'Following wet El Niño winters, lower alluvial fans in Death Valley erupt into vibrant yellow Desert Gold carpets. Blue Spring manatee season concludes mid-to-late March as river waters warm.',
      leadAlert: 'Book summer camping at Glacier, Yellowstone, and Rocky Mountain National Parks. Cadilac Mountain ends its first-in-the-nation sunrise run on March 6.'
    },
    4: {
      badge: 'Spring Lotteries & Higher Elevations',
      title: 'April: Canyon Blooms & Smoky Mountains Firefly Lottery',
      details: 'Higher elevations in Death Valley showcase evening primrose and phacelia. Haleakalā trade-wind cloud inversions establish dry, stable atmospheric conditions above 10,000 feet.',
      leadAlert: 'For 2026 Elkmont, NPS lottery opened April 24 at 10 AM EDT and closed April 27 at 11:59 PM EDT; event May 20–27. These are historical, not a 2027 schedule.'
    },
    5: {
      badge: 'Synchronous Flashes & Slot Canyon Openings',
      title: 'May: Elkmont Synchronous Fireflies & Early Zion Slot Windows',
      details: 'Photinus carolinus fireflies begin their synchronized flash mating display in Elkmont around May 25. Yellowstone Upper Geyser Basin boardwalks clear of winter snowpack.',
      leadAlert: 'Virgin River snowmelt begins subsiding; check Zion Narrows USGS gauges daily (must drop below 150 CFS to open). Book July Haleakalā sunrise passes.'
    },
    6: {
      badge: 'Alpine Plowing & Columbia Salmon Ascent',
      title: 'June: Glacier Sun Road Plowing Climax & Sockeye Salmon Runs',
      details: 'NPS snowplow crews break through the 60-foot Big Drift at Logan Pass; Going-to-the-Sun Road typically opens late June. Columbia River sockeye salmon battle through Bonneville fish ladders.',
      leadAlert: 'Glacier required no vehicle reservations in 2026. Logan Pass shuttle tickets and time-limited parking were separate requirements July 1–September 7; next-season rules unconfirmed.'
    },
    7: {
      badge: 'Brown Bears & Alpine Wildflower Peak',
      title: 'July: Katmai Brooks Falls Bear Salmon Leap & Glacier Wildflowers',
      details: 'July is the world-famous peak: up to 40+ coastal brown bears line Brooks Falls to catch leaping sockeye salmon. Logan Pass glacier lilies bloom in carpets along the Continental Divide.',
      leadAlert: '2026 Logan Pass: private-car parking was limited to 3 hours with a free kiosk permit; a separately ticketed shuttle was offered. Verify upcoming-season access.'
    },
    8: {
      badge: 'Monsoon Caution & Stable Trade Winds',
      title: 'August: Peak Geyser Cycles & Haleakalā Crater Clear Skies',
      details: 'Yellowstone geysers experience optimal daylight viewing. Haleakalā summit inversions feature crisp 35°F pre-dawn temperatures with sea-of-clouds below.',
      leadAlert: 'Watch afternoon Zion Narrows flash-flood warnings. For 2026 RMNP, September access reservations released August 1; October released September 1. Confirm any 2027 booking rules with NPS.'
    },
    9: {
      badge: 'Bull Elk Bugling & Fall Chinook Runs',
      title: 'September: Rocky Mountain Elk Rut & Columbia Chinook Surge',
      details: 'Moraine Park echoes with eerie, high-pitched bull elk bugles during dusk rutting battles (5 PM–7 PM). Columbia River fall Chinook and Coho counts exceed 15,000 salmon per day.',
      leadAlert: 'Goldilocks month for Zion Narrows: warm 62°F water, low flow (<60 CFS), and diminished monsoon storm activity.'
    },
    10: {
      badge: 'Rut Climax & Cadillac First Sunrise Return',
      title: 'October: Cadillac Mountain First U.S. Sunrise Alignment',
      details: 'On October 7, solar declination shifts such that Cadillac Mountain summit in Acadia becomes the earliest sunrise in the United States once again. Bull elk rut reaches its final peak.',
      leadAlert: 'Going-to-the-Sun Road closes for winter at Logan Pass by mid-to-late October. Prepare for freezing sunrise temperatures on Cadillac Mountain (25°F–35°F).'
    },
    11: {
      badge: 'First Cold Fronts & Manatee Aggregations',
      title: 'November: Blue Spring Manatee Return & Acadia Winter Solstice Approach',
      details: 'The first continental Arctic cold fronts chill the St. Johns River below 68°F, drawing hundreds of manatees into Blue Spring warm waters. Cadillac Mountain welcomes winter first light.',
      leadAlert: '⚠️ Blue Spring park gate closes to vehicle entry when capacity is reached; arrive by 8:00 AM on cold weekend mornings.'
    },
    12: {
      badge: 'Winter Solstice Light & Firefall Booking Window',
      title: 'December: Deep Winter Manatees & Future Firefall Planning',
      details: 'Over 500+ manatees gather in Blue Spring transparent waters. Cadillac Mountain greets the earliest sunrise in the nation on the winter solstice.',
      leadAlert: '2027 Yosemite Firefall entrance and viewing rules have not been announced in the cited 2026 NPS guidance. Do not purchase an assumed Firefall vehicle reservation.'
    }
  };

  var state = {
    selectedMonth: 0,
    selectedFilter: 'all',
    map: null,
    markers: {}
  };

  function initTimeline() {
    var monthBtns = document.querySelectorAll('.np-month-btn');
    var filterPills = document.querySelectorAll('.np-filter-pill');

    monthBtns.forEach(function (btn) {
      btn.addEventListener('click', function () {
        var m = parseInt(btn.getAttribute('data-month'), 10);
        state.selectedMonth = m;
        monthBtns.forEach(function (b) { b.classList.remove('active'); });
        btn.classList.add('active');
        updateIntelBanner();
        applyFilters();
      });
    });

    filterPills.forEach(function (pill) {
      pill.addEventListener('click', function () {
        var f = pill.getAttribute('data-filter');
        state.selectedFilter = f;
        filterPills.forEach(function (p) { p.classList.remove('active'); });
        pill.classList.add('active');
        applyFilters();
      });
    });
  }

  function updateIntelBanner() {
    var banner = document.getElementById('np-month-intel');
    if (!banner) return;

    var m = state.selectedMonth;
    var intel = MONTH_INTEL[m] || MONTH_INTEL[0];

    // Count phenomena active in this month
    var activeCount = 0;
    if (m === 0) {
      activeCount = PHENOMENA.length;
    } else {
      PHENOMENA.forEach(function (p) {
        if (p.months.indexOf(m) !== -1) activeCount++;
      });
    }

    var badgeText = m === 0 ? intel.badge : 'Month ' + m + ' · ' + activeCount + ' Active Phenomena';

    banner.innerHTML =
      '<div class="np-intel-header">' +
        '<span class="np-intel-title">' + intel.title + '</span>' +
        '<span class="np-intel-badge">' + badgeText + '</span>' +
      '</div>' +
      '<p class="np-intel-details">' + intel.details + '</p>' +
      '<div class="np-intel-lead-time">' + intel.leadAlert + '</div>';
  }

  function applyFilters() {
    var cards = document.querySelectorAll('.wf-story');
    var m = state.selectedMonth;
    var f = state.selectedFilter;

    var visibleCount = 0;

    cards.forEach(function (card) {
      var cardId = card.getAttribute('data-phenomenon-id');
      var item = PHENOMENA.find(function (p) { return p.id === cardId; });
      if (!item) return;

      var matchMonth = (m === 0) || (item.months.indexOf(m) !== -1);

      var matchCategory = true;
      if (f === 'lottery') matchCategory = (item.permitType === 'lottery');
      else if (f === 'open') matchCategory = (item.permitType === 'open');
      else if (f === 'wildlife') matchCategory = (item.category === 'wildlife');
      else if (f === 'optical') matchCategory = (item.category === 'optical');

      var isVisible = matchMonth && matchCategory;

      if (isVisible) {
        card.style.display = '';
        visibleCount++;
        if (m !== 0 && item.months.indexOf(m) !== -1) {
          card.classList.add('highlighted');
          card.classList.remove('dimmed');
        } else {
          card.classList.remove('highlighted');
          card.classList.remove('dimmed');
        }
      } else {
        if (m !== 0 && !matchMonth && matchCategory) {
          // If category matches but not the month, keep visible but dimmed
          card.style.display = '';
          card.classList.add('dimmed');
          card.classList.remove('highlighted');
        } else {
          card.style.display = 'none';
        }
      }
    });

    // Update map marker highlights
    updateMapMarkers();
  }

  function initMap() {
    var mapEl = document.getElementById('phenomenon-leaflet-map');
    if (!mapEl || typeof L === 'undefined') return;

    // Continental US Center
    state.map = L.map('phenomenon-leaflet-map', {
      scrollWheelZoom: false,
      zoomControl: true
    }).setView([39.8283, -98.5795], 4);

    // Try CARTO Voyager with OpenStreetMap fallback
    var cartoUrl = 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';
    var osmUrl = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';

    fetch('/api/carto-basemap-config')
      .then(function (res) { return res.json(); })
      .then(function (cfg) {
        var tileUrl = (cfg && cfg.url) ? cfg.url : cartoUrl;
        L.tileLayer(tileUrl, {
          maxZoom: 18,
          attribution: '&copy; <a href="https://carto.com/">CARTO</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        }).addTo(state.map);
      })
      .catch(function () {
        L.tileLayer(osmUrl, {
          maxZoom: 18,
          attribution: '&copy; OpenStreetMap contributors'
        }).addTo(state.map);
      });

    // Custom Ranger Badge SVG icon generator
    function createRangerIcon(number, category) {
      var color = '#1e3f20';
      if (category === 'optical') color = '#b45309';
      else if (category === 'wildlife') color = '#0369a1';

      var svg =
        '<svg width="34" height="42" viewBox="0 0 34 42" fill="none" xmlns="http://www.w3.org/2000/svg">' +
          '<path d="M17 1L33 6V20C33 30 17 41 17 41C17 41 1 30 1 20V6L17 1Z" fill="' + color + '" stroke="#ffffff" stroke-width="2"/>' +
          '<circle cx="17" cy="18" r="10" fill="#ffffff"/>' +
          '<text x="17" y="22" font-family="sans-serif" font-size="11" font-weight="bold" fill="' + color + '" text-anchor="middle">' + number + '</text>' +
        '</svg>';

      return L.divIcon({
        className: 'np-ranger-marker',
        html: svg,
        iconSize: [34, 42],
        iconAnchor: [17, 42],
        popupAnchor: [0, -38]
      });
    }

    PHENOMENA.forEach(function (p, idx) {
      var marker = L.marker([p.lat, p.lng], {
        icon: createRangerIcon(idx + 1, p.category)
      }).addTo(state.map);

      var popupHtml =
        '<div class="np-map-popup">' +
          '<h4>' + (idx + 1) + '. ' + p.name + '</h4>' +
          '<div class="popup-meta">' + p.park + '</div>' +
          '<div class="popup-lead"><strong>Peak:</strong> ' + p.peakLabel + '<br><strong>Access guidance:</strong> ' + getSeasonPolicy(p,new Date().getFullYear()).text + '</div>' +
          '<a class="popup-jump" href="#' + p.id + '">View Ranger Dossier &darr;</a>' +
        '</div>';

      marker.bindPopup(popupHtml);
      state.markers[p.id] = marker;
    });
  }

  function updateMapMarkers() {
    if (!state.map) return;
    var m = state.selectedMonth;

    PHENOMENA.forEach(function (p) {
      var marker = state.markers[p.id];
      if (!marker) return;

      if (m === 0 || p.months.indexOf(m) !== -1) {
        marker.setOpacity(1.0);
      } else {
        marker.setOpacity(0.35);
      }
    });
  }

  // Set initial month based on real current date
  function setInitialMonth() {
    var curMonth = new Date().getMonth() + 1; // 1-12
    var curBtn = document.querySelector('.np-month-btn[data-month="' + curMonth + '"]');
    if (curBtn) {
      // Don't auto-restrict by default so users see all 12 on entry, but show current in-season badge
      var monthSub = curBtn.querySelector('.btn-sub');
      if (monthSub) monthSub.innerHTML = 'Now';
    }
  }

  // Defensive boot: some integrations load this script after DOMContentLoaded.
  // Keep the map independent of slower advertising and external tile requests.
  var initialized=false;
  function bootAtlas() {
    if (!initialized) {
      initialized=true;
      initTimeline();
      setInitialMonth();
      updateIntelBanner();
    }
    if (!state.map) initMap();
  }
  if (document.readyState === 'loading' || !document.readyState) {
    document.addEventListener('DOMContentLoaded', bootAtlas, {once:true});
  } else {
    bootAtlas();
  }
  if (typeof window.addEventListener === 'function') window.addEventListener('load', bootAtlas, {once:true});

  // Export for testing
  window.NP_PHENOMENA_DATA = {
    phenomena: PHENOMENA,
    monthIntel: MONTH_INTEL,
    getSeasonPolicy: getSeasonPolicy,
    state: state
  };
})();
