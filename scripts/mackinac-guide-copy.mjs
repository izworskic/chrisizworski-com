// Visitor-facing copy for every generated Mackinac sub-page, written as a travel guide.
//
// Titles, meta descriptions, canonicals and source lists stay in the two generators
// (they are search-governed); this module owns what a visitor reads on the page.
// Facts are limited to what the cited official sources and the shared catalog already
// support. No em dashes: tests/mackinac-catalog-cards-rendered.test.js forbids them.

const section = (eyebrow, title, inner) =>
  `<section class="hub-section"><div class="eyebrow">${eyebrow}</div><h2>${title}</h2>${inner}</section>`;
const pairs = rows => `<div class="decision-grid-2">${rows.map(([t, p]) => `<article><strong>${t}</strong><p>${p}</p></article>`).join("")}</div>`;

// ---------------------------------------------------------------------------
// Primary hub surfaces
// ---------------------------------------------------------------------------
export const HUB_COPY = {
  plan: {
    h1: "How to plan a Mackinac Island trip",
    lede: "Mackinac rewards a little planning. The ferry you can make, the nights you have, who’s coming and what you’re hoping for shape the trip far more than any top-ten list. Answer four questions on My Trip and every page here, from ferries to dinner, fits itself to you.",
    primaryLabel: "Start My Trip",
    decisions: [
      ["Time", "How long do you have?", "A day trip, one night and a long weekend are different trips. More nights mean slower mornings and a real full day with no ferry to catch."],
      ["People", "Who’s coming?", "Kids, couples, friends and grandparents want different paces, different meals and different amounts of walking."],
      ["Priorities", "What would spoil it?", "Crowds, too much walking, rushing, overspending. Say it up front and the plan steers around it."]
    ],
    body: () => [
      section("Four questions", "What My Trip asks you",
        `<p>Four quick taps and the planner knows enough to shape the rest of the site. Your answers follow you from page to page, so you only give them once.</p><div class="flow-grid"><article><strong>Trip length</strong><span>A day · one night · two or three nights · four or more</span></article><article><strong>Who’s coming</strong><span>Solo · couple · family · friends · three generations · group</span></article><article><strong>The trip you picture</strong><span>The icons · slow and easy · biking · history · food · a special occasion · kids · scenery</span></article><article><strong>What to avoid</strong><span>Waiting · missing out · walking · rushing · spending · crowds · weather</span></article></div>`),
      section("What happens next", "From your driveway to the dock to the Island",
        `<div class="steps"><div class="step"><div><strong>Find the ferry you can actually make</strong><p>Your starting city and leave time are checked against both Mackinaw City and St. Ignace, with room for parking and boarding.</p></div></div><div class="step"><div><strong>Drop the boats you can’t catch</strong><p>Only departures you can reach comfortably make the list.</p></div></div><div class="step"><div><strong>Shape the days</strong><p>Arrival, full and departure days each get their own plan, sized to the hours you’ll really have.</p></div></div><div class="step"><div><strong>Put the best fit first</strong><p>Among the plans that work, the one closest to what you told us comes first.</p></div></div></div>`),
      section("Why it matters", "A shorter trip should be a smaller trip",
        `<p>A late ferry means a smaller day, not the same checklist done faster. One night gives you an arrival evening and a departure morning, not a full day in between. And if walking is hard, the plan shouldn’t send you up the bluff and back three times. Mackinac is at its best when the plan fits the trip you actually have.</p>`)
    ].join(""),
    truth: "Your answers shape which suggestions you see and in what order. They don’t change ferry schedules, opening hours, weather or accessibility, which the planner checks separately.",
    faq: [
      ["How many questions do I need to answer?", "Four: trip length, who’s coming, the trip you picture and what you’d most like to avoid. Occasionally one more, when the answer would really change the plan."],
      ["Does the planner use AI to invent the itinerary?", "No. It builds plans from published ferry schedules, drive estimates and known Island places first, and only then uses AI to choose among plans that already work. It never makes up places or times."],
      ["Can I change the plan later?", "Yes. Once it’s built you can ask for more relaxed, less walking, more outdoors, a better dinner, less downtown or more history without starting over."]
    ]
  },

  "where-to-stay": {
    h1: "Where to stay on Mackinac Island",
    lede: "Stay the night and you get the Island most visitors never see: the harbor going quiet after the last day ferries, horses on an empty Main Street, the Straits turning gold from a porch. Where you sleep decides what that night feels like, so choose the neighborhood before the hotel.",
    primaryLabel: "Find my kind of stay",
    decisions: [
      ["Convenience", "Step out onto Main Street", "Downtown and the harbor put dinner, fudge and the ferry docks a short walk away. For one night or a first visit, that ease is worth more than a pool."],
      ["Experience", "Let the hotel be the trip", "The grand resorts and historic inns earn their price when the porch, the lawn and a long dinner are part of why you came."],
      ["Quiet", "Buy yourself the edges of the day", "The hours before the first morning boat and after the last evening one belong to overnight guests. A quieter address makes the most of them."]
    ],
    body: ({lodgingCards}) => [
      section("The neighborhoods", "Four corners of the Island, four different nights", pairs([
        ["Downtown and the harbor", "The heart of it. Walk to dinner, walk to the dock, watch the boats come and go. Busy by day, lively into the evening, and the easiest base for a one-night stay."],
        ["Mission Point and the east side", "The sunrise side. Wide lawns running down to the water, an easy, flat walk into town, and a resort pace once the day crowds thin."],
        ["Grand Hotel and the West Bluff", "Up the hill above town, where Victorian cottages line the bluff and the Island’s famous front porch looks out over the Straits. Stay here when the setting is the point."],
        ["Stonecliffe and the west side", "Out among the woods and meadows on the sunset side. Quieter and farther from the action; you’ll rely on bikes or a horse-drawn taxi, and you won’t mind."]
      ])),
      section("Where we’d look", "Properties worth a look, and who they suit",
        `<p class="section-dek">Each note says what kind of trip a property suits, not whether it has a room. Rates, availability and season dates change, so confirm with the property before you plan around it.</p><div class="catalog-grid">${lodgingCards()}</div>`),
      section("Luggage and ferry day", "Think about your bags before you book",
        `<p>There are no cars to carry your luggage. Some properties meet the boats with dock porters; at others you’ll handle bags differently, so ask when you book. On a one-night trip you deal with luggage on both days, and a hotel that takes it off your hands buys back real Island time.</p>`)
    ].join(""),
    truth: "Property notes describe fit, not availability. Rates, packages, porter service and opening dates change every season; confirm with the property or the official lodging directory for your dates.",
    faq: [
      ["Is it worth staying overnight on Mackinac Island?", "For most people, yes. An overnight removes the race for the last ferry and gives you the Island’s quietest hours: the evening after day visitors leave and the early morning before the first boats arrive. A day trip still works if that’s what you have; just plan it tighter."],
      ["Should I stay downtown?", "Downtown is the easiest choice for a short stay or a first visit, with restaurants, shops and the ferry docks close by. Choose the east side, West Bluff or west side when the setting and a quieter evening matter more than convenience."],
      ["Does this page show hotel availability?", "No. It helps you decide where and what kind of stay fits your trip. Check rates and rooms with the property or the official lodging directory."]
    ]
  },

  dining: {
    h1: "Where to eat on Mackinac Island",
    lede: "Lunch with a view from the Fort, a picnic in the park, fudge worked by hand on marble slabs, a long dinner after the day crowds head home. Eating well here is mostly about timing: fit meals to where you already are, and save the big one for the evening.",
    primaryLabel: "Fit meals to my trip",
    decisions: [
      ["Timing", "Keep lunch from eating the afternoon", "On a day trip the best hours are short. A quick, nearby lunch leaves more time on the bike or up at the Fort."],
      ["Location", "Eat where you already are", "Lunch at the Fort on a history day, a picnic on a bike day. Crossing the Island just for a meal costs more time than it looks."],
      ["Occasion", "Decide which meal is the event", "One meal can be the highlight. Make it dinner if you’re staying over, and let the others be simple."]
    ],
    body: ({diningCards}) => [
      section("How to eat here", "Four ways to do a meal on Mackinac", pairs([
        ["Grab and go", "Sandwiches or picnic supplies from a downtown market, eaten in Marquette Park or out along the shore. Right for bike days, kids and fine-weather days you don’t want to spend indoors."],
        ["On the route", "Pair lunch with the part of the Island you’re already exploring, like the Tea Room at the Fort on a history morning. No doubling back."],
        ["Main Street social", "Burgers, a brewpub, a harbor-view bar. Come for the downtown energy, the people-watching and a drink as the boats come in."],
        ["The destination dinner", "A reservation, a nicer shirt, a slower evening. Best on an overnight, when nobody is watching the clock for the last ferry."]
      ])),
      section("Where we’d eat", "Tables worth planning around",
        `<p class="section-dek">Each note says what kind of meal a place is good for. Hours, seasons and reservations change, so check before you build a day around one.</p><div class="catalog-grid">${diningCards()}</div>`),
      section("With kids", "Plan the snack before anyone asks",
        `<p>With young children or grandparents along, a real sit-down break around midday keeps the afternoon from falling apart. Build it into the day like any other stop, somewhere near a restroom and a bit of shade, and everything after it goes better.</p>`)
    ].join(""),
    truth: "Notes describe what kind of meal a place suits. Hours, seasonal closing, waits and reservations change often; check with the restaurant for your date.",
    faq: [
      ["Should I make dinner reservations on Mackinac Island?", "For a special dinner, and on busy summer and event weekends, check with the restaurant ahead of time. For casual lunches, knowing where you’ll be at midday matters more than booking."],
      ["What is the best lunch for a day trip?", "Something quick and close to what you’re doing: a picnic, a casual downtown spot or the Tea Room at the Fort. Save the long, sit-down meal for an overnight."],
      ["Can the planner recommend food for families?", "Yes. Tell My Trip who’s coming and your pace, and the list on this page reorders to put easy, family-friendly choices first. Confirm hours before you go."]
    ]
  },

  "things-to-do": {
    h1: "Things to do on Mackinac Island",
    lede: "A car-free island in the Straits of Mackinac, most of it state park: an 18th-century fort on the bluff, a limestone arch high above the water, a shoreline road you ride by bike, and a downtown that runs on horses and fudge. You won’t see it all in one visit, so choose what to build yours around.",
    primaryLabel: "Plan my Island day",
    decisions: [
      ["Anchor", "Pick the one thing you’d hate to miss", "The Fort, the shoreline loop, a carriage tour or simply the harbor. Build the day around one, and fit the rest in around it."],
      ["Terrain", "Know where the hills are", "Downtown and the shoreline are flat. The Fort, Arch Rock and the interior sit up on the bluffs, and the climbs take real time and energy."],
      ["Weather", "Save the outdoors for the best hours", "Ride and take photos when the wind and light are with you. Museums and shops are for the grey hour."]
    ],
    body: () => [
      section("Choose your kind of day", "Six ways to spend a day on the Island",
        `<div class="experience-grid"><a href="/mackinac-island/bike-day/"><strong>Ride the Island</strong><span>The 8.2-mile shoreline loop, flat all the way, past the stairs to Arch Rock and around to British Landing.</span></a><a href="/mackinac-island/limited-walking/"><strong>See more, walk less</strong><span>Carriage tours, horse-drawn taxis and the flat harbor front, saving the climbs for where they’re worth it.</span></a><article><strong>Historic Mackinac</strong><span>Fort Mackinac on the bluff and the historic buildings of downtown. A full morning, not a quick stop.</span></article><article><strong>Scenery and photography</strong><span>Arch Rock, the West Bluff cottages, sunset from the west side and the harbor at first light.</span></article><a href="/mackinac-island/with-kids/"><strong>Mackinac with kids</strong><span>Ferries, horses, bikes and the Fort’s cannon and rifle demonstrations. Plan around energy and snacks, not a checklist.</span></a><article><strong>Slow Island</strong><span>Marquette Park, the harbor, a long lunch and an evening walk. The point is having nowhere to be.</span></article></div>`),
      section("How to plan the day", "One big thing, a few small ones",
        `<p>The best Mackinac days have a single anchor and a few things that fit easily around it: the Fort in the morning, lunch nearby, an easy afternoon by the water. Try to fit the loop ride, the Fort, a carriage tour and the Grand Hotel porch into one ferry schedule and you’ll spend the day hurrying between them.</p>`),
      section("Getting around", "No cars, but not no effort",
        `<p>You’ll get around on foot, by bike, by carriage or by horse-drawn taxi. Downtown and the shoreline road are easy going; anything inland climbs, sometimes steeply. Distances look short on the map, so leave time for the hills, especially with kids, older travelers or a full day already behind you.</p>`)
    ].join(""),
    truth: "Opening hours, rentals, tours and conditions change by season and by day. The live planner checks your date; confirm with operators before you go.",
    faq: [
      ["What should I not miss on a first visit?", "Pick one anchor: Fort Mackinac, a ride around the shoreline, a carriage tour or an unhurried afternoon downtown. Add Arch Rock and a walk along the harbor if there’s time. A day built around one highlight beats a day spent racing between all of them."],
      ["Can I bike and see the Fort in one day?", "Usually, yes, if you arrive on a morning ferry and the weather cooperates. Treat the loop as a real block of the day rather than a quick add-on, and leave margin for the ferry home."],
      ["Is Mackinac Island easy to walk?", "Downtown and the shoreline are flat and easy. The Fort, Arch Rock and the interior are uphill. If walking is hard for anyone in your group, use carriages and taxis for the climbs."]
    ]
  },

  events: {
    h1: "Planning a Mackinac trip around an event",
    lede: "Lilacs in June, the Fourth of July, sailboats finishing the long races from Chicago and Port Huron, a fudge festival as the leaves turn. Event weekends are some of the Island’s best days and its busiest. When a date brings you here, build everything else around it.",
    primaryLabel: "Plan around my event",
    decisions: [
      ["Timing", "Work back from the start time", "Know when you need to be there, then pick a ferry with room to spare. A fixed time rules out some otherwise good boats."],
      ["Crowds", "Expect busier everything", "Big weekends fill ferries, restaurants and rooms. Book earlier and eat at off-hours."],
      ["Stay", "Consider sleeping over", "For early starts, late finishes or multi-day festivals, a room on the Island means no race for the last boat."]
    ],
    body: () => [
      section("2026 calendar highlights", "The big weekends",
        `<div class="event-list"><article><time>June 5–14, 2026</time><strong>Lilac Festival</strong><span>Ten days celebrating the Island’s old lilacs, with events around town. Book rooms well ahead.</span></article><article><time>July 4, 2026</time><strong>Fourth of July</strong><span>Holiday crowds and evening celebrations. Plan your return ferry before the day begins.</span></article><article><time>July 10–14 & July 18–21, 2026</time><strong>Chicago and Bayview Mackinac races</strong><span>Sailboats finish the two great Mackinac races and fill the harbor. A wonderful sight, and a busy one.</span></article><article><time>October 2–3, 2026</time><strong>Fall Fudge Festival</strong><span>Fudge, early fall color and a slower season, with some businesses beginning to close for the year.</span></article><article><time>October 23–25, 2026</time><strong>Halloween Weekend</strong><span>A late-season favorite. Many businesses have closed or keep shorter hours, so check before you go.</span></article></div><p class="section-dek">Dates are for 2026, from the official annual-events calendar. Check the organizer for the year you’re visiting.</p>`),
      section("Event-day planning", "Protect the start time, then enjoy the rest",
        `<p>Tell My Trip when your event starts. It works back from that time to a ferry with room to spare, then fills the hours before and after with things that fit, so the event never depends on a perfect connection.</p>`),
      section("The official calendar", "Confirm the schedule before you commit",
        `<p>Programs, times and ticketing change. Use this page to decide how an event shapes your trip, and the Tourism Bureau or the organizer to confirm the details.</p>`)
    ].join(""),
    truth: "Dates shown are 2026 references. Event organizers and the Mackinac Island Tourism Bureau are the source for schedules, changes, tickets and cancellations.",
    faq: [
      ["Should I stay overnight for a Mackinac event?", "Often, yes. It removes ferry pressure for early, late or multi-day events and gives you the quieter hours around them. Rooms go quickly on big weekends, so book early."],
      ["How early should I arrive for an event?", "Work back from the start time: allow for getting to the dock, parking, boarding, the crossing and getting across town. Aim to arrive with time to spare rather than on a perfect connection."],
      ["Are the event dates on this page live?", "They’re 2026 dates from the official calendar. Always confirm the current year’s schedule with the organizer."]
    ]
  },

  "around-the-straits": {
    h1: "Beyond the Island: Mackinaw City, St. Ignace and the Straits",
    lede: "The ferry towns have their own reasons to linger: a reconstructed 18th-century fort and a lighthouse facing the bridge at Mackinaw City, Ojibwa history in St. Ignace, dark skies at the Headlands and the five-mile Mackinac Bridge in between. Add them on the way in or out, and keep the Island days for the Island.",
    primaryLabel: "Plan a Straits trip",
    decisions: [
      ["Gateway", "Start from the side you’re on", "Coming from the south, Mackinaw City’s sights are on your way. From the Upper Peninsula, St. Ignace’s are."],
      ["Timing", "Use the ferry days", "A mainland stop fits best before your boat over or after you return, not in the middle of an Island day."],
      ["Worth it", "Go for a reason", "History, the night sky or the bridge itself are good reasons to add a stop. Ticking off another town isn’t."]
    ],
    body: ({regionalCards}) => [
      section("Worth the detour", "Stops that earn their place",
        `<p class="section-dek">Ideas for the route in and out. Check hours and seasons before you plan around a stop.</p><div class="catalog-grid">${regionalCards()}</div>`),
      section("Mackinaw City", "The south side: forts, lighthouses and dark skies",
        `<p>On a history trip, Colonial Michilimackinac pairs naturally with the Mackinaw City ferries, with Old Mackinac Point Lighthouse close by, looking out at the bridge. On a clear night, the Headlands International Dark Sky Park just west of town is a remarkable place to watch the stars. Save these for the evening before or after your Island days.</p>`),
      section("St. Ignace", "The north side: the Upper Peninsula way in",
        `<p>If you’re coming from the Upper Peninsula, St. Ignace is usually the easier ferry town. Its waterfront and the Museum of Ojibwa Culture make a good hour or two when your route already passes through.</p>`)
    ].join(""),
    truth: "These are route ideas, not confirmation that a stop is open. Hours and seasons vary; check before you go.",
    faq: [
      ["Should I visit Mackinaw City and Mackinac Island on the same day?", "It can work when a short stop fits before your ferry or after you return. Don’t give up your best Island hours for it; on an overnight trip, a mainland evening is often the better slot."],
      ["Is St. Ignace better than Mackinaw City?", "Neither is better in general. Leave from the side of the bridge you’re arriving on, then compare ferry times: sometimes a better departure is worth the extra drive."],
      ["Can the planner build a broader Straits trip?", "Yes. Tell My Trip you’d like to see the region, and a multi-day plan puts mainland stops on your arrival and departure days."]
    ]
  }
};

// ---------------------------------------------------------------------------
// Intent pages. guide: [{eyebrow,title,paras}] where a para is text or [lead, text].
// ---------------------------------------------------------------------------
export const INTENT_COPY = {
  "day-trip": {
    h1: "A Mackinac Island day trip, done right",
    lede: "One day is enough to fall for the Island: an early boat across the Straits, a morning on the bluff or the bike, lunch near the harbor, fudge for the drive home. The trick is catching a morning ferry and choosing one big thing, not six.",
    cta: "Plan my day trip",
    decisions: [
      ["Morning", "Get on an early boat", "The ferry you can reach from home decides how much Island you get. Leave early enough to make a morning departure without rushing."],
      ["Midday", "Give the best hours to one big thing", "The Fort, the shoreline loop, a carriage tour or the kids’ favorite. Everything else fits around it."],
      ["Evening", "Don’t aim for the last boat", "The final ferry is a backstop, not a plan. Heading back a little earlier makes for a calmer drive home."]
    ],
    guide: [{eyebrow: "A good shape for the day", title: "Morning, midday, afternoon", paras: [
      ["Morning.", "Step off the boat onto Main Street and head for your anchor while it’s quiet, whether that’s the Fort, the bike rental or a carriage tour."],
      ["Midday.", "A quick lunch close to where you are. A harbor-side spot, a picnic in Marquette Park or the Tea Room at the Fort keeps you moving."],
      ["Afternoon.", "Something easy: Arch Rock, the West Bluff cottages, a slow walk along the harbor. Then fudge, and a ferry with time to spare."]
    ]}],
    stepsTitle: "Plan it in three steps",
    steps: [
      ["Tell My Trip your date, starting city and leave time", "It finds the Mackinaw City or St. Ignace ferries you can realistically make."],
      ["Say who’s coming and what matters", "Four quick taps set the pace, the walking and what gets priority."],
      ["Let a short day be a smaller day", "A later arrival gets a compact plan instead of a rushed one."]
    ],
    cards: [
      ["Aim for about six hours on the Island", "Enough for one big experience, a relaxed lunch and time to wander, without watching the clock."],
      ["Mackinaw City or St. Ignace?", "Usually the town on your side of the bridge. Sometimes a better ferry time makes the other worth it; My Trip compares both."],
      ["The loop is flat; the middle is not", "The 8.2-mile shoreline ride is easy riding. Interior roads climb and take more time and effort."],
      ["With kids, plan the break", "A real lunch and rest stop keeps the afternoon from unraveling. It’s time well spent."]
    ],
    truth: "Ferry schedules, weather and your drive all change the plan, so there’s no single perfect day to publish. Recheck ferry times with the operator before you go.",
    faq: [
      ["How many hours do I need on Mackinac Island?", "About six hours on the Island makes a relaxed first visit: one big experience, lunch and time to wander. Fewer hours can still be a good day if you plan to do less."],
      ["Which ferry port should I use?", "Usually the one on your side of the bridge: Mackinaw City from the Lower Peninsula, St. Ignace from the Upper Peninsula. Your start time can change that, so compare both."],
      ["Should I take the last ferry back?", "Treat the last boat as a backstop. With kids, doubtful weather or a long drive home, an earlier ferry is usually the better choice."]
    ]
  },

  "with-kids": {
    h1: "Mackinac Island with kids",
    lede: "A boat ride to get there, horses on Main Street, cannon at the Fort, bikes, beaches and fudge being made in the shop windows. Mackinac is a gift for families, as long as the day is built around energy and snacks rather than a checklist.",
    cta: "Plan our family trip",
    decisions: [
      ["Energy", "Know your walking limit", "The hills are real. Plan the climbs for fresh legs, and ride a carriage for the rest."],
      ["Anchor", "Pick one thing for them", "The Fort, a carriage ride, a bike ride or the beach. Make it the heart of the day."],
      ["Breaks", "Schedule the downtime", "A proper lunch and a rest in the park is worth more than one more stop."]
    ],
    guide: [{eyebrow: "What kids love here", title: "The Island’s best family moments", paras: [
      ["The ferry.", "Spray, gulls and the bridge on the horizon. For younger kids it’s half the adventure."],
      ["The Fort.", "Soldiers in period uniform, and the cannon and rifle demonstrations up on the bluff."],
      ["The fudge shops.", "Watching fudge poured and worked on marble slabs in the Main Street windows."],
      ["The shore.", "Riding or walking along the water, with plenty of stony beaches for skipping rocks."]
    ]}],
    stepsTitle: "Plan it in three steps",
    steps: [
      ["Tell My Trip who’s coming", "Young kids, teens and grandparents each change the pace and the walking."],
      ["Say what would ruin the day", "Too much walking, long waits, crowds or rushing: the plan steers around it."],
      ["Adjust as you go", "Tap “Less walking” or “More relaxed” after the plan is built, without starting over."]
    ],
    cards: [
      ["Carriages are transport, too", "A horse-drawn taxi up the hill can save tired legs, and the rest of the afternoon."],
      ["A bike day is its own day", "The shoreline loop is a big family outing on its own. Don’t stack the Fort and a carriage tour on top of it."],
      ["Feed them before they ask", "Plan lunch and a restroom stop near where you’ll be, before hunger decides the schedule."],
      ["One night makes two easy days", "An overnight lets arrival and departure days stay light. It isn’t an extra full day, but it’s a calmer trip."]
    ],
    truth: "Every family is different. We use broad guidance and don’t assume stroller access, accessibility or attraction details we haven’t confirmed; check with operators when it matters.",
    faq: [
      ["Is Mackinac Island good for young kids?", "Very, as long as you don’t overpack the day. Horses, bikes, ferries and the Fort give plenty of variety; the hills and the walking between places are what to plan around."],
      ["Should families rent bikes?", "If everyone rides comfortably, the flat shoreline loop is a highlight of the trip. The hilly interior is better left to confident riders."],
      ["Is a day trip enough with kids?", "For many families, yes, as long as the day is focused. An overnight takes the pressure off the ferry and makes both days easier."]
    ]
  },

  "2-day-itinerary": {
    h1: "Two days on Mackinac Island",
    lede: "Two days usually means one night, and one night on Mackinac is the best deal on the Island: you arrive, the day crowds leave, and the evening and the next morning are yours. Plan it as an arrival day and a departure day, with a long evening in between.",
    cta: "Plan my two days",
    decisions: [
      ["Day one", "Arrive and settle in", "Let the ferry set the clock. Check in, find your bearings and keep the afternoon light."],
      ["The night", "Use the quiet", "Dinner, sunset, the harbor after dark. This is what staying over buys you."],
      ["Day two", "An easy morning, then home", "Get out early while it’s quiet, keep luggage and the ferry simple, and add a mainland stop only if it’s on the way."]
    ],
    guide: [{eyebrow: "A sample shape", title: "Arrival afternoon, long evening, early morning", paras: [
      ["Day one.", "Arrive by early afternoon, drop your bags and do one thing properly, perhaps the Fort or a carriage tour. Dinner downtown or at your hotel, then a walk along the harbor as the lights come on."],
      ["Day two.", "Up early for the Island at its emptiest. Ride the shoreline loop or walk up to Arch Rock before the first boats arrive, then a late breakfast, fudge and a relaxed ferry home."]
    ]}],
    stepsTitle: "Plan it in three steps",
    steps: [
      ["Choose “One night” on My Trip", "You’ll get an arrival day and a departure day, planned for the hours you’ll actually have."],
      ["Pick your style", "Couples, families, cyclists and history lovers each spend the two days differently."],
      ["Tune it", "Less walking, a better dinner, more outdoors or less downtown, without starting over."]
    ],
    cards: [
      ["One night isn’t a full day", "It removes ferry pressure, but arriving and leaving still take real time."],
      ["Two nights changes everything", "A second night adds a true full day with no boat to catch: room for a long ride, a whole history day or nothing at all."],
      ["Where you stay matters more on a short trip", "Downtown saves steps; a quieter property makes the evening itself the experience."],
      ["Mainland stops go on the ends", "A Straits stop fits before you cross or after you return, not in the middle of your Island time."]
    ],
    truth: "Your two-day plan sets the shape of each day and what goes together. Exact times for each stop are best set closer to the date, with current weather and opening hours.",
    faq: [
      ["Is 2 days enough for Mackinac Island?", "Yes, for a first visit. Treat it as an arrival day and a departure day with one night between, and choose your priorities. Two nights gives you a full day in the middle, which is a different, more relaxed trip."],
      ["What should I do the first evening?", "Keep it easy: dinner, a walk along the harbor or up to a viewpoint, and sunset. The quiet after the day visitors leave is the reason to stay."],
      ["Should I stay downtown or somewhere quieter?", "Downtown is easiest on a short stay. Choose a quieter property when the evening and the setting matter more than being close to everything."]
    ]
  },

  "ferry-planner": {
    h1: "Mackinac Island ferries: which boat, which port",
    lede: "Every Mackinac trip starts with a short, lovely crossing: the bridge on the horizon, Round Island Lighthouse sliding past, the Island rising green and white ahead. Choosing the right boat comes down to the port on your side of the bridge and a departure you can make without rushing.",
    cta: "Find my ferry",
    decisions: [
      ["Port", "Mackinaw City or St. Ignace?", "From the south, Mackinaw City usually saves you crossing the bridge. From the Upper Peninsula, St. Ignace. My Trip checks both."],
      ["Timing", "Leave room at the dock", "Allow for the drive, parking and boarding. The best departure is the one you make comfortably, not the one you almost make."],
      ["Return", "Plan the ride home, too", "Day trips need a return that fits. Overnight trips can keep the return flexible."]
    ],
    guide: [{eyebrow: "At the dock", title: "What to expect", paras: [
      "Ferries run from both Mackinaw City and St. Ignace, and the crossing itself is short. Park, check in and give yourself a buffer: summer weekends and event days are busy.",
      "Luggage and bikes can come with you; ask your ferry line how it’s handled. If you’re staying on the Island, your hotel may have porters meeting the boats."
    ]}],
    stepsTitle: "Find your boat in three steps",
    steps: [
      ["Add your date, starting city and leave time", "That tells us which departures you can realistically reach."],
      ["Compare both ports", "Mackinaw City and St. Ignace, side by side for your trip."],
      ["Confirm with the ferry line", "Schedules and service can change; the operator has the final word."]
    ],
    cards: [
      ["Coming from the south", "Mackinaw City usually saves you from crossing the bridge."],
      ["Coming from the Upper Peninsula", "St. Ignace is usually the simpler way over."],
      ["A better boat can beat a shorter drive", "Now and then a slightly longer drive puts you on the Island much earlier."],
      ["Overnight returns can stay open", "If you’re staying over, you don’t need to pick a boat home now unless you have somewhere to be."]
    ],
    truth: "Ferry times come from published schedules. Operators have the final say on service, weather cancellations and changes; check before you go.",
    faq: [
      ["Mackinaw City or St. Ignace, which is better?", "Usually the one on your side of the bridge. Your starting city and the departure times can change that, so compare both."],
      ["Do I need to pick an exact return ferry for an overnight trip?", "No. Unless you have a deadline, keep the return flexible; the planner shows the options for your return day."],
      ["Does the planner use live traffic?", "No. Drive times are planning estimates with a buffer added, not live traffic."]
    ]
  },

  "from-detroit": {
    h1: "Detroit to Mackinac Island",
    lede: "Straight up I-75, past Bay City and into the pines of the north, to the bridge and the boats. From Detroit it’s a long drive to a short ferry, so the whole trip turns on when you leave home.",
    cta: "Plan from Detroit",
    decisions: [
      ["Port", "Start with Mackinaw City", "I-75 runs straight there. My Trip still checks St. Ignace in case a better boat is worth the bridge."],
      ["Leave time", "The drive decides the ferry", "An early ferry only helps if you can reach the dock, park and board in time."],
      ["Trip length", "Day trip or overnight?", "A day trip from Detroit is a very long day. An overnight trades the rush for an evening on the Island."]
    ],
    guide: [{eyebrow: "The drive", title: "Making the most of the road north", paras: [
      "Leave early and plan one stop to stretch your legs along the way.",
      "If a day trip means a pre-dawn start and a late drive home, consider one night instead: arrive in the afternoon, enjoy the evening and take the next day slowly."
    ]}],
    stepsTitle: "Plan it in three steps",
    steps: [
      ["Open My Trip with Detroit already filled in", "Your starting city carries over, so you don’t type it again."],
      ["Choose your date and leave time", "We show the ferries you can realistically make."],
      ["Day trip or overnight?", "The return, meals and Island plan all change once there’s no same-day ferry to catch."]
    ],
    cards: [
      ["I-75 goes straight to the ferries", "It’s the direct route to Mackinaw City; St. Ignace is just across the bridge if its timing is better."],
      ["Missing a boat costs more than a few miles", "On a long drive, catching the right departure matters more than the fastest route."],
      ["A late arrival means a smaller day", "Pick one or two things rather than rushing through the whole list."],
      ["Think about the drive home", "After a long day, an earlier ferry back is often the smarter choice."]
    ],
    truth: "Drive times are estimates, not live traffic. Ferry schedules belong to the operators; check them before you leave.",
    faq: [
      ["Can Detroit visitors do Mackinac Island as a day trip?", "Yes, with a very early start. Check that your leave time gives you enough hours on the Island and a return that doesn’t make the drive home miserable."],
      ["Which ferry port is better from Detroit?", "Mackinaw City, in most cases: I-75 leads right to it. St. Ignace is worth comparing only when its departure times are clearly better."],
      ["Should I stay overnight instead?", "If a day trip would leave you only a few hours on the Island, or mean a very long drive both ways, one night is the better trip."]
    ]
  },

  "from-chicago": {
    h1: "Chicago to Mackinac Island",
    lede: "Chicago has two good ways north: around the lake and up through Michigan to Mackinaw City, or through Wisconsin and across the Upper Peninsula to St. Ignace. Either way it’s a proper road trip, and the Island rewards staying at least a night once you get there.",
    cta: "Plan from Chicago",
    decisions: [
      ["Route", "Through Michigan or through Wisconsin?", "Both work. Where you start in Chicagoland and when you leave decide which is cleaner."],
      ["Ferry", "Plan the drive and the boat together", "A slightly quicker drive can still land you on the Island later if the ferry times don’t line up."],
      ["Trip length", "Stay at least a night", "After that much driving, one or more nights on the Island is what makes the trip."]
    ],
    guide: [{eyebrow: "The two routes", title: "Around the lake, or over the top", paras: [
      ["Through Michigan.", "Around the south end of Lake Michigan and north through the Lower Peninsula to the Mackinaw City ferries."],
      ["Through Wisconsin and the U.P.", "North through Wisconsin, across the Upper Peninsula along Lake Michigan’s northern shore, and into St. Ignace."],
      "My Trip compares both against the ferry schedule, so you don’t have to."
    ]}],
    stepsTitle: "Plan it in three steps",
    steps: [
      ["Open My Trip with Chicago already filled in", "We route you to both Mackinaw City and St. Ignace."],
      ["Add your leave time", "Departures you can’t reach drop off the list."],
      ["Decide on nights before stops", "With a long drive, how many nights you have shapes everything else."]
    ],
    cards: [
      ["The Michigan route", "Around the lake and up through Michigan to the Mackinaw City ferries."],
      ["The Wisconsin and U.P. route", "North through Wisconsin, across the Upper Peninsula and into St. Ignace."],
      ["Count the dock time", "Parking, boarding and the crossing all take time; there’s no driving onto the Island."],
      ["Come back a different way", "Out one route and home the other makes a loop of it, if that adds something to the trip."]
    ],
    truth: "We compare planning routes and published ferry schedules, not live traffic. Check road conditions and ferry times before you travel.",
    faq: [
      ["What is the best way to drive from Chicago to Mackinac Island?", "There are two: around the lake through Michigan to Mackinaw City, or north through Wisconsin and the Upper Peninsula to St. Ignace. Where you start and when you leave decide which is better."],
      ["Can the planner compare both ferry ports from Chicago?", "Yes. It routes you to both ferry towns and lists only the departures you can comfortably reach."],
      ["Is Mackinac a good one-night trip from Chicago?", "It can be, but it’s a lot of driving for one night. Two or more nights give you far more Island for the trip it takes to get there."]
    ]
  },

  "from-traverse-city": {
    h1: "Traverse City to Mackinac Island",
    lede: "From Traverse City the Island is close enough for a spontaneous day and easy enough for a weekend: north through lake and orchard country to Mackinaw City and onto a boat. The only real question is how early you want to be on the water.",
    cta: "Plan from Traverse City",
    decisions: [
      ["Port", "Mackinaw City first", "You’re already south of the bridge. St. Ignace only makes sense if its boat is clearly better."],
      ["Leave time", "A little earlier goes a long way", "Leaving half an hour sooner can mean a better ferry and a fuller day."],
      ["Island plan", "Spend the saved time well", "A shorter drive leaves room for a bike loop, the Fort or a family day; just probably not all three."]
    ],
    guide: [{eyebrow: "Day or weekend", title: "An easy trip, either way", paras: [
      "The drive north runs through Northern Michigan’s lake towns. Leave early for a full day on the Island, or make a weekend of it with a night there and a slow morning before the boat home."
    ]}],
    stepsTitle: "Plan it in three steps",
    steps: [
      ["Open My Trip with Traverse City filled in", "Both ferry towns are compared right away."],
      ["Pick your date and leave time", "We show which departures you can make."],
      ["Choose what the day is for", "Biking, history, kids or a slow scenic day each get a different plan."]
    ],
    cards: [
      ["No need to cross the bridge", "From Traverse City, Mackinaw City is the natural ferry town."],
      ["Day trips work well", "Leave early and don’t aim for the last boat home."],
      ["Late start, smaller plan", "If you get away late, the plan gets shorter instead of rushed."],
      ["One night is a treat", "Staying over gives you the quiet evening and early morning on the Island."]
    ],
    truth: "Drive times are planning estimates, not live traffic, and ferry service can change. Check before you go.",
    faq: [
      ["Can I do Mackinac Island as a day trip from Traverse City?", "Yes. Leave early enough to reach a morning ferry and come back without rushing; My Trip checks that from your actual leave time."],
      ["Should I ferry from Mackinaw City or St. Ignace from Traverse City?", "Mackinaw City, almost always. My Trip still compares St. Ignace in case its schedule suits you better."],
      ["Is one night worth it from Traverse City?", "If you’d enjoy dinner, sunset and a quiet morning on the Island, yes. One night gives you an arrival day and a departure day; two nights adds a full day between."]
    ]
  },

  "from-grand-rapids": {
    h1: "Grand Rapids to Mackinac Island",
    lede: "From Grand Rapids it’s a solid drive north to the Straits, long enough that the road and the ferry have to be planned together. Get the leave time right and the rest of the day falls into place.",
    cta: "Plan from Grand Rapids",
    decisions: [
      ["Drive", "Your leave time picks the ferry", "Only the boats you can comfortably reach are real options."],
      ["Port", "Mackinaw City, unless the timing says otherwise", "You’re coming from the south; St. Ignace has to earn the bridge crossing."],
      ["Return", "Don’t max out the day", "After a long drive, a comfortable ferry home beats squeezing in one more hour."]
    ],
    guide: [{eyebrow: "Day or weekend", title: "Decide before you pick the boat", paras: [
      "An early start makes a good day trip. If it would leave only a few Island hours or a late night home, stay over: an evening on the Island and a slow morning make the drive worth it."
    ]}],
    stepsTitle: "Plan it in three steps",
    steps: [
      ["Open My Trip with Grand Rapids filled in", "We work out the drive to each ferry town."],
      ["Enter your date and real leave time", "Boats you can’t reach are left off."],
      ["Choose one big thing", "On a day trip, protect one highlight, plus lunch and some slack."]
    ],
    cards: [
      ["Head for Mackinaw City", "Coming from the south, it’s the natural ferry town."],
      ["Arriving isn’t boarding", "Parking and check-in take time; build them in."],
      ["Keep day trips focused", "A late arrival calls for a smaller plan, not a faster one."],
      ["Overnight helps both ends", "A night on the Island turns one long day into an easy evening and a relaxed morning."]
    ],
    truth: "Drive times are estimates, not live traffic. Ferry companies have the final word on schedules and boarding.",
    faq: [
      ["Can I day-trip Mackinac Island from Grand Rapids?", "Yes, with an early start. My Trip checks that the drive and boarding still leave you enough time on the Island and a sensible trip home."],
      ["Which ferry port should I use from Grand Rapids?", "Mackinaw City, usually. My Trip compares St. Ignace against the actual schedule rather than assuming."],
      ["How do I avoid wasting time at the ferry dock?", "Plan the drive and the ferry together. The planner adds a buffer for the road and boarding, so you arrive with time to spare but not an hour to kill."]
    ]
  },

  "limited-walking": {
    h1: "Mackinac Island with less walking",
    lede: "No cars doesn’t have to mean long walks. Downtown and the 8.2-mile shoreline are mostly flat, horse-drawn taxis and carriage tours handle the hills, and you can save your steps for the one view worth climbing to. Here’s how to see the Island comfortably.",
    cta: "Plan an easier day",
    decisions: [
      ["Terrain", "Know the flat parts from the hills", "Downtown and the shoreline are easy. The Fort, Grand Hotel, Arch Rock and the interior sit up on the bluffs."],
      ["Getting around", "Ride the climbs", "Horse-drawn taxis and carriage tours handle the hills, so your energy goes where it matters."],
      ["Priorities", "Spend your steps wisely", "Pick the places you most want to explore on foot, and ride to them."]
    ],
    guide: [{eyebrow: "Getting around", title: "How to ride instead of climb", paras: [
      "Horse-drawn taxis go point to point around the Island, and carriage tours cover the highlights, including stops up on the bluff.",
      "The Tourism Bureau lists wheelchair and mobility-scooter options, an accessible horse-drawn carriage and accessible ferry parking. Call ahead to confirm what’s available on your date."
    ]}],
    stepsTitle: "Plan it in three steps",
    steps: [
      ["Tell My Trip walking is a concern", "It shapes your plan from the start, not as an afterthought."],
      ["Add your date, starting city and ferry", "An easier Island day still has to fit the drive and the boat."],
      ["Tap “Less walking” anytime", "The plan cuts steep transitions without changing your trip."]
    ],
    cards: [
      ["The shoreline is the easy zone", "The Tourism Bureau describes the 8.2-mile perimeter and downtown as mostly flat, while the interior has hills and bluffs."],
      ["Use the Fort’s north entrance", "The official accessibility guide notes a steep south entrance and a more accessible north side; a horse-drawn taxi can take you there."],
      ["Accessible options exist; book them", "An accessible horse-drawn carriage and accessible ferry parking are available. Contact operators to confirm for your date."],
      ["One highlight beats three climbs", "Choose one uphill destination and avoid going up and down the bluff more than once."]
    ],
    truth: "This is planning guidance, not an accessibility certification. Everyone’s needs differ, historic buildings and paths vary, and equipment or carriage availability must be confirmed with the operator.",
    faq: [
      ["Is Mackinac Island flat?", "Downtown and the 8.2-mile shoreline are mostly flat. The Fort, Arch Rock and the interior are uphill, so plan around that."],
      ["Can I visit Fort Mackinac without walking the steep south approach?", "Yes. Official accessibility guidance points to the north side as the more accessible entrance, and a horse-drawn taxi can take you there. Confirm current arrangements before you visit."],
      ["Are wheelchairs or mobility scooters possible on Mackinac Island?", "Yes. The Tourism Bureau lists wheelchair and mobility-scooter options and accessible ferry parking. Check rental availability and property access directly."]
    ]
  },

  "bike-day": {
    h1: "Biking Mackinac Island: the M-185 loop",
    lede: "Eight flat miles of shoreline road with no cars on it: past the stairs up to Arch Rock, around to British Landing and back into town with the Straits beside you the whole way. It’s one of the great easy rides anywhere. Pick the right hours and it’s perfect.",
    cta: "Plan my bike day",
    decisions: [
      ["Route", "Shoreline or interior?", "The loop is flat and easy. Interior roads and trails climb, and they’re a different kind of ride."],
      ["Timing", "Ride in the best window", "Wind and rain matter more than the temperature. Choose the hours, not just the day."],
      ["Pace", "Let the ride be the day", "Add one stop, like Arch Rock or a long lunch, and don’t try to fit everything else around it."]
    ],
    guide: [{eyebrow: "The ride", title: "Around the Island in eight miles", paras: [
      "Rent downtown or bring your own bike on the ferry, then follow the shore road all the way around. Allow a relaxed couple of hours with stops, longer if you linger.",
      "Good places to pause: the stairs up to Arch Rock, British Landing on the far side of the Island, and any of the stony beaches along the way."
    ]}],
    stepsTitle: "Plan it in three steps",
    steps: [
      ["Start My Trip with biking chosen", "The plan starts from a bike day and asks only what’s missing."],
      ["Add your ferry and bikes", "Renting on the Island takes pickup time; bringing bikes changes the ferry logistics."],
      ["Let the weather pick the hours", "The planner scores the riding window for your date."]
    ],
    cards: [
      ["A highway with no cars", "M-185 is famous as the state highway where motor vehicles aren’t allowed. It runs about 8.2 miles around the Island."],
      ["Watch the wind", "The shore road is open to the lake, and a headwind changes the ride."],
      ["Busy at the start", "Rental pickup, ferry arrivals and Main Street crowds slow things downtown, even when the loop itself is quiet."],
      ["E-bikes are restricted", "Per the Tourism Bureau’s May 25, 2026 update, e-cycles require a qualifying mobility disability and a City license; ordinary recreational e-bikes aren’t broadly permitted."]
    ],
    truth: "Riding conditions are planning guidance, not a safety guarantee. Weather changes fast, rentals and ferry policies belong to the operators, and e-bike rules follow the City of Mackinac Island.",
    faq: [
      ["How long is the bike ride around Mackinac Island?", "The M-185 loop is about 8.2 miles. Riding time depends on your pace, your stops and the wind."],
      ["Is the Mackinac Island bike loop hilly?", "The shoreline loop is mostly flat. Interior routes are much hillier and a different kind of ride."],
      ["Can I use an e-bike on Mackinac Island?", "Current 2026 Tourism Bureau guidance allows e-cycles for people with a qualifying mobility disability who complete the City licensing process, with specific class rules. Check the current rules before bringing one."]
    ]
  },

  fall: {
    h1: "Mackinac Island in the fall",
    lede: "Autumn on the Island means gold and red on the bluffs, cool clear days for the bike, and streets that feel like a village again once summer’s crowds are gone. It’s also closing season, so plan for the color and check what’s still open.",
    cta: "Plan my fall trip",
    decisions: [
      ["Color", "Make the scenery the point", "Save the best light for the shoreline, the west side and the woods of the interior."],
      ["Season", "Check what’s open", "Many businesses close through October. Confirm lodging, dinner and tours for your date."],
      ["Weather", "Chase the good hours", "Days are shorter and cooler. Get outdoors in the best window of the day."]
    ],
    guide: [{eyebrow: "Timing", title: "When the leaves turn", paras: [
      "Color on the Island builds through the fall, and the timing shifts from year to year with the weather. Our Mackinac fall color tracker follows how this season is running."
    ]}],
    stepsTitle: "Plan it in three steps",
    steps: [
      ["Enter your real fall date", "Color and closures both depend on it."],
      ["Say whether scenery is the point", "A photographer, a festival visitor and a first-timer each get a different route."],
      ["Recheck closures near the date", "Where published dates exist we use them; where they don’t, we say so."]
    ],
    cards: [
      ["Color is forecast, not promised", "Peak shifts with the weather. We help with timing without guaranteeing leaves."],
      ["October is winding down", "Businesses close through the month, so later trips need more checking."],
      ["Festival weekends are busy", "The Fudge Festival and Halloween Weekend bring crowds even in a quieter season."],
      ["The light is shorter", "Put the scenery in the best daylight, not whatever time is left over."]
    ],
    truth: "Fall color is modeled and weather-dependent, not guaranteed. Operating dates come from published sources where available; businesses and ferry lines have the final word.",
    faq: [
      ["Is October a good time to visit Mackinac Island?", "Often a wonderful one: cooler days, fall color and a slower pace. Just check closures, which increase as October goes on."],
      ["Is Mackinac Island quiet in fall?", "Usually quieter than summer, though festival weekends can be busy."],
      ["Will everything still be open?", "No. Some places stay open longer than others; check the official season updates for your dates."]
    ],
    related: [["Fall color tracker", "/fall-color/mackinac-island-fall-color/"], ["Bike day", "/mackinac-island/bike-day/"], ["Where to stay", "/mackinac-island/where-to-stay/"], ["Events", "/mackinac-island/events/"]]
  }
};
