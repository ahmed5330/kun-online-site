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
test('WhatsApp-only contact and organization are consistent',()=>{
  for(const p of pages){const s=fs.readFileSync(p,'utf8');assert.doesNotMatch(s,/tel:|mailto:/,p);assert.match(s,/wa\.me\/201021231619/,p);assert.match(s,/ميدان الأزهر/,p);}
});
test('public pages show WhatsApp contact without rendering the phone number',()=>{
  for(const p of [...pages,path.join(root,'blog/article-template.html')]){
    const s=fs.readFileSync(p,'utf8');
    const withoutWhatsAppDestination=s.replaceAll('https://wa.me/201021231619','');
    assert.doesNotMatch(withoutWhatsAppDestination,/01021231619/,p);
    assert.doesNotMatch(s,/href="tel:/i,p);
  }
  const contact=fs.readFileSync(path.join(root,'contact/index.html'),'utf8');
  assert.match(contact,/>تواصل عبر واتساب<|>افتح محادثة واتساب</);
});
test('landing pages keep contact details in footer, not above navigation',()=>{
  for(const relativePath of ['index.html','en/index.html','gulf/index.html']){
    const html=fs.readFileSync(path.join(root,relativePath),'utf8');
    assert.match(html,/<body>\s*<!-- NAV -->/,relativePath);
    assert.doesNotMatch(html,/site-phone-strip/,relativePath);
    const footer=html.split('<footer>')[1]?.split('</footer>')[0];
    assert.ok(footer,relativePath);
    assert.match(footer,/https:\/\/wa\.me\/201021231619/,relativePath);
    assert.match(footer,/href="\/services\//,relativePath);
    assert.match(footer,/href="\/about\//,relativePath);
    assert.match(footer,/href="\/contact\//,relativePath);
    assert.match(footer,relativePath==='en/index.html'?/Egypt — Asyut — Al-Azhar Square/:/مصر — أسيوط — ميدان الأزهر/,relativePath);
  }
});
test('Kun Commerce OS marketing content is reachable and consistent',()=>{
  const system=fs.readFileSync(path.join(root,'system/index.html'),'utf8');
  assert.match(system,/rel="canonical" href="https:\/\/kun-online\.com\/system\/"/);
  assert.match(system,/https:\/\/app\.kun-online\.com\/v2\//);
  for(const p of ['index.html','en/index.html','gulf/index.html']){
    const html=fs.readFileSync(path.join(root,p),'utf8');
    assert.match(html,/id="kun-system"/,p);
    assert.match(html,/href="\/system\/"/,p);
    assert.match(html,/href="\/assets\/system\.css"/,p);
    const footer=html.split('<footer>')[1]||'';
    assert.match(footer,/href="\/system\/"/,p);
  }
  assert.match(fs.readFileSync(path.join(root,'_redirects'),'utf8'),/\/system \/system\/ 301/);
  assert.match(fs.readFileSync(path.join(root,'sitemap.xml'),'utf8'),/https:\/\/kun-online\.com\/system\//);
});
test('Commerce OS does not interrupt the primary service narrative',()=>{
  for(const name of ['index.html','en/index.html','gulf/index.html']){
    const html=fs.readFileSync(path.join(root,name),'utf8');
    const pos=(tag)=>html.indexOf(tag);
    const required=['<!-- SERVICES -->','<!-- PACKAGES -->','<!-- FAQ -->','<!-- KUN COMMERCE OS -->','<!-- CTA BAND -->'];
    const offsets=required.map(pos);
    assert.ok(offsets.every((n,i)=>n>=0&&(i===0||n>offsets[i-1])),name);
    if(name!=='gulf/index.html'){
      assert.ok(pos('<!-- TESTIMONIALS -->')<pos('<!-- KUN COMMERCE OS -->'),name);
      assert.ok(pos('<!-- APPROACH -->')<pos('<!-- WHY -->'),name);
    }
    assert.equal(html.split('id="kun-system"').length-1,1,name);
  }
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
test('hreflang URLs are exact, reciprocal and align with sitemap',()=>{
  const expected={
    'ar-EG':'https://kun-online.com/',
    'ar-SA':'https://kun-online.com/gulf/',
    'ar-AE':'https://kun-online.com/gulf/',
    'ar-KW':'https://kun-online.com/gulf/',
    'en':'https://kun-online.com/en/',
    'x-default':'https://kun-online.com/'
  };
  const xml=fs.readFileSync(path.join(root,'sitemap.xml'),'utf8');
  for(const page of ['index.html','en/index.html','gulf/index.html']){
    const html=fs.readFileSync(path.join(root,page),'utf8');
    const links=[...html.matchAll(/<link rel="alternate" hreflang="([^"]+)" href="([^"]+)">/g)];
    assert.equal(links.length,6,page);
    assert.deepEqual(Object.fromEntries(links.map(m=>[m[1],m[2]])),expected,page);
    const canonical=html.match(/rel="canonical" href="([^"]+)"/)?.[1];
    assert.ok(Object.values(expected).includes(canonical),page);
    const entry=[...xml.matchAll(/<url>([\s\S]*?)<\/url>/g)].find(m=>m[1].includes('<loc>'+canonical+'</loc>'))?.[1];
    assert.ok(entry,'sitemap missing locale: '+page);
    for(const [lang,url] of Object.entries(expected)){
      assert.ok(entry.includes('hreflang="'+lang+'" href="'+url+'"'),'sitemap hreflang mismatch: '+lang+' '+page);
    }
  }
});

test('canonical redirects preserve paths and queries with no loops',()=>{
  for(const [source,target] of [
    ['https://www.kun-online.com/blog?utm_source=test','https://kun-online.com/blog/?utm_source=test'],
    ['http://www.kun-online.com/services/ecommerce-ads','https://kun-online.com/services/ecommerce-ads/'],
    ['https://kun-online.com/en/index.html','https://kun-online.com/en/'],
    ['https://kun-online.com/system','https://kun-online.com/system/'],
    ['https://kun-online.com/system/index.html','https://kun-online.com/system/'],
    ['http://www.kun-online.com/system?source=seo','https://kun-online.com/system/?source=seo'],
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


test('sitemap uses verified editorial lastmod dates and no fabricated defaults',()=>{
  const xml=fs.readFileSync(path.join(root,'sitemap.xml'),'utf8');
  const articles=JSON.parse(fs.readFileSync(path.join(root,'blog/articles.json'),'utf8'));
  const mapped=new Map(articles.map(a=>[a.slug,a.dateModified]));
  const entries=[...xml.matchAll(/<url>([\s\S]*?)<\/url>/g)].map(x=>x[1]);
  assert.equal(entries.length,25);
  for(const entry of entries){
    const url=entry.match(/<loc>([^<]+)<\/loc>/)?.[1];
    const lastmod=entry.match(/<lastmod>([^<]+)<\/lastmod>/)?.[1];
    assert.ok(url?.startsWith('https://kun-online.com/'),entry);
    const slug=url?.split('/blog/')[1];
    if(slug&&mapped.has(slug)){
      assert.equal(lastmod,mapped.get(slug),url);
      assert.match(lastmod,/^\d{4}-\d{2}-\d{2}$/);
    }else{
      assert.equal(lastmod,undefined,'non-article dates must have an explicit editorial source: '+url);
    }
  }
});
test('pages expose main content and defer optional font styles without fake testimonials',()=>{
  for(const p of pages){const s=fs.readFileSync(p,'utf8');assert.match(s,/<main\b/,p);const active=s.replace(/<noscript>[\s\S]*?<\/noscript>/g,'');for(const font of active.matchAll(/<link\b[^>]*fonts\.googleapis[^>]*>/g)){if(font[0].includes('stylesheet'))assert.match(font[0],/media="print"/,p);} }
  for(const home of ['index.html','en/index.html','gulf/index.html']){const s=fs.readFileSync(path.join(root,home),'utf8');assert.doesNotMatch(s,/class="tstars"|<em>150<\/em>|8\+ Years of Field Experience/);}
});

test('article template uses crawlable noindex instead of conflicting robots block',()=>{
  const robots=fs.readFileSync(path.join(root,'robots.txt'),'utf8');
  const template=fs.readFileSync(path.join(root,'blog/article-template.html'),'utf8');
  assert.doesNotMatch(robots,/Disallow:\s*\/blog\/article-template\.html/);
  assert.match(template,/<meta name="robots" content="noindex, follow">/);
  assert.match(robots,/Sitemap:\s*https:\/\/kun-online\.com\/sitemap\.xml/);
  assert.doesNotMatch(robots,/Disallow:\s*\/assets\//);
});

test('keyword targeting map covers every indexable URL and separates software from agency',()=>{
  const map=JSON.parse(fs.readFileSync(path.join(root,'seo/keyword-map.json'),'utf8'));
  assert.equal(map.metricsAvailable,false,'Do not invent GSC, demand, CPC, or keyword difficulty');
  const intended=pages.filter(p=>!p.endsWith('404.html')).map(p=>{
    const html=fs.readFileSync(p,'utf8');
    return new URL(html.match(/rel="canonical" href="([^"]+)"/)[1]).pathname;
  });
  const listed=map.pages.map(p=>p.path);
  assert.equal(new Set(listed).size,listed.length,'duplicate URL targeting');
  assert.deepEqual([...listed].sort(),intended.sort(),'all indexable pages must be mapped exactly once');
  assert.ok(map.pages.every(p=>p.primary&&p.secondary.length&&p.intent&&p.priority));
  assert.equal(map.pages.find(p=>p.path==='/system/').pillar,'software');
  assert.equal(map.pages.find(p=>p.path==='/services/order-management/').pillar,'agency');
});

test('store-management service explains deliverables, KPIs, and service-vs-software intent',()=>{
  const html=fs.readFileSync(path.join(root,'services/ecommerce-management/index.html'),'utf8');
  assert.match(html,/إمتى تحتاج شركة لإدارة متجرك الإلكتروني؟/);
  assert.match(html,/ماذا تشمل خدمة إدارة المتاجر الإلكترونية؟/);
  assert.match(html,/الأرقام اللي لازم نقيسها بوضوح/);
  assert.match(html,/إدارة المتجر كخدمة ولا سيستم/);
  assert.match(html,/href="\/system\/"/);
  assert.match(html,/href="\/services\/order-management\/"/);
  assert.match(html,/href="\/pricing\/"/);
  assert.match(html,/https:\/\/wa\.me\/201021231619/);
});
