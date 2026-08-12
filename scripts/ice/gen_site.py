import hashlib
import os
import json, pathlib, sys
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
from gen_chrome import (head, header, FOOTER, SAFETY_BANNER, breadcrumb,
                        PERSON_NODE, PERSON_ID, SITE, BASE)

ROOT = pathlib.Path(__file__).resolve().parents[2]
OUT = pathlib.Path(os.environ.get("ICE_OUT", str(ROOT / "public" / "michigan-ice")))
(OUT / "regions").mkdir(parents=True, exist_ok=True)
ICE_ROOT_DATE_MODIFIED = "2026-08-12"

REGIONS = [
    dict(
        slug="saginaw-bay", name="Saginaw Bay", short="Saginaw Bay",
        acis="KMBS", acisName="Saginaw MBS International Airport",
        nws="KMBS", lake="huron", lakeName="Lake Huron",
        access="Linwood, Pinconning, Quanicassee, Sebewaing, Bay Port, Caseville",
        blurb=("The largest and most heavily fished ice sheet in Michigan, and the one that puts the most people in "
               "the water. Saginaw Bay is shallow, wide open to wind, and it freezes and breaks up faster than almost "
               "anything else in the state. That combination is exactly what makes it productive and exactly what "
               "makes it dangerous."),
        detail=("Because the bay is shallow it gives up heat quickly, so it can lock up hard in a short cold stretch "
                "well before deeper water does. The same shallowness and the open fetch mean a single day of strong "
                "wind can shear the sheet, open leads a mile offshore, and push pressure ridges up overnight. People "
                "who were on good ice in the morning have been cut off from shore by afternoon. The Coast Guard flies "
                "rescues off this bay most winters, and the pattern is almost always the same: solid ice near shore, a "
                "working crack that opened with an offshore wind, and a group of anglers on the wrong side of it."),
        notes=[
            ("Offshore wind is the specific hazard", "A west or southwest wind on Saginaw Bay pushes ice away from the "
             "west shore. That is the setup that opens leads behind people. Check wind direction before you walk out, "
             "not just temperature."),
            ("Shallow means fast both ways", "The bay makes ice quickly in a cold snap and loses it just as quickly in "
             "a thaw. Cold accumulation from two weeks ago tells you very little about today if it has been above "
             "freezing since."),
            ("The DNR singles out Great Lakes bays", "Michigan DNR states plainly that ice covering the bays of the "
             "Great Lakes will always be more fragile than inland lake ice at the same thickness. This is that ice."),
        ],
    ),
    dict(
        slug="houghton-lake", name="Houghton Lake", short="Houghton Lake",
        acis="KHTL", acisName="Houghton Lake, Roscommon County",
        nws="KHTL", lake=None, lakeName=None,
        access="Houghton Lake town accesses, Prudenville, North Shore",
        blurb=("The largest inland lake in Michigan and the center of the state's ice fishing culture. Shallow, "
               "wind exposed for an inland lake, and surrounded by more shanties in February than anywhere else "
               "in Michigan."),
        detail=("Houghton Lake averages only around twenty feet deep, which is why it freezes early relative to the "
                "deep northern lakes and why the ice fishing tradition here is so entrenched. There is no satellite "
                "ice product for inland lakes at this scale, so the only signal this page can honestly offer is "
                "accumulated cold from the Houghton Lake climate station, which sits essentially on the water. That "
                "is a real signal for whether ice should be forming, and it is not a measurement of the ice."),
        notes=[
            ("No satellite coverage here", "The NOAA ice cover product covers the Great Lakes, not inland lakes. For "
             "Houghton Lake this page shows accumulated cold only, and says so rather than implying more."),
            ("Shallow and early", "At roughly twenty feet average depth this lake gives up heat fast and typically "
             "locks up ahead of the deeper northern lakes."),
            ("Crowds are their own hazard", "Heavy shanty and vehicle traffic concentrates load and cuts holes across "
             "the sheet. Popular does not mean safe."),
        ],
    ),
    dict(
        slug="lake-st-clair", name="Lake St. Clair", short="Lake St. Clair",
        acis="KDET", acisName="Detroit City Airport",
        lake="stclair", lakeName="Lake St. Clair", nws="KDET",
        access="Metro Beach, Selfridge, Anchor Bay, Fair Haven, Algonac",
        blurb=("Shallow, current driven, and the closest hard water to several million people. Lake St. Clair produces "
               "excellent perch and pike ice fishing and it has some of the least forgiving ice in the state because "
               "of the flow moving through it."),
        detail=("St. Clair is essentially a wide spot in a river system. Water moves through it constantly on its way "
                "from Lake Huron to the Detroit River, and moving water undermines ice from below where you cannot see "
                "it. The DNR specifically warns that ice formed over current is often dangerous, and this entire lake "
                "is over current. Anchor Bay in the northeast is the traditional ice fishing water because flow there "
                "is weakest, and even that varies year to year."),
        notes=[
            ("The whole lake is over current", "Flow undermines ice from underneath and leaves thickness that looks "
             "fine from the top. This is the single most important fact about ice on St. Clair."),
            ("Anchor Bay is the traditional water", "It sits away from the main flow path, which is why the ice "
             "fishing concentrates there. That is a relative statement, not an assurance."),
            ("Freighter tracks reopen", "Shipping keeps channels open and moving. Stay far off any track and any lead "
             "that lines up with one."),
        ],
    ),
    dict(
        slug="little-bay-de-noc", name="Little Bay de Noc", short="Little Bay de Noc",
        acis="KESC", acisName="Escanaba, Delta County Airport",
        lake="michigan", lakeName="Lake Michigan", nws="KESC",
        access="Escanaba, Gladstone, Kipling, Ford River",
        blurb=("The Upper Peninsula walleye destination, and the coldest of the regions on this page. Little Bay de "
               "Noc is a long protected arm off northern Lake Michigan that reliably makes better ice than anything "
               "in the Lower Peninsula, for the simple reason that it is much colder for much longer."),
        detail=("The protected shape and the northern latitude mean this bay accumulates cold earlier and holds it "
                "later than any of the southern waters. It also draws destination anglers from several states, which "
                "means a lot of people on the ice who do not know the local hazards. The Escanaba River and Ford "
                "River mouths carry current and are the usual soft spots, and the outer bay opens to Green Bay "
                "proper where wind driven ice movement is a real factor."),
        notes=[
            ("Colder and longer", "This is the most reliable ice season of the regions here, which is why it draws "
             "destination traffic. Reliable is not the same as uniform."),
            ("River mouths are the soft spots", "The Escanaba and Ford river mouths carry current under the ice. "
             "Treat any river influence as suspect regardless of the surrounding sheet."),
            ("The outer bay moves", "Where Little Bay de Noc opens toward Green Bay, wind can move ice. The protected "
             "inner bay behaves very differently from the outer end."),
        ],
    ),
    dict(
        slug="grand-traverse-bay", name="Grand Traverse Bay", short="Grand Traverse Bay",
        acis="KTVC", acisName="Traverse City Cherry Capital Airport",
        lake="michigan", lakeName="Lake Michigan", nws="KTVC",
        access="Suttons Bay, Bowers Harbor, Elk Rapids, Northport",
        blurb=("Deep, cold, and the least likely of these waters to lock up. Grand Traverse Bay only makes broad ice "
               "in genuinely hard winters, and when it does the whitefish and lake trout fishing is worth the wait."),
        detail=("The bay runs several hundred feet deep in places, and deep water holds an enormous amount of heat. "
                "That thermal mass means Grand Traverse Bay resists freezing long after shallower water has locked up, "
                "and in mild winters the main basin never freezes at all. What does freeze, and freezes first, is the "
                "shallow protected water: Suttons Bay, Bowers Harbor, the far south end of the west arm. Those are the "
                "traditional ice destinations and they are the only parts worth watching in most years."),
        notes=[
            ("Depth resists ice", "Several hundred feet of water holds heat. In a mild winter the main basin simply "
             "does not freeze, and no amount of cold in December changes that quickly."),
            ("The protected pockets go first", "Suttons Bay, Bowers Harbor, and the south end of the west arm are "
             "where ice forms and where the fishing happens."),
            ("Lake wide numbers mislead here", "A Lake Michigan cover percentage is dominated by the far north and "
             "the shallows elsewhere. It says very little about this specific bay."),
        ],
    ),
    dict(
        slug="burt-mullett", name="Burt and Mullett Lakes", short="Burt and Mullett",
        acis="KAPN", acisName="Alpena County Regional Airport",
        lake=None, lakeName=None, nws="KAPN",
        access="Indian River, Topinabee, Alanson, Mullett Lake Village",
        blurb=("Two large deep northern inland lakes connected by the Inland Waterway, known for walleye, perch, and "
               "a genuine big fish reputation. Deeper than Houghton, later to freeze, and complicated by the current "
               "moving between them."),
        detail=("Burt and Mullett are part of a connected chain, and chain of lakes systems are called out by the DNR "
                "as specifically unpredictable because water moves between the basins. The Indian River stretch "
                "between them carries current all winter and is never trustworthy. Both lakes are deep enough that "
                "they take real cold to lock up, and both have spring holes and inlet influence that keep local "
                "thickness inconsistent even in a hard winter."),
        notes=[
            ("Chain of lakes means moving water", "The DNR flags chain systems as unpredictable for exactly this "
             "reason. The connecting water between Burt and Mullett is the hazard, not the open basins."),
            ("No satellite coverage", "These are inland lakes with no NOAA ice product. Accumulated cold is the only "
             "signal here, and this page will not pretend otherwise."),
            ("Deep water, later ice", "Both lakes are deep enough to resist early freeze up. Expect them to trail "
             "the shallow waters by weeks."),
        ],
    ),
]

(pathlib.Path(__file__).resolve().parent / "regions.json").write_text(json.dumps(REGIONS, indent=1))


def top_stats():
    return (
        '<div class="stat-row">'
        '<div class="stat"><div class="lbl">Season stage</div><div class="val mono" id="s-stage">...</div>'
        '<div class="sub">freeze progression</div></div>'
        '<div class="stat"><div class="lbl">Statewide cold</div><div class="val mono" id="s-afdd">...</div>'
        '<div class="sub">accumulated F days</div></div>'
        '<div class="stat"><div class="lbl">Great Lakes ice</div><div class="val mono" id="s-cover">...</div>'
        '<div class="sub" id="s-cover-sub">satellite cover</div></div>'
        '<div class="stat"><div class="lbl">Huron vs 54 year normal</div><div class="val mono" id="s-vsnorm">...</div>'
        '<div class="sub">for today</div></div>'
        '</div>'
    )


def build_index():
    url = SITE + "/"
    ld = {"@context": "https://schema.org", "@graph": [
        {"@type": "WebSite", "@id": SITE + "/#website", "name": "Michigan Ice Report", "url": SITE,
         "description": "Michigan ice conditions using freezing degree days, ten-year station normals, NOAA "
                        "lake-wide ice cover, and a 54-year Great Lakes ice climatology.",
         "author": {"@id": PERSON_ID}},
        {"@type": "WebPage", "@id": url + "#webpage", "url": url,
         "isPartOf": {"@id": SITE + "/#website"},
         "name": "Michigan Ice Report: Accumulated Cold and Great Lakes Ice Cover",
         "description": "Live Michigan ice conditions across six waters using accumulated freezing degree days, "
                        "ten-year station normals, and a 54-year Great Lakes ice climatology.",
         "dateModified": ICE_ROOT_DATE_MODIFIED,
         "inLanguage": "en-US", "author": {"@id": PERSON_ID},
         "breadcrumb": {"@id": url + "#breadcrumb"}},
        breadcrumb([("Michigan Ice Report", url)]),
        {"@type": "ItemList", "@id": url + "#waters", "name": "Michigan ice fishing waters tracked",
         "numberOfItems": len(REGIONS),
         "itemListElement": [
             {"@type": "ListItem", "position": i + 1, "name": r["name"],
              "url": f"{SITE}/regions/{r['slug']}.html"}
             for i, r in enumerate(REGIONS)]},
        PERSON_NODE,
    ]}

    rows = "".join(
        f'<tr id="row-{r["slug"]}">'
        f'<td><a href="/michigan-ice/regions/{r["slug"]}.html">{r["short"]}</a>'
        f'<div style="font-size:11px;color:#5c7280">{r["acisName"][:30]}</div></td>'
        f'<td class="num" data-f="afdd">...</td>'
        f'<td class="num" data-f="temp">...</td>'
        f'<td class="num" data-f="wind">...</td>'
        f'<td class="num" data-f="cover">...</td>'
        f'<td data-f="stage">...</td>'
        f'</tr>' for r in REGIONS)

    accs = "".join(
        f'<div class="tile"><h3><a href="/michigan-ice/regions/{r["slug"]}.html">{r["short"]}</a></h3>'
        f'<div class="acc" id="acc-{r["slug"]}">'
        f'<div class="acc-track"><div class="acc-fill" style="width:0%"></div>'
        f'<div class="acc-normal" style="left:0%"></div></div>'
        f'<div class="acc-legend"><span data-f="accnow">0</span><span data-f="accnorm">normal</span></div>'
        f'</div></div>' for r in REGIONS)

    tiles = "".join(
        f'<div class="tile"><h3><a href="/michigan-ice/regions/{r["slug"]}.html">{r["name"]}</a></h3>'
        f'<p>{r["blurb"][:210]}...</p></div>' for r in REGIONS)

    body = (
        header("/") +
        '<p class="lede">Ice is not weather, it is history. A cold morning tells you almost nothing. What matters is '
        'how much cold has accumulated since freeze up, and whether this winter is running ahead of or behind normal. '
        'This compares accumulated cold across six Michigan waters with a ten year station normal, while Great '
        'Lakes ice cover is compared with a 54 year climatology.</p>'
        + SAFETY_BANNER
        + top_stats() +
        '<div class="card read"><div class="kicker">The read</div>'
        '<p style="margin:0;font-size:16px" id="the-read">Loading current conditions.</p>'
        '<p class="note" style="margin-top:10px" id="read-stamp"></p></div>'

        '<h2>Season cold accumulation</h2>'
        '<p>The bar shows accumulated freezing degree days so far this season for each water. The marker is where a '
        'normal season sits on this calendar date. Ice growth follows the square root of accumulated cold, so this is '
        'the single most useful number for whether ice should be forming at all.</p>'
        '<div class="grid three">' + accs + '</div>'
        '<p class="note" id="acc-stamp">Loading daily temperature records.</p>'

        '<h2>Conditions by water</h2>'
        '<div class="tbl-wrap"><table><thead><tr>'
        '<th>Water</th><th>Season cold</th><th>Air temp</th><th>Wind</th><th>Lake ice</th><th>Stage</th>'
        '</tr></thead><tbody id="board">' + rows + '</tbody></table></div>'
        '<p class="note" id="board-stamp">Loading.</p>'

        '<h2>What this site does and does not tell you</h2>'
        '<p>There are three separate things people mean when they ask about ice conditions, and only two of them can '
        'be answered with data from a distance.</p>'
        '<ul class="tight">'
        '<li><strong>Has it been cold enough for ice to form?</strong> This is answerable, and it is what the '
        'accumulated cold number is for. It comes from real daily temperature records at a station near each water.</li>'
        '<li><strong>Is there ice out there right now?</strong> Partly answerable on the Great Lakes, where NOAA '
        'publishes satellite derived ice cover. Not answerable on inland lakes, which have no comparable product, and '
        'the inland pages here say so.</li>'
        '<li><strong>Is the ice safe where I want to stand?</strong> Not answerable. Not by this site, not by any '
        'site, not by a forum post from yesterday. Michigan DNR rejects the inch thickness rule entirely because ice '
        'does not form uniformly, and thickness can change by feet within a few yards.</li>'
        '</ul>'
        '<p>The third question is the one that matters most and the only honest answer is a spud bar in your hands. '
        'Everything here is context for the drive, not permission to walk out.</p>'

        '<h2>The waters</h2>'
        '<p>Six waters, chosen because they carry most of Michigan ice fishing traffic and because they behave very '
        'differently from each other. A shallow wind exposed bay, a deep northern basin, a lake sitting on top of a '
        'river, and inland lakes with no satellite coverage at all.</p>'
        '<div class="grid two">' + tiles + '</div>'

        # The only tool on the network with no question surface at all. Every fact here is already
        # stated elsewhere on this page: the accumulated cold method, the ten year station normal,
        # the 54 year Great Lakes ice climatology, the six waters, and the DNR position on thickness rules. The
        # safety framing is kept exactly as the page already words it, because a confident answer
        # on this page could put someone on bad ice.
        '<h2>Common questions about Michigan ice</h2>'
        '<h3>Is the ice safe in Michigan right now?</h3>'
        '<p>Nothing on this page can tell you that, and no site can. Everything here is accumulated weather data '
        'and satellite observation, and none of it measures the ice under your feet. The Michigan DNR does not '
        'recognize a reliable inch thickness rule and states that ice on the bays of the Great Lakes will always be '
        'more fragile than ice on inland lakes. What accumulated cold can tell you is whether it has been cold '
        'enough, for long enough, for ice to have formed at all, and whether this winter is running ahead of or '
        'behind its ten year accumulated-cold normal. Separately, the parent Great Lake can be compared with its '
        '54 year ice-cover climatology. Those are useful screens before you drive north and useless substitutes for '
        'testing. Test with a spud bar or auger every few steps, on every trip, including water you fished last '
        'week and found solid.</p>'
        '<h3>How much cold does it take to make ice?</h3>'
        '<p>Ice formation tracks accumulated cold rather than any single cold morning, which is why one hard '
        'overnight freeze in December means much less than people expect. The measure used here is accumulated '
        'freezing degree days: every day below freezing adds to a running total from freeze up, and that total is '
        'compared against a ten year station average for the same date. A shallow, sheltered inland lake locks up on a '
        'modest total. A wide, wind exposed body like Saginaw Bay needs far more, because wind keeps the water '
        'moving and mixing, and moving water sheds cold instead of holding it. That is why two waters a hundred '
        'miles apart sit at completely different stages in the same week, and why a single statewide ice number '
        'would be worse than none at all.</p>'
        '<h3>Which Michigan lakes have satellite ice cover data?</h3>'
        '<p>Only the Great Lakes waters have a satellite product, and the data used here is lake-wide rather than '
        'bay-specific. Saginaw Bay displays the Lake Huron average and Grand Traverse Bay displays the Lake Michigan '
        'average, so each is a directional parent-lake signal rather than an observation of that bay. Inland lakes '
        'have no comparable product. '
        'Nobody flies a satellite ice analysis over Houghton Lake or Mullett Lake, so for those waters the '
        'accumulated cold figure and the ten year station comparison are all there is. This is the most important '
        'limitation to understand about this page. On the Great Lakes it can describe whole-lake ice conditions. On '
        'inland lakes it can only say whether the weather has been cold enough that ice ought to have formed.</p>'

        '<h2>More from the network</h2>'
        '<div class="anchor-list">'
        '<a href="/michigan-ice/ice-safety.html">Ice safety, and what the DNR actually says</a>'
        '<a href="/michigan-ice/freezing-degree-days.html">How accumulated cold predicts ice</a>'
        '<a href="/michigan-ice/ice-cover-history.html">54 years of Great Lakes ice</a>'
        '<a href="https://greatlakeslevels.org">Great Lakes Levels</a>'
        '<a href="https://michigantroutreport.com">Michigan Trout Report</a>'
        '<a href="https://whitetail.chrisizworski.com">Michigan Whitetail Report</a>'
        '</div>'
        + FOOTER
    )
    (OUT / "index.html").write_text(head(
        "Michigan Ice Report: Ice Cover Today | Chris Izworski",
        "Michigan ice conditions for six waters: accumulated freezing degree days, NOAA satellite ice cover, "
        "and a 54 year Great Lakes climatology baseline.",
        url, ld) + body)


def build_safety():
    url = SITE + "/ice-safety.html"
    ld = {"@context": "https://schema.org", "@graph": [
        {"@type": "Article", "@id": url + "#article",
         "headline": "Michigan Ice Safety: What the DNR Actually Says",
         "description": "Michigan DNR rejects the standard inch thickness guide for ice safety. Here is what it says "
                        "instead, why Great Lakes bay ice is treated as more fragile, and how to test ice yourself.",
         "author": {"@id": PERSON_ID}, "publisher": {"@id": PERSON_ID},
         "inLanguage": "en-US", "mainEntityOfPage": url,
         "isPartOf": {"@id": SITE + "/#website"}},
        breadcrumb([("Michigan Ice Report", SITE + "/"), ("Ice safety", url)]),
        PERSON_NODE,
    ]}
    body = (
        header("/ice-safety.html") +
        '<h1 style="font-size:30px;margin:22px 0 0">Michigan ice safety, and what the DNR actually says</h1>'
        '<p class="lede">Most ice safety pages reprint a thickness chart: four inches to walk, eight to drive. '
        'Michigan does not endorse that chart. Understanding why is more useful than memorizing it.</p>'

        '<div class="card warn"><div class="kicker">The state position</div>'
        '<p style="margin:0;font-size:16px">The Michigan DNR states that there is no reliable inch thickness rule for '
        'determining whether ice is safe, and that ice should be tested with a spud, needle bar, or auger. Its stated '
        'mantra is that no ice is safe ice.</p></div>'

        '<h2>Why Michigan rejects the thickness chart</h2>'
        '<p>The familiar chart exists because it is simple, and simplicity is exactly its problem. The DNR position is '
        'that ice seldom forms at a uniform rate, so a single number cannot describe a sheet. Three or four inches on '
        'a small sheltered pond with no inflow is a completely different material from the same measured thickness '
        'over a river with current, or over the open bays of the Great Lakes.</p>'
        '<p>The state is explicit on that last point, and it matters enormously for Michigan specifically: ice '
        'covering the bays of the Great Lakes will always be more fragile than the chart implies. Saginaw Bay, Little '
        'Bay de Noc, Grand Traverse Bay, and Anchor Bay on Lake St. Clair are all in that category. Four of the six '
        'waters tracked on this site are Great Lakes water.</p>'
        '<p>There is a second reason the chart misleads, and it has nothing to do with thickness. Ice quality varies '
        'as much as ice depth. New clear ice with a bluish tint is the strongest ice there is. Ice formed from melted '
        'and refrozen snow is the weakest, and a foot of that old air filled ice can be less trustworthy than a couple '
        'of inches of fresh black ice. A tape measure cannot tell the difference. Your eyes and a spud bar can.</p>'

        '<h2>What actually changes ice strength</h2>'
        '<ul class="tight">'
        '<li><strong>Current.</strong> Moving water erodes ice from underneath, where there is no visible sign. River '
        'mouths, narrows, connecting channels, and chain of lakes systems are all suspect. The DNR calls out chain '
        'systems as specifically unpredictable.</li>'
        '<li><strong>Snow cover.</strong> Snow insulates, which slows ice growth, and it adds weight to the sheet. It '
        'also hides everything: cracks, leads, pressure ridges, and thin patches.</li>'
        '<li><strong>Wind.</strong> On a big shallow bay, an offshore wind can shear a sheet and open a lead behind '
        'people who walked out on solid ice. This is the classic Saginaw Bay rescue scenario.</li>'
        '<li><strong>Springs and inflow.</strong> Groundwater and inlets create local soft spots that show no surface '
        'difference at all.</li>'
        '<li><strong>Age and thaw cycles.</strong> Ice that has melted and refrozen repeatedly is structurally worse '
        'than its thickness suggests, no matter how thick it measures.</li>'
        '<li><strong>Concentrated load.</strong> Vehicles, crowds of shanties, and groups standing together all '
        'concentrate weight in a way a single person walking does not.</li>'
        '</ul>'

        '<h2>How to test it yourself</h2>'
        '<p>The DNR guidance is to test thickness and quality with a spud bar, needle bar, or auger, and to keep '
        'testing as you go rather than once at the edge. Practical version:</p>'
        '<ul class="tight">'
        '<li>Check at the shoreline, then every few steps as you move out. Ice that is six or seven inches in one spot '
        'can be two a short distance away.</li>'
        '<li>Look at what comes out of the hole. Clear and bluish is the good case. White, granular, or layered is not.</li>'
        '<li>Measure properly. Hook the bottom edge of the ice with a tape rather than judging by how fast the auger '
        'went through, which consistently makes ice feel thicker than it is.</li>'
        '<li>Carry ice picks or claws where you can reach them with your hands, not in a bag.</li>'
        '<li>Wear a flotation device. A float suit is the single piece of gear most likely to change an outcome.</li>'
        '<li>Do not walk out in single file as a group, and do not stand together in one spot once you are out.</li>'
        '<li>Tell somebody on shore where you are going and when you will be back.</li>'
        '<li>Take a phone, and know that on a big bay you may not have signal where you are going.</li>'
        '</ul>'

        '<h2>The specific Michigan failure pattern</h2>'
        '<p>The recurring Saginaw Bay incident is not people walking onto obviously bad ice. It is people walking onto '
        'genuinely solid ice, fishing for several hours, and finding that an offshore wind opened a crack between them '
        'and shore while they were sitting. The ice they tested was fine. The ice they needed to walk back across was '
        'not there anymore.</p>'
        '<p>That failure mode is why wind direction belongs on an ice conditions page at all, and why this site shows '
        'it. If the wind is pushing ice away from the shore you parked on, that is a reason to reconsider regardless '
        'of how much cold has accumulated.</p>'

        '<h2>What this site is for</h2>'
        '<p>Accumulated cold tells you whether ice should be forming. Satellite cover tells you whether the lake is '
        'freezing at a large scale. Neither one measures the ice under your boots, and neither one can. Use this to '
        'decide whether the drive is worth it, then make the real decision on the ice with a spud bar in your hand.</p>'

        '<div class="anchor-list">'
        '<a href="https://www.michigan.gov/dnr/education/safety-info/ice">Michigan DNR ice safety</a>'
        '<a href="/michigan-ice/">Current conditions</a>'
        '<a href="/michigan-ice/freezing-degree-days.html">How accumulated cold works</a>'
        '<a href="/michigan-ice/regions/saginaw-bay.html">Saginaw Bay, where wind is the hazard</a>'
        '<a href="/michigan-ice/regions/lake-st-clair.html">Lake St. Clair, where current is the hazard</a>'
        '</div>'
        + FOOTER
    )
    (OUT / "ice-safety.html").write_text(head(
        "Michigan Ice Safety: No Reliable Inch Rule | Chris Izworski",
        "The Michigan DNR recognizes no reliable inch thickness rule. What it says instead, why Great Lakes bay "
        "ice is more fragile, and how to test with a spud bar.",
        url, ld) + body)


def build_method():
    url = SITE + "/freezing-degree-days.html"
    ld = {"@context": "https://schema.org", "@graph": [
        {"@type": "Article", "@id": url + "#article",
         "headline": "Freezing Degree Days: How Accumulated Cold Predicts Ice Growth",
         "description": "What accumulated freezing degree days are, how the modified Stefan equation converts them to "
                        "an ice thickness estimate, and why that estimate overpredicts thin early season ice.",
         "author": {"@id": PERSON_ID}, "publisher": {"@id": PERSON_ID},
         "inLanguage": "en-US", "mainEntityOfPage": url,
         "isPartOf": {"@id": SITE + "/#website"}},
        breadcrumb([("Michigan Ice Report", SITE + "/"), ("How it works", url)]),
        PERSON_NODE,
    ]}
    body = (
        header("/freezing-degree-days.html") +
        '<h1 style="font-size:30px;margin:22px 0 0">Freezing degree days, and how accumulated cold predicts ice</h1>'
        '<p class="lede">Ice thickness follows the square root of accumulated cold. That relationship is over a '
        'century old, it is used in real engineering work, and it has a specific weakness that matters a great deal '
        'for anyone standing on early season ice.</p>'
        + SAFETY_BANNER +
        '<h2>What a freezing degree day is</h2>'
        '<p>Take a day, average its high and low temperature, and subtract that average from 32 degrees Fahrenheit. A '
        'day averaging 22 degrees contributes 10 freezing degree days. A day averaging 40 degrees contributes negative '
        '8, because it takes heat back out of the sheet. Add those up across the winter and you get accumulated '
        'freezing degree days, usually written AFDD.</p>'
        '<p>That single running total captures something a thermometer reading cannot. Ice does not care what the '
        'temperature is this morning. It cares how much heat has left the water since freeze up, and AFDD is a direct '
        'proxy for exactly that. It is also why a warm spell is genuinely destructive rather than merely a pause: '
        'those days subtract.</p>'
        '<p>This site computes AFDD for each water from daily maximum and minimum temperature records at a nearby '
        'climate station, using the standard method of summing the daily differences from freezing across the season.</p>'

        '<h2>From accumulated cold to an ice thickness estimate</h2>'
        '<p>The relationship between AFDD and ice thickness is called the Stefan equation, after the physicist who '
        'derived it in 1891 for sea ice. In the form used by the US Army Corps of Engineers for practical work, '
        'thickness in inches equals a coefficient multiplied by the square root of AFDD in Fahrenheit degree days.</p>'
        '<p>The coefficient carries all of the local reality: how much snow is insulating the sheet, whether the water '
        'is windswept or sheltered, whether there is current. Corps guidance uses values in the range of roughly 0.5 '
        'for a snow covered sheltered sheet up to around 0.8 for a windy lake with little snow. As a worked example '
        'from that guidance, a coefficient of 0.6 applied to 300 accumulated freezing degree days predicts a sheet '
        'about 10 inches thick.</p>'
        '<p>The square root is the important part. It means ice growth decelerates. Getting the first four inches '
        'takes far less accumulated cold than adding the next four, because the ice itself insulates the water below '
        'from the air above. This is why a hard cold snap early in the season changes conditions dramatically and the '
        'same cold snap in February barely moves the number.</p>'

        '<div class="card warn"><div class="kicker">The weakness that matters most</div>'
        '<p style="margin:0;font-size:16px">Published work on this method notes that it overpredicts thickness for '
        'newly formed thin ice. The error runs in the dangerous direction, and it runs that way precisely during the '
        'early season window when people are most eager to get out. Treat any early season estimate as optimistic.</p>'
        '</div>'

        '<h2>Why this site shows the range and not a number</h2>'
        '<p>Because the coefficient depends on snow and wind and shelter, a single number would be false precision. '
        'This site shows accumulated cold as the primary figure, which is a measurement rather than a model, and gives '
        'the modeled thickness only as a range across plausible coefficients.</p>'
        '<p>Even that range assumes a uniform sheet, which never exists. Michigan DNR is direct about this: ice does '
        'not form at a uniform rate, and thickness can vary by feet within a few yards. A model built on a single air '
        'temperature record cannot know about the spring hole, the current seam, or the pressure ridge. Those are the '
        'things that actually put people in the water.</p>'

        '<h2>What the numbers mean in practice</h2>'
        '<div class="tbl-wrap"><table><thead><tr><th>Accumulated cold</th><th>What it implies</th><th>How to read it</th></tr></thead><tbody>'
        '<tr><td class="num">0 to 50</td><td>Little or no ice expected</td>'
        '<td>Early season or post thaw. Open water and skim ice.</td></tr>'
        '<tr><td class="num">50 to 150</td><td>Ice forming</td>'
        '<td>The most dangerous window. The model is least reliable here and it errs optimistic.</td></tr>'
        '<tr><td class="num">150 to 350</td><td>Ice building</td>'
        '<td>Sheets developing on shallow water. Deep and current driven water still unreliable.</td></tr>'
        '<tr><td class="num">350 to 700</td><td>Sustained cold</td>'
        '<td>Established ice on shallow waters in a normal winter. Local variation still governs.</td></tr>'
        '<tr><td class="num">700 and above</td><td>Hard winter accumulation</td>'
        '<td>Deep water begins locking up. Michigan reaches this in colder years.</td></tr>'
        '</tbody></table></div>'
        '<p class="note">These bands describe what the physics implies about formation, not whether any particular '
        'spot will hold you. Nothing in this table is a safety threshold.</p>'

        '<h2>Where the data comes from</h2>'
        '<p>Daily maximum and minimum temperatures come from the Applied Climate Information System, which serves the '
        'official daily climate record for United States stations. Current conditions come from the National Weather '
        'Service API. Great Lakes ice cover comes from NOAA GLERL, built on National Ice Center analyses.</p>'
        '<div class="anchor-list">'
        '<a href="https://www.rcc-acis.org/">Applied Climate Information System</a>'
        '<a href="https://www.glerl.noaa.gov/data/ice/">NOAA GLERL ice data</a>'
        '<a href="/michigan-ice/">Current conditions</a>'
        '<a href="/michigan-ice/ice-safety.html">Ice safety</a>'
        '<a href="/michigan-ice/ice-cover-history.html">54 year ice history</a>'
        '</div>'
        + FOOTER
    )
    (OUT / "freezing-degree-days.html").write_text(head(
        "Freezing Degree Days: How Cold Predicts Ice Thickness",
        "What freezing degree days are, how the modified Stefan equation turns them into an ice thickness "
        "range, and why it overpredicts thin early ice.",
        url, ld) + body)


def build_history():
    url = SITE + "/ice-cover-history.html"
    ld = {"@context": "https://schema.org", "@graph": [
        {"@type": "Article", "@id": url + "#article",
         "headline": "54 Years of Great Lakes Ice Cover",
         "description": "What the NOAA GLERL ice climatology record shows about Great Lakes ice cover since 1973, "
                        "when ice peaks, and how variable Michigan winters actually are.",
         "author": {"@id": PERSON_ID}, "publisher": {"@id": PERSON_ID},
         "inLanguage": "en-US", "mainEntityOfPage": url,
         "isPartOf": {"@id": SITE + "/#website"}},
        breadcrumb([("Michigan Ice Report", SITE + "/"), ("54 year history", url)]),
        PERSON_NODE,
    ]}
    body = (
        header("/ice-cover-history.html") +
        '<h1 style="font-size:30px;margin:22px 0 0">54 years of Great Lakes ice cover</h1>'
        '<p class="lede">NOAA has recorded daily ice cover on each Great Lake since the 1973 ice year. That record is '
        'what makes it possible to say whether this winter is actually unusual, rather than just feeling like it.</p>'
        + SAFETY_BANNER +
        '<div class="card"><div class="kicker">Today against the record</div>'
        '<p style="margin:0;font-size:16px" id="hist-detail">Loading the climatology record.</p>'
        '<p class="note" style="margin-top:8px" id="hist-stamp"></p></div>'

        '<h2>What the record actually contains</h2>'
        '<p>The GLERL ice climatology gives daily average ice cover as a percentage for each lake, from November '
        'through early June, for every ice year since 1973. An ice year is labeled by the January calendar year, so '
        'the 1975 column holds November and December of 1974 along with the early months of 1975.</p>'
        '<p>One detail in that dataset is worth appreciating, because it is a small model of the honesty problem this '
        'whole site deals with. The record distinguishes a recorded zero from a day where ice cover simply was not '
        'measured. A zero means someone looked and there was no ice. A gap means nobody looked. Conflating the two '
        'would quietly manufacture data that does not exist.</p>'

        '<h2>When Michigan ice peaks</h2>'
        '<p>Averaged across the full record, Lake Huron ice cover peaks in the third week of February, at roughly half '
        'the lake surface. That average conceals enormous year to year variation, and the variation is the real story: '
        'on the same mid February date the record contains years under 10 percent cover and years above 95 percent.</p>'
        '<p>For an ice angler that spread is the whole point. A mid February date is not a season, it is a coin flip '
        'weighted by that particular winter. Which is exactly why accumulated cold for the current season matters more '
        'than a calendar.</p>'

        '<h2>Lake by lake, and why Michigan waters differ</h2>'
        '<p>Ice behaves differently on each lake for reasons that come down mostly to depth and shape.</p>'
        '<ul class="tight">'
        '<li><strong>Lake Erie</strong> is shallow and freezes most completely, often approaching full cover in a cold '
        'winter.</li>'
        '<li><strong>Lake Huron</strong> carries Saginaw Bay, which locks up well ahead of the open lake because it is '
        'shallow and protected relative to the main basin.</li>'
        '<li><strong>Lake Michigan</strong> is deep in the middle and rarely freezes across, but its northern end and '
        'protected bays like Little Bay de Noc make reliable ice.</li>'
        '<li><strong>Lake Superior</strong> is deep and cold, and its ice varies dramatically between mild and severe '
        'winters.</li>'
        '<li><strong>Lake St. Clair</strong> is shallow and small enough to freeze readily, but it has current running '
        'through it constantly, which is a different problem entirely.</li>'
        '</ul>'
        '<p>A lake wide percentage is a blunt instrument for a specific bay. Grand Traverse Bay can be wide open while '
        'Lake Michigan as a whole reports meaningful cover, because that cover is concentrated in the far north and in '
        'shallow water elsewhere. The region pages here note where the lake wide number is and is not informative.</p>'

        '<h2>Using history to read the current season</h2>'
        '<p>The useful comparison is not this year against last year, it is this year against the distribution. If '
        'today sits above the 54 year average for this date, ice is running ahead of a normal season. If it sits in '
        'the bottom quarter of years, no amount of one cold week is going to catch it up quickly, because the square '
        'root relationship means late cold adds less thickness than early cold does.</p>'
        '<p>That is the comparison the front page makes automatically, and it is the reason this site pulls the whole '
        'historical file rather than just today.</p>'
        '<div class="anchor-list">'
        '<a href="https://www.glerl.noaa.gov/data/ice/">NOAA GLERL ice data</a>'
        '<a href="/michigan-ice/">Current conditions</a>'
        '<a href="/michigan-ice/freezing-degree-days.html">How accumulated cold works</a>'
        '<a href="/michigan-ice/ice-safety.html">Ice safety</a>'
        '<a href="/michigan-ice/regions/saginaw-bay.html">Saginaw Bay</a>'
        '</div>'
        + FOOTER
    )
    (OUT / "ice-cover-history.html").write_text(head(
        "Great Lakes Ice Cover: 54-Year NOAA Record | Chris Izworski",
        "What NOAA GLERL records show about Great Lakes ice cover since 1973: when ice peaks, how variable "
        "Michigan winters are, and how this season compares.",
        url, ld) + body)


def build_region(r):
    url = f"{SITE}/regions/{r['slug']}.html"
    ld = {"@context": "https://schema.org", "@graph": [
        {"@type": "WebPage", "@id": url + "#webpage", "url": url,
         "name": f"{r['name']} Ice Conditions",
         "description": f"Accumulated freezing degree days, current temperature and wind, and ice context for "
                        f"{r['name']}.",
         "isPartOf": {"@id": SITE + "/#website"},
         "inLanguage": "en-US", "author": {"@id": PERSON_ID},
         "breadcrumb": {"@id": url + "#breadcrumb"}},
        breadcrumb([("Michigan Ice Report", SITE + "/"), (r["name"], url)]),
        PERSON_NODE,
    ]}
    notes = "".join(f'<div class="tile"><h3>{t}</h3><p>{d}</p></div>' for t, d in r["notes"])
    others = "".join(
        f'<div class="tile"><h3><a href="/michigan-ice/regions/{o["slug"]}.html">{o["short"]}</a></h3>'
        f'<p>{o["blurb"][:130]}...</p></div>'
        for o in REGIONS if o["slug"] != r["slug"])

    if r["lake"]:
        cover_line = (f'<div class="stat"><div class="lbl">{r["lakeName"]} ice</div>'
                      f'<div class="val mono" id="r-cover">...</div>'
                      f'<div class="sub">satellite cover</div></div>')
        cover_note = (f'Satellite ice cover shown here is for {r["lakeName"]} as a whole, not for this specific water. '
                      f'It is a directional signal about the lake, not a measurement of the ice where you fish.')
    else:
        cover_line = ('<div class="stat"><div class="lbl">Satellite ice</div>'
                      '<div class="val mono">n/a</div><div class="sub">inland lake</div></div>')
        cover_note = ('There is no NOAA satellite ice cover product for inland lakes at this scale. For this water the '
                      'only honest signal available from a distance is accumulated cold, and that is all this page '
                      'claims to show.')

    body = (
        header("/") +
        f'<h1 style="font-size:30px;margin:22px 0 0">{r["name"]} ice conditions</h1>'
        f'<p class="lede">{r["blurb"]}</p>'
        f'<p class="note">Access areas: {r["access"]}. Temperature record from {r["acisName"]}.</p>'
        + SAFETY_BANNER +

        f'<div class="card" data-region="{r["slug"]}" id="region-live">'
        '<div class="kicker">Current readings <span class="badge live">live</span></div>'
        '<div class="stat-row">'
        '<div class="stat"><div class="lbl">Season cold</div><div class="val mono" id="r-afdd">...</div>'
        '<div class="sub">accumulated F days</div></div>'
        '<div class="stat"><div class="lbl">Vs normal</div><div class="val mono" id="r-vsnorm">...</div>'
        '<div class="sub">for this date</div></div>'
        '<div class="stat"><div class="lbl">Air temp</div><div class="val mono" id="r-temp">...</div>'
        '<div class="sub">deg F now</div></div>'
        '<div class="stat"><div class="lbl">Wind</div><div class="val mono" id="r-wind">...</div>'
        '<div class="sub" id="r-wind-sub">mph</div></div>'
        + cover_line +
        '</div>'
        '<div class="acc" id="acc-region" style="margin-top:14px">'
        '<div class="acc-track"><div class="acc-fill" style="width:0%"></div>'
        '<div class="acc-normal" style="left:0%"></div></div>'
        '<div class="acc-legend"><span data-f="accnow">0</span><span data-f="accnorm">normal</span></div>'
        '</div>'
        '<p style="margin:14px 0 0;font-size:15.5px" id="r-read">Loading.</p>'
        '<p class="note" id="r-stamp"></p>'
        '</div>'

        f'<h2>What this water is like</h2><p>{r["detail"]}</p>'
        f'<p class="note">{cover_note}</p>'

        '<h2>What to know before you go</h2>'
        f'<div class="grid two">{notes}</div>'

        '<h2>The other waters</h2>'
        '<p>These six waters behave differently enough that a plan built for one can be wrong on another. Depth, '
        'current, and wind exposure all change the picture.</p>'
        f'<div class="grid three">{others}</div>'

        '<h2>Related</h2>'
        '<div class="anchor-list">'
        '<a href="/michigan-ice/">All waters, current conditions</a>'
        '<a href="/michigan-ice/ice-safety.html">Ice safety and DNR guidance</a>'
        '<a href="/michigan-ice/freezing-degree-days.html">How accumulated cold works</a>'
        '<a href="/michigan-ice/ice-cover-history.html">54 year ice history</a>'
        '</div>'
        + FOOTER
    )
    (OUT / "regions" / f"{r['slug']}.html").write_text(head(
        f"{r['name']} Ice Conditions Today | Chris Izworski",
        f"Accumulated freezing degree days, current temperature and wind, and ice context for {r['name']}, "
        f"plus access at {r['access'].split(',')[0]}.",
        url, ld) + body)


build_index()
build_safety()
build_method()
build_history()
for r in REGIONS:
    build_region(r)

print("pages written:")
for p in sorted(OUT.rglob("*.html")):
    print(f"  {p.relative_to(OUT)}  {p.stat().st_size:,} bytes")


assert BASE == "/michigan-ice", "BASE and the hardcoded hrefs in these generators must agree"


# Checksum manifest. The 10 pages under public/michigan-ice/ are generated, so a
# hand edit there is silently destroyed on the next run. A Node test compares the
# committed HTML against these hashes and fails if they drift, which turns an
# invisible loss into a red build.
manifest = {}
for f in sorted(OUT.rglob("*.html")):
    manifest[str(f.relative_to(OUT))] = hashlib.sha256(f.read_bytes()).hexdigest()
(pathlib.Path(__file__).resolve().parent / "generated.json").write_text(
    json.dumps({"outputDir": "public/michigan-ice", "files": manifest}, indent=2, sort_keys=True) + "\n")
print(f"wrote checksum manifest for {len(manifest)} generated pages")
