import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {canonicalLocation} from '../_worker.js';
const root = path.resolve(import.meta.dirname, '..');
function all(dir) {return fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.name==='.git'?[]:e.isDirectory()?all(path.join(dir,e.name)):[path.join(dir,e.name)]);}
const pages = all(root).filter(p=>p.endsWith('.html')&&!p.endsWith('article-template.html'));
test('all intended pages have one self canonical, title, description and H1',()=>{
  for(const p of pages){
    const s=fs.readFileSync(p,'utf8');
    assert.equal((s.match(/<h1\b/g)||[]).length,1,p);
    assert.equal((s.match(/rel="canonical"/g)||[]).length,1,p);
    assert.match(s,/<title>[^<]+<\/title>/,p);
    assert.match(s,/<meta name="description" content="[^"]+"/,p);
    assert.doesNotMatch(s,/sites\.google\.com|www\.kun-online\.com|201559439118|\{\{/,p);
    let rel=path.relative(root,p).replaceAll('\\','/');
    let suffix=rel==='index.html'?'/':rel.endsWith('index.html')?'/'+rel.slice(0,-10):'/'+rel.slice(0,-5);
    assert.ok(s.includes(`rel="canonical" href="https://kun-online.com${suffix}"`),p);
    for(const json of s.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g))JSON.parse(json[1]);
  }
});
test('phone and organization are consistent and old contact never remains',()=>{
  for(const p of pages){const s=fs.readFileSync(p,'utf8');assert.match(s,/tel:\+201021231619/,p);assert.match(s,/wa\.me\/201021231619/,p);assert.match(s,/ميدان الأزهر/,p);}
});
test('blog links remain available without JavaScript',()=>{
  const s=fs.readFileSync(path.join(root,'blog/index.html'),'utf8');
  const articles=JSON.parse(fs.readFileSync(path.join(root,'blog/articles.json'),'utf8'));
  for(const a of articles){assert.ok(s.includes(`href="/blog/${a.slug}"`),a.slug);assert.ok(fs.existsSync(path.join(root,'blog',a.slug+'.html')));}
});
test('relative internal links point at real pages or assets',()=>{
  for(const p of pages){const s=fs.readFileSync(p,'utf8');for(const m of s.matchAll(/href="(\/[^"#?]*)(?:[?#][^"]*)?"/g)){
    const target=path.join(root,decodeURIComponent(m[1]));
    assert.ok(fs.existsSync(target)||fs.existsSync(target+'.html')||fs.existsSync(path.join(target,'index.html')),`${p}: ${m[1]}`);
  }}
});
test('language annotations are reciprocal and exclude unrelated blog home',()=>{
  for(const p of ['index.html','en/index.html','gulf/index.html']){
    const s=fs.readFileSync(path.join(root,p),'utf8');
    for(const lang of ['ar-EG','ar-SA','ar-AE','ar-KW','en','x-default'])assert.ok(s.includes(`hreflang="${lang}"`));
  }
  assert.doesNotMatch(fs.readFileSync(path.join(root,'blog/index.html'),'utf8'),/hreflang="en"/);
});
test('canonical redirects preserve paths and queries with no loops',()=>{
  for(const [source,target] of [
    ['https://www.kun-online.com/blog?utm_source=test','https://kun-online.com/blog/?utm_source=test'],
    ['http://www.kun-online.com/services/ecommerce-ads','https://kun-online.com/services/ecommerce-ads/'],
    ['https://kun-online.com/en/index.html','https://kun-online.com/en/'],
    ['https://kun-online.com/blog/what-is-ecommerce.html?q=1','https://kun-online.com/blog/what-is-ecommerce?q=1'],
    ['https://www.kun-online.com/الصفحة-الرئيسية_1?x=2','https://kun-online.com/?x=2'],
    ['https://kun-online.com/blog/what-is-ecommerce/','https://kun-online.com/blog/what-is-ecommerce']
  ]){assert.equal(canonicalLocation(source),target);assert.equal(canonicalLocation(target),null);}
  assert.equal(canonicalLocation('https://preview.pages.dev/blog/'),null);
  assert.equal(canonicalLocation('https://kun-online.com/api/not-found'),null);
});
test('all intended pages are in the sitemap and template is excluded',()=>{
  const s=fs.readFileSync(path.join(root,'sitemap.xml'),'utf8');
  assert.doesNotMatch(s,/https:\/\/www\.kun-online\.com|article-template|<loc>[^<]*404/);
  for(const p of pages.filter(p=>!p.endsWith('404.html'))){const html=fs.readFileSync(p,'utf8');const url=html.match(/rel="canonical" href="([^"]+)"/)[1];assert.ok(s.includes(`<loc>${url}</loc>`),p);}
});
