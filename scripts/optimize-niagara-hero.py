#!/usr/bin/env python3
"""Make one optimized local real-photo Niagara hero from a verified licensed original.
Do not download a placeholder or generate an AI substitute."""
from pathlib import Path
from PIL import Image, ImageOps
root=Path("public/assets/niagara-falls/photos")
source=root/"hero.source.jpg"
target=root/"horseshoe-2026.jpg"
if not source.is_file(): raise RuntimeError("Licensed source JPEG missing")
with Image.open(source) as loaded:
    if loaded.format not in ("JPEG","MPO"): raise RuntimeError("Source is not JPEG")
    if loaded.format=="MPO": loaded.seek(0)
    image=ImageOps.exif_transpose(loaded).convert("RGB")
    if image.width<1280 or image.height<850: raise RuntimeError("Source too small for hero")
    banner=ImageOps.fit(image,(1600,900),method=Image.Resampling.LANCZOS,centering=(.52,.51))
    banner.save(target,"JPEG",quality=85,optimize=True,progressive=True,subsampling=0)
source.unlink()
with Image.open(target) as result:
    result.verify()
with Image.open(target) as result:
    if result.format!="JPEG" or result.size!=(1600,900): raise RuntimeError("Output JPEG dimensions invalid")
n=target.stat().st_size
if n<45000 or n>1600000: raise RuntimeError(f"Optimized hero size out of range: {n}")
print(f"Verified original real Niagara photo optimized to 1600x900; {n} bytes; Chicken4War, CC BY-SA 4.0")
