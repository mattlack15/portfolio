"""Draw a readable review panel beside the real mobile browser recording."""
import json
import sys
from PIL import Image, ImageDraw, ImageFont

spec = json.load(open(sys.argv[1]))
image = Image.new('RGB', (1440, 1000), '#edf0e8')
draw = ImageDraw.Draw(image)
font_root = '/System/Library/Fonts/Supplemental/'
def font(name, size):
    try:
        return ImageFont.truetype(font_root + name, size)
    except OSError:
        return ImageFont.load_default(size=size)

label = font('Courier New.ttf', 16)
title = font('Georgia.ttf', 64)
body = font('Arial.ttf', 25)
small = font('Arial.ttf', 20)
draw.text((85, 110), spec['number'] + ' / ' + spec['name'].upper(), font=label, fill='#596d4f')
draw.text((80, 175), 'On a phone.', font=title, fill='#263d33')
draw.text((85, 277), '390 px wide / real browser recording', font=small, fill='#596d4f')
draw.line((85, 344, 710, 344), fill='#b6c2ad', width=1)
for i, item in enumerate(spec['mobile']):
    y = 407 + i * 82
    draw.text((85, y + 4), str(i + 1).zfill(2), font=label, fill='#71846a')
    draw.text((145, y), item, font=body, fill='#263d33')
draw.text((85, 826), 'Try all four designs at', font=small, fill='#596d4f')
draw.text((85, 866), 'localhost:4173/designs', font=label, fill='#263d33')
draw.rounded_rectangle((892, 70, 1298, 930), radius=14, fill='#263d33')
draw.text((900, 953), spec['name'] + ' / Mobile preview', font=label, fill='#596d4f')
image.save(sys.argv[2])
