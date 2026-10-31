#!/usr/bin/env python3
"""Refresh crawlable article cards, metadata and sitemap without publishing content."""
import argparse, html, json, re
from pathlib import Path
from xml.sax.saxutils import escape

ROOT = Path(__file__).resolve().parent.parent
BASE = 'https://kun-online.com'
# Version static cover URLs to bypass cached malformed RTL graphics.
COVER_REV = '?v=rtl-raqm-20261019'

def article_cards(articles, designs=None):
    designs = designs or {}
    cards=[]
    for a in articles:
        slug=html.escape(a['slug'],quote=True)
        title=html.escape(a['title'])
        desc=html.escape(a.get('description') or a.get('excerpt',''))
        minutes=re.search(r'\d+',str(a.get('readTime',5)))
        minutes=minutes.group(0) if minutes else '5'
        # Backgrounds no longer eagerly download every full-size PNG.
        image=a.get('image','')
        design=designs.get(a['slug'],{})
        visual_alt=design.get('alt',a['title'])
        pic=''
        if image and (ROOT/'blog/images'/image).exists():
            stem=Path(image).stem
            pic='<picture><source type="image/webp" srcset="/blog/images/'+stem+'-640.webp'+COVER_REV+' 640w, /blog/images/'+stem+'.webp'+COVER_REV+' 1200w" sizes="(max-width:600px) 90vw, 330px"><img src="/blog/images/'+html.escape(image,quote=True)+COVER_REV+'" alt="'+html.escape(visual_alt,quote=True)+'" width="1200" height="630" loading="lazy" decoding="async"></picture>' if (ROOT/'blog/images'/(stem+'.webp')).exists() else '<img src="/blog/images/'+html.escape(image,quote=True)+'" alt="'+html.escape(visual_alt,quote=True)+'" width="1200" height="630" loading="lazy" decoding="async">'
        svg=design.get('svg','')
        if re.fullmatch(r'[a-z0-9-]+\.svg',svg) and (ROOT/'blog/images'/svg).is_file() and pic:
            visual='<source type="image/svg+xml" srcset="/blog/images/'+svg+'">'
            pic=pic.replace('<picture>','<picture>'+visual,1) if pic.startswith('<picture>') else '<picture>'+visual+pic+'</picture>'
        cards.append('<article class="card blog-card" data-category="'+html.escape(a.get('category','store'),quote=True)+'">'+pic+'<p>'+html.escape(a.get('categoryLabel','مقالات'))+' · '+html.escape(a.get('date',''))+' · '+minutes+' دقائق</p><h2><a href="/blog/'+slug+'">'+title+'</a></h2><p>'+desc+'</p></article>')
    return ''.join(cards)

def refresh(optimize=False):
    # Keep critical shared styles in the three landing pages in sync.
    shared_css=(ROOT/'assets/site.css').read_text(encoding='utf-8')
    for home in ('index.html','en/index.html','gulf/index.html'):
        page=ROOT/home
        source=page.read_text(encoding='utf-8')
        source=re.sub(r'<!-- shared-css:start -->[\s\S]*?<!-- shared-css:end -->',
                      lambda _: '<!-- shared-css:start --><style>'+shared_css+'</style><!-- shared-css:end -->',
                      source)
        page.write_text(source,encoding='utf-8')
    articles=json.loads((ROOT/'blog/articles.json').read_text(encoding='utf-8'))
    articles_by_slug={a['slug']:a for a in articles}
    designs_file=ROOT/'seo/published-cover-designs.json'
    designs_data=json.loads(designs_file.read_text(encoding='utf-8')) if designs_file.is_file() else {'items':[]}
    designs={entry['slug']:entry for entry in designs_data.get('items',[])}
    if optimize:
        from PIL import Image
        for png in (ROOT/'blog/images').glob('*.png'):
            with Image.open(png) as image:
                image=image.convert('RGB')
                image.save(png.with_suffix('.webp'),'WEBP',quality=90,method=6)
                small=image.copy(); small.thumbnail((640,336))
                small.save(png.with_name(png.stem+'-640.webp'),'WEBP',quality=88,method=6)
    blog=ROOT/'blog/index.html'
    s=blog.read_text(encoding='utf-8')
    s=re.sub(r'<!-- articles:start -->[\s\S]*?<!-- articles:end -->','<!-- articles:start -->'+article_cards(articles,designs)+'<!-- articles:end -->',s)
    blog.write_text(s,encoding='utf-8')
    # Article legibility is a publishing invariant, NOT an image optimization option.
    # The scheduled publisher deliberately calls refresh() without --optimize-images.
    # Always normalize every published guide so new daily articles cannot retain the
    # dark-theme body copy on the redesign's white background.
    for article in (ROOT/'blog').glob('*.html'):
        if article.name in ('index.html', 'article-template.html'):
            continue
        original=article.read_text(encoding='utf-8')
        s=original
        if 'class="art-content"' in s or 'class="article-box"' in s:
            if 'editorial-20261019.css' not in s:
                if '</head>' not in s:
                    raise ValueError('Published article missing </head>: ' + article.name)
                s=s.replace('</head>', '<link rel="stylesheet" href="/assets/editorial-20261019.css?v=2">\n</head>', 1)
        # Enrich only real published cover assets; never manufacture image evidence.
        meta=articles_by_slug.get(article.stem)
        if meta:
            filename=meta.get('image','')
            if re.fullmatch(r'[a-z0-9-]+\.png',filename) and (ROOT/'blog/images'/filename).is_file():
                image_url=BASE+'/blog/images/'+filename
                visible=re.search(r'<img\b[^>]*src="/blog/images/[^"]+"[^>]*alt="([^"]+)"',s,re.I)
                image_alt=html.unescape(visible.group(1)) if visible else meta['title']
                if '</head>' not in s:
                    raise ValueError('Article missing head: '+article.name)
                tags=[]
                if not re.search(r'<meta\s+property="og:image"',s,re.I):
                    tags.append('<meta property="og:image" content="'+html.escape(image_url,quote=True)+'">')
                for name,value in (('og:image:width','1200'),('og:image:height','630'),
                                   ('og:image:alt',image_alt)):
                    if not re.search(r'<meta\s+property="'+re.escape(name)+r'"',s,re.I):
                        tags.append('<meta property="'+name+'" content="'+html.escape(value,quote=True)+'">')
                if not re.search(r'<meta\s+name="twitter:card"',s,re.I):
                    tags.append('<meta name="twitter:card" content="summary_large_image">')
                if not re.search(r'<meta\s+name="twitter:image"',s,re.I):
                    tags.append('<meta name="twitter:image" content="'+html.escape(image_url,quote=True)+'">')
                if tags:
                    s=s.replace('</head>','\n'.join(tags)+'\n</head>',1)
                def add_blogposting_image(match):
                    try:
                        data=json.loads(match.group(2))
                    except json.JSONDecodeError:
                        return match.group(0)
                    if isinstance(data,dict) and data.get('@type')=='BlogPosting' and not data.get('image'):
                        data['image']=image_url
                        return match.group(1)+json.dumps(data,ensure_ascii=False,indent=2)+match.group(3)
                    return match.group(0)
                s=re.sub(r'(<script\b[^>]*type="application/ld\+json"[^>]*>)([\s\S]*?)(</script>)',
                         add_blogposting_image,s,flags=re.I)
        if optimize:
            def picture(m):
                tag=m.group(0)
                source=re.search(r'src="(/blog/images/([^"/?]+)\.png)(?:\?v=[^"]+)?"',tag)
                if not source or not (ROOT/(source.group(1).lstrip('/').replace('.png','.webp'))).exists():
                    return tag
                stem=source.group(2)
                versioned=re.sub(r'src="/blog/images/[^"]+\.png(?:\?v=[^"]+)?"',
                                 lambda _: 'src="'+source.group(1)+COVER_REV+'"', tag)
                return '<picture><source type="image/webp" srcset="/blog/images/'+stem+'-640.webp'+COVER_REV+' 640w, /blog/images/'+stem+'.webp'+COVER_REV+' 1200w" sizes="(max-width:820px) 95vw, 760px">'+versioned+'</picture>'
            # Refresh rather than nesting picture sources on repeated runs.
            s=re.sub(r'<picture>(?:<source\b[^>]*>)+(<img\b[\s\S]*?>)</picture>',r'\1',s)
            s=re.sub(r'<img\b[\s\S]*?>',picture,s)
        design=designs.get(article.stem)
        if design and (ROOT/'blog/images'/design['svg']).is_file():
            alt=html.escape(design['alt'],quote=True)
            caption=html.escape(design['caption'])
            svg_source='<source type="image/svg+xml" srcset="/blog/images/'+design['svg']+'">'
            found=re.search(r'<div class="art-featured">[\s\S]*?</div>',s,re.I)
            if found:
                segment=found.group(0)
                image_match=r'(<img\b[^>]*\bsrc="/blog/images/'+re.escape(article.stem)+r'\.png[^"]*"[^>]*\balt=")[^"]*(")'
                segment=re.sub(image_match,lambda m:m.group(1)+alt+m.group(2),segment,count=1)
                segment=re.sub(r'<source type="image/svg\+xml"[^>]*>','',segment)
                if '<picture>' in segment:
                    segment=segment.replace('<picture>','<picture>'+svg_source,1)
                else:
                    segment=re.sub(r'(<img\b[^>]*\bsrc="/blog/images/'+re.escape(article.stem)+r'\.png[^"]*"[^>]*>)',
                                   lambda m:'<picture>'+svg_source+m.group(1)+'</picture>',segment,count=1)
                segment=re.sub(r'<p class="ko-cover-caption">[\s\S]*?</p>','',segment)
                segment=segment.replace('</div>','<p class="ko-cover-caption">'+caption+'</p></div>',1)
                s=s[:found.start()]+segment+s[found.end():]
            # Some older guides place covers inside <figure> rather than .art-featured.
            # Reinsert SVG after the optional optimization rebuilds PNG/WebP <picture>.
            def restore_svg_sources(m):
                markup=m.group(0)
                if '/blog/images/'+article.stem+'.png' not in markup:
                    return markup
                markup=re.sub(r'<source type="image/svg\+xml"[^>]*>','',markup)
                markup=re.sub(r'<img\b[^>]*>',lambda hit:re.sub(
                    r'\balt="[^"]*"',lambda _: 'alt="'+alt+'"',hit.group(0)),
                    markup,count=1)
                return markup.replace('<picture>','<picture>'+svg_source,1)
            s=re.sub(r'<picture>(?:<source\b[^>]*>)*<img\b[\s\S]*?></picture>',
                     restore_svg_sources,s,flags=re.I)
            for key in ('og:image:alt','twitter:image:alt'):
                tag='<meta '+('property' if key.startswith('og:') else 'name')+'="'+key+'" content="'+alt+'">'
                pat=r'<meta\s+(?:property|name)="'+re.escape(key)+r'"[^>]*>'
                if re.search(pat,s,re.I):
                    s=re.sub(pat,lambda _:tag,s,count=1,flags=re.I)
                else:
                    s=s.replace('</head>',tag+'\n</head>',1)
        if s != original:
            article.write_text(s,encoding='utf-8')
    entries=[]
    languages=[('ar-EG','/'),('ar-SA','/gulf/'),('ar-AE','/gulf/'),('ar-KW','/gulf/'),('en','/en/'),('x-default','/')]
    for path in sorted(ROOT.rglob('*.html')):
        rel=path.relative_to(ROOT).as_posix()
        if rel in ('404.html','blog/article-template.html') or '.git' in rel:continue
        # Invitation-only review entry is crawlable by invitees, but explicitly
        # noindex and must not be put back in the public sitemap by CI.
        source=path.read_text(encoding='utf-8')
        if re.search(r'<meta\s+name=["\x27]robots["\x27][^>]*content=["\x27]\s*noindex\b', source, re.I):continue
        url='/' if rel=='index.html' else '/'+rel[:-10] if rel.endswith('index.html') else '/'+rel[:-5]
        # A fabricated default lastmod is worse than omitting the optional tag.
        # Only an editor-maintained dateModified is suitable evidence here; an
        # article's original publication date is not automatically an edit date.
        changed=None
        if url.startswith('/blog/') and not url.endswith('/'):
            article=next((a for a in articles if a['slug']==url.split('/')[-1]),None)
            if article and re.fullmatch(r'\d{4}-\d{2}-\d{2}',str(article.get('dateModified',''))):
                changed=article['dateModified']
        entry='  <url><loc>'+escape(BASE+url)+'</loc>'
        if changed:
            entry+='<lastmod>'+escape(changed)+'</lastmod>'
        if url.startswith('/blog/') and not url.endswith('/'):
            cover=articles_by_slug.get(url.split('/')[-1],{}).get('image','')
            if re.fullmatch(r'[a-z0-9-]+\.png',cover) and (ROOT/'blog/images'/cover).is_file():
                entry+='<image:image><image:loc>'+escape(BASE+'/blog/images/'+cover)+'</image:loc></image:image>'
            svg=designs.get(url.split('/')[-1],{}).get('svg','')
            if re.fullmatch(r'[a-z0-9-]+\.svg',svg) and (ROOT/'blog/images'/svg).is_file():
                entry+='<image:image><image:loc>'+escape(BASE+'/blog/images/'+svg)+'</image:loc></image:image>'
        if url in ('/','/en/','/gulf/'):
            entry+=''.join('<xhtml:link rel="alternate" hreflang="'+lang+'" href="'+BASE+p+'"/>' for lang,p in languages)
        # Only explicitly approved original illustrations (no scraped imagery).
        for illustration in sorted(set(re.findall(
            r'src="(/assets/visuals/[a-z0-9-]+\.svg)"',source,re.I))):
            if (ROOT/illustration.lstrip('/')).is_file():
                entry+='<image:image><image:loc>'+escape(BASE+illustration)+'</image:loc></image:image>'
        entries.append(entry+'</url>')
    xml='<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n'+'\n'.join(entries)+'\n</urlset>\n'
    (ROOT/'sitemap.xml').write_text(xml,encoding='utf-8')
    print(f'Refreshed {len(entries)} sitemap entries and {len(articles)} static cards')

if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('--optimize-images',action='store_true')
    refresh(parser.parse_args().optimize_images)
