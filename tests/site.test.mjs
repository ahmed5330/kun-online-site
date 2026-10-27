import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import worker, {canonicalLocation, isPrivatePublicPath} from '../_worker.js';
import {createHash} from 'node:crypto';
const root = path.resolve(import.meta.dirname, '..');
function all(dir) {return fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.name==='.git'?[]:e.isDirectory()?all(path.join(dir,e.name)):[path.join(dir,e.name)]);}
const pages = all(root).filter(p=>p.endsWith('.html')&&!p.endsWith('article-template.html'));
const indexablePages = pages.filter(p=>!p.endsWith('404.html')&&!p.endsWith(path.join('reviews','index.html')));
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
  for(const p of pages){const s=fs.readFileSync(p,'utf8').replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,'');for(const m of s.matchAll(/href="(\/[^"#?]*)(?:[?#][^"]*)?"/g)){
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
    ['https://kun-online.com/system/order-management','https://kun-online.com/system/order-management/'],
    ['https://kun-online.com/system/order-management/index.html','https://kun-online.com/system/order-management/'],
    ['https://kun-online.com/system/inventory','https://kun-online.com/system/inventory/'],
    ['https://kun-online.com/system/inventory/index.html','https://kun-online.com/system/inventory/'],
    ['https://kun-online.com/system/shipping','https://kun-online.com/system/shipping/'],
    ['https://kun-online.com/system/shipping/index.html','https://kun-online.com/system/shipping/'],
    ['https://kun-online.com/system/easy-orders','https://kun-online.com/system/easy-orders/'],
    ['https://kun-online.com/system/easy-orders/index.html','https://kun-online.com/system/easy-orders/'],
    ['http://www.kun-online.com/system/easy-orders?utm=integration','https://kun-online.com/system/easy-orders/?utm=integration'],
    ['http://www.kun-online.com/system/shipping?utm=shipping','https://kun-online.com/system/shipping/?utm=shipping'],
    ['http://www.kun-online.com/system/inventory?utm=inventory','https://kun-online.com/system/inventory/?utm=inventory'],
    ['http://www.kun-online.com/system/order-management?utm=orders','https://kun-online.com/system/order-management/?utm=orders'],
    ['http://www.kun-online.com/system?source=seo','https://kun-online.com/system/?source=seo'],
    ['https://kun-online.com/blog/what-is-ecommerce.html?q=1','https://kun-online.com/blog/what-is-ecommerce?q=1'],
    ['https://www.kun-online.com/الصفحة-الرئيسية_1?x=2','https://kun-online.com/?x=2'],
    ['https://kun-online.com/blog/what-is-ecommerce/','https://kun-online.com/blog/what-is-ecommerce']
  ]){assert.equal(canonicalLocation(source),target);assert.equal(canonicalLocation(target),null);}
  assert.equal(canonicalLocation('https://preview.pages.dev/blog/'),null);
  assert.equal(canonicalLocation('https://preview.pages.dev/blog'),null);
  assert.equal(canonicalLocation('https://preview.pages.dev/الصفحة-الرئيسية_1'),null);
  assert.equal(canonicalLocation('https://preview.pages.dev/system/index.html'),null);
  assert.equal(canonicalLocation('https://kun-online.com/api/not-found'),null);
});
test('all intended pages are in the sitemap and template is excluded',()=>{
  const s=fs.readFileSync(path.join(root,'sitemap.xml'),'utf8');
  assert.doesNotMatch(s,/https:\/\/www\.kun-online\.com|article-template|<loc>[^<]*404/);
  for(const p of indexablePages){const html=fs.readFileSync(p,'utf8');const url=html.match(/rel="canonical" href="([^"]+)"/)[1];assert.ok(s.includes(`<loc>${url}</loc>`),p);}
});


test('sitemap uses verified editorial lastmod dates and no fabricated defaults',()=>{
  const xml=fs.readFileSync(path.join(root,'sitemap.xml'),'utf8');
  const articles=JSON.parse(fs.readFileSync(path.join(root,'blog/articles.json'),'utf8'));
  const mapped=new Map(articles.map(a=>[a.slug,a.dateModified]));
  const entries=[...xml.matchAll(/<url>([\s\S]*?)<\/url>/g)].map(x=>x[1]);
  assert.equal(entries.length,indexablePages.length);
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
test('all pages load brand-font CSS on first visit and allow late swap without refresh',()=>{
  for(const page of pages){
    const html=fs.readFileSync(page,'utf8');
    assert.match(html,/<main\b/,page);
    const fontLinks=[...html.matchAll(/<link\b[^>]*fonts\.googleapis\.com\/css2[^>]*>/g)].map(x=>x[0]);
    assert.equal(fontLinks.length,1,'Expected one active Google Fonts CSS file: '+page);
    for(const link of fontLinks){
      assert.match(link,/rel="stylesheet"/,page);
      assert.match(link,/display=swap/,page);
      assert.doesNotMatch(link,/display=optional|media="print"|onload=|as="style"/,page);
    }
    assert.doesNotMatch(html,/<noscript>\s*<link[^>]*fonts\.googleapis\.com/,page);
    assert.match(html,/rel="preconnect" href="https:\/\/fonts\.gstatic\.com" crossorigin/,page);
  }
  for(const home of ['index.html','en/index.html','gulf/index.html']){
    const html=fs.readFileSync(path.join(root,home),'utf8');
    assert.doesNotMatch(html,/class="tstars"|<em>150<\/em>|8\+ Years of Field Experience/);
  }
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
  const intended=indexablePages.map(p=>{
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

test('order confirmation service distinguishes fulfillment states and agency vs software',()=>{
  const html=fs.readFileSync(path.join(root,'services/order-management/index.html'),'utf8');
  assert.match(html,/خدمة تأكيد الطلبات وخدمة العملاء للمتاجر الإلكترونية/);
  assert.match(html,/مراحل الأوردر/);
  assert.match(html,/إزاي نقيس أداء تأكيد الطلبات بصدق/);
  assert.match(html,/من المسؤول عن ماذا؟/);
  assert.match(html,/href="\/system\/"/);
  assert.match(html,/href="\/services\/ecommerce-management\/"/);
  assert.match(html,/href="\/pricing\/"/);
  assert.match(html,/https:\/\/wa\.me\/201021231619/);
});

test('SEO-23 ads service separates advertising metrics from delivered-order profitability',()=>{
  const html=fs.readFileSync(path.join(root,'services/ecommerce-ads/index.html'),'utf8');
  assert.match(html,/<title>إدارة إعلانات المتاجر الإلكترونية في مصر \| كن أونلاين<\/title>/);
  assert.match(html,/rel="canonical" href="https:\/\/kun-online\.com\/services\/ecommerce-ads\/"/);
  assert.match(html,/<h1>إدارة إعلانات المتاجر الإلكترونية<\/h1>/);
  for(const term of ['Meta','TikTok','تكلفة الطلب المؤكد','تكلفة الطلب المُسلّم','ROAS','هامش المساهمة','CAC']){
    assert.ok(html.includes(term),'missing ads-service term: '+term);
  }
  assert.match(html,/إزاي نقيس تكلفة الطلب والعائد الإعلاني والربحية؟/);
  assert.match(html,/خدمة تشغيل وتأكيد طلبات مستقلة/);
  for(const href of ['/blog/customer-funnel-guide','/blog/essential-ecommerce-glossary','/services/order-management/','/pricing/','/system/']){
    assert.ok(html.includes('href="'+href+'"'),'missing internal link '+href);
  }
  assert.match(html,/href="https:\/\/wa\.me\/201021231619"/);
  assert.doesNotMatch(html,/ضمان مبيعات|مبيعات مضمونة|أرباح مضمونة/);
});

test('SEO-24 store-building page has platform choices, acceptance criteria and honest scope',()=>{
  const html=fs.readFileSync(path.join(root,'services/ecommerce-store-development/index.html'),'utf8');
  assert.match(html,/<title>بناء وتصميم متجر إلكتروني في مصر \| كن أونلاين<\/title>/);
  assert.match(html,/rel="canonical" href="https:\/\/kun-online\.com\/services\/ecommerce-store-development\/"/);
  assert.match(html,/<h1>بناء وتصميم متجر إلكتروني في مصر<\/h1>/);
  for(const phrase of ['Shopify','WooCommerce','سلة','زد','مراحل إنشاء المتجر الإلكتروني','قائمة استلام المتجر','الدفع والشحن','أساسيات السيو','تكلفة إنشاء متجر إلكتروني','بعد إطلاق المتجر']){
    assert.ok(html.includes(phrase),'missing store-development topic '+phrase);
  }
  for(const href of ['/gulf/','/pricing/','/blog/startup-budget-egypt','/blog/owned-vs-rented-channels','/services/ecommerce-management/','/system/']){
    assert.ok(html.includes('href="'+href+'"'),'missing contextual internal link '+href);
  }
  assert.match(html,/href="https:\/\/wa\.me\/201021231619"/);
  assert.match(html,/لا يوجد ضمان لترتيب معين/);
  assert.match(html,/مش جزءًا تلقائيًا من أي مشروع بناء متجر/);
  assert.doesNotMatch(html,/مبيعات مضمونة|أرباح مضمونة|رقم واحد يناسب كل/);
});

test('SEO-25 consulting page separates research, feasibility and execution with scoped deliverables',()=>{
  const html=fs.readFileSync(path.join(root,'services/ecommerce-consulting/index.html'),'utf8');
  assert.match(html,/<title>استشارات التجارة الإلكترونية ودراسة السوق في مصر \| كن أونلاين<\/title>/);
  assert.match(html,/rel="canonical" href="https:\/\/kun-online\.com\/services\/ecommerce-consulting\/"/);
  assert.match(html,/<h1>استشارات التجارة الإلكترونية ودراسة السوق<\/h1>/);
  for(const term of ['دراسة السوق ودراسة الجدوى','العميل المستهدف','المنافسون والبدائل','منهج العمل','ما المخرجات التي يمكن أن تستلمها','نموذج مبدئي للتكلفة والهامش','سيناريو','استطلاع رأي','سيستم كن أونلاين']){
    assert.ok(html.includes(term),'missing consulting scope term '+term);
  }
  for(const href of ['/blog/startup-budget-egypt','/blog/essential-ecommerce-glossary','/services/ecommerce-store-development/','/services/ecommerce-management/','/services/ecommerce-ads/','/pricing/','/gulf/','/system/']){
    assert.ok(html.includes('href="'+href+'"'),'missing consulting internal link '+href);
  }
  assert.match(html,/href="https:\/\/wa\.me\/201021231619"/);
  assert.match(html,/لا نفترض تقديم دراسة جدوى استثمارية أو قانونية شاملة/);
  assert.match(html,/الخدمات الأخرى|خدمات أخرى|مش تلقائيًا/);
  assert.doesNotMatch(html,/مبيعات مضمونة|أرباح مضمونة|نجاح مضمون/);
});

test('SEO-26 pricing page preserves stated rates and clearly discloses scope and billing rules',()=>{
  const html=fs.readFileSync(path.join(root,'pricing/index.html'),'utf8');
  assert.match(html,/<title>تكلفة إدارة المتاجر الإلكترونية \| كن أونلاين<\/title>/);
  assert.match(html,/<h1>تكلفة إدارة المتاجر الإلكترونية والتسويق والعمليات<\/h1>/);
  assert.match(html,/rel="canonical" href="https:\/\/kun-online\.com\/pricing\/"/);
  // Never silently change commercial figures as part of editorial SEO updates.
  for(const rate of ['$1K–10K','$10K–50K','$50K–150K','+$150K','$1','$0.75','$0.5']){
    assert.ok(html.includes(rate),'missing existing pricing tier/rate '+rate);
  }
  for(const item of ['التسويق لكل تسليمة','العمليات لكل تسليمة','رسوم العمليات ثابتة','تعريف التسليمة المؤهلة',
    'العملة والفاتورة','إيه المشمول وغير المشمول','المرتجعات','الإنفاق المدفوع لمنصات الإعلانات',
    'سيستم كن أونلاين','هل توجد رسوم ثابتة أو حد أدنى أو ضريبة؟']){
    assert.ok(html.includes(item),'missing pricing disclosure '+item);
  }
  for(const href of ['/system/','/services/ecommerce-management/','/services/ecommerce-ads/',
    '/services/order-management/','/services/ecommerce-consulting/','/services/ecommerce-store-development/']){
    assert.ok(html.includes('href="'+href+'"'),'missing commercial funnel link '+href);
  }
  assert.match(html,/https:\/\/wa\.me\/201021231619/);
  assert.doesNotMatch(html,/مبيعات مضمونة|أرباح مضمونة/);
  assert.doesNotMatch(html,/كل ما المبيعات زادت، التكلفة للأوردر الواحد بتقل/);
});

test('SEO-27 Commerce OS product page separates software from service and requires real readiness',()=>{
  const html=fs.readFileSync(path.join(root,'system/index.html'),'utf8');
  assert.match(html,/<title>برنامج إدارة المتاجر الإلكترونية والطلبات والمخزون \| كن أونلاين<\/title>/);
  assert.match(html,/rel="canonical" href="https:\/\/kun-online\.com\/system\/"/);
  assert.match(html,/<h1 id="kos-hero-title">برنامج إدارة المتاجر الإلكترونية:/);
  assert.equal((html.match(/<h1\b/g)||[]).length,1);
  for(const term of ['برنامج إدارة المخزون للمتاجر','برنامج كن أونلاين','Easy Orders','J&amp;T','Microsoft Clarity',
    'برنامج ولا فريق إدارة؟','سيناريوهات الاستخدام','إزاي نعرف المزايا اللي شغالة على متجرك فعلًا؟',
    'المحفظة','الباندل','الحملات والتحليلات']){
    assert.ok(html.includes(term),'missing software-intent term '+term);
  }
  for(const href of ['/services/ecommerce-management/','/services/order-management/','/services/ecommerce-ads/','/pricing/']){
    assert.ok(html.includes('href="'+href+'"'),'missing service-versus-product link '+href);
  }
  for(const warning of ['وجود قسم أو تكامل في واجهة النظام لا يعني إنه مفعّل','لا يثبت إن الحساب مربوط',
    'لا تعتبر الأرقام نهائية من غير مطابقة','لا يثبت وحده مَن تسبب في الشراء']){
    assert.ok(html.includes(warning),'missing safe capability qualification '+warning);
  }
  assert.match(html,/href="https:\/\/app\.kun-online\.com\/v2\/"/);
  assert.match(html,/href="https:\/\/wa\.me\/201021231619"/);
  assert.doesNotMatch(html,/اشتراك مجاني|جميع الميزات مفعّلة|نتائج مضمونة/);
});

test('SEO-28 order management software landing is distinct from order confirmation agency service',()=>{
  const software=fs.readFileSync(path.join(root,'system/order-management/index.html'),'utf8');
  const service=fs.readFileSync(path.join(root,'services/order-management/index.html'),'utf8');
  const system=fs.readFileSync(path.join(root,'system/index.html'),'utf8');
  assert.match(software,/<title>برنامج إدارة الطلبات للمتاجر الإلكترونية \| كن أونلاين<\/title>/);
  assert.match(software,/<h1 id="order-software-heading">برنامج إدارة الطلبات/);
  assert.match(software,/rel="canonical" href="https:\/\/kun-online\.com\/system\/order-management\/"/);
  assert.match(service,/rel="canonical" href="https:\/\/kun-online\.com\/services\/order-management\/"/);
  for(const phrase of ['برنامج إدارة الطلبات أم خدمة تأكيد الطلبات','CSV','XLSX',
    'Easy Orders','التأكيد','الشحن','المرتجعات','قائمة تحقق لتفعيل إدارة الطلبات',
    'مخطط توضيحي','التفعيل والاختبار الفعلي مطلوبان']){
    assert.ok(software.includes(phrase),'missing documented order-software scope '+phrase);
  }
  assert.match(system,/href="\/system\/order-management\/"/);
  assert.match(service,/href="\/system\/order-management\/"/);
  assert.match(software,/href="\/services\/order-management\/"/);
  assert.match(software,/href="https:\/\/app\.kun-online\.com\/v2\/"/);
  assert.match(software,/href="https:\/\/wa\.me\/201021231619"/);
  assert.match(fs.readFileSync(path.join(root,'_redirects'),'utf8'),/\/system\/order-management \/system\/order-management\/ 301/);
  const map=JSON.parse(fs.readFileSync(path.join(root,'seo/keyword-map.json'),'utf8'));
  assert.equal(map.pages.find(p=>p.path==='/system/order-management/').pillar,'software');
  assert.equal(map.pages.find(p=>p.path==='/services/order-management/').pillar,'agency');
  assert.ok(fs.readFileSync(path.join(root,'sitemap.xml'),'utf8').includes('<loc>https://kun-online.com/system/order-management/</loc>'));
  assert.doesNotMatch(software,/مبيعات مضمونة|جميع المزايا مفعلة|لقطة شاشة فعلية/);
});

test('SEO-29 inventory barcode page is software intent with real deployment qualifications',()=>{
  const inventory=fs.readFileSync(path.join(root,'system/inventory/index.html'),'utf8');
  const system=fs.readFileSync(path.join(root,'system/index.html'),'utf8');
  const orders=fs.readFileSync(path.join(root,'system/order-management/index.html'),'utf8');
  assert.match(inventory,/<title>برنامج إدارة المخزون والباركود للمتاجر الإلكترونية \| كن أونلاين<\/title>/);
  assert.match(inventory,/rel="canonical" href="https:\/\/kun-online\.com\/system\/inventory\/"/);
  assert.match(inventory,/<h1 id="inventory-title">برنامج إدارة المخزون/);
  assert.equal((inventory.match(/<h1\b/g)||[]).length,1);
  for(const term of ['QR','SKU','الباندلز','Easy Orders','الماسح','الجرد',
    'المرتجعات','تكويد','باركود','قائمة تحقق لتفعيل باركود المخزون',
    'توثيق الإصدار البرمجي لا يثبت نشر جميع عمليات المخزن']){
    assert.ok(inventory.includes(term),'missing scoped inventory subject '+term);
  }
  assert.match(system,/href="\/system\/inventory\/"/);
  assert.match(orders,/href="\/system\/inventory\/"/);
  assert.match(inventory,/href="\/system\/order-management\/"/);
  assert.match(inventory,/href="\/services\/ecommerce-management\/"/);
  assert.match(inventory,/href="https:\/\/app\.kun-online\.com\/v2\/"/);
  assert.match(inventory,/href="https:\/\/wa\.me\/201021231619"/);
  assert.match(fs.readFileSync(path.join(root,'_redirects'),'utf8'),/\/system\/inventory \/system\/inventory\/ 301/);
  assert.match(fs.readFileSync(path.join(root,'sitemap.xml'),'utf8'),/<loc>https:\/\/kun-online\.com\/system\/inventory\/<\/loc>/);
  const map=JSON.parse(fs.readFileSync(path.join(root,'seo/keyword-map.json'),'utf8'));
  assert.equal(map.pages.find(p=>p.path==='/system/inventory/').pillar,'software');
  assert.doesNotMatch(inventory,/ماسح يعمل على كل هاتف|جميع المزايا منشورة|مبيعات مضمونة/);
});

test('SEO-30 shipping software page distinguishes carrier APIs, sheets and COD settlement',()=>{
  const html=fs.readFileSync(path.join(root,'system/shipping/index.html'),'utf8');
  const system=fs.readFileSync(path.join(root,'system/index.html'),'utf8');
  const orders=fs.readFileSync(path.join(root,'system/order-management/index.html'),'utf8');
  assert.match(html,/<title>برنامج إدارة الشحن والبوليصات والمرتجعات \| كن أونلاين<\/title>/);
  assert.match(html,/rel="canonical" href="https:\/\/kun-online\.com\/system\/shipping\/"/);
  assert.match(html,/<h1 id="shipping-title">برنامج إدارة الشحن/);
  assert.equal((html.match(/<h1\b/g)||[]).length,1);
  for(const term of ['J&amp;T','AWB','CSV','XLSX','COD','المرتجعات','بوليصة',
     'برنامج إدارة الشحن غير التعاقد مع شركة شحن','قائمة تحقق لربط الشحن والبوليصات بأمان',
     'قوالب استيراد','إثباتًا للتسليم دون بيانات ناقل موثوقة','التحصيل']){
    assert.ok(html.includes(term),'missing shipping statement '+term);
  }
  for(const link of ['/system/','/system/order-management/','/system/inventory/',
    '/services/ecommerce-management/','/pricing/']){
    assert.ok(html.includes('href="'+link+'"'),'missing related page '+link);
  }
  assert.ok(system.includes('href="/system/shipping/"'));
  assert.ok(orders.includes('href="/system/shipping/"'));
  assert.match(html,/href="https:\/\/app\.kun-online\.com\/v2\/"/);
  assert.match(html,/href="https:\/\/wa\.me\/201021231619"/);
  assert.match(fs.readFileSync(path.join(root,'_redirects'),'utf8'),/\/system\/shipping \/system\/shipping\/ 301/);
  assert.match(fs.readFileSync(path.join(root,'sitemap.xml'),'utf8'),/<loc>https:\/\/kun-online\.com\/system\/shipping\/<\/loc>/);
  const map=JSON.parse(fs.readFileSync(path.join(root,'seo/keyword-map.json'),'utf8'));
  assert.equal(map.pages.find(p=>p.path==='/system/shipping/').pillar,'software');
  assert.doesNotMatch(html,/كل شركات الشحن مربوطة تلقائيًا|شحن مجاني مضمون|تحصيل مضمون/);
});

test('SEO-31 Easy Orders integration targets software buyers without unsupported control claims',()=>{
  const page=fs.readFileSync(path.join(root,'system/easy-orders/index.html'),'utf8');
  const home=fs.readFileSync(path.join(root,'system/index.html'),'utf8');
  const orders=fs.readFileSync(path.join(root,'system/order-management/index.html'),'utf8');
  const stock=fs.readFileSync(path.join(root,'system/inventory/index.html'),'utf8');
  assert.match(page,/<title>ربط Easy Orders مع كن أونلاين \| مزامنة الطلبات والباندلز<\/title>/);
  assert.match(page,/rel="canonical" href="https:\/\/kun-online\.com\/system\/easy-orders\/"/);
  assert.match(page,/<h1 id="easy-title">ربط Easy Orders مع كن أونلاين/);
  assert.equal((page.match(/<h1\b/g)||[]).length,1);
  for(const term of ['Webhook','POST','HEAD','Secret','استكمال الفجوات','حدود API',
    'معاينة استيراد المنتجات','منتجات الباندل','مخزون نفس المتجر','المنتج غير المعدل',
    'لا يغيّر المنتج نفسه في Easy Orders','ربط الطلبات مش معناه التحكم الكامل',
    'قائمة تحقق لاختبار ربط Easy Orders']){
    assert.ok(page.includes(term),'missing scoped integration qualification '+term);
  }
  for(const href of ['/system/','/system/order-management/','/system/inventory/',
    '/services/order-management/','/services/ecommerce-management/','/pricing/']){
    assert.ok(page.includes('href="'+href+'"'),'missing related page '+href);
  }
  for(const existing of [home,orders,stock]){
    assert.ok(existing.includes('href="/system/easy-orders/"'),'missing integration backlink');
  }
  assert.match(page,/href="https:\/\/app\.kun-online\.com\/v2\/"/);
  assert.match(page,/href="https:\/\/wa\.me\/201021231619"/);
  assert.match(fs.readFileSync(path.join(root,'_redirects'),'utf8'),/\/system\/easy-orders \/system\/easy-orders\/ 301/);
  assert.match(fs.readFileSync(path.join(root,'sitemap.xml'),'utf8'),/<loc>https:\/\/kun-online\.com\/system\/easy-orders\/<\/loc>/);
  const map=JSON.parse(fs.readFileSync(path.join(root,'seo/keyword-map.json'),'utf8'));
  assert.equal(map.pages.find(p=>p.path==='/system/easy-orders/').pillar,'software');
  assert.doesNotMatch(page,/تحكم كامل ومضمون|كل أوردر يصل دائمًا|تكامل يعمل بدون إعداد/);
});

test('SEO-32 real product screen galleries stay hidden until authorized image evidence exists',()=>{
  const manifest=JSON.parse(fs.readFileSync(path.join(root,'seo/system-screenshots.json'),'utf8'));
  assert.equal(manifest.version,1);
  const pages=['/system/','/system/order-management/','/system/inventory/',
    '/system/shipping/','/system/easy-orders/'];
  assert.deepEqual(manifest.pendingTargets,pages);
  for(const route of pages){
    const html=fs.readFileSync(path.join(root,route.slice(1),'index.html'),'utf8');
    assert.equal((html.match(/<!-- genuine-app-screenshots:start -->/g)||[]).length,1,route);
    assert.equal((html.match(/<!-- genuine-app-screenshots:end -->/g)||[]).length,1,route);
    assert.match(html,/توضيحي|توضيحية/,route+' illustrative UI must not impersonate a real screenshot');
    assert.equal((html.match(/class="kos-real-capture"/g)||[]).length,
      manifest.screenshots.filter(s=>s.page===route).length,route+' gallery must contain approved items only');
  }
  for(const s of manifest.screenshots){
    assert.ok(pages.includes(s.page),'unrecognized marketing screenshot page');
    assert.equal(s.realUiVerified,true);
    assert.equal(s.privacyReviewed,true);
    assert.equal(s.captureAuthorized,true);
  }
});


test('SEO-09: homepage LocalBusiness links publisher ID without unverified hours or price',()=>{
  const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
  const schemas=[...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map(x=>JSON.parse(x[1]));
  const entity=schemas.find(s=>s['@type']==='LocalBusiness');
  const website=schemas.find(s=>s['@type']==='WebSite');
  assert.ok(entity,'Homepage must keep a real publisher entity');
  assert.equal(entity['@id'],'https://kun-online.com/#organization');
  assert.equal(website?.publisher?.['@id'],entity['@id']);
  assert.equal(entity.openingHoursSpecification,undefined,'Do not claim opening hours absent owner verification');
  assert.equal(entity.priceRange,undefined,'Do not infer local business price tier');
  assert.match(entity.contactPoint?.url || '',/^https:\/\/wa\.me\//);
});


test('SEO-33: practical operations guides are linked contextually from relevant pillars and each other',()=>{
  const slugs=[
    'real-cost-per-delivered-order',
    'order-confirmation-delivery-rate',
    'inventory-barcode-bundle-tracking',
    'cod-shipping-returns-reconciliation'
  ];
  const pillars=[
    'services/ecommerce-ads/index.html',
    'services/order-management/index.html',
    'services/ecommerce-management/index.html',
    'system/inventory/index.html',
    'system/shipping/index.html',
    'system/order-management/index.html'
  ];
  for(const slug of slugs){
    const guide=fs.readFileSync(path.join(root,'blog',slug+'.html'),'utf8');
    const links=slugs.filter(other=>other!==slug && guide.includes('href="/blog/'+other+'"'));
    assert.ok(links.length>=2,slug+': guide must contain at least two sibling topical links');
    const linkingPillars=pillars.filter(p=>fs.readFileSync(path.join(root,p),'utf8').includes('href="/blog/'+slug+'"'));
    assert.ok(linkingPillars.length>=2,slug+': guide must be linked from two relevant service/system pillars');
    assert.match(guide,/<h1\b/i,slug);
  }
});


test('all HTML pages use a content-addressed analytics script reference',()=>{
  const script=fs.readFileSync(path.join(root,'assets/site.js'));
  const tag=createHash('sha1').update(Buffer.from('blob '+script.length+'\0')).update(script).digest('hex').slice(0,12);
  const expected='/assets/site.js?v='+tag;
  for(const filename of [...pages,path.join(root,'blog/article-template.html')]){
    const html=fs.readFileSync(filename,'utf8');
    assert.ok(html.includes('src="'+expected+'"'),filename+': stale or missing analytics script version');
    assert.equal((html.match(/src="\/assets\/site\.js\?/g)||[]).length,1,
      filename+': duplicate or missing analytics bundle');
  }
});

test('advanced Pages worker explicitly shortens only analytics script cache lifetime',async()=>{
  const env={ASSETS:{fetch:async()=>new Response('ok',{
    headers:{'Content-Type':'application/javascript','Cache-Control':'public, max-age=86400'}
  })}};
  const js=await worker.fetch(new Request('https://kun-online.com/assets/site.js'),env);
  assert.equal(js.status,200);
  assert.equal(js.headers.get('cache-control'),'public, max-age=300, must-revalidate');
  const ordinary=await worker.fetch(new Request('https://kun-online.com/assets/site.css'),env);
  assert.equal(ordinary.headers.get('cache-control'),'public, max-age=86400');
});


test('Cloudflare Pages asset rules do not mask the short analytics bundle TTL',()=>{
  const headers=fs.readFileSync(path.join(root,'_headers'),'utf8');
  assert.doesNotMatch(headers,/^\/assets\/\*\s*\n\s*Cache-Control:\s*public,\s*max-age=86400/m,
    'A blanket long-lived asset cache can override the analytics-only rule');
  assert.match(headers,/^\/assets\/site\.js\s*\n\s*Cache-Control:\s*public,\s*max-age=300,\s*must-revalidate/m);
  for(const name of ['blog.js','site.css','system.css']){
    assert.match(headers,new RegExp('^/assets/'+name.replace('.','\\.')+'\\s*\\n\\s*Cache-Control:\\s*public,\\s*max-age=86400','m'));
  }
});


test('SEO-34: revised editorial pages carry verified modification dates and labeled examples',()=>{
  const articles=JSON.parse(fs.readFileSync(path.join(root,'blog/articles.json'),'utf8'));
  for (const slug of ['startup-budget-egypt','product-marketing-operations-ecommerce']) {
    const html=fs.readFileSync(path.join(root,'blog',slug+'.html'),'utf8');
    const scripts=html.split('<script type="application/ld+json">').slice(1);
    const schemas=scripts.map(s=>JSON.parse(s.split('</script>')[0]));
    const posting=schemas.find(x=>x['@type']==='BlogPosting');
    assert.ok(posting,slug+' must have article structured data');
    assert.equal(posting.dateModified,articles.find(item=>item.slug===slug)?.dateModified,'Article dates must match registry of actual revisions');
    assert.equal(posting.url,'https://kun-online.com/blog/'+slug);
    assert.ok(html.includes('rel="canonical" href="https://kun-online.com/blog/'+slug+'"'));
    assert.ok(html.includes('افتراضي') || html.includes('افتراضية'),slug);
    assert.ok(!html.includes('1000% طلب'));
    assert.ok(!html.includes('Shopify من 29$'));
  }
  const budget=fs.readFileSync(path.join(root,'blog/startup-budget-egypt.html'),'utf8');
  const ops=fs.readFileSync(path.join(root,'blog/product-marketing-operations-ecommerce.html'),'utf8');
  assert.ok(budget.includes('هامش المساهمة'));
  assert.ok(budget.includes('https://www.shopify.com/pricing'));
  assert.ok(budget.includes('support.google.com/merchants/answer/13889434'));
  assert.ok(budget.includes('href="/blog/real-cost-per-delivered-order"'));
  assert.ok(ops.includes('نقرة واتساب ليست عميلًا مؤهلًا'));
  assert.ok(ops.includes('href="/blog/order-confirmation-delivery-rate"'));
});

test('SEO-34: ecommerce history avoids unsupported national performance percentages',()=>{
  const html=fs.readFileSync(path.join(root,'blog/ecommerce-evolution-history.html'),'utf8');
  for(const falseClaim of [
    'أكثر من 90% من المتاجر الجديدة',
    'نسبة النمو السنوية للسوق العربي تتراوح بين 15 إلى 20%',
    '80% من متاجر الموضة',
    'Facebook/Instashop تأخذ 20%',
    '80% من المتاجر الجديدة تصرف',
    '90% من الزيارات للمتاجر الإلكترونية',
    'جلب 500 جنيه يوميًا في شهرك الأول'
  ]) assert.ok(!html.includes(falseClaim),'Unverified claim reappeared: '+falseClaim);
  assert.ok(html.includes('"dateModified":"2026-10-16"'));
  assert.ok(html.includes('سوق مصر أو السعودية'));
  assert.ok(html.includes('سياسة استبدال واسترجاع واضحة'));
});


test('SEO-34: blog category filter exposes every actual published category', () => {
  const html=fs.readFileSync(path.join(root,'blog/index.html'),'utf8');
  const articles=JSON.parse(fs.readFileSync(path.join(root,'blog/articles.json'),'utf8'));
  const choices=[...html.matchAll(/<option value="([^"]+)"/g)].map(m=>m[1]);
  assert.equal(new Set(choices).size,choices.length,'duplicate filter values');
  assert.ok(choices.includes('all'),'category reset must exist');
  const missing=[...new Set(articles.map(a=>a.category))].filter(category=>!choices.includes(category));
  assert.deepEqual(missing,[],'published article category inaccessible through blog filter');
});

test('SEO-34: new operations guides have actual word counts and non-misleading reading time', () => {
  const index=fs.readFileSync(path.join(root,'blog/index.html'),'utf8');
  const articles=JSON.parse(fs.readFileSync(path.join(root,'blog/articles.json'),'utf8'));
  for(const slug of [
    'real-cost-per-delivered-order',
    'cod-shipping-returns-reconciliation',
    'inventory-barcode-bundle-tracking',
    'order-confirmation-delivery-rate'
  ]){
    const item=articles.find(a=>a.slug===slug);
    assert.ok(item,slug);
    const html=fs.readFileSync(path.join(root,'blog',slug+'.html'),'utf8');
    const article=html.match(/<article\b[^>]*>([\s\S]*?)<\/article>/i)?.[1];
    assert.ok(article,slug+' missing article body');
    const words=article.replace(/<[^>]*>/g,' ').replace(/&(?:[a-z]+|#\d+);/gi,' ')
      .trim().split(/\s+/).filter(Boolean).length;
    assert.equal(item.wordCount,words,slug+' wordCount metadata must match article');
    assert.equal(item.readTime,Math.ceil(words/170),slug+' read time is an approximation at 170 wpm');
    const card=index.match(new RegExp('<article class="card blog-card"[^>]*>[\\s\\S]*?<a href="/blog/'+slug+'">'));
    assert.ok(card,slug+' not linked in index');
    assert.ok(index.includes(item.categoryLabel+' · '+item.date+' · '+item.readTime+' دقائق'),
      slug+' index reading label out of sync');
  }
});


test('SEO: four existing operations guides have real distinct 1200x630 featured images and correct image metadata',()=>{
  const slugs=[
    'cod-shipping-returns-reconciliation',
    'inventory-barcode-bundle-tracking',
    'order-confirmation-delivery-rate',
    'real-cost-per-delivered-order'
  ];
  const registry=JSON.parse(fs.readFileSync(path.join(root,'blog/articles.json'),'utf8'));
  const hashes=new Set();
  for(const slug of slugs){
    const data=registry.find(item=>item.slug===slug);
    assert.ok(data,'missing operations guide registry record: '+slug);
    assert.equal(data.image,slug+'.png');
    assert.equal(data.dateISO,'2026-10-15','original publication date must not change');
    assert.match(data.dateModified,/^\d{4}-\d{2}-\d{2}$/,'article revision date must be ISO');
    const buffer=fs.readFileSync(path.join(root,'blog/images',data.image));
    assert.equal(buffer.subarray(0,8).toString('hex'),'89504e470d0a1a0a','PNG signature required');
    assert.equal(buffer.readUInt32BE(16),1200,'cover width');
    assert.equal(buffer.readUInt32BE(20),630,'cover height');
    const hash=createHash('sha256').update(buffer).digest('hex');
    assert.ok(!hashes.has(hash),'covers must be genuinely unique and topic specific');
    hashes.add(hash);
    const html=fs.readFileSync(path.join(root,'blog',slug+'.html'),'utf8');
    assert.match(html,new RegExp('src="/blog/images/'+slug+'\\.png(?:\\?v=rtl-raqm-20261019)?"'),'featured image must render in the page (versioned URLs supported)');
    assert.ok(html.includes('property="og:image" content="https://kun-online.com/blog/images/'+data.image+'"'),'share preview must use the real cover');
    assert.ok(html.includes('name="twitter:card" content="summary_large_image"'),'X/Twitter preview must have appropriate card');
    const article=html.match(/<script type="application\/ld\+json">([^<]+)<\/script>/)?.[1];
    assert.ok(article,'article JSON-LD missing');
    const structured=JSON.parse(article);
    assert.equal(structured['@type'],'BlogPosting');
    assert.equal(structured.image,'https://kun-online.com/blog/images/'+data.image);
    assert.equal(structured.datePublished,'2026-10-15');
    assert.equal(structured.dateModified,data.dateModified,'article schema must match the recorded real revision date');
  }
});


test('SEO: internal editorial plans, pending content and source files return uncrawlable 404 without leaking drafts',async()=>{
  const restricted=[
    '/content/approved/is-ecommerce-right-for-you.html.ready',
    '/content/approved/is-ecommerce-right-for-you.json',
    '/content/publication-log.json',
    '/docs/editorial-drafts/002-is-ecommerce-right-for-you.md',
    '/seo/keyword-map.json', '/seo-content-map.json',
    '/tests/site.test.mjs', '/scripts/refresh_site.py', '/.github/workflows/site-quality.yml',
    '/SKILL.md', '/package.json'
  ];
  let called=0;
  const env={ASSETS:{fetch:async()=>{called++;return new Response('asset published',{status:200})}}};
  for(const route of restricted){
    for(const host of ['kun-online.com','www.kun-online.com']){
      const url='https://'+host+route;
      assert.equal(isPrivatePublicPath(url),true,'must classify sensitive path '+url);
      const result=await worker.fetch(new Request(url),env);
      assert.equal(result.status,404,'internal source must not be publicly served: '+url);
      assert.equal(result.headers.get('x-robots-tag'),'noindex, nofollow','internal response must clearly refuse indexing');
      assert.equal(result.headers.get('cache-control'),'no-store');
    }
  }
  for(const route of ['/','/blog/','/robots.txt','/sitemap.xml','/blog/what-is-ecommerce','/assets/site.js']){
    const url='https://kun-online.com'+route;
    assert.equal(isPrivatePublicPath(url),false,'never block a customer-facing page: '+route);
  }
  assert.equal(isPrivatePublicPath('https://preview.pages.dev/docs/editorial-drafts/a.md'),false,'preview host excluded by design');
  assert.equal(called,0,'ASSETS must not receive sensitive requests');
});


test('SEO: sitewide keyword targeting has unique primary intents across all sitemap pages',()=>{
  const mapping=JSON.parse(fs.readFileSync(path.join(root,'seo/keyword-map.json'),'utf8'));
  const xml=fs.readFileSync(path.join(root,'sitemap.xml'),'utf8');
  const mapped=mapping.pages.map(page=>'https://kun-online.com'+page.path);
  const urls=[...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m=>m[1]);
  assert.equal(mapped.length,urls.length,'all indexable canonical URLs must be mapped');
  assert.deepEqual([...new Set(urls)].sort(),[...new Set(mapped)].sort(),'Sitemap and keyword map must agree');
  const keywordToPath=new Map();
  for(const page of mapping.pages){
    assert.ok(page.primary && page.primary.trim().length>3,'missing primary term on '+page.path);
    assert.ok(['P0','P1','P2'].includes(page.priority),'bad priority for '+page.path);
    assert.ok(page.intent,'search intent missing on '+page.path);
    const kw=page.primary.toLocaleLowerCase('ar').trim().replace(/\s+/g,' ');
    assert.ok(!keywordToPath.has(kw),
      'Duplicate primary keyword assigned to '+keywordToPath.get(kw)+' and '+page.path);
    keywordToPath.set(kw,page.path);
  }
  const service=mapping.pages.find(p=>p.path==='/services/order-management/');
  const software=mapping.pages.find(p=>p.path==='/system/order-management/');
  assert.ok(service && software);
  assert.equal(service.pillar,'agency','service intent is distinct from product SaaS intent');
  assert.equal(software.pillar,'software');
  const doc=fs.readFileSync(path.join(root,'docs/seo-sitewide-indexing-audit-2026-10-16.md'),'utf8');
  assert.match(doc,/indexed.*deprecated|deprecated.*indexed/i,
    'Audit must acknowledge the deprecated indexed field rather than claim zero indexed');
  assert.match(doc,/غير قابل للجزم/, 'Do not invent a total Google-indexed count');
});


test('SEO: all public guides pass the editorial depth, asset, schema and metadata consistency gate',()=>{
  const registry=JSON.parse(fs.readFileSync(path.join(root,'blog/articles.json'),'utf8'));
  const sitemap=fs.readFileSync(path.join(root,'sitemap.xml'),'utf8');
  assert.ok(registry.length>=15,'blog article inventory unexpectedly shrank below reviewed baseline');
  const titles=new Set();
  for(const item of registry){
    const file=path.join(root,'blog',item.slug+'.html');
    const html=fs.readFileSync(file,'utf8');
    const core=html.match(/<article\b[^>]*>([\s\S]*?)<\/article>/i)?.[1] ||
      html.match(/<div class="art-content">([\s\S]*?)<section class="related-static">/)?.[1];
    assert.ok(core,'guide needs a substantive content body: '+item.slug);
    const words=core.replace(/<[^>]*>/g,' ').replace(/&(?:[a-z]+|#\d+);/gi,' ')
      .trim().split(/\s+/).filter(Boolean).length;
    assert.ok(words>=1500,'Internal editorial standard: substantial original coverage; '+item.slug+' = '+words);
    assert.equal(item.wordCount,words,'registry length drift: '+item.slug);
    assert.equal(item.readTime,Math.ceil(words/170),'reading time drift: '+item.slug);
    const schema=[...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)]
      .map(m=>JSON.parse(m[1])).find(x=>x['@type']==='BlogPosting');
    assert.ok(schema,'blog structured data absent: '+item.slug);
    assert.equal(schema.wordCount,words,'schema word count mismatch: '+item.slug);
    assert.equal(schema.timeRequired,'PT'+item.readTime+'M','schema timeRequired mismatch: '+item.slug);
    assert.ok(schema.datePublished,'keep original publication date: '+item.slug);
    assert.equal(schema.dateModified,item.dateModified,'revision date mismatch: '+item.slug);
    assert.ok(typeof item.image==='string' && item.image.endsWith('.png'),'cover missing: '+item.slug);
    assert.ok(fs.existsSync(path.join(root,'blog/images',item.image)),'cover asset missing: '+item.slug);
    assert.ok(html.includes('/blog/images/'+item.image),'article does not visibly reference cover: '+item.slug);
    const primary=html.match(/<title>([^<]+)<\/title>/)?.[1];
    assert.ok(primary && !titles.has(primary),'duplicate or missing SEO title: '+item.slug);
    titles.add(primary);
    const outgoing=[...new Set([...html.matchAll(/href=["']\/blog\/([a-z0-9-]+)/g)]
      .map(m=>m[1]).filter(s=>s!==item.slug))];
    assert.ok(outgoing.length>=2,'need at least two useful related blog reading links: '+item.slug);
    const canonical='https://kun-online.com/blog/'+item.slug;
    assert.ok(html.includes('rel="canonical" href="'+canonical+'"'),'self-canonical missing: '+item.slug);
    assert.ok(sitemap.includes('<loc>'+canonical+'</loc>'),'article omitted from sitemap: '+item.slug);
    assert.ok(sitemap.includes('<loc>'+canonical+'</loc><lastmod>'+item.dateModified+'</lastmod>'),
      'updated sitemap modification date missing: '+item.slug);
  }
});


test('all published guides explicitly load the readable editorial UI (including daily articles)',()=>{
  const registry=JSON.parse(fs.readFileSync(path.join(root,'blog/articles.json'),'utf8'));
  const stylesheet=fs.readFileSync(path.join(root,'assets/editorial-20261019.css'),'utf8');
  assert.match(stylesheet,/\.art-content :is\(p,li,dd,dt\)/);
  assert.match(stylesheet,/\.article-box :is\(p,li\)/);
  assert.ok(registry.length>=19, 'At least the existing published guides must remain');
  for(const article of registry){
    const file=path.join(root,'blog',article.slug+'.html');
    const markup=fs.readFileSync(file,'utf8');
    const head=markup.split('</head>')[0];
    assert.match(head,/<link rel="stylesheet" href="\/assets\/editorial-20261019\.css(?:\?[^"]*)?">/,
      article.slug+': daily publication lacks readable light-theme article styling');
    assert.ok(markup.includes('class="art-content"')||markup.includes('class="article-box"'),
      article.slug+': article is missing a recognized editorial body');
  }
  const publisher=fs.readFileSync(path.join(root,'scripts/publish-approved-article.mjs'),'utf8');
  const refresher=fs.readFileSync(path.join(root,'scripts/refresh_site.py'),'utf8');
  assert.match(publisher,/editorial-20261019\.css/,'Publisher must normalize newly approved articles');
  assert.ok(refresher.indexOf("for article in (ROOT/'blog').glob('*.html')")<
    refresher.indexOf("    entries=[]"),'Article normalization must not depend on image optimization');
});
