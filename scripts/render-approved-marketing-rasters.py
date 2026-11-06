#!/usr/bin/env python3
"""Render approved short-hook SVG covers as identical 1200x630 PNG/WebP/640-WebP.
CairoSVG shapes + Pillow/libraqm Arabic text; avoid font-dependent SVG->PNG bugs.
No network or production writes. Only --write modifies local workspace.
"""
import argparse, io, json, os, re, sys
from pathlib import Path
from xml.etree import ElementTree as ET
ROOT=Path(__file__).resolve().parent.parent
IMG=ROOT/'blog/images'
SPECS=ROOT/'seo/published-cover-designs.json'
CREATIVE=ROOT/'seo/creative-hooks-20261103.json'

def font_paths():
    root=Path('/usr/share/fonts/truetype/noto')
    bold=Path(os.environ.get('KUN_FONT_BOLD',root/'NotoSansArabic-Bold.ttf'))
    regular=Path(os.environ.get('KUN_FONT_REGULAR',root/'NotoSansArabic-Regular.ttf'))
    if not bold.is_file() or not regular.is_file():
        raise RuntimeError('Noto Sans Arabic regular + bold are required, fail closed to prevent tofu glyphs')
    return bold,regular

def render(svg, bold, regular):
    import cairosvg
    from PIL import Image, ImageDraw, ImageFont, features
    if not features.check('raqm'):
        raise RuntimeError('Pillow requires libraqm for correct Arabic shaping')
    root=ET.fromstring(svg)
    ns='{http://www.w3.org/2000/svg}'
    assert root.attrib.get('width')=='1200' and root.attrib.get('height')=='630'
    texts=[]
    # The approved cover generator places all text at root level / in untransformed groups.
    def strip(parent, transforms=()):
        for child in list(parent):
            if child.tag==ns+'text':
                if transforms: raise ValueError('Nested transformed SVG text not supported')
                texts.append((dict(child.attrib),''.join(child.itertext())))
                parent.remove(child)
            else:
                transform=child.attrib.get('transform')
                strip(child, transforms+((transform,) if transform else ()))
    strip(root)
    if len(texts)<3 or not any('مش' in t or 'العميل' in t or 'بتبيع' in t for _,t in texts):
        # The hook is validated by the JS coverage tests; avoid empty or shifted copies.
        if len(texts)<3: raise ValueError('Expected brand, hook, and subline')
    bare=ET.tostring(root, encoding='utf-8', xml_declaration=False)
    png=cairosvg.svg2png(bytestring=bare, output_width=1200, output_height=630)
    with Image.open(io.BytesIO(png)) as loaded:
        im=loaded.convert('RGB')
    draw=ImageDraw.Draw(im)
    for attrs,value in texts:
        if not value.strip():continue
        size=round(float(attrs.get('font-size','30')))
        file=bold if int(attrs.get('font-weight','500'))>=700 else regular
        font=ImageFont.truetype(str(file),size,layout_engine=ImageFont.Layout.RAQM)
        anchor='ms' if attrs.get('text-anchor')=='middle' else 'rs'
        x,y=float(attrs.get('x',0)),float(attrs.get('y',0))
        if not (40<=x<=1160 and 35<=y<=590):raise ValueError('Text baseline outside cover')
        draw.text((x,y),value,font=font,fill=attrs.get('fill','#ffffff'),
                  direction='rtl', language='ar',anchor=anchor,
                  stroke_width=0)
    return im

def main():
    p=argparse.ArgumentParser()
    p.add_argument('--write',action='store_true',help='Write image variants to local repository working directory')
    p.add_argument('--max',type=int,default=0,help='Optional preview count; forbidden in --write mode')
    opt=p.parse_args()
    items=json.loads(SPECS.read_text(encoding='utf-8'))['items']
    creative=json.loads(CREATIVE.read_text(encoding='utf-8'))['items']
    bySlug={x['slug']:x for x in creative}
    if len(items)!=32 or len(creative)!=32 or len(bySlug)!=32:
        raise ValueError('Explicitly reviewed 32-item batch required; never silently process new unreviewed articles')
    if opt.write and opt.max:raise ValueError('Partial production update is not allowed')
    bold,regular=font_paths()
    from PIL import Image
    for n,item in enumerate(items):
        slug=item['slug']
        if not re.fullmatch(r'[a-z0-9-]+',slug) or slug not in bySlug:
            raise ValueError('Unknown slug '+slug)
        path=IMG/(slug+'.svg')
        svg=path.read_bytes()
        if not svg.startswith(b'<svg xmlns="http://www.w3.org/2000/svg"'):
            raise ValueError('Invalid SVG '+slug)
        if re.search(br'<(?:image|script|foreignObject|use)\b|(?:href|onload|onerror)\s*=',svg,re.I):
            raise ValueError('Unsafe SVG '+slug)
        pic=render(svg,bold,regular)
        targets=[(slug+'.png','PNG',1200,630),(slug+'.webp','WEBP',1200,630),(slug+'-640.webp','WEBP',640,336)]
        for name,fmt,w,h in targets:
            to=IMG/name
            output=pic if w==1200 else pic.resize((w,h),Image.Resampling.LANCZOS)
            memory=io.BytesIO()
            if fmt=='PNG':output.save(memory,format='PNG',optimize=True)
            else:output.save(memory,format='WEBP',quality=87 if w==1200 else 83,method=6)
            payload=memory.getvalue()
            if len(payload)>800_000:raise ValueError('Image not optimized: '+name)
            with Image.open(io.BytesIO(payload)) as chk:
                if chk.size!=(w,h):raise ValueError('Bad image geometry: '+name)
            if opt.write:to.write_bytes(payload)
        print(('RENDERED' if opt.write else 'CHECKED'), slug, pic.size)
        if opt.max and n+1>=opt.max:break
    print('Complete: binaries altered' if opt.write else 'Preview check only, no writes')

if __name__=='__main__':
    main()
