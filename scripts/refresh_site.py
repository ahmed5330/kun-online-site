#!/usr/bin/env python3
"""Refresh crawlable article cards, metadata and sitemap without publishing content."""
import argparse, html, json, re
from pathlib import Path
from xml.sax.saxutils import escape

ROOT = Path(__file__).resolve().parent.parent
BASE = 'https://kun-online.com'
# Version static cover URLs to bypass cached malformed RTL graphics.
COVER_REV = '?v=rtl-raqm-20261019'

def article_cards(articles):
    cards=[]
    for a in articles:
        slug=html.escape(a['slug'],quote=True)
        title=html.escape(a['title'])
        desc=html.escape(a.get('description') or a.get('excerpt',''))
        minutes=re.search(r'\d+',str(a.get('readTime',5)))
        minutes=minutes.group(0) if minutes else '5'
        # Backgrounds no longer eagerly download every full-size PNG.
        image=a.get('image','')
        pic=''
        if image and (ROOT/'blog/images'/image).exists():
            stem=Path(image).stem
            pic='<picture><source type="image/webp" srcset="/blog/images/'+stem+'-640.webp'+COVER_REV+' 640w, /blog/images/'+stem+'.webp'+COVER_REV+' 1200w" sizes="(max-width:600px) 90vw, 330px"><img src="/blog/images/'+html.escape(image,quote=True)+COVER_REV+'" alt="'+html.escape(a['title'],quote=True)+'" width="1200" height="630" loading="lazy" decoding="async"></picture>' if (ROOT/'blog/images'/(stem+'.webp')).exists() else '<img src="/blog/images/'+html.escape(image,quote=True)+'" alt="'+html.escape(a['title'],quote=True)+'" width="1200" height="630" loading="lazy" decoding="async">'
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
    s=re.sub(r'<!-- articles:start -->[\s\S]*?<!-- articles:end -->','<!-- articles:start -->'+article_cards(articles)+'<!-- articles:end -->',s)
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
                s=s.replace('</head>', '<link rel="stylesheet" href="/assets/editorial-20261019.css?v=1">\\n</head>', 1)
        if optimize:
            def picture(m):
                tag=m.group(0)
                source=re.search(r'src="(/blog/images/([^"/?]+)\\.png)(?:\\?v=[^"]+)?"',tag)
                if not source or not (ROOT/(source.group(1).lstrip('/').replace('.png','.webp'))).exists():
                    return tag
                stem=source.group(2)
                versioned=re.sub(r'src="/blog/images/[^"]+\\.png(?:\\?v=[^"]+)?"',
                                 lambda _: 'src="'+source.group(1)+COVER_REV+'"', tag)
                return '<picture><source type="image/webp" srcset="/blog/images/'+stem+'-640.webp'+COVER_REV+' 640w, /blog/images/'+stem+'.webp'+COVER_REV+' 1200w" sizes="(max-width:820px) 95vw, 760px">'+versioned+'</picture>'
            # Refresh rather than nesting picture sources on repeated runs.
            s=re.sub(r'<picture><source\\b[^>]*>(<img\\b[\\s\\S]*?>)</picture>',r'\\1',s)
            s=re.sub(r'<img\\b[\\s\\S]*?>',picture,s)
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
        if url in ('/','/en/','/gulf/'):
            entry+=''.join('<xhtml:link rel="alternate" hreflang="'+lang+'" href="'+BASE+p+'"/>' for lang,p in languages)
        entries.append(entry+'</url>')
    xml='<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n'+'\n'.join(entries)+'\n</urlset>\n'
    (ROOT/'sitemap.xml').write_text(xml,encoding='utf-8')
    print(f'Refreshed {len(entries)} sitemap entries and {len(articles)} static cards')

if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('--optimize-images',action='store_true')
    refresh(parser.parse_args().optimize_images)
