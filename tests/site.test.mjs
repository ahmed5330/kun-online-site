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
  assert.equal(entries.length,29);
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
