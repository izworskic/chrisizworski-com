#!/usr/bin/env python3
"""One-time, source-verified Commons photo import, for repository-owned assets.

Requires Pillow. No live sensor and no photos are generated with AI.
The manifest is an allowlist: selected file, Commons page, named creator and CC license.
"""
import io
import json
import pathlib
import urllib.parse
import urllib.request
from PIL import Image, ImageOps

ROOT = pathlib.Path(__file__).resolve().parents[1]
MANIFEST = ROOT / "data/frozen-lighthouse-photography.json"
OUTPUT = ROOT / "public/assets/frozen-lighthouse-photos"
UA = "FreighterViewFarms/1.0 (editorial source photography; https://chrisizworski.com/)"
OUTPUT.mkdir(parents=True,exist_ok=True)
data=json.loads(MANIFEST.read_text())
assert len(data["photos"])==3
for photo in data["photos"]:
    filename=photo["filename"]
    source="https://commons.wikimedia.org/wiki/Special:Redirect/file/"+urllib.parse.quote(filename,safe="")
    request=urllib.request.Request(source,headers={"User-Agent":UA,"Accept":"image/jpeg,image/*"})
    with urllib.request.urlopen(request,timeout=55) as response:
        assert response.url.startswith("https://upload.wikimedia.org/"),response.url
        raw=response.read(14_000_000)
        assert len(raw)<14_000_000,"Oversized photo. Check source."
    with Image.open(io.BytesIO(raw)) as im:
        im=ImageOps.exif_transpose(im).convert("RGB")
        assert im.width>=750 and im.height>=500,(filename,im.size)
        for target in [640,1280]:
            output=OUTPUT/(photo["outputStem"]+"-"+str(target)+".webp")
            scale=min(1,target/im.width)
            new=(round(im.width*scale),round(im.height*scale))
            dest=im.resize(new,Image.Resampling.LANCZOS) if scale<1 else im
            dest.save(output,"WEBP",quality=82,method=6)
            assert output.stat().st_size<470_000,(str(output),output.stat().st_size)
            print(output.relative_to(ROOT),new,output.stat().st_size,"bytes",flush=True)
print("All photographs derived from the source images in",MANIFEST.relative_to(ROOT))
