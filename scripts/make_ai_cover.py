#!/usr/bin/env python3
"""توليد صورة مقال بـ DALL-E + إضافة شعار كن أونلاين"""
import sys, base64, io
from pathlib import Path
from openai import OpenAI
from PIL import Image, ImageDraw, ImageFont
import arabic_reshaper

KEY_FILE = "/root/.openclaw/secrets/openai-key.txt"
FONT = "/usr/share/fonts/truetype/freefont/FreeSerifBold.ttf"
LIME = (125, 194, 66)
MUTED = (215, 225, 240)

def ar(t):
    return arabic_reshaper.reshape(t)

def generate(topic_en, out):
    client = OpenAI(api_key=Path(KEY_FILE).read_text().strip())

    prompt = (
        f"Modern flat vector illustration about {topic_en}. "
        "Dark navy background (#0a0f1e) with deep blue (#1B3A8F) and lime green (#7DC242) accents. "
        "Clean minimal business style, geometric shapes, subtle depth. "
        "Absolutely no text, no letters, no words, no numbers anywhere in the image. "
        "Professional editorial header illustration, centered composition."
    )

    r = client.images.generate(
        model="gpt-image-1", prompt=prompt,
        size="1536x1024", quality="medium", n=1
    )
    raw = base64.b64decode(r.data[0].b64_json)
    img = Image.open(io.BytesIO(raw)).convert("RGB").resize((1200, 800), Image.LANCZOS)
    img = img.crop((0, 85, 1200, 715))  # 1200x630

    d = ImageDraw.Draw(img, "RGBA")
    # شريط سفلي شفاف للشعار
    d.rectangle([0, 630-92, 1200, 630], fill=(10, 15, 30, 205))
    d.rectangle([0, 0, 1200, 7], fill=LIME)

    f_logo = ImageFont.truetype(FONT, 33)
    f_dom  = ImageFont.truetype(FONT, 21)
    d.text((1130, 630-62), ar("كن أونلاين"), font=f_logo, fill=LIME, anchor="ra")
    d.text((1130, 630-28), "kun-online.com", font=f_dom, fill=MUTED, anchor="ra")

    img.save(out, "PNG", optimize=True)
    return out

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("usage: make_ai_cover.py '<english topic>' <output.png>")
        sys.exit(1)
    print(generate(sys.argv[1], sys.argv[2]))
