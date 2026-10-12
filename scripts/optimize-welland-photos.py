#!/usr/bin/env python3
"""Resize sourced JPEG photographs for fast, first-party lock cards.

All images retain their original photographer and CC licence citations in
welland-canal.js. The visible card marks the photos as cropped for presentation.
"""
from pathlib import Path
from PIL import Image, ImageOps

DIR = Path("public/assets/welland/photos")
FILES = ("north1", "north2", "north3", "thorold", "south8")

for name in FILES:
    target = DIR / f"{name}.jpg"
    if not target.exists():
        raise RuntimeError(f"Missing source photo: {target}")
    with Image.open(target) as original:
        if original.format != "JPEG":
            raise RuntimeError(f"Unexpected format: {target}")
        img = ImageOps.exif_transpose(original).convert("RGB")
        img.thumbnail((1100, 1100), Image.Resampling.LANCZOS)
        temp = DIR / f"{name}.optimized.jpg"
        img.save(temp, "JPEG", quality=83, optimize=True, progressive=True, subsampling=0)
    temp.replace(target)
    size = target.stat().st_size
    if size < 8_000 or size > 1_500_000:
        raise RuntimeError(f"Unreasonable photo bytes ({size}): {target}")
    print(f"{name}: {img.size[0]}x{img.size[1]}, {size:,} bytes", flush=True)
