#!/usr/bin/env python3
"""One-time, source-licensed image import for the Michigan winter flagship; manual quality gate."""
from __future__ import annotations
import html, io, json, os, time, urllib.request, urllib.error
from pathlib import Path
from PIL import Image, ImageOps, UnidentifiedImageError
ROOT = Path(__file__).resolve().parents[1]
manifest = json.loads((ROOT/'data/michigan-winter-photo-sources.json').read_text())
page_path=ROOT/'public/michigan-winter-activities/index.html'
page=page_path.read_text()
seen=set()
results=[]
for item in manifest['images']:
    src=item['sourceUrl'];path=ROOT/item['localPath']
    if src in seen: raise RuntimeError('Duplicate source: '+src)
    seen.add(src)
    req=urllib.request.Request(src,headers={'User-Agent':'ChrisIzworskiWinterFieldGuideImageImport/1.0 (contact: chrisizworski.com); Wikimedia-commons-compatible-photo-user-agent'})
    raw=None;last=None
    for attempt in range(4):
        try:
            with urllib.request.urlopen(req,timeout=40) as response:
                content_type=response.headers.get('Content-Type','').lower()
                if not content_type.startswith('image/'):raise RuntimeError('Unexpected content type: '+content_type)
                raw=response.read(22*1024*1024+1)
                if len(raw)>22*1024*1024:raise RuntimeError('Photo exceeds upload budget')
                break
        except urllib.error.HTTPError as e:
            if e.code in (403,429):
                raise RuntimeError('Source denied automated retrieval; do not bypass source policy: '+src) from e
            last=e
        except Exception as e:
            last=e
            if attempt<3:time.sleep(2+attempt*3)
    if raw is None: raise RuntimeError('Source failed after 4 attempts: '+src+' '+str(last))
    try:
        with Image.open(io.BytesIO(raw)) as base:
            image=ImageOps.exif_transpose(base).convert('RGB')
            if image.width<480 or image.height<320: raise RuntimeError('Image dimensions too small')
            image.thumbnail((item['maxWidth'],item['maxHeight']),Image.Resampling.LANCZOS)
            path.parent.mkdir(parents=True,exist_ok=True)
            for quality in (82,74,66):
                buf=io.BytesIO()
                image.save(buf,'WEBP',quality=quality,method=5)
                if len(buf.getvalue())<=360000:break
            path.write_bytes(buf.getvalue())
            with Image.open(path) as chk:
                chk.verify()
    except (UnidentifiedImageError,OSError) as e:raise RuntimeError('Photo decode failure: '+src) from e
    local='/'+item['localPath'].removeprefix('public/')
    src_escaped=html.escape(src,quote=True)
    found=page.count('src="'+src_escaped+'"')+page.count('src="'+src+'"')
    if not found:raise RuntimeError('Source is no longer referenced in page: '+src)
    page=page.replace('src="'+src_escaped+'"','src="'+local+'"')
    page=page.replace('src="'+src+'"','src="'+local+'"')
    results.append({'source':src,'local':local,'bytes':path.stat().st_size,'dimensions':list(image.size),'references':found})
    print(f"Imported {item['localPath']}: {path.stat().st_size} bytes",flush=True)
    time.sleep(.5)
page_path.write_text(page)
(ROOT/'docs/MICHIGAN_WINTER_PHOTO_IMPORT_REPORT.json').write_text(json.dumps({'built':'2026-10-26','photos':results},indent=2)+'\n')
assert len(results)==len(manifest['images'])>=16
assert all(item['bytes']<=360000 for item in results)
print('IMAGE_IMPORT_SUCCEEDED: %d photos; %d bytes'%(len(results),sum(x['bytes'] for x in results)))
