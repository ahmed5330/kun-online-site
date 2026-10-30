#!/usr/bin/env python3
"""Deterministic, brand-consistent Arabic editorial covers.

Uses a single RTL shaping pass via Pillow + libraqm. Do NOT run
arabic_reshaper/get_display before Pillow's direction='rtl': on supported
Pillow builds that double-processes bidirectional text and corrupts titles.

Default publishing behavior only creates missing covers for approved drafts.
Explicit --rebuild-published is reserved for the supervised cover repair job.
"""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont, features
import argparse
import json
import os
import subprocess
from datetime import datetime
from zoneinfo import ZoneInfo

ROOT = Path(__file__).resolve().parent.parent
APPROVED = ROOT / "content" / "approved"
IMAGES = ROOT / "blog" / "images"
ARTICLES = ROOT / "blog" / "articles.json"
SIZE = (1200, 630)
RTL_KW = {"direction": "rtl", "language": "ar"}

PALETTE = {
    "store": ((116, 214, 78), (30, 78, 62)),
    "ads": ((91, 181, 236), (26, 66, 102)),
    "finance": ((241, 192, 99), (91, 70, 46)),
    "ops": ((98, 218, 188), (27, 78, 82)),
}

def font_file():
    explicit = os.getenv("EDITORIAL_ARABIC_FONT")
    if explicit and Path(explicit).is_file():
        return explicit
    for name in ("Noto Sans Arabic:style=Bold", "Noto Kufi Arabic:style=Bold"):
        try:
            result = subprocess.check_output(
                ["fc-match", "-f", "%{file}", name], text=True
            ).strip()
            if result and Path(result).is_file():
                return result
        except (OSError, subprocess.CalledProcessError):
            pass
    raise RuntimeError("Noto Arabic font is required for editorial covers")

def require_raqm():
    if not features.check("raqm"):
        raise RuntimeError("Pillow with libraqm is required for correct Arabic cover text")

def get_font(path, size):
    return ImageFont.truetype(path, size, layout_engine=ImageFont.Layout.RAQM)

def text_width(draw, line, font):
    return draw.textlength(line, font=font, **RTL_KW)

def wrap_title(draw, text, font, max_width):
    words = str(text).strip().split()
    if not words:
        raise ValueError("Missing cover title")
    lines = []
    current = ""
    for word in words:
        candidate = (current + " " + word).strip()
        if text_width(draw, candidate, font) <= max_width:
            current = candidate
        else:
            if current:
                lines.append(current)
            if text_width(draw, word, font) > max_width:
                raise ValueError("Unbreakable word does not fit cover")
            current = word
    if current:
        lines.append(current)
    return lines

def color_category(meta):
    category = meta.get("category", "store")
    return PALETTE.get(category, PALETTE["store"])

def cover_topic(meta):
    """Choose relevant, face-free pictograms from editorial subject and category."""
    slug = str(meta.get("slug", "")).lower()
    category = str(meta.get("category", "store")).lower()
    if any(word in slug for word in ("profit", "cost", "budget", "price", "finance")):
        return "finance"
    if any(word in slug for word in ("shipping", "delivery", "order-confirmation", "returns")):
        return "ops"
    if any(word in slug for word in ("inventory", "barcode", "bundle")):
        return "inventory"
    if any(word in slug for word in ("research", "selection", "competitor", "demand", "reviews")):
        return "research"
    if any(word in slug for word in ("funnel", "conversion", "checkout")):
        return "cro"
    if any(word in slug for word in ("seo", "search", "google")):
        return "seo"
    if any(word in slug for word in ("scale", "growth", "expansion")):
        return "growth"
    return category

def draw_motif(draw, category, accent):
    """Subtle category-specific abstract chart, no unverified data or text."""
    pale = tuple(max(0, min(255, round(x * .53))) for x in accent)
    if category == "finance":
        for i, h in enumerate((76, 118, 170, 130)):
            x = 120 + 62 * i
            draw.rounded_rectangle((x, 467-h, x+37, 467), radius=7,
                                   fill=(17, 49, 70), outline=pale, width=3)
    elif category == "ads":
        coords = [(118, 461), (180, 421), (240, 447), (302, 343), (365, 324)]
        draw.line(coords, fill=pale, width=7, joint="curve")
        for x, y in coords:
            draw.ellipse((x-7,y-7,x+7,y+7), fill=accent)
    elif category == "ops":
        for x, y in ((125,340),(200,340),(163,418)):
            draw.rounded_rectangle((x,y,x+65,y+55),radius=10,
                                   fill=(14,49,65),outline=pale,width=3)
            draw.line((x+32,y+8,x+32,y+43),fill=pale,width=2)
    elif category == "research":
        draw.ellipse((133,299,281,447),outline=accent,width=11)
        draw.ellipse((161,327,253,419),outline=pale,width=3)
        draw.line((260,427,344,508),fill=accent,width=14)
    elif category == "inventory":
        for x,y in ((132,327),(225,327),(179,411)):
            draw.polygon(((x,y),(x+70,y),(x+90,y+27),(x+20,y+27)),
                         outline=accent,width=3)
            draw.rectangle((x+20,y+27,x+90,y+90),outline=pale,width=3)
            draw.line((x+55,y+30,x+55,y+84),fill=pale,width=2)
    elif category == "cro":
        for i in range(3):
            x=120+i*91
            draw.rounded_rectangle((x,350,x+73,430),radius=13,
                                   outline=accent,width=4)
            draw.line((x+17,374,x+56,374),fill=pale,width=4)
            draw.line((x+17,393,x+47,393),fill=pale,width=3)
            if i<2:
                draw.line((x+75,391,x+88,391),fill=accent,width=3)
    elif category == "seo":
        draw.rounded_rectangle((119,328,362,473),radius=17,
                               fill=(14,48,63),outline=pale,width=4)
        draw.rounded_rectangle((140,353,341,388),radius=12,outline=accent,width=3)
        draw.ellipse((166,401,207,442),outline=accent,width=5)
        draw.line((201,438,225,460),fill=accent,width=5)
        for y in (409,426,443):
            draw.line((250,y,323,y),fill=pale,width=3)
    elif category == "growth":
        for i,height in enumerate((40,72,110,165)):
            x=126+i*59
            draw.rounded_rectangle((x,474-height,x+37,474),radius=7,
                                   fill=(14,49,65),outline=pale,width=3)
        draw.line(((131,408),(207,381),(282,328),(358,299)),
                  fill=accent,width=6,joint="curve")
    else:
        draw.rounded_rectangle((128,360,340,468),radius=17,
                               fill=(14,48,63),outline=pale,width=4)
        draw.polygon([(118,362),(235,274),(350,362)],outline=accent)
        draw.rounded_rectangle((216,411,251,468),radius=6,fill=pale)

def generate(meta, overwrite=False):
    require_raqm()
    name = str(meta["slug"])
    if meta.get("image") != name + ".png":
        raise ValueError("Cover path does not match the published slug: " + name)
    target = IMAGES / (name + ".png")
    if target.exists() and not overwrite:
        return False

    accent, tint = color_category(meta)
    canvas = Image.new("RGB", SIZE)
    draw = ImageDraw.Draw(canvas)
    # Lightweight branded gradient: deterministic and independently topic-specific.
    for y in range(SIZE[1]):
        r = y / (SIZE[1] - 1)
        draw.line((0,y,SIZE[0],y), fill=(int(6+7*r),int(25+16*r),int(46+16*r)))
    draw.ellipse((820,-310,1500,370), outline=tint, width=4)
    draw.ellipse((995,-155,1390,240), outline=tint, width=4)
    draw.rounded_rectangle((48,46,1152,581),radius=27,
                           outline=(37,78,99),width=2)
    draw.rounded_rectangle((78,75,1123,160),radius=13,fill=(16,47,63))
    draw_motif(draw,cover_topic(meta),accent)

    fontpath = font_file()
    brand = get_font(fontpath, 29)
    draw.text((1080,102), "كن أونلاين  |  دليلك للتجارة الإلكترونية",
              font=brand,fill=(229,241,238),anchor="ra",**RTL_KW)
    draw.rounded_rectangle((1020,176,1080,183),radius=3,fill=accent)

    headline = str(meta["title"]).strip()
    chosen = None
    for size in range(74,43,-2):
        f = get_font(fontpath,size)
        ls = wrap_title(draw,headline,f,935)
        if len(ls) <= 3 and all(text_width(draw,line,f) <= 935 for line in ls) and ((len(ls)-1)*int(size*1.45) + size*1.12 <= 315):
            chosen = (f,ls,size)
            break
    if not chosen:
        raise ValueError("Cover title cannot fit in three lines: " + name)
    font, lines, sz = chosen
    line_step = int(sz*1.45)
    block_height = line_step*(len(lines)-1) + sz*1.12
    y = round(208+(315-block_height)/2)
    for line in lines:
        draw.text((1080,y),line,font=font,fill=(248,252,255),anchor="ra",**RTL_KW)
        y += line_step
    if (y - line_step + sz*1.12) > 526:
        raise ValueError("Title overflows footer: " + name)

    label_font = get_font(fontpath, 27)
    draw.rounded_rectangle((760,531,1081,543),radius=5,fill=accent)
    draw.text((1080,562), "معلومات عملية تساعدك على اتخاذ قرار أفضل",
              font=label_font,fill=(184,207,219),anchor="ra",**RTL_KW)

    IMAGES.mkdir(parents=True,exist_ok=True)
    canvas.save(target,optimize=True)
    # Preserve the canonical PNG while providing lighter responsive WebP variants.
    canvas.save(target.with_suffix(".webp"),"WEBP",quality=87,method=6)
    smaller=canvas.resize((640,336),resample=Image.Resampling.LANCZOS)
    smaller.save(target.with_name(name+"-640.webp"),"WEBP",quality=85,method=6)
    with Image.open(target) as check:
        assert check.size == SIZE and check.format == "PNG"
    print("COVER READY:",target.relative_to(ROOT))
    return True

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--rebuild-published",action="store_true",
                        help="Rebuild ALL published covers; requires explicit invocation")
    args = parser.parse_args()
    if args.rebuild_published:
        items = json.loads(ARTICLES.read_text(encoding="utf-8"))
        if not isinstance(items,list) or not items:
            raise RuntimeError("Published article list is empty")
        for item in items:
            generate(item,overwrite=True)
        print("REBUILT",len(items),"PUBLISHED COVERS")
        return
    cairo_today = os.getenv("EDITORIAL_CAIRO_DATE") or datetime.now(
        ZoneInfo("Africa/Cairo")).date().isoformat()
    log_path = ROOT / "content" / "publication-log.json"
    logged = {entry["slug"] for entry in json.loads(log_path.read_text(encoding="utf-8"))}
    for item in sorted(APPROVED.glob("*.json")):
        meta = json.loads(item.read_text(encoding="utf-8"))
        if meta.get("approved") is True and meta.get("eligibleFrom","9999-12-31") <= cairo_today and meta["slug"] not in logged:
            generate(meta)
if __name__ == "__main__":
    main()
