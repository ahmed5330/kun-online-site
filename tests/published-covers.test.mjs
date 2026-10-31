import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {join} from 'node:path';

const root=new URL('..',import.meta.url);
const read=p=>readFileSync(new URL(p,root),'utf8');
const articles=JSON.parse(read('blog/articles.json'));
const designs=JSON.parse(read('seo/published-cover-designs.json'));
const bySlug=new Map(articles.map(a=>[a.slug,a]));
const list=read('blog/index.html'),map=read('sitemap.xml');
const attr=s=>String(s).replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;');

test('COVER-01: all approved original designs are unique, per-published-article and editorially descriptive',()=>{
 assert.equal(designs.schemaVersion,1);
 assert.equal(designs.items.length,29,'29 pre-existing approved guides are in this audited batch');
 assert.equal(new Set(designs.items.map(d=>d.slug)).size,designs.items.length);
 assert.equal(new Set(designs.items.map(d=>d.alt)).size,designs.items.length);
 for(const d of designs.items){
   assert.ok(bySlug.has(d.slug),'missing registered article '+d.slug);
   assert.equal(d.svg,d.slug+'.svg');
   assert.equal(d.png,d.slug+'.png');
   assert.ok(d.alt.length>20&&d.alt.length<150);
   assert.ok(d.focusKeyword.length>10);
   assert.ok(!('caption' in d),'internal production notes must not be image captions');
   assert.doesNotMatch(d.alt,/بلا أشخاص|بلا بيانات|لمقال/,'ALT must describe the visual, not instructions');
 }
});

test('COVER-02: all new published vectors are original geometry, without photos, remote content or active SVG',()=>{
 for(const d of designs.items){
  const svg=read('blog/images/'+d.svg);
  assert.match(svg,/^<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg"[^>]+width="1200" height="630"/);
  assert.match(svg,/<title id="title">/);
  assert.match(svg,/<desc id="desc">/);
  assert.match(svg,/<rect\b/);
  assert.doesNotMatch(svg,/<(?:image|script|foreignObject|iframe|use)\b|\bonload=|\bonerror=|\bhref=|\bdata:/i);
  assert.ok(svg.includes(attr(d.alt)),'SVG title/description discrepancy '+d.slug);
  assert.doesNotMatch(svg, /<text[^>]*>(?:رسوم توضيحية|KUN ONLINE · ORIGINAL EDITORIAL VISUAL)/,'No internal footer in the image itself');
  assert.doesNotMatch(svg,/بلا أشخاص|بلا بيانات مفبركة|ORIGINAL EDITORIAL VISUAL|ليس بيانات فعلية/,
   'No private design instructions embedded in visible artwork');
  assert.ok(existsSync(new URL('blog/images/'+d.png,root)),'keep canonical legacy PNG '+d.slug);
 }
});

test('COVER-03: every article keeps truthful ALT, clean visuals, and compatible PNG sharing',()=>{
 for(const d of designs.items){
  const html=read('blog/'+d.slug+'.html');
  const source='<source type="image/svg+xml" srcset="/blog/images/'+d.svg+'?v=editorial-clean-20261031">';
  assert.ok(html.includes(source),'missing original vector in article '+d.slug);
  const hero=[...html.matchAll(/<picture>([\s\S]*?)<\/picture>/gi)].find(x=>x[0].includes(d.svg));
  assert.ok(hero,'missing vector + fallback picture '+d.slug);
  assert.ok(hero[0].includes('/blog/images/'+d.png),'PNG fallback removed '+d.slug);
  assert.ok(hero[0].includes('alt="'+attr(d.alt)+'"'),'ALT not specific to graphic '+d.slug);
  assert.doesNotMatch(html, /class="ko-cover-caption"|بلا بيانات مفبركة|ليس بيانات فعلية عن متجر/,
   'No image-production notes shown to readers: '+d.slug);
  for(const [field,key] of [['property','og:image:alt'],['name','twitter:image:alt']]){
   assert.ok(html.includes('<meta '+field+'="'+key+'" content="'+attr(d.alt)+'">'),'social image alt '+key+' '+d.slug);
  }
  const imageUrl='https://kun-online.com/blog/images/'+d.png;
  assert.ok(html.includes('property="og:image" content="'+imageUrl+'"'));
  assert.ok(html.includes('name="twitter:image" content="'+imageUrl+'"'));
  assert.ok(html.includes('"image": "'+imageUrl+'"')||html.includes('"image":"'+imageUrl+'"'),
    'retained safe raster BlogPosting.image '+d.slug);
 }
});

test('COVER-04: editorial listing and sitemap enumerate every approved vector and legacy raster',()=>{
 for(const d of designs.items){
  assert.ok(list.includes('<source type="image/svg+xml" srcset="/blog/images/'+d.svg+'?v=editorial-clean-20261031">'),'missing listing SVG '+d.slug);
  assert.ok(list.includes('alt="'+attr(d.alt)+'"'),'missing listing ALT '+d.slug);
  assert.ok(map.includes('<image:loc>https://kun-online.com/blog/images/'+d.svg+'</image:loc>'));
  assert.ok(map.includes('<image:loc>https://kun-online.com/blog/images/'+d.png+'</image:loc>'));
 }
});

test('COVER-05: next editorial refresh retains image SEO without changing canonicals or inventing keyword tags',()=>{
 const source=read('scripts/refresh_site.py');
 assert.ok(source.includes('seo/published-cover-designs.json'));
 assert.ok(source.includes('def restore_svg_sources('));
 assert.ok(source.includes("source type=\"image/svg+xml\""));
 assert.doesNotMatch(read('seo/published-cover-designs.json'),/\bmeta keywords\b/i);
});
