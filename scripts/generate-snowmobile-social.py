"""Render static PNG preview cards. Manual asset build: Python 3 + Pillow.
Cards are typography, not photographs or depictions of live conditions.
"""
from pathlib import Path
import json, subprocess
from PIL import Image, ImageDraw, ImageFont
root=Path(__file__).resolve().parents[1]
regions=json.loads(subprocess.check_output(['node','--input-type=module','-e',"import {REGIONS} from './lib/snowmobile/regions.mjs';console.log(JSON.stringify(REGIONS));"],cwd=root))
out=root/'public/snowmobile/social';out.mkdir(exist_ok=True)
fontdir=Path('/usr/share/fonts/truetype/dejavu')
def font(size,bold=False):return ImageFont.truetype(str(fontdir/('DejaVuSans-Bold.ttf' if bold else 'DejaVuSans.ttf')),size)
for r in [{'key':'michigan','shortLabel':'Michigan'}]+regions:
 im=Image.new('RGB',(1200,630),'#123246');d=ImageDraw.Draw(im)
 d.rectangle((0,0,1200,12),fill='#e8a33d')
 d.text((68,52),'MICHIGAN WINTER TRIP TOOLS',font=font(24,True),fill='#acd8ee')
 # Fit long regional labels without wrapping into the main title.
 size=48
 while d.textlength(r['shortLabel'],font=font(size,True))>1064:size-=1
 d.text((68,124),r['shortLabel'],font=font(size,True),fill='white')
 d.text((68,205),'Snowmobile trail maps',font=font(53,True),fill='white')
 d.text((68,278),'& route planning',font=font(53,True),fill='white')
 d.rounded_rectangle((68,388,1132,462),radius=12,fill='#244a60')
 d.text((94,407),'Junction stops  /  Route miles  /  Trail reports',font=font(29),fill='white')
 d.text((68,515),'Built by Chris Izworski',font=font(31,True),fill='#e8a33d')
 d.text((68,567),'chrisizworski.com/snowmobile',font=font(23),fill='#acd8ee')
 im.save(out/(r['key']+'.png'),optimize=True)
print('Rendered 8 social cards (1200 × 630).')
