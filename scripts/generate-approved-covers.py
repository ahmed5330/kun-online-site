#!/usr/bin/env python3
"""Deterministic editorial cover images for approved articles (not screenshots).
Run in Actions before the guarded publisher; produces a genuine 1200x630 PNG.
Requires pillow, arabic-reshaper, python-bidi, fonts-noto-core.
"""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
from bidi.algorithm import get_display
import arabic_reshaper
import json, math, os, subprocess

ROOT = Path(__file__).resolve().parent.parent
APPROVED = ROOT / "content" / "approved"
IMAGES = ROOT / "blog" / "images"

def font_file():
    explicit = os.getenv("EDITORIAL_ARABIC_FONT")
    if explicit and Path(explicit).is_file():
        return explicit
    for name in ("Noto Sans Arabic:style=Bold", "DejaVu Sans:style=Bold"):
        try:
            file = subprocess.check_output(["fc-match", "-f", "%{file}", name], text=True).strip()
            if file and Path(file).is_file():
                return file
        except (OSError, subprocess.CalledProcessError):
            continue
    raise RuntimeError("No Unicode Arabic font available. Install fonts-noto-core.")

def rtl(text):
    return get_display(arabic_reshaper.reshape(text))

def lines_for(draw, text, font, width):
    words = text.split()
    result, current = [], ""
    for word in words:
        candidate = (current + " " + word).strip()
        if draw.textlength(rtl(candidate), font=font) <= width:
            current = candidate
        else:
            if current: result.append(current)
            current = word
    if current: result.append(current)
    return result

def generate(meta, overwrite=False):
    name = meta["slug"]
    if meta.get("image") != name + ".png":
        raise ValueError("Cover must use the unique article slug: " + name)
    target = IMAGES / (name + ".png")
    if target.exists() and not overwrite:
        return False
    font_path = font_file()
    canvas = Image.new("RGB", (1200,630))
    pixels = canvas.load()
    for y in range(630):
        for x in range(1200):
            p = y/630
            glow = max(0.0,1.0-math.hypot((x-1050)/850,(y-100)/500))
            pixels[x,y] = (int(9 + 14*p + 9*glow), int(18+20*p + 16*glow), int(32+24*p + 17*glow))
    d = ImageDraw.Draw(canvas)
    green = (125,194,66)
    d.ellipse((870,-260,1480,350), outline=(46,95,74), width=4)
    d.ellipse((980,-170,1390,260), outline=(49,106,71), width=4)
    d.rounded_rectangle((50,54,1150,573), radius=28, outline=(55,82,87), width=2)
    d.rounded_rectangle((84,89,1116,150), radius=12, fill=(22,50,51))
    small = ImageFont.truetype(font_path,31)
    d.text((1090,100),rtl("كن أونلاين  |  دليل التجارة الإلكترونية"), font=small,
           fill=(211,234,204),anchor="ra")
    title = str(meta["title"]).strip()
    size = 70
    while size >= 38:
        face = ImageFont.truetype(font_path,size)
        lines = lines_for(d,title,face,950)
        if len(lines) <= 3 and all(d.textlength(rtl(line),font=face)<=950 for line in lines): break
        size -= 3
    lines = lines_for(d,title,face,950)
    if len(lines)>4: raise ValueError("Title too long for cover: "+name)
    block_height = len(lines)*int(size*1.65)
    start = max(182, int(335-block_height/2))
    for i,line in enumerate(lines):
        d.text((1090,start+i*int(size*1.65)),rtl(line),font=face,fill=(246,250,248),anchor="ra")
    d.rounded_rectangle((870,528,1100,539), radius=5, fill=green)
    d.text((1090,560),rtl("خطوات عملية قابلة للتطبيق"),font=ImageFont.truetype(font_path,25),fill=(168,200,169),anchor="ra")
    IMAGES.mkdir(parents=True, exist_ok=True)
    canvas.save(target,optimize=True)
    with Image.open(target) as image:
        assert image.size == (1200,630) and image.format == "PNG"
    print("COVER READY:",target.relative_to(ROOT))
    return True

if __name__ == "__main__":
    for item in sorted(APPROVED.glob("*.json")):
        meta=json.loads(item.read_text(encoding="utf-8"))
        if meta.get("approved") is True:
            generate(meta)
