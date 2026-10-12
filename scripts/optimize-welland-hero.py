#!/usr/bin/env python3
"""Create a crisp 16:9 hero from a sourced CC BY-SA 4.0 Welland image.

Photographer: Dough4872, Algoberta entering Welland Canal Lock 3, 2024.
Source/licence and "cropped" indication are visibly linked in the site hero.
"""
from pathlib import Path
from PIL import Image, ImageOps

base=Path("public/assets/welland/photos")
source=base/"hero-algoberta.source.jpg"
target=base/"hero-algoberta.jpg"
if not source.exists(): raise RuntimeError(f"Original licensed photograph missing: {source}")
with Image.open(source) as original:
    if original.format not in ("JPEG","MPO"):
        raise RuntimeError(f"Unexpected image format: {original.format}")
    if original.format=="MPO": original.seek(0)
    image=ImageOps.exif_transpose(original).convert("RGB")
    if image.width<1280 or image.height<750:
        raise RuntimeError("Hero source too small for a high-quality banner")
    # Keep the vessel/lock as the primary subject; no AI-generated edits.
    banner=ImageOps.fit(image,(1600,900),method=Image.Resampling.LANCZOS,centering=(0.5,0.47))
    banner.save(target,format="JPEG",quality=84,optimize=True,progressive=True,subsampling=0)
source.unlink()
with Image.open(target) as result:
    if result.size!=(1600,900) or result.format!="JPEG":
        raise RuntimeError("Hero output dimensions/format are wrong")
bytes=target.stat().st_size
if bytes<45000 or bytes>1500000:
    raise RuntimeError(f"Unreasonable optimized hero size: {bytes}")
print(f"Hero ready: 1600x900, {bytes:,} bytes; original source Dough4872 / CC BY-SA 4.0")
