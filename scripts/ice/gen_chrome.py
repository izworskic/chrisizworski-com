BASE = "/michigan-ice"
SITE = "https://chrisizworski.com" + BASE
PERSON_ID = "https://chrisizworski.com/#person"

PERSON_NODE = {
    "@type": "Person",
    "@id": PERSON_ID,
    "name": "Chris Izworski",
    "url": "https://chrisizworski.com",
    "sameAs": [
        "https://chrisizworski.com",
        "https://michigantroutreport.com/chris-izworski/",
        "https://michiganbirdingreport.com/chris-izworski",
        "https://greatlakeslevels.org",
        "https://github.com/izworskic",
        "https://www.youtube.com/@izworskic",
        "https://www.wikidata.org/wiki/Q138283432",
    ],
}

# Palette derived from the subject: pewter winter sky, pale ice wash, and a
# blue-green accent because Michigan DNR identifies clear ice with a bluish
# tint as the strongest ice. Warm tone is reserved for thaw and deterioration.
CSS = """
*{box-sizing:border-box}
html,body{margin:0;padding:0}
html{overflow-x:hidden}
body{font-family:"Newsreader",Georgia,"Iowan Old Style",serif;background:#dce8ec;color:#1f2a33;line-height:1.62}
.mono,.val,td.num,.afdd-num{font-family:ui-monospace,SFMono-Regular,"SF Mono",Menlo,Consolas,monospace;font-variant-numeric:tabular-nums}
.wrap{max-width:1060px;margin:0 auto;padding:0 20px}
.page{min-height:100vh;background:linear-gradient(180deg,#eef4f5 0%,#e3edf0 42%,#dce8ec 100%);padding-bottom:48px}
h1,h2,h3{font-family:"Fraunces",Georgia,serif;line-height:1.24;letter-spacing:-.005em}
a{color:#16606b}
a:hover{color:#1d7a87}
.site-header{padding-top:30px;padding-bottom:14px;border-bottom:2px solid #16606b}
.site-header .brandrow{display:flex;align-items:baseline;flex-wrap:wrap;gap:12px}
.site-header .brand{font-family:"Fraunces",Georgia,serif;font-size:30px;font-weight:600}
.site-header .tag{font-size:13px;color:#5c7280;letter-spacing:.03em}
.site-header .stage{margin-left:auto;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:11.5px;color:#16606b;text-transform:uppercase;letter-spacing:.12em;border:1px solid #16606b;border-radius:7px;padding:3px 10px}
.nav{margin-top:12px;display:flex;flex-wrap:wrap;gap:6px}
.nav a{display:inline-block;border:1px solid #bcd2d8;border-radius:999px;padding:5px 13px;font-size:12.5px;font-weight:600;text-decoration:none;color:#3f5764;background:rgba(255,255,255,.55)}
.nav a:hover{border-color:#16606b;color:#16606b}
.nav a[aria-current="page"]{background:#16606b;border-color:#16606b;color:#fff}
.lede{font-size:17px;color:#31465280;color:#314652;margin:18px 0 0}
.card{background:rgba(255,255,255,.62);border:1px solid #cddde2;border-radius:13px;padding:16px 20px;margin-top:18px}
.card.read{border-left:4px solid #16606b}
.card.warn{border-left:4px solid #b4472b;background:rgba(255,247,244,.78)}
.kicker{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:11px;letter-spacing:.13em;text-transform:uppercase;color:#5c7280;margin-bottom:6px}
.stat-row{display:flex;flex-wrap:wrap;gap:8px;margin-top:16px}
.stat{flex:1 1 auto;min-width:118px;border:1px solid #cddde2;border-radius:11px;padding:9px 12px;background:rgba(255,255,255,.72);text-align:center}
.stat .lbl{font-size:9.5px;letter-spacing:.09em;text-transform:uppercase;color:#5c7280}
.stat .val{font-size:21px;line-height:1.22;color:#16606b}
.stat .sub{font-size:10.5px;color:#5c7280}
/* signature: season cold accumulation track */
.acc{margin-top:8px}
.acc-track{position:relative;height:30px;border:1px solid #bcd2d8;border-radius:6px;background:repeating-linear-gradient(90deg,#f4f9fa 0 9px,#eaf2f4 9px 10px);overflow:hidden}
.acc-fill{position:absolute;top:0;left:0;bottom:0;background:linear-gradient(90deg,#1d7a87,#16606b);opacity:.88}
.acc-normal{position:absolute;top:-4px;bottom:-4px;width:2px;background:#1f2a33}
.acc-normal::after{content:"normal";position:absolute;top:-14px;left:50%;transform:translateX(-50%);font-family:ui-monospace,Menlo,monospace;font-size:8.5px;letter-spacing:.08em;text-transform:uppercase;color:#1f2a33;white-space:nowrap}
.acc-legend{display:flex;justify-content:space-between;font-family:ui-monospace,Menlo,monospace;font-size:10px;color:#5c7280;margin-top:5px}
table{width:100%;border-collapse:collapse;margin-top:14px;font-size:14.5px;background:rgba(255,255,255,.55)}
th,td{text-align:left;padding:9px 11px;border-bottom:1px solid #d6e4e8;vertical-align:top}
th{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:11px;letter-spacing:.07em;text-transform:uppercase;color:#5c7280;font-weight:600}
td.num{white-space:nowrap}
.tbl-wrap{overflow-x:auto}
.badge{display:inline-block;font-family:ui-monospace,Menlo,monospace;font-size:10px;letter-spacing:.06em;text-transform:uppercase;border-radius:5px;padding:2px 7px;white-space:nowrap;border:1px solid #bcd2d8;color:#3f5764;background:rgba(255,255,255,.7)}
.badge.live{color:#155e4a;border-color:#a9cdbf;background:rgba(226,243,236,.8)}
.badge.cold{color:#16606b;border-color:#9dc4cd;background:rgba(222,240,244,.85)}
.badge.thaw{color:#8f3a22;border-color:#dcb1a2;background:rgba(250,236,230,.85)}
.grid{display:grid;grid-template-columns:1fr;gap:14px;margin-top:16px}
@media(min-width:730px){.grid.two{grid-template-columns:1fr 1fr}.grid.three{grid-template-columns:repeat(3,1fr)}}
.tile{border:1px solid #cddde2;border-radius:13px;padding:15px 17px;background:rgba(255,255,255,.6)}
.tile h3{margin:0 0 6px;font-size:16.5px}
.tile p{margin:0;font-size:14px;color:#3f5764}
.note{font-size:13px;color:#5c7280;font-style:italic}
.site-footer{margin-top:34px;padding-top:16px;border-top:1px solid #cddde2;font-size:12.5px;color:#5c7280}
.site-footer a{color:#16606b}
ul.tight li{margin-bottom:7px}
h2{margin-top:30px;font-size:22px}
h3{font-size:17px}
p{margin:12px 0}
.anchor-list{display:flex;flex-wrap:wrap;gap:8px;margin-top:10px}
.anchor-list a{font-size:13px;border:1px solid #bcd2d8;border-radius:999px;padding:4px 12px;text-decoration:none;background:rgba(255,255,255,.6)}
.safety-banner{margin-top:18px;border:2px solid #b4472b;border-radius:12px;padding:14px 18px;background:rgba(255,246,243,.9)}
.safety-banner strong{color:#8f3a22}
a:focus-visible,button:focus-visible{outline:3px solid #16606b;outline-offset:2px}
@media (prefers-reduced-motion:reduce){*{transition:none!important;animation:none!important}}
.acc-fill{transition:width .6s ease}
"""

FONTS = ('<link rel="preconnect" href="https://fonts.googleapis.com">'
         '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>'
         '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?'
         'family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600&'
         'family=Newsreader:ital,opsz@0,6..72;1,6..72&display=swap">')

NAV = [
    (BASE + "/", "Conditions"),
    (BASE + "/ice-safety.html", "Ice safety"),
    (BASE + "/freezing-degree-days.html", "How it works"),
    (BASE + "/ice-cover-history.html", "54 year history"),
]


def head(title, desc, canonical, ld_json):
    import json as _j
    return (
        '<!DOCTYPE html><html lang="en"><head>'
        '<meta charset="utf-8">'
        '<meta name="viewport" content="width=device-width, initial-scale=1">'
        f'<title>{title}</title>'
        f'<meta name="description" content="{desc}">'
        f'<link rel="canonical" href="{canonical}">'
        f'<meta property="og:title" content="{title}">'
        f'<meta property="og:description" content="{desc}">'
        f'<meta property="og:url" content="{canonical}">'
        '<meta property="og:type" content="website">'
        '<meta property="og:site_name" content="Michigan Ice Report">'
        '<meta name="twitter:card" content="summary">'
        f'{FONTS}<style>{CSS}</style>'
        f'<script type="application/ld+json">{_j.dumps(ld_json, separators=(",", ":"))}</script>'
        '</head>'
    )


def header(current, stage="Off season"):
    navhtml = "".join(
        f'<a href="{h}"{" aria-current=\"page\"" if h == current else ""}>{t}</a>'
        for h, t in NAV)
    return (
        '<body><div class="page"><div class="wrap">'
        '<header class="site-header"><div class="brandrow">'
        '<span class="brand">Michigan Ice Report</span>'
        '<span class="tag">Accumulated cold, satellite ice cover, and 54 years of context</span>'
        f'<span class="stage" id="season-stage">{stage}</span>'
        '</div>'
        f'<nav class="nav">{navhtml}</nav>'
        '</header>'
    )


SAFETY_BANNER = (
    '<div class="safety-banner">'
    '<strong>No ice is safe ice.</strong> Everything on this site is accumulated weather data and satellite '
    'observation. None of it measures the ice under your feet. The Michigan DNR does not recognize a reliable '
    'inch thickness rule and states that ice on the bays of the Great Lakes will always be more fragile. '
    'Test with a spud bar or auger every few steps, every trip, and read the '
    '<a href="/michigan-ice/ice-safety.html">ice safety page</a> before you go out.'
    '</div>'
)

FOOTER = (
    '<footer class="site-footer">'
    'Ice cover from the <a href="https://www.glerl.noaa.gov/data/ice/">NOAA Great Lakes Environmental Research '
    'Laboratory</a> ice climatology, built on National Ice Center analyses. Daily temperatures from the '
    '<a href="https://www.rcc-acis.org/">Applied Climate Information System</a>. Current observations from the '
    '<a href="https://www.weather.gov/documentation/services-web-api">National Weather Service API</a>. '
    'Ice safety guidance from the <a href="https://www.michigan.gov/dnr/education/safety-info/ice">Michigan DNR</a>. '
    'Part of a Michigan outdoor network that includes the '
    '<a href="https://michigantroutreport.com">Michigan Trout Report</a>, '
    '<a href="https://whitetail.chrisizworski.com">Michigan Whitetail Report</a>, '
    '<a href="https://greatlakeslevels.org">Great Lakes Levels</a>, and '
    '<a href="https://weekend.chrisizworski.com">Michigan Outdoor Weekend</a>. '
    'Built and maintained by <a href="https://chrisizworski.com">Chris Izworski</a>. '
    'This site reports weather and satellite data. It does not report ice safety, and it never will.'
    '</footer>'
    '</div></div><script src="/michigan-ice/ice.js"></script></body></html>'
)


def breadcrumb(items):
    return {
        "@type": "BreadcrumbList",
        "@id": items[-1][1] + "#breadcrumb",
        "itemListElement": [
            {"@type": "ListItem", "position": i + 1, "name": n, "item": u}
            for i, (n, u) in enumerate(items)],
    }
