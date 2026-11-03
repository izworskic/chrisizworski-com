#!/usr/bin/env python3
"""Build a provenance-checked NASA rocket/payload image catalog.

Standard-library only. Run weekly in GitHub Actions; never from the browser.
Searches only NASA's official images API, validates NASA photo credit and image
hostname, and edits the existing static manifest only when a materially
different approved image is found. Never copies LL2/SpaceX proprietary images.
"""
from __future__ import annotations

import argparse
import json
import re
import sys
import unittest
from pathlib import Path
from urllib.parse import quote, urlencode, urlsplit
from urllib.request import Request, urlopen

ROOT=Path(__file__).resolve().parents[1]
CATALOG=ROOT/"public/synced-national-tools/rocket-launch-live/visual-catalog.json"
NASA_API="https://images-api.nasa.gov/search"
UA="FreighterViewRocketVisualResearch/1.0 (https://chrisizworski.com/)"
MAX_RESPONSE=1_500_000
NASA_CENTERS={"KSC","JSC","HQ","GSFC","MSFC","ARC","JPL","LARC","GRC","AFRC","SSC","WFF"}
EXCLUDED_CREDIT=re.compile(r"spacex|blue origin|copyright|©|courtesy|licensed|boeing|united launch alliance|rocket lab|northrop grumman",re.I)
NAMES={
 "falcon-9":{"query":"Falcon 9","must":r"\bfalcon[\s-]*9\b","preferred":"NHQ202409270003"},
 "vulcan":{"query":"Vulcan Centaur","must":r"\bvulcan\b","preferred":"KSC-20210826-PH-KLS01_0073"},
 "starship":{"query":"SpaceX Starship rocket","must":r"\bstarship\b","preferred":"iss072e220043"},
 "new-glenn":{"query":"Blue Origin New Glenn","must":r"\bnew[\s-]*glenn\b","preferred":None}
}
PAYLOADS={
 "escapade":{"query":"ESCAPADE spacecraft","must":r"\bESCAPADE\b","preferred":"KSC-20240822-PH-KLS01_0033",
             "summary":"Twin NASA spacecraft study how the solar wind interacts with Mars's magnetic environment."},
 "imap":{"query":"IMAP spacecraft","must":r"\bIMAP\b","preferred":"KSC-20250529-PH-AJN01_0065",
         "summary":"NASA's Interstellar Mapping and Acceleration Probe investigates the particles and boundaries of the heliosphere."},
 "europa-clipper":{"query":"Europa Clipper spacecraft","must":r"\bEuropa[\s-]*Clipper\b","preferred":None,
                   "summary":"NASA's Europa Clipper investigates Jupiter's icy moon and whether it may have habitable conditions."},
 "psyche":{"query":"NASA Psyche spacecraft","must":r"\bPsyche\b","preferred":None,
           "summary":"NASA's Psyche spacecraft investigates a metal-rich asteroid."},
 "pace":{"query":"PACE spacecraft NASA","must":r"\bPACE\b","preferred":None,
         "summary":"NASA's PACE satellite studies ocean ecology, aerosols and clouds."}
}
PAYLOAD_IDENTIFIERS=tuple(PAYLOADS)


def nasa_credit(meta):
    """Require a NASA-identified photographer, not simply a NASA-hosted file."""
    explicit=[str(meta.get(k) or "").strip() for k in ("photographer","secondary_creator")]
    explicit=[x for x in explicit if x]
    if explicit:
        if any(EXCLUDED_CREDIT.search(x) for x in explicit):
            return None
        for item in explicit:
            if re.search(r"\bNASA(?:/|\s*[-–]|\b)",item,re.I):
                return item[:90]
        return None
    description=str(meta.get("description") or "")[-1600:]
    for pattern in (r"(?:Photo\s+)?Credit\s*:\s*\(?\s*(NASA/[^).;\n]{2,90})",
                    r"Credit\s*:\s*(Don Pettit/NASA)"):
        match=re.search(pattern,description,re.I)
        if match and not EXCLUDED_CREDIT.search(match.group(1)):
            return match.group(1).strip(" .)")[:90]
    return None


def safe_image(url,nasa_id):
    if not isinstance(url,str) or len(url)>450:
        return None
    u=urlsplit(url)
    if (u.scheme!="https" or u.hostname!="images-assets.nasa.gov" or u.username or
        u.password or u.port or u.query or u.fragment):
        return None
    if not re.match(r"^/image/[^/]+/[^/]+~(?:small|medium|large|thumb)\.(?:jpg|jpeg|png|webp)$",u.path,re.I):
        return None
    if not u.path.startswith("/image/"+quote(nasa_id,safe="")+"/"):
        return None
    return url


def candidate(item,name,pattern):
    data=(item.get("data") or [{}])[0]
    nasa_id=data.get("nasa_id")
    if not isinstance(nasa_id,str) or not re.fullmatch(r"[A-Za-z0-9_ -]{4,95}",nasa_id):
        return None
    if data.get("media_type")!="image" or str(data.get("center") or "").upper() not in NASA_CENTERS:
        return None
    title=str(data.get("title") or "")
    # Never match a rocket solely from a background reference in a long caption.
    if not re.search(pattern,title,re.I):
        return None
    credit=nasa_credit(data)
    if not credit:
        return None
    full=str(data.get("description") or "")
    if re.search(r"(?:©|\bcopyright(?:ed)?\b|\bimage courtesy\b|\bphoto courtesy\b)",full,re.I):
        return None
    links=item.get("links") or []
    prioritized=sorted(links,key=lambda link:
      0 if "~medium." in str(link.get("href")) else
      1 if "~small." in str(link.get("href")) else
      2 if "~large." in str(link.get("href")) else 3)
    image=next((x for link in prioritized if (x:=safe_image(link.get("href"),nasa_id))),None)
    if not image:
        return None
    year=str(data.get("date_created") or "")[:4]
    if year and not re.fullmatch(r"(?:19|20)\d\d",year):
        year=""
    return {"nasaId":nasa_id,"title":title.strip()[:160],
            "imageUrl":image,"sourceUrl":"https://images.nasa.gov/details/"+quote(nasa_id,safe=""),
            "credit":credit,"year":year}


def select(items,name,setting):
    candidates=[x for i in (items or []) if (x:=candidate(i,name,setting["must"]))]
    preferred=setting.get("preferred")
    candidates.sort(key=lambda v:(v["nasaId"]!=preferred,
        not re.search(r"\b(?:rocket|launch|spacecraft|rollout|flight)\b",v["title"],re.I),
        v.get("year") or "",v["nasaId"]),reverse=False)
    return candidates[0] if candidates else None


def fetch_nasa(query,opener=urlopen):
    url=NASA_API+"?"+urlencode({"q":query,"media_type":"image","page_size":30})
    req=Request(url,headers={"User-Agent":UA,"Accept":"application/json"})
    with opener(req,timeout=14) as response:
        if int(response.status)!=200:
            raise ValueError("NASA image API HTTP status not 200")
        raw=response.read(MAX_RESPONSE+1)
        if len(raw)>MAX_RESPONSE:
            raise ValueError("NASA response size exceeded")
    obj=json.loads(raw)
    result=obj.get("collection",{}).get("items")
    if not isinstance(result,list):
        raise ValueError("NASA response missing image list")
    return result


def refresh(source,fetcher=fetch_nasa):
    out=json.loads(json.dumps(source))  # preserve reviewed seed on feed failure
    discoveries=0
    checked=0
    for kind,settings in (("rockets",NAMES),("payloads",PAYLOADS)):
        for key,rule in settings.items():
            try:
                hits=fetcher(rule["query"])
                checked+=1
                chosen=select(hits,key,rule)
                if not chosen:
                    continue
                current=out.get(kind,{}).get(key)
                if not current and kind=="payloads":
                    current={"name":key.replace("-"," ").upper(),"summary":rule["summary"],
                             "context":"NASA photo of this named spacecraft, from a past preparation or mission event, not a live camera.",
                             "matchType":"named-nasa-payload"}
                if not current:
                    continue
                updated={**current,**{k:v for k,v in chosen.items() if k!="year"}}
                if updated != current:
                    out.setdefault(kind,{})[key]=updated
                    discoveries+=1
            except (OSError,ValueError,KeyError,TimeoutError) as exc:
                print("NASA query unavailable for "+key+": "+str(exc)[:120],file=sys.stderr)
    return out,{"checked":checked,"changed":discoveries}


def run_build():
    original=json.loads(CATALOG.read_text(encoding="utf-8"))
    if original.get("schemaVersion")!=1:
        raise ValueError("Unexpected image manifest schema")
    update,report=refresh(original)
    before=json.dumps(original,sort_keys=True,ensure_ascii=False)
    after=json.dumps(update,sort_keys=True,ensure_ascii=False)
    if before!=after:
        CATALOG.write_text(json.dumps(update,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
    print(json.dumps({"catalog_changed":before!=after,**report},sort_keys=True))


class CatalogTests(unittest.TestCase):
    def item(self,title="SpaceX Falcon 9 rocket launch",credit="NASA/A Photographer",
             image="https://images-assets.nasa.gov/image/NHQ202409270003/NHQ202409270003~medium.jpg",
             nasa_id="NHQ202409270003"):
        return {"data":[{"nasa_id":nasa_id,"center":"HQ","media_type":"image",
                         "title":title,"photographer":credit,"date_created":"2024-09-27"}],
                "links":[{"href":image,"render":"image","rel":"alternate"}]}
    def test_nasa_owned_photo_accepted(self):
        r=candidate(self.item(),"falcon-9",NAMES["falcon-9"]["must"])
        self.assertEqual(r["credit"],"NASA/A Photographer")
    def test_third_party_photo_excluded_even_on_nasa_api(self):
        for credit in ("SpaceX","Blue Origin","Photo courtesy SpaceX","United Launch Alliance"):
            self.assertIsNone(candidate(self.item(credit=credit),"falcon-9",NAMES["falcon-9"]["must"]))
    def test_not_just_word_in_caption(self):
        item=self.item(title="Astronaut walking through hangar")
        item["data"][0]["description"]="Beside a Falcon 9 rocket."
        self.assertIsNone(candidate(item,"falcon-9",NAMES["falcon-9"]["must"]))
    def test_url_no_impersonation(self):
        for image in ("https://evil.nasa.gov/photo.jpg",
                      "https://images-assets.nasa.gov.evil.test/image/NHQ202409270003/a~medium.jpg",
                      "http://images-assets.nasa.gov/image/NHQ202409270003/NHQ202409270003~medium.jpg"):
            self.assertIsNone(candidate(self.item(image=image),"falcon-9",NAMES["falcon-9"]["must"]))
    def test_preferred_verified_asset_wins(self):
        other=self.item(nasa_id="NHQ202409270004",
                        image="https://images-assets.nasa.gov/image/NHQ202409270004/NHQ202409270004~medium.jpg")
        found=select([other,self.item()],"falcon-9",NAMES["falcon-9"])
        self.assertEqual(found["nasaId"],"NHQ202409270003")
    def test_missing_and_broken_nasa_result_fail_closed(self):
        seed={"schemaVersion":1,"rockets":{"falcon-9":{"imageUrl":"keep"}},"payloads":{}}
        saved,report=refresh(seed,lambda q:[])
        self.assertEqual(saved["rockets"]["falcon-9"]["imageUrl"],"keep")
        self.assertEqual(report["changed"],0)
    def test_payload_is_not_equated_to_rocket(self):
        self.assertIsNone(candidate(self.item(title="ESCAPADE spacecraft"),"falcon-9",NAMES["falcon-9"]["must"]))
    def test_photographer_field_required_or_nasa_description(self):
        photo=self.item(credit="")
        photo["data"][0]["description"]="Credit: NASA/Kim Shiflett"
        self.assertEqual(candidate(photo,"falcon-9",NAMES["falcon-9"]["must"])["credit"],"NASA/Kim Shiflett")
        photo["data"][0]["description"]="Credit: SpaceX"
        self.assertIsNone(candidate(photo,"falcon-9",NAMES["falcon-9"]["must"]))


def main():
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument("--test",action="store_true",help="run isolated no-network safety tests")
    p.add_argument("--build",action="store_true",help="refresh NASA image manifest on disk")
    args=p.parse_args()
    if not args.test and not args.build:
        p.error("Specify --test or --build")
    if args.test and not unittest.TextTestRunner(verbosity=2).run(
      unittest.defaultTestLoader.loadTestsFromTestCase(CatalogTests)).wasSuccessful():
        return 1
    if args.build:
        run_build()
    return 0


if __name__=="__main__":
    sys.exit(main())
