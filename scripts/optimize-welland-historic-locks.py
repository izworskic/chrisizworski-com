#!/usr/bin/env python3
from pathlib import Path
from PIL import Image,ImageOps
d=Path('public/assets/welland/photos')
for stem in ['lock5-construction-1916','lock8-gates-1929']:
 p=d/f'{stem}.source.jpg';q=d/f'{stem}.jpg'
 if not p.exists():raise RuntimeError(f'Cannot release missing documented photo: {p}')
 with Image.open(p) as o:
  if o.format not in ('JPEG','MPO'):raise RuntimeError('Invalid source format')
  if o.format=='MPO':o.seek(0)
  image=ImageOps.exif_transpose(o).convert('RGB')
  image.thumbnail((1200,1200),Image.Resampling.LANCZOS)
  image.save(q,'JPEG',quality=85,optimize=True,progressive=True)
 if not 30000<q.stat().st_size<1500000:raise RuntimeError(f'Image size unreasonable: {q}')
 print(f'{stem}: {q.stat().st_size} bytes; photographed lock is historical')
 p.unlink()
