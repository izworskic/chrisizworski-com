import fs from "node:fs";
import path from "node:path";
import {createRequire} from "node:module";
import {navHtml,PRIMARY_GENERATED_SURFACES} from "./mackinac-site-architecture.mjs";

const require=createRequire(import.meta.url);
const {LODGING,DINING,REGIONAL}=require("../lib/mackinac-island/catalog.js");
const root="public/mackinac-island";
const hero="https://thumb.wikimedia.org/wikipedia/commons/thumb/6/6e/Mackinac_Island_July_2010_05_%28harbor_from_Fort_Street%29.JPG/1280px-Mackinac_Island_July_2010_05_%28harbor_from_Fort_Street%29.JPG";

const esc=s=>String(s??"").replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const pillList=items=>items.map(x=>`<span>${esc(x)}</span>`).join("");
const decisionCards=rows=>rows.map(x=>`<article class="hub-decision"><span>${esc(x[0])}</span><h3>${esc(x[1])}</h3><p>${esc(x[2])}</p></article>`).join("");
const faqHtml=faq=>faq.map(x=>`<details><summary>${esc(x[0])}</summary><p>${esc(x[1])}</p></details>`).join("");

function profileBox(){
  return `<aside class="trip-context" data-trip-context hidden><div><span>Your saved trip is here</span><strong data-trip-context-title>Continue your Mackinac trip</strong><p data-trip-context-summary></p></div><a class="btn primary" data-mackinac-planner-cta href="/mackinac-island/#trip-intake">Continue my trip</a></aside>`;
}

function lodgingCards(){
  return LODGING.map(item=>`<article class="catalog-card"><div class="catalog-top"><span>${esc(item.district)}</span><strong>${esc(item.name)}</strong><small>${esc(item.type)}</small></div><p>${esc(item.note)}</p><div class="catalog-traits">${pillList(item.traits.slice(0,5))}</div>${item.closing_2026?`<small class="catalog-status">Published 2026 closing: ${esc(item.closing_2026)}</small>`:"<small class=\"catalog-status\">Season dates: verify for your trip.</small>"}</article>`).join("");
}
function diningCards(){
  return DINING.map(item=>`<article class="catalog-card"><div class="catalog-top"><span>${esc(item.district)}</span><strong>${esc(item.name)}</strong><small>${esc(item.style)} · ${esc(item.price_band)}</small></div><p>${esc(item.note)}</p><div class="catalog-traits">${pillList(item.traits.slice(0,5))}</div><small class="catalog-status">Meals: ${esc(item.meal.join(", "))} · current hours/reservations must be checked.</small></article>`).join("");
}
function regionalCards(){
  return REGIONAL.map(item=>`<article class="catalog-card"><div class="catalog-top"><span>${esc(item.gateway)}</span><strong>${esc(item.name)}</strong><small>${esc(item.type)}</small></div><p>${esc(item.note)}</p><small class="catalog-status">Route fit only. Verify current hours for the trip date.</small></article>`).join("");
}

const pages=[
  {
    slug:"plan",surface:"plan",title:"Mackinac Island Trip Planner",description:"Build a Mackinac Island trip around your actual travelers, trip length, ferry approach, pace, walking tolerance and priorities before choosing an itinerary.",
    h1:"Build the Mackinac trip before you build the itinerary",
    lede:"The useful first question is not “what are the top ten things to do?” It is what kind of Mackinac trip you are trying to have. A day trip, one-night stay, active bike weekend and relaxed multigenerational visit should not start from the same itinerary.",
    primaryCta:"/mackinac-island/#trip-intake",primaryLabel:"Build my trip",
    decisions:[
      ["1 · Time","How much Mackinac do you actually have?","A same-day ferry window, one night, and several nights create different products. The planner composes arrival, full and departure days differently."],
      ["2 · People","Who is making the trip?","Kids, couples, active groups and limited-walking visitors need different transition counts, meal timing and movement."],
      ["3 · Tradeoff","What would make the trip feel wrong?","Crowds, too much walking, overspending, missing an icon, bad weather or feeling rushed should change the plan before stops are selected."]
    ],
    body:`
      <section class="hub-section"><div class="eyebrow">The shared engine</div><h2>Four answers are enough to make the rest of the site smarter</h2><p>The Mackinac intake asks trip length, party type, the experience you are picturing, and the thing most likely to reduce the value of the trip. A deterministic visitor vector is created from those answers. JEV may then classify among the supplied Mackinac visitor archetypes or choose one bounded follow-up question, but it cannot invent facts about you or the Island.</p><div class="flow-grid"><article><strong>Trip length</strong><span>Day · one night · 2–3 nights · 4+ nights</span></article><article><strong>Party</strong><span>Solo · couple · family · friends · multigenerational · group</span></article><article><strong>Trip vision</strong><span>Icons · relaxed · biking · history · food/social · special · kids · scenery</span></article><article><strong>Main loss</strong><span>Waiting · missing out · walking · rushing · spending · crowds · weather</span></article></div></section>
      <section class="hub-section"><div class="eyebrow">What happens next</div><h2>The planner should remove impossible options before ranking anything</h2><div class="steps"><div class="step"><div><strong>Resolve the mainland approach</strong><p>Your starting city and leave-home time are used to estimate travel to Mackinaw City and St. Ignace.</p></div></div><div class="step"><div><strong>Keep only reachable ferries</strong><p>Drive time, road buffer and ferry check-in happen before a departure is considered usable.</p></div></div><div class="step"><div><strong>Build a trip shape that fits the visit</strong><p>Arrival day, full Island day, departure day, biking, walking tolerance, meals and fixed event times become real constraints.</p></div></div><div class="step"><div><strong>Rank valid alternatives</strong><p>JEV can resolve preference tradeoffs only after deterministic feasibility has done its work.</p></div></div></div></section>
      <section class="hub-section"><div class="eyebrow">Why this matters</div><h2>A shorter trip should become a smaller trip—not the same checklist performed faster</h2><p>A late ferry arrival can remove a loop ride or major attraction. A one-night stay creates an arrival evening and a departure morning, not a fictional full middle day. A visitor who says walking is the biggest loss should not receive repeated hill-to-downtown-to-hill transitions. These are planning consequences, not cosmetic personalization.</p></section>`,
    truth:"The visitor profile guides preference ranking. It does not change published schedules, attraction facts, weather, accessibility rules or route feasibility.",
    faq:[
      ["How many questions do I need to answer?","The base intake uses four high-value questions. At most one additional adaptive question is asked when it can materially change the trip."],
      ["Does the planner use AI to invent the itinerary?","No. The planner creates valid deterministic candidates first. JEV is bounded to classification or ranking among supplied valid options."],
      ["Can I change the plan later?","Yes. The live planner supports bounded adjustments such as more relaxed, less walking, more outdoors, better dinner, less downtown and more history without restarting the intake."]
    ],
    sources:[["Official Mackinac trip planning","https://www.mackinacisland.org/plan-your-trip/"],["Official suggested itineraries","https://www.mackinacisland.org/plan-your-trip/suggested-itineraries/"],["Mackinac State Historic Parks itineraries","https://www.mackinacparks.com/visit/plan/itineraries/"]]
  },
  {
    slug:"where-to-stay",surface:"stay",title:"Where to Stay on Mackinac Island",description:"Choose where to stay on Mackinac Island by balancing downtown convenience, quiet, resort amenities, character and trip length.",
    h1:"Choose a Mackinac stay by what you want the night to do for the trip",
    lede:"The most useful lodging question is not which hotel has the highest generic rating. It is whether the stay should reduce transitions, become part of the experience, create a quieter evening, support kids, or put you near a specific part of the Island.",
    primaryCta:"/mackinac-island/?intent=stay#trip-intake",primaryLabel:"Match lodging to my trip",
    decisions:[
      ["Convenience","Do you want to walk out into downtown?","For a short stay, downtown proximity can protect time and simplify luggage, meals and ferry-day transitions."],
      ["Experience","Should the property itself be a destination?","A full-service resort, iconic historic hotel or quiet west-side stay can justify extra travel when the lodging is part of the reason for the trip."],
      ["Quiet","How important are early and late Island hours?","Sleeping on the Island changes the experience after many day-trippers leave and before the morning ferries arrive."]
    ],
    body:`
      <section class="hub-section"><div class="eyebrow">How to choose</div><h2>Location is a trip-design choice</h2><div class="decision-grid-2"><article><strong>Downtown / harbor</strong><p>Best when reducing transitions matters: short stays, first visits, dining and easy ferry-day movement.</p></article><article><strong>Mission / east side</strong><p>Useful for resort-style stays, lawns, lake views and getting a little outside the busiest downtown core.</p></article><article><strong>Grand Hotel area</strong><p>Works when iconic Mackinac and the property experience deserve a large share of the trip.</p></article><article><strong>Stonecliffe / west side</strong><p>Better when quiet, sunsets, space and a destination-style stay matter more than constant downtown access.</p></article></div></section>
      <section class="hub-section"><div class="eyebrow">Shared lodging catalog</div><h2>Known properties, described by trip fit—not room availability</h2><p class="section-dek">These properties come from the source-backed Mackinac catalog already used by the live planner. The cards describe why each can fit a trip. They do not claim a room is available or quote a live rate.</p><div class="catalog-grid">${lodgingCards()}</div></section>
      <section class="hub-section"><div class="eyebrow">Luggage + ferry day</div><h2>The lodging choice affects arrival and departure friction</h2><p>The official Tourism Bureau notes that some properties use dock porters while other guests may need to handle luggage differently. On a one-night trip, that operational detail can matter almost as much as amenities because both calendar days include ferry and luggage transitions.</p></section>`,
    truth:"Property cards are source-backed fit guidance only. No room inventory, live rate, package, porter availability or booking status is inferred. Check the property or official lodging directory for the actual trip date.",
    faq:[
      ["Is it worth staying overnight on Mackinac Island?","An overnight removes same-day return pressure and lets you experience the Island after many day visitors leave and before the first morning arrivals. Whether it is worth the added cost depends on the trip you want."],
      ["Should I stay downtown?","Downtown is particularly useful for short trips and visitors who value convenience. Quieter or resort-style areas can be better when the property and evening atmosphere are a larger part of the trip."],
      ["Does this page show hotel availability?","No. It ranks and explains fit. Availability and rates must be checked with the property or an authoritative booking source."]
    ],
    sources:[["Official Mackinac lodging directory","https://www.mackinacisland.org/stay/"],["Official resort guide","https://www.mackinacisland.org/stay/resorts/"],["Official 2026 season updates","https://www.mackinacisland.org/season-updates/"]]
  },
  {
    slug:"dining",surface:"eat",title:"Mackinac Island Dining Planner",description:"Choose Mackinac Island restaurants and meal timing by fitting quick meals, destination dinners, family breaks and geography into the actual Island itinerary.",
    h1:"Build meals around the Mackinac day instead of stopping the day for meals",
    lede:"A restaurant can be excellent and still be wrong for the trip. The useful choice is whether the meal should save time, create a break, become a special-occasion anchor, keep a history itinerary together, or extend the evening after the day-trippers leave.",
    primaryCta:"/mackinac-island/?intent=dining#trip-intake",primaryLabel:"Fit food to my trip",
    decisions:[
      ["Timing","Does the meal protect or consume the prime Island window?","A day trip may need a fast lunch or location-efficient meal. An overnight can make dinner part of the destination experience."],
      ["Geography","Is the restaurant already on the route?","Leaving the Fort, interior or west side only to return later creates unnecessary transitions."],
      ["Purpose","Is food fuel, a break, or a major experience?","The planner should treat a picnic, quick family meal and special dinner as three different itinerary blocks."]
    ],
    body:`
      <section class="hub-section"><div class="eyebrow">Meal strategy</div><h2>Match the meal to the trip shape</h2><div class="decision-grid-2"><article><strong>Fast + flexible</strong><p>Useful for short day trips, bike days, kids and visitors who would rather spend the weather window outside.</p></article><article><strong>Route-efficient</strong><p>Pair lunch with the area you are already visiting so food does not create avoidable backtracking.</p></article><article><strong>Downtown social</strong><p>Works when shopping, drinks, people-watching and Main Street energy are part of the desired experience.</p></article><article><strong>Destination dinner</strong><p>Best when the meal itself deserves time and the trip can absorb travel, reservation timing and a slower evening.</p></article></div></section>
      <section class="hub-section"><div class="eyebrow">Shared dining catalog</div><h2>Known dining choices with the tradeoff made visible</h2><p class="section-dek">The live planner uses the same curated catalog below. Fit scores depend on the visitor profile; this page deliberately does not pretend that current hours, waits, reservations or tables have been checked.</p><div class="catalog-grid">${diningCards()}</div></section>
      <section class="hub-section"><div class="eyebrow">For families</div><h2>A planned break can be more valuable than one more stop</h2><p>With younger children or a multigenerational group, meal and restroom timing reduces the chance that the second half of the day collapses. The planner treats that slack as useful itinerary time rather than as inefficiency.</p></section>`,
    truth:"Restaurant fit is not current restaurant status. Hours, seasonal closure, waits, reservations and table availability must be checked for the trip date.",
    faq:[
      ["Should I make dinner reservations on Mackinac Island?","For a specific destination dinner or busy event period, checking reservation requirements directly with the restaurant is prudent. This planner does not infer table availability."],
      ["What is the best lunch for a day trip?","There is no single best lunch. A quick or route-efficient meal often preserves more Island time, while a scenic or sit-down lunch may be the right choice when food and atmosphere are priorities."],
      ["Can the planner recommend food for families?","Yes. The visitor profile includes party type and pace, and the curated catalog includes family/value fit. Current operating details still need to be checked."]
    ],
    sources:[["Official Mackinac dining directory","https://www.mackinacisland.org/dining/"],["Official lunch and dinner guide","https://www.mackinacisland.org/blog/post/where-to-eat-lunch-dinner-on-mackinac-island/"],["Official 2026 season updates","https://www.mackinacisland.org/season-updates/"]]
  },
  {
    slug:"things-to-do",surface:"explore",title:"Mackinac Island Things to Do",description:"Choose what to do on Mackinac Island by matching Fort Mackinac, M-185, Arch Rock, carriage tours, downtown, scenery and State Park time to your actual trip.",
    h1:"Choose the Mackinac experiences that deserve your limited Island time",
    lede:"Mackinac has more worthwhile things to do than most visitors can fit. The planning problem is not finding attractions—it is deciding which experiences belong together given ferry arrival, weather, hills, crowds, party type and trip length.",
    primaryCta:"/mackinac-island/#trip-intake",primaryLabel:"Build my experience mix",
    decisions:[
      ["Anchor","What is the one experience the day should protect?","Fort Mackinac, the M-185 loop, a carriage experience, scenery or a relaxed downtown day each create a different route."],
      ["Movement","How much climbing and transition time fits?","The shoreline perimeter and downtown are different movement problems from interior hills and bluff attractions."],
      ["Weather","Which experiences depend on the best outdoor window?","Bike riding, photography and scenic outdoor blocks should use the useful weather window instead of being scheduled arbitrarily."]
    ],
    body:`
      <section class="hub-section"><div class="eyebrow">Experience families</div><h2>Start by choosing the type of day</h2><div class="experience-grid"><a href="/mackinac-island/bike-day/"><strong>Ride the Island</strong><span>M-185 shoreline loop, conditions, bike logistics and interior-hill tradeoffs.</span></a><a href="/mackinac-island/limited-walking/"><strong>See more with less walking</strong><span>Use flatter zones, horse-drawn movement and fewer steep transitions.</span></a><article><strong>Historic Mackinac</strong><span>Make Fort Mackinac and the historic core the anchor instead of one stop among many.</span></article><article><strong>Scenery + photography</strong><span>Use weather, light, lake views and quieter areas to decide when and where to move.</span></article><a href="/mackinac-island/with-kids/"><strong>Mackinac with kids</strong><span>Protect energy, meal breaks and transition count instead of packing every attraction into the day.</span></a><article><strong>Slow Island</strong><span>Reduce downtown backtracking and leave room for parks, waterfront, dinner and evening atmosphere.</span></article></div></section>
      <section class="hub-section"><div class="eyebrow">Trip-shape rule</div><h2>One anchor plus supporting experiences usually beats five competing anchors</h2><p>The deterministic spatial planner already generates known trip shapes such as a compact core day, active loop, easy-flow visit, slow overnight and regional extension. JEV may choose among those valid candidates based on visitor preferences, but it cannot create arbitrary stops or override ferry and mobility constraints.</p></section>
      <section class="hub-section"><div class="eyebrow">Movement reality</div><h2>The Island is car-free, not effort-free</h2><p>Downtown and the roughly 8.2-mile perimeter route are relatively flat compared with interior roads and bluff attractions. A map distance alone can therefore understate the cost of a route for families, limited-walking visitors or people carrying a full day of activities.</p></section>`,
    truth:"This guide organizes known Mackinac experiences; it does not guarantee an attraction is open, a rental is available, or conditions are safe. The live planner rechecks the date-specific pieces.",
    faq:[
      ["What should I not miss on a first visit?","For many first-time visitors, one iconic anchor such as Fort Mackinac, an M-185 ride, carriage experience or scenic historic core works better than trying to make every highlight mandatory."],
      ["Can I bike and see the Fort in one day?","Often yes when ferry timing, weather and pace support it, but the planner should treat the bike loop as a major block rather than pretending it adds no time."],
      ["Is Mackinac Island easy to walk?","Downtown and the perimeter are flatter; interior attractions involve hills and bluffs. Walking tolerance should be treated as a real planning input."]
    ],
    sources:[["Official things to do","https://www.mackinacisland.org/do/"],["Official getting around guide","https://www.mackinacisland.org/plan-your-trip/getting-around/"],["Mackinac State Historic Parks","https://www.mackinacparks.com/"]]
  },
  {
    slug:"events",surface:"events",title:"Mackinac Island Events Trip Planner",description:"Plan Mackinac Island events around fixed start times, crowd pressure, ferry timing, lodging demand and sightseeing that fits around the event.",
    h1:"If an event is why you are coming, the event owns the itinerary",
    lede:"An event trip should not be a normal sightseeing itinerary with an event squeezed into the middle. Fixed start times, crowd pressure, lodging demand and ferry arrival margin need to be protected first.",
    primaryCta:"/mackinac-island/?intent=events#trip-intake",primaryLabel:"Plan around my event",
    decisions:[
      ["Anchor","What time must you be on the Island?","A fixed event start creates a hard arrival margin and can eliminate otherwise attractive ferry choices."],
      ["Crowds","Will the event change downtown pressure?","Large annual events can shift ferry, restaurant and lodging demand even when weather is excellent."],
      ["Stay","Does sleeping on the Island reduce event-day risk?","For early starts, late finishes or multi-day festivals, an overnight can materially change the trip."]
    ],
    body:`
      <section class="hub-section"><div class="eyebrow">2026 annual anchors</div><h2>Major events materially change the planning problem</h2><div class="event-list"><article><time>June 5–14, 2026</time><strong>Lilac Festival</strong><span>Multi-day festival; lodging and downtown demand should be planned earlier than an ordinary June visit.</span></article><article><time>July 4, 2026</time><strong>Fourth of July celebrations</strong><span>Holiday crowds and fixed evening programming can change return-ferry strategy.</span></article><article><time>July 10–14 & July 18–21, 2026</time><strong>Chicago and Bayview Mackinac race periods</strong><span>Harbor activity and event traffic become part of the experience.</span></article><article><time>October 2–3, 2026</time><strong>Fall Fudge Festival</strong><span>Fall color, seasonal business closures and event programming all matter at once.</span></article><article><time>October 23–25, 2026</time><strong>Halloween Weekend</strong><span>Late-season operating limits and event timing need explicit rechecking.</span></article></div><p class="section-dek">These are 2026 reference dates from the official annual-events calendar. Future-year dates must be reverified rather than carried forward.</p></section>
      <section class="hub-section"><div class="eyebrow">Event-first planning</div><h2>Protect the hard time first, then spend the remaining Island time</h2><p>The live planner supports a fixed event-start input. It adds arrival margin before the event and then composes sightseeing around what remains instead of ranking a plan that is attractive but late.</p></section>
      <section class="hub-section"><div class="eyebrow">Current calendar</div><h2>Use the official calendar for the authoritative event schedule</h2><p>Event programs can change. The destination hub can help decide how the event affects the trip, while the Tourism Bureau or event organizer remains the authority for the actual schedule.</p></section>`,
    truth:"The listed dates are explicitly 2026 reference dates. Event organizers and the Mackinac Island Tourism Bureau remain authoritative for current schedules, changes, ticketing and cancellations.",
    faq:[
      ["Should I stay overnight for a Mackinac event?","It can reduce ferry timing pressure for early, late or multi-day events. The value depends on the event schedule, lodging cost and the rest of the trip."],
      ["How early should I arrive for an event?","Use the event's actual start time, then preserve enough ferry and on-Island movement margin to avoid making the event dependent on a perfect transfer."],
      ["Are the event dates on this page live?","The major dates shown are labeled 2026 reference dates. Always confirm the current schedule with the official calendar or organizer."]
    ],
    sources:[["Official upcoming-events calendar","https://www.mackinacisland.org/upcoming-events/"],["Official annual-events calendar","https://www.mackinacisland.org/upcoming-events/annual-island-events/"],["Official 2026 season updates","https://www.mackinacisland.org/season-updates/"]]
  },
  {
    slug:"around-the-straits",surface:"straits",title:"Mackinac Island & Straits Trip Planner",description:"Decide when Mackinaw City, St. Ignace and other Straits stops improve a Mackinac Island trip instead of adding unnecessary driving and transitions.",
    h1:"Make Mackinac the anchor; add the Straits only when the route earns it",
    lede:"A regional trip can be excellent, but every mainland add-on has a cost in driving, parking, ferry timing and transitions. The useful question is whether a stop naturally fits before the ferry, after the ferry, or on a separate day.",
    primaryCta:"/mackinac-island/?intent=straits#trip-intake",primaryLabel:"Build a regional trip",
    decisions:[
      ["Gateway","Which side of the bridge are you already using?","Mackinaw City and St. Ignace should be treated as route gateways first, not interchangeable attraction lists."],
      ["Timing","Does the stop fit before arrival or after departure?","A mainland stop is strongest when it uses otherwise awkward ferry-day time instead of stealing prime Island hours."],
      ["Value","Is the stop worth another transition?","History, night sky, maritime or cultural interests can justify a regional extension; a generic checklist usually cannot."]
    ],
    body:`
      <section class="hub-section"><div class="eyebrow">Shared regional catalog</div><h2>Known Straits extensions with a reason to exist</h2><p class="section-dek">These options come from the same regional catalog used by the live planner. They are route ideas, not claims that an attraction is open when you arrive.</p><div class="catalog-grid">${regionalCards()}</div></section>
      <section class="hub-section"><div class="eyebrow">Mackinaw City</div><h2>Use the south gateway when it complements a Lower Peninsula approach</h2><p>History-first visitors can pair Colonial Michilimackinac with the Mackinaw City ferry side. A clear mainland evening can make Headlands International Dark Sky Park valuable on a regional overnight. The important rule is placement: do not insert either into the middle of a strong Island day.</p></section>
      <section class="hub-section"><div class="eyebrow">St. Ignace</div><h2>Use the north gateway when the trip already belongs on the Upper Peninsula side</h2><p>St. Ignace can be the cleaner ferry approach for Upper Peninsula travelers and can support cultural/history extensions such as the Museum of Ojibwa Culture when the route naturally passes through town.</p></section>`,
    truth:"Regional suggestions are planning-fit ideas only. The live planner does not infer attraction hours or availability from the existence of a catalog entry; verify current operating information before adding the stop.",
    faq:[
      ["Should I visit Mackinaw City and Mackinac Island on the same day?","Sometimes, especially when a short mainland stop naturally fits before an achievable ferry or after returning. Do not sacrifice the core Island window just to add another destination name."],
      ["Is St. Ignace better than Mackinaw City?","Neither is universally better. Your starting city, side of the bridge, ferry alignment and regional interests determine the better gateway."],
      ["Can the planner build a broader Straits trip?","Yes. The visitor profile includes regional-exploration preference, and the multi-day planner can place gateway experiences on arrival or departure days when they improve the trip."]
    ],
    sources:[["Mackinaw City things to do","https://mackinawcity.com/things-to-do/"],["St. Ignace attractions","https://stignace.com/attractions/"],["Official Mackinac getting-here guide","https://www.mackinacisland.org/plan-your-trip/getting-here/"]]
  }
];

function pageHtml(p){
  const canonical=`https://chrisizworski.com/mackinac-island/${p.slug}/`;
  const jsonLd=JSON.stringify({"@context":"https://schema.org","@graph":[
    {"@type":"WebPage","@id":canonical,"url":canonical,"name":p.title,"description":p.description,"isPartOf":{"@id":"https://chrisizworski.com/#website"},"author":{"@id":"https://chrisizworski.com/#person"},"about":{"@type":"Place","name":"Mackinac Island","address":{"@type":"PostalAddress","addressRegion":"MI","addressCountry":"US"}}},
    {"@type":"FAQPage","mainEntity":p.faq.map(x=>({"@type":"Question","name":x[0],"acceptedAnswer":{"@type":"Answer","text":x[1]}}))},
    {"@type":"BreadcrumbList","itemListElement":[{"@type":"ListItem","position":1,"name":"Chris Izworski","item":"https://chrisizworski.com/"},{"@type":"ListItem","position":2,"name":"Mackinac Island","item":"https://chrisizworski.com/mackinac-island/"},{"@type":"ListItem","position":3,"name":p.title,"item":canonical}]}
  ]});
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(p.title)} | Chris Izworski</title><meta name="description" content="${esc(p.description)}"><meta name="robots" content="index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1"><meta name="author" content="Chris Izworski"><link rel="canonical" href="${canonical}"><meta property="og:type" content="website"><meta property="og:site_name" content="Chris Izworski"><meta property="og:title" content="${esc(p.title)}"><meta property="og:description" content="${esc(p.description)}"><meta property="og:url" content="${canonical}"><meta property="og:image" content="${hero}"><meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${esc(p.title)}"><meta name="twitter:description" content="${esc(p.description)}"><meta name="twitter:image" content="${hero}"><link rel="stylesheet" href="/assets/mackinac-intent.css?v=20260920-hub1"><script type="application/ld+json">${jsonLd}</script></head>
<body data-mackinac-surface="${esc(p.surface)}"><header class="bar"><div class="shell"><a class="brand" href="/">Chris Izworski</a><a class="hub-home-link" href="/mackinac-island/">Mackinac Island trip hub</a></div></header>
<div class="destination-nav-wrap"><div class="shell">${navHtml("/mackinac-island/"+p.slug+"/")}</div></div>
<main><section class="hero"><div class="shell"><div class="crumbs"><a href="/">Home</a> / <a href="/mackinac-island/">Mackinac Island</a> / ${esc(p.title)}</div><div class="hero-grid"><div><div class="eyebrow">Mackinac destination intelligence</div><h1>${esc(p.h1)}</h1><p class="lede">${esc(p.lede)}</p><div class="cta-row"><a class="btn primary" data-mackinac-planner-cta href="${p.primaryCta}">${esc(p.primaryLabel)}</a><a class="btn" href="/mackinac-island/">See Mackinac today</a></div></div><figure class="intent-hero-photo"><img src="${hero}" alt="Mackinac Island harbor viewed from above downtown"><figcaption>Harbor view from Fort Street · <a href="https://commons.wikimedia.org/wiki/File:Mackinac_Island_July_2010_05_(harbor_from_Fort_Street).JPG" target="_blank" rel="noopener">Michael Barera / Wikimedia Commons</a> · CC BY-SA 4.0</figcaption></figure></div></div></section>
<div class="shell">${profileBox()}</div>
<section class="shell decision-strip">${decisionCards(p.decisions)}</section>
${p.body}
<section class="hub-section faq"><div class="shell"><div class="eyebrow">Common questions</div><h2>Before you lock this part of the trip</h2>${faqHtml(p.faq)}</div></section>
<section class="hub-section"><div class="shell"><p class="truth"><strong>Truth boundary:</strong> ${esc(p.truth)}</p><div class="planner-cta"><h2>Carry this decision into the same Mackinac planner</h2><p>Your visitor profile and trip inputs belong to one shared engine. Moving to another Mackinac page should not create a separate trip.</p><a class="btn" data-mackinac-planner-cta href="${p.primaryCta}">${esc(p.primaryLabel)}</a></div><p class="sources"><strong>Primary planning references:</strong> ${p.sources.map(x=>`<a href="${x[1]}" target="_blank" rel="noopener">${esc(x[0])}</a>`).join(" · ")}</p></div></section>
</main><footer><div class="shell">Built by <a href="/">Chris Izworski</a>. Live agencies, operators and businesses remain authoritative for their own schedules, conditions, accessibility, prices and availability.</div></footer><script src="/assets/mackinac-hub.js?v=20260920-hub1" defer></script></body></html>`;
}

const slugs=pages.map(x=>x.slug);
for(const required of PRIMARY_GENERATED_SURFACES)if(!slugs.includes(required))throw new Error("Missing primary hub generator surface: "+required);
for(const p of pages){const dir=path.join(root,p.slug);fs.mkdirSync(dir,{recursive:true});fs.writeFileSync(path.join(dir,"index.html"),pageHtml(p));}
console.log(`Generated ${pages.length} primary Mackinac hub pages.`);
