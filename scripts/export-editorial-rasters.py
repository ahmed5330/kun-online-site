#!/usr/bin/env python3
"""Explicit, supervised SVG -> PNG/WebP consistency export.

This script never runs in the site publisher by default. It updates published
image bytes only with --write; image paths and canonical article links stay fixed.
Requirements: pip install cairosvg Pillow
"""
import argparse
import io
import json
import os
import re
import subprocess
from pathlib import Path
from xml.etree import ElementTree as ET

ROOT=Path(__file__).resolve().parent.parent
IMAGES=ROOT/'blog'/'images'
MANIFEST=ROOT/'seo'/'published-cover-designs.json'

def main():
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument('--write',action='store_true',help='Replace all published raster variants after reviewing vector previews')
    args=p.parse_args()
    records=json.loads(MANIFEST.read_text(encoding='utf-8'))['items']
    assert len(records)==29, 'Require explicit editorial inventory review before altering published image count'
    rendered=[]
    for item in records:
        slug=item['slug']
        assert re.fullmatch(r'[a-z0-9-]+',slug)
        assert item['svg']==slug+'.svg' and item['png']==slug+'.png'
        content=(IMAGES/item['svg']).read_text(encoding='utf-8')
        assert content.startswith('<svg xmlns="http://www.w3.org/2000/svg"')
        assert 'width="1200" height="630"' in content
        assert not re.search(r'<(?:script|image|foreignObject|use)\b|(?:href|onload|onerror)\s*=',content,re.I)
        if not args.write:
            rendered.append(slug)
            continue
        # SVG engines differ in Arabic shaping. For social previews we strip
        # SVG <text> and draw the *same* headline lines via Pillow/libraqm.
        import cairosvg
        from PIL import Image, ImageDraw, ImageFont, features
        if not features.check('raqm'):
            raise RuntimeError('Pillow/libraqm is required for Arabic social images')
        root = ET.fromstring(content)
        ns = '{http://www.w3.org/2000/svg}'
        title_elements = []
        for parent in root.iter():
            for child in list(parent):
                if child.tag == ns+'text':
                    title_elements.append((child.attrib, ''.join(child.itertext())))
                    parent.remove(child)
        if len(title_elements)<3:
            raise RuntimeError('Visible Arabic headline missing for '+slug)
        bare = ET.tostring(root,encoding='utf-8',xml_declaration=False)
        png_data = cairosvg.svg2png(bytestring=bare,output_width=1200,output_height=630)
        with Image.open(io.BytesIO(png_data)) as png:
            rgb = png.convert('RGB')
            assert rgb.size == (1200,630)
            draw=ImageDraw.Draw(rgb)
            font_path = os.getenv('EDITORIAL_ARABIC_FONT') or subprocess.check_output(
                ['fc-match','-f','%{file}','Noto Sans Arabic:style=Bold'],text=True).strip()
            if not Path(font_path).is_file():
                raise RuntimeError('Noto Arabic font required to avoid squares')
            for attrs,value in title_elements:
                if not value.strip():
                    continue
                size = int(float(attrs.get('font-size','36')))
                font = ImageFont.truetype(font_path,size,layout_engine=ImageFont.Layout.RAQM)
                x,y=float(attrs['x']),float(attrs['y'])
                anchor='ms' if attrs.get('text-anchor')=='middle' else 'rs'
                draw.text((x,y),value,fill=attrs.get('fill','#f8fbff'),
                          font=font,anchor=anchor,direction='rtl',language='ar')
            sources=((slug+'.png','PNG',None),
                     (slug+'.webp','WEBP',87),
                     (slug+'-640.webp','WEBP',85))
            for name,format,quality in sources:
                file=IMAGES/name
                image=rgb if name!=slug+'-640.webp' else rgb.resize((640,336),Image.Resampling.LANCZOS)
                tmp=file.with_name(file.name+'.tmp')
                kw=dict(optimize=True) if format=='PNG' else dict(quality=quality,method=6)
                image.save(tmp,format=format,**kw)
                with Image.open(tmp) as check:
                    assert check.size==((640,336) if name.endswith('-640.webp') else (1200,630))
                os.replace(tmp,file)
        rendered.append(slug)
        print('RASTER SYNC:',slug)
    if args.write:
        print('Exported',len(rendered),'approved 1200x630 PNG + WebP + 640x336 WebP sets.')
    else:
        print('CHECK ONLY:',len(rendered),'SVG assets validated. No raster pixels or timestamps altered.')

if __name__=='__main__':
    main()
