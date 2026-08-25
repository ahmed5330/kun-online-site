#!/usr/bin/env python3
"""مولّد صور مقالات كن أونلاين — 1200x630"""
import sys
from PIL import Image, ImageDraw, ImageFont
import arabic_reshaper

W, H  = 1200, 630
NAVY  = (10, 15, 30)
BLUE  = (27, 58, 143)
LIME  = (125, 194, 66)
WHITE = (255, 255, 255)
MUTED = (150, 165, 195)
FONT  = "/usr/share/fonts/truetype/freefont/FreeSerifBold.ttf"

def ar(t):
    return arabic_reshaper.reshape(t)

def build(title, category_label, out):
    img = Image.new("RGB", (W, H), NAVY)
    d = ImageDraw.Draw(img)
    for y in range(H):
        r = y / H
        d.line([(0, y), (W, y)], fill=(int(10+14*r), int(15+21*r), int(30+42*r)))
    d.ellipse([W-300, -200, W+200, 300], fill=BLUE)
    d.ellipse([-220, H-240, 180, H+220], fill=(18, 30, 60))
    d.rectangle([0, 0, W, 8], fill=LIME)
    f_cat = ImageFont.truetype(FONT, 30)
    f_title = ImageFont.truetype(FONT, 60)
    f_logo = ImageFont.truetype(FONT, 34)
    f_dom = ImageFont.truetype(FONT, 23)
    PAD = 80
    cat = ar(category_label)
    cw = d.textlength(cat, font=f_cat)
    d.rounded_rectangle([W-PAD-cw-44, 74, W-PAD, 132], radius=29, fill=(18,38,24), outline=LIME, width=2)
    d.text((W-PAD-22, 103), cat, font=f_cat, fill=LIME, anchor="rm")
    lines, cur = [], ""
    for w in title.split():
        t = (cur + " " + w).strip()
        if d.textlength(ar(t), font=f_title) > W - PAD*2:
            if cur: lines.append(cur)
            cur = w
        else:
            cur = t
    if cur: lines.append(cur)
    if len(lines) > 4:
        lines = lines[:4]
        lines[3] = lines[3].rstrip() + "…"
    lh = 86
    y = (H - len(lines)*lh)//2 + 10
    for ln in lines:
        d.text((W-PAD, y), ar(ln), font=f_title, fill=WHITE, anchor="ra")
        y += lh
    d.rectangle([W-PAD-130, y+18, W-PAD, y+24], fill=LIME)
    d.text((W-PAD, H-80), ar("كن أونلاين"), font=f_logo, fill=LIME, anchor="ra")
    d.text((W-PAD, H-44), "kun-online.com", font=f_dom, fill=MUTED, anchor="ra")
    img.save(out, "PNG", optimize=True)
    return out

if __name__ == "__main__":
    print(build(sys.argv[1], sys.argv[2] if len(sys.argv)>2 else "أساسيات",
                sys.argv[3] if len(sys.argv)>3 else "cover.png"))
