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


test('GEO-05: foundational guides preserve source-backed claims and editorial registry parity', () => {
  const registry = JSON.parse(read('blog/articles.json'));
  const plan = JSON.parse(read('seo-content-map.json'));
  const guides = [
    {slug:'ecommerce-complete-journey-guide', original:'2026-08-26',
      ref:'https://help.shopify.com/en/manual/intro-to-shopify/initial-setup/setup-prepare-for-launch'},
    {slug:'common-ecommerce-beginner-mistakes', original:'2026-08-28',
      ref:'https://help.shopify.com/en/manual/intro-to-shopify/initial-setup/setup-prepare-for-launch'},
    {slug:'ecommerce-funnel-explained', original:'2026-08-30',
      ref:'https://developers.google.com/analytics/devguides/collection/ga4/ecommerce'}
  ];
  for (const g of guides) {
    const meta = registry.find(item => item.slug === g.slug);
    const mapped = plan.queue.find(item => item.slug === g.slug);
    const html = read('blog/' + g.slug + '.html');
    const posting = byType(html, 'BlogPosting');
    assert.ok(meta && mapped && posting, g.slug + ' must remain published and mapped');
    assert.equal(meta.dateISO, g.original, g.slug + ' original publication date');
    assert.equal(posting.datePublished, g.original, g.slug + ' original schema publication date');
    assert.equal(meta.dateModified, '2026-10-27', g.slug + ' source revision date');
    assert.equal(posting.dateModified, meta.dateModified, g.slug + ' schema revision parity');
    assert.equal(posting.wordCount, meta.wordCount, g.slug + ' schema wordcount parity');
    assert.equal(mapped.word_count, meta.wordCount, g.slug + ' 100-topic registry parity');
    assert.equal(posting.timeRequired, 'PT' + meta.readTime + 'M', g.slug + ' reading time');
    assert.match(html, /الإجابة المختصرة:/, g.slug + ' must explain direct answer');
    assert.ok(html.includes('href="' + g.ref + '"'), g.slug + ' official reference required');
    assert.ok(read('sitemap.xml').includes('<loc>https://kun-online.com/blog/' + g.slug + '</loc><lastmod>2026-10-27</lastmod>'));
  }
  const mistakes = read('blog/common-ecommerce-beginner-mistakes.html');
  assert.doesNotMatch(mistakes, /بناءً على سنين من إدارة المتاجر والملاحظة المباشرة/);
  assert.doesNotMatch(mistakes, /ابدأ بـ 20-50 قطعة فقط/);
  assert.match(mistakes, /لا يوجد عدد قطع ثابت يصلح لجميع المنتجات/);
  const funnel = read('blog/ecommerce-funnel-explained.html');
  assert.match(funnel, /مثال تعليمي افتراضي/);
});


test('GEO accuracy: beginner and channel guides do not publish fabricated fixed marketplace fees',()=>{
 const registry=JSON.parse(read('blog/articles.json'));
 const map=JSON.parse(read('seo-content-map.json'));
 const cases=[
  {slug:'ecommerce-complete-journey-guide',original:'2026-08-26',count:1684,minutes:10,lastmod:'2026-10-27'},
  {slug:'owned-vs-rented-channels',original:'2026-09-01',count:1805,minutes:11,lastmod:'2026-10-28'}
 ];
 for(const entry of cases){
  const item=registry.find(x=>x.slug===entry.slug);
  const published=map.queue.find(x=>x.slug===entry.slug);
  const html=read('blog/'+entry.slug+'.html');
  const schema=byType(html,'BlogPosting');
  assert.ok(item&&published&&schema,entry.slug);
  assert.equal(item.dateISO,entry.original);
  assert.equal(schema.datePublished,entry.original);
  assert.equal(item.dateModified,entry.lastmod);
  assert.equal(schema.dateModified,item.dateModified);
  assert.equal(item.wordCount,entry.count);
  assert.equal(published.word_count,entry.count);
  assert.equal(schema.wordCount,entry.count);
  assert.equal(item.readTime,entry.minutes);
  assert.equal(schema.timeRequired,'PT'+entry.minutes+'M');
  assert.ok(html.includes('href="https://www.shopify.com/pricing"'),
   'Official current plan reference required');
  assert.ok(read('sitemap.xml').includes('<loc>https://kun-online.com/blog/'+entry.slug+'</loc><lastmod>'+entry.lastmod+'</lastmod>'));
  assert.ok(!html.includes('trial مجاني 3 شهور'),'Outdated free-trial claim');
  assert.ok(!html.includes('750 إلى 3000 جنيه'),'Misleading outdated FX conversion');
 }
 const primer=read('blog/ecommerce-complete-journey-guide.html');
 for(const stale of ['2.49% (الأسرع','10-25 جنيه بين المدن','أنت قدام بـ 80%','3-6 شهور لحتى تشوف','ROAS أقل من 2x','عمولة 15-30% من السعر'])
  assert.ok(!primer.includes(stale),'Unsupported guarantee/rate '+stale);
 const compare=read('blog/owned-vs-rented-channels.html');
 for(const stale of ['15% إلى 45% حسب فئة','29 دولار للخطة الأساسية','بين 750 إلى 3000 جنيه','أقل من 5000 جنيه'])
  assert.ok(!compare.includes(stale),'Unsupported regional price '+stale);
});


test('GEO editorial: latest authorial explanations link to primary sources and preserve true dates',()=>{
  const registry=JSON.parse(read('blog/articles.json'));
  const plan=JSON.parse(read('seo-content-map.json'));
  const items=[
    {slug:'essential-ecommerce-glossary',date:'2026-08-31',count:1682,mins:10,source:'https://developers.google.com/analytics/devguides/collection/ga4/validate-ecommerce'},
    {slug:'brand-vs-product-business',date:'2026-09-02',count:1738,mins:11,source:'https://www.wipo.int/ar/web/trademarks'},
    {slug:'product-marketing-operations-ecommerce',date:'2026-08-28',count:1615,mins:10,source:'https://developers.google.com/analytics/devguides/collection/ga4/ecommerce'}
  ];
  for(const q of items){
    const row=registry.find(x=>x.slug===q.slug),mapped=plan.queue.find(x=>x.slug===q.slug);
    const html=read('blog/'+q.slug+'.html');
    const posting=byType(html,'BlogPosting');
    assert.ok(row&&mapped&&posting,'missing editorial article '+q.slug);
    assert.equal(row.dateISO,q.date,'original publication must remain unchanged');
    assert.equal(posting.datePublished,row.dateISO,'schema publication date');
    assert.equal(row.dateModified,'2026-10-28','actual revision date');
    assert.equal(posting.dateModified,row.dateModified,'schema modification');
    assert.equal(row.wordCount,q.count,'verified article word count');
    assert.equal(mapped.word_count,q.count,'mapped publication word count');
    assert.equal(posting.wordCount,q.count,'schema word count');
    assert.equal(row.readTime,q.mins,'reading time in registry');
    assert.equal(posting.timeRequired,'PT'+q.mins+'M','schema reading time');
    assert.ok(html.includes('الإجابة المختصرة:'),'direct answer missing');
    assert.ok(html.includes('href="'+q.source+'"'),'primary-source link missing');
    assert.ok(read('sitemap.xml').includes('<loc>https://kun-online.com/blog/'+q.slug+'</loc><lastmod>2026-10-28</lastmod>'));
  }
});


test('GEO beginner guides: sources, metadata, unchanged original publication dates',()=>{
 const registry=JSON.parse(read('blog/articles.json'));
 const mapped=JSON.parse(read('seo-content-map.json'));
 const cases=[
  {slug:'what-is-ecommerce',date:'2026-08-25T20:45:12Z',words:1582,minutes:10,link:'https://sdgpulse.unctad.org/glossary/e-commerce/'},
  {slug:'startup-budget-egypt',date:'2026-08-27',words:1741,minutes:11,link:'https://www.shopify.com/pricing'},
  {slug:'owned-vs-rented-channels',date:'2026-09-01',words:1805,minutes:11,link:'https://www.shopify.com/pricing'},
  {slug:'ecommerce-evolution-history',date:'2026-08-26T06:05:00Z',words:1614,minutes:10,link:'https://www.wto.org/english/tratop_e/ecom_e/ecom_work_programme_e.htm'}
 ];
 for(const q of cases){
  const meta=registry.find(x=>x.slug===q.slug),html=read('blog/'+q.slug+'.html');
  const schema=byType(html,'BlogPosting');
  assert.ok(meta&&schema,'article and schema missing '+q.slug);
  assert.equal(meta.dateISO,q.date,'original publication date retained');
  assert.equal(schema.datePublished,q.date,'original schema publication retained');
  assert.equal(meta.dateModified,'2026-10-28');
  assert.equal(schema.dateModified,meta.dateModified);
  assert.equal(meta.wordCount,q.words);
  assert.equal(schema.wordCount,q.words);
  assert.equal(meta.readTime,q.minutes);
  assert.equal(schema.timeRequired,'PT'+q.minutes+'M');
  const mappedRow=mapped.queue.find(x=>x.slug===q.slug);
  if(mappedRow)assert.equal(mappedRow.word_count,q.words,'planned article count matches');
  assert.ok(html.includes('الإجابة المختصرة:'));
  assert.ok(html.includes('href="'+q.link+'"'),'Source must be original and relevant');
  assert.ok(read('sitemap.xml').includes('<loc>https://kun-online.com/blog/'+q.slug+'</loc><lastmod>2026-10-28</lastmod>'));
 }
 assert.ok(!read('blog/ecommerce-evolution-history.html').includes('Amazon يقول أن 35%'),'Unsupported recommendation revenue statistic');
});
