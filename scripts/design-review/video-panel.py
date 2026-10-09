"""Draw a readable review panel beside the real mobile browser recording."""
import json
import sys
from PIL import Image, ImageDraw, ImageFont

spec = json.load(open(sys.argv[1]))
plain = spec['id'] == 'editorial'
background = '#f4f1e8' if plain else '#edf0e8'
ink = '#252525' if plain else '#263d33'
muted = '#535353' if plain else '#596d4f'
image = Image.new('RGB', (1440, 1000), background)
draw = ImageDraw.Draw(image)
font_root = '/System/Library/Fonts/Supplemental/'
def font(name, size):
    try:
        return ImageFont.truetype(font_root + name, size)
    except OSError:
        return ImageFont.load_default(size=size)

label = font('Arial.ttf' if plain else 'Courier New.ttf', 16)
title = font('Arial.ttf' if plain else 'Georgia.ttf', 54 if plain else 64)
body = font('Arial.ttf', 25)
small = font('Arial.ttf', 20)
draw.text((85, 110), spec['number'] + ' / ' + spec['name'].upper(), font=label, fill=muted)
draw.text((80, 175), 'Mobile layout' if plain else 'On a phone.', font=title, fill=ink)
draw.text((85, 277), '390 px wide / real browser recording', font=small, fill=muted)
if not plain:
    draw.line((85, 344, 710, 344), fill='#b6c2ad', width=1)
for i, item in enumerate(spec['mobile']):
    y = 407 + i * 82
    if not plain:
        draw.text((85, y + 4), str(i + 1).zfill(2), font=label, fill='#71846a')
    draw.text((85 if plain else 145, y), item, font=body, fill=ink)
draw.text((85, 826), 'Open the revised design at' if plain else 'Try all four designs at', font=small, fill=muted)
draw.text((85, 866), 'localhost:4173/designs/editorial' if plain else 'localhost:4173/designs', font=label, fill=ink)
draw.rounded_rectangle((892, 70, 1298, 930), radius=14, fill=ink)
draw.text((900, 953), spec['name'] + ' / Mobile preview', font=label, fill=muted)
image.save(sys.argv[2])
