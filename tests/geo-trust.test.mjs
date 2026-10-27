import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { canonicalLocation, isPrivatePublicPath } from '../_worker.js';

const root = path.resolve(import.meta.dirname, '..');
const read = p => fs.readFileSync(path.join(root,p),'utf8');
const base = 'https://kun-online.com/';
const route = '/methodology/';

const byType = (html, type) => [...html.matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)]
  .map(m => JSON.parse(m[1])).find(schema => schema['@type'] === type);


test('GEO-04: methodology is substantial, visible without JS, and canonical', () => {
  const html = read('methodology/index.html');
  const core = html.match(/<main\b[^>]*>([\s\S]*?)<\/main>/i)?.[1] || '';
  const text = core.replace(/<[^>]+>/g,' ').replace(/&[a-z]+;/gi,' ').trim();
  assert.ok(text.split(/\s+/).length >= 550,'The method page should contain substantive readable explanations');
  assert.equal((html.match(/<h1\b/gi) || []).length,1);
  assert.match(html,/<title>منهج كن أونلاين/);
  assert.match(html,/rel="canonical" href="https:\/\/kun-online\.com\/methodology\/"/);
  assert.match(html,/<meta name="robots" content="index,follow">/);
  assert.match(core,/مصدر البيانات/);
  assert.match(core,/نسبة التسليم/);
  assert.match(core,/هامش المساهمة/);
  assert.match(core,/دراسة حالة موثقة/);
  assert.match(core,/href="\/blog\/real-cost-per-delivered-order"/);
  assert.match(core,/href="\/services\/ecommerce-management\/"/);
  assert.match(core,/https:\/\/wa\.me\/201021231619/);
  assert.match(html,/ميدان الأزهر/);
});

test('GEO-04: published page JSON-LD references canonical organization and website', () => {
  const html = read('methodology/index.html');
  const items = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map(x=>JSON.parse(x[1]));
  const organization = items.find(x=>x['@type']==='Organization');
  const webPage = items.find(x=>x['@type']==='WebPage');
  const breadcrumbs = items.find(x=>x['@type']==='BreadcrumbList');
  assert.equal(organization?.['@id'],base+'#organization');
  assert.equal(webPage?.['@id'],base+'methodology/#page');
  assert.equal(webPage?.isPartOf?.['@id'],base+'#website');
  assert.equal(webPage?.publisher?.['@id'],base+'#organization');
  assert.equal(breadcrumbs?.itemListElement?.at(-1)?.item,base+'methodology/');
  assert.ok(!items.some(x=>['Review','AggregateRating'].includes(x['@type'])));
});

test('GEO-04: canonical redirect and indexability mapping are connected', () => {
  const map=JSON.parse(read('seo/keyword-map.json'));
  const urls=[...read('sitemap.xml').matchAll(/<loc>([^<]+)<\/loc>/g)].map(x=>x[1]);
  assert.equal(map.pages.filter(x=>x.path===route).length,1);
  assert.ok(map.pages.find(x=>x.path===route).primary);
  assert.equal(urls.filter(u=>u===base+'methodology/').length,1);
  assert.equal(canonicalLocation(base+'methodology'),base+'methodology/');
  assert.equal(canonicalLocation(base+'methodology/index.html'),base+'methodology/');
  assert.equal(canonicalLocation(base+'methodology/'),null);
  const redirects=read('_redirects');
  assert.match(redirects,/\/methodology \/methodology\/ 301/);
  assert.match(redirects,/\/methodology\/index\.html \/methodology\/ 301/);
  assert.match(read('about/index.html'),/href="\/methodology\/"/);
  assert.match(read('services/ecommerce-management/index.html'),/href="\/methodology\/"/);
});

test('GEO-04: case-study consent template stays private; review form stays noindex', () => {
  const caseTemplate='docs/geo/case-study-approval-template.md';
  assert.ok(fs.existsSync(path.join(root,caseTemplate)));
  assert.equal(isPrivatePublicPath(base+caseTemplate),true);
  const body=read(caseTemplate);
  for(const s of ['مرجع الموافقة','كل رقم جوهري','لا تُكتب شهادة','محظور'])assert.ok(body.includes(s),s);
  const reviews=read('reviews/index.html');
  assert.match(reviews,/<meta name="robots" content="noindex,follow">/);
  assert.ok(!read('sitemap.xml').includes('<loc>'+base+'reviews/</loc>'));
});


test('GEO-05: three revised guides preserve original dates and provide evidenced quick answers',()=>{
 const registry=JSON.parse(read('blog/articles.json'));
 const expectations=[
  {
   slug:'inventory-barcode-bundle-tracking',original:'2026-10-15',
   source:'https://help.shopify.com/en/manual/products/details/sku',
   secondary:'https://help.shopify.com/en/manual/inventory-and-locations/adjusting-inventory'
  },
  {
   slug:'customer-funnel-guide',original:'2026-08-29',
   source:'https://support.google.com/analytics/answer/9327974?hl=en'
  },
  {
   slug:'product-profitability-before-launch',original:'2026-10-25',
   source:'https://help.shopify.com/en/manual/products/details/product-details-page/'
  }
 ];
 for(const e of expectations){
  const item=registry.find(x=>x.slug===e.slug);
  assert.ok(item,e.slug+' missing registry record');
  assert.equal(item.dateISO,e.original,e.slug+' original published date must not be changed');
  assert.equal(item.dateModified,'2026-10-27',e.slug+' changed content must have real revision date');
  const html=read('blog/'+e.slug+'.html');
  const posting=byType(html,'BlogPosting');
  assert.ok(posting,e.slug+' missing BlogPosting');
  assert.equal(posting.datePublished,e.original,e.slug);
  assert.equal(posting.dateModified,item.dateModified,e.slug);
  assert.equal(posting.wordCount,item.wordCount,e.slug);
  assert.equal(posting.timeRequired,'PT'+item.readTime+'M',e.slug);
  assert.match(html,/الإجابة المختصرة:/,e.slug+' answer-first paragraph missing');
  assert.ok(html.includes('href="'+e.source+'"'),e.slug+' primary official reference missing');
  if(e.secondary)assert.ok(html.includes('href="'+e.secondary+'"'),e.slug+' second official reference missing');
  assert.ok(read('sitemap.xml').includes('<loc>https://kun-online.com/blog/'+e.slug+'</loc><lastmod>2026-10-27</lastmod>'));
 }
});
