import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {buildSVG} from '../scripts/editorial-cover-artwork.mjs';
const root=new URL('..',import.meta.url);
const read=p=>readFileSync(new URL(p,root),'utf8');
const designs=JSON.parse(read('seo/published-cover-designs.json')).items;
const articles=JSON.parse(read('blog/articles.json'));
const lookup=new Map(articles.map(a=>[a.slug,a]));
const index=read('blog/index.html');
const sitemap=read('sitemap.xml');
const version='?v=illustrated-20261031';

test('ART-01: one individually composed vector per published article, reproducible and no text-rendering defects',()=>{
 assert.equal(designs.length,29);
 const signatures=new Set();
 for(const [i,s] of designs.entries()){
  const article=lookup.get(s.slug);
  assert.ok(article,'unregistered article '+s.slug);
  const asset=read('blog/images/'+s.svg);
  const expected=buildSVG({...s,index:i,title:article.title});
  assert.equal(asset,expected,'bespoke illustration generation drift '+s.slug);
  assert.match(asset,/^<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg" width="1200" height="630"/);
  assert.match(asset,/<title id="title">/);
  assert.match(asset,/<desc id="desc">/);
  assert.doesNotMatch(asset,/<text\b|font-family|<foreignObject\b|<image\b|<script\b|<use\b|href\s*=|onload\s*=|data:/i,'no external fonts, overlays, embeds or scripts');
  assert.doesNotMatch(asset,/بلا أشخاص|بلا بيانات مفبركة|ORIGINAL EDITORIAL VISUAL/,'internal design notes stay internal');
  const digest=createHash('sha256').update(asset).digest('hex');
  assert.ok(!signatures.has(digest),'duplicate artwork: '+s.slug);
  signatures.add(digest);
  assert.ok(asset.length>1700 && asset.length<18000,'unexpected vector complexity');
 }
});

test('ART-02: Google-friendly stable page URLs, SVG picture and PNG/WebP fallbacks without invented modification dates',()=>{
 for(const s of designs){
  const article=lookup.get(s.slug);
  const html=read('blog/'+s.slug+'.html');
  const svg='/blog/images/'+s.svg;
  assert.ok(html.includes('srcset="'+svg+version+'"'),'new illustration not loaded: '+s.slug);
  assert.ok(index.includes('srcset="'+svg+version+'"'),'new article card image not loaded: '+s.slug);
  assert.ok(html.includes('<img src="/blog/images/'+s.png),'native img fallback required: '+s.slug);
  assert.ok(html.includes('rel="canonical" href="https://kun-online.com/blog/'+s.slug+'"'),'article canonical not stable');
  assert.ok(html.includes('property="og:image" content="https://kun-online.com/blog/images/'+s.png+'"'),'social fallback missing');
  assert.ok(html.includes('name="twitter:image" content="https://kun-online.com/blog/images/'+s.png+'"'),'twitter fallback missing');
  assert.ok(sitemap.includes('<image:loc>https://kun-online.com/blog/images/'+s.svg+'</image:loc>'));
  assert.ok(sitemap.includes('<image:loc>https://kun-online.com/blog/images/'+s.png+'</image:loc>'));
  assert.ok(existsSync(new URL('blog/images/'+s.png,root)),'original raster file disappeared');
  assert.ok(html.includes('alt="'+s.alt.replaceAll('&','&amp;').replaceAll('"','&quot;')+'"'));
  assert.ok(html.includes('"dateModified":"'+article.dateModified+'"')||html.includes('"dateModified": "'+article.dateModified+'"'),'no invented editorial dates');
 }
});

test('ART-03: the publisher preserves the art and never stamps every existing article as new',()=>{
 const refresh=read('scripts/refresh_site.py');
 assert.match(refresh,/VECTOR_REV = '\?v=illustrated-20261031'/);
 assert.match(refresh,/published-cover-designs\.json/);
 assert.match(refresh,/def restore_svg_sources/);
 assert.doesNotMatch(refresh,/dateModified\s*=\s*datetime\.now/);
 const generator=read('scripts/editorial-cover-artwork.mjs');
 for(const a of articles) assert.ok(generator.includes("'"+a.slug+"'"),'missing original storyboard '+a.slug);
});
