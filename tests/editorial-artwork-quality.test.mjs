import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {buildMarketingCover} from '../scripts/marketing-hook-cover-artwork.mjs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const articles=JSON.parse(read('blog/articles.json'));
const designs=JSON.parse(read('seo/published-cover-designs.json')).items;
const creative=JSON.parse(read('seo/creative-hooks-20261103.json')).items;
const bySlug=new Map(articles.map(a=>[a.slug,a]));
const fromCreative=new Map(creative.map(x=>[x.slug,x]));
const listing=read('blog/index.html'),sitemap=read('sitemap.xml'),version='?v=hook-20261103';
const esc=s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('"','&quot;');
test('ART-01: all published articles have unique reproducible hooks and meaningful vector visuals',()=>{
 assert.ok(articles.length>=32,'retain the 32 reviewed image covers');
 assert.ok(designs.length>=32,'all 32 approved covers must remain');
 assert.equal(creative.length,designs.length);
 assert.equal(new Set(creative.map(x=>x.slug)).size,designs.length);
 const digests=new Set();
 for(const d of designs){
  const article=bySlug.get(d.slug),hook=fromCreative.get(d.slug);
  assert.ok(article&&hook,'missing article or approved hook '+d.slug);
  assert.equal(hook.seoTitle,article.title);
  const asset=read('blog/images/'+d.svg);
  assert.equal(asset,buildMarketingCover(d,hook),'design drift '+d.slug);
  assert.match(asset,/width="1200" height="630"/);
  assert.match(asset,/id="topic-art"/);
  const lineBlock=asset.match(/<g id="hook">([\s\S]*?)<\/g>/)?.[1];
  assert.ok(lineBlock,'visible hook missing '+d.slug);
  const visible=[...lineBlock.matchAll(/<text[^>]*>([^<]+)<\/text>/g)].map(x=>x[1].replaceAll('&amp;','&')).join(' ');
  assert.equal(visible,hook.hook,'the cover must display the agreed concise hook');
  assert.ok((lineBlock.match(/<text /g)||[]).length<=3);
  assert.match(asset,/direction="rtl"/);
  assert.doesNotMatch(asset,/<foreignObject\b|<image\b|<script\b|<use\b|href\s*=|onload\s*=|data:/i);
  assert.doesNotMatch(asset,/بلا أشخاص|بلا بيانات مفبركة|ORIGINAL EDITORIAL VISUAL/);
  const hash=createHash('sha256').update(asset).digest('hex');
  assert.ok(!digests.has(hash),'duplicate cover');
  digests.add(hash);
 }
});
test('ART-02: stable canonical, SEO image naming, social raster fallbacks and honest image ALT',()=>{
 for(const d of designs){
  const art=bySlug.get(d.slug),c=fromCreative.get(d.slug),html=read('blog/'+d.slug+'.html');
  assert.ok(html.includes('rel="canonical" href="https://kun-online.com/blog/'+d.slug+'"'));
  assert.ok(html.includes('srcset="/blog/images/'+d.svg+version+'"'));
  assert.ok(listing.includes('srcset="/blog/images/'+d.svg+version+'"'));
  assert.ok(listing.includes('alt="'+esc(d.alt)+'"'));
  assert.ok(html.includes('alt="'+esc(d.alt)+'"'));
  assert.ok(html.includes('property="og:image" content="https://kun-online.com/blog/images/'+d.png+'"'));
  assert.ok(html.includes('name="twitter:image" content="https://kun-online.com/blog/images/'+d.png+'"'));
  assert.ok(html.includes('"dateModified":"'+art.dateModified+'"')||html.includes('"dateModified": "'+art.dateModified+'"'));
  assert.ok(sitemap.includes('<image:loc>https://kun-online.com/blog/images/'+d.svg+'</image:loc>'));
  assert.ok(sitemap.includes('<image:loc>https://kun-online.com/blog/images/'+d.png+'</image:loc>'));
  assert.ok(existsSync(new URL('../blog/images/'+d.png,import.meta.url)));
  assert.equal(d.alt,c.alt);
  assert.ok(d.alt.length>20 && d.alt.length<150);
 }
});
test('ART-03: future editorial refresh keeps the approved hook artwork and site SEO',()=>{
 const p=read('scripts/refresh_site.py');
 assert.match(p,/VECTOR_REV = '\?v=hook-20261103'/);
 assert.ok(p.includes('published-cover-designs.json'));
 assert.ok(p.includes('def restore_svg_sources'));
 assert.doesNotMatch(p,/dateModified\s*=\s*datetime\.now/);
});
