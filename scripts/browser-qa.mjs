import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {serve} from './serve-test.mjs';
const require=createRequire(import.meta.url);
const {chromium}=require('playwright');
const server=await serve();const base=`http://127.0.0.1:${server.address().port}`;
const root=path.resolve(import.meta.dirname,'..');
const publishedArticleUrls=JSON.parse(fs.readFileSync(path.join(root,'blog/articles.json'),'utf8')).map(article=>'/blog/'+article.slug);
const dir=path.join(root,'test-results');fs.mkdirSync(dir,{recursive:true});
const browser=await chromium.launch({headless:true,...(process.env.SITE_BROWSER_EXECUTABLE?{executablePath:process.env.SITE_BROWSER_EXECUTABLE}:{})});
const results=[];
try{
for(const width of [390,1440]){
 const page=await browser.newPage({viewport:{width,height:900}});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 for(const url of ['/','/blog/','/blog/ecommerce-first-30-days-plan','/blog/ecommerce-product-ideas-research','/blog/essential-ecommerce-glossary','/blog/real-cost-per-delivered-order','/blog/order-confirmation-delivery-rate','/blog/inventory-barcode-bundle-tracking','/blog/cod-shipping-returns-reconciliation','/services/','/reviews/','/consultations/','/services/ecommerce-management/','/services/ecommerce-ads/','/services/ecommerce-store-development/','/services/ecommerce-consulting/','/pricing/','/about/','/methodology/','/contact/','/system/','/system/order-management/','/system/inventory/','/system/shipping/','/system/easy-orders/','/en/','/gulf/',...publishedArticleUrls]){
  const response=await page.goto(base+url,{waitUntil:'domcontentloaded'});
  await page.locator('h1').waitFor();
  // Verify initial navigation, before any reload, has an active blocking
  // brand-font stylesheet. Deferred print-media CSS + optional used to trap
  // slow first-time visitors on fallback fonts until the next navigation.
  const firstViewFonts=await page.evaluate(()=>{
    const links=[...document.querySelectorAll('link[href*="fonts.googleapis.com/css2"]')];
    return {count:links.length,swap:links.every(link=>link.href.includes('display=swap')),
      renderBlocking:links.every(link=>!link.hasAttribute('media')&&!link.hasAttribute('onload'))};
  });
  assert.equal(firstViewFonts.count,1, width+' '+url+': brand font CSS must be linked exactly once');
  if(url==='/'){
    // The homepage intentionally paints a system-font fallback immediately, then
    // switches to the real brand font when the CSS finishes loading; no reload.
    assert.ok(firstViewFonts.swap,width+' '+url+': font-display swap required');
    await page.waitForFunction(()=>{
      const link=document.querySelector('link[href*="fonts.googleapis.com/css2"]');
      return link?.media==='all' && !!link.sheet;
    },{timeout:15000});
    await page.evaluate(()=>document.fonts.ready);
    const family=await page.locator('h1').evaluate(node=>getComputedStyle(node).fontFamily);
    assert.match(family,/Tajawal/,width+' '+url+': final brand font must be applied');
  }else{
    assert.ok(firstViewFonts.swap && firstViewFonts.renderBlocking,width+' '+url+': font CSS must load for first paint without reload');
    await page.evaluate(()=>document.fonts.ready);
  }
  assert.equal(response.status(),200,url);
  if(url==='/system/'||url.startsWith('/system/')){
    const approvals=JSON.parse(fs.readFileSync(path.join(root,'seo/system-screenshots.json'),'utf8')).screenshots.filter(s=>s.page===url);
    assert.equal(await page.locator('.kos-real-capture').count(),approvals.length,url+' authentic screenshot approval mismatch');
    if(approvals.length){
      for(const img of await page.locator('.kos-real-capture img').all()){
        const loaded=await img.evaluate(el=>el.complete&&el.naturalWidth>0);
        assert.ok(loaded,url+' screenshot asset must load');
      }
    }
  }
  const actual=await page.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth,h1:document.querySelectorAll('h1').length,phone:!!document.querySelector('a[href="https://wa.me/201021231619"]')&&!document.querySelector('a[href^="tel:"]'),hiddenTitles:Array.from(document.querySelectorAll('h1,h2')).filter(el=>Number(getComputedStyle(el).opacity)===0).map(el=>el.textContent)}));
  assert.ok(actual.scroll<=actual.width+2,`${width} ${url}: overflow ${actual.scroll}`);
  assert.equal(actual.h1,1);assert.ok(actual.phone);assert.equal(actual.hiddenTitles.length,0);
  if(url==='/'||url==='/en/'||url==='/gulf/'){
   const placement=await page.evaluate(()=>{
    const system=document.querySelector('#kun-system');
    const previous=document.querySelector('#testimonials')||document.querySelector('#faq');
    const cta=document.querySelector('.cta-band');
    return {afterCore:!!(system&&previous&&(previous.compareDocumentPosition(system)&Node.DOCUMENT_POSITION_FOLLOWING)),beforeFinalCta:!!(system&&cta&&(system.compareDocumentPosition(cta)&Node.DOCUMENT_POSITION_FOLLOWING))};
   });
   assert.ok(placement.afterCore,`${width} ${url}: system interrupted main sections`);
   assert.ok(placement.beforeFinalCta,`${width} ${url}: system section is beyond final CTA`);
  }
  if(url.startsWith('/blog/') && url!=='/blog/'){
    await page.locator('.art-featured img, .operation-cover img').first().evaluate(img=>img.decode().catch(()=>{}));
    const legibility=await page.evaluate(()=>{
      const para=document.querySelector('.art-content .editorial-guide p')||document.querySelector('.art-content p')||document.querySelector('.article-box section p')||document.querySelector('.article-box > p.summary');
      const title=document.querySelector('.art-header h1')||document.querySelector('.article-box h1');
      const img=document.querySelector('.art-featured img')||document.querySelector('.operation-cover img');
      const rgb=(str)=>{const m=str.match(/[\d.]+/g);return m?.slice(0,3).map(Number)};
      const luminance=(rgb)=>rgb.map(v=>{v/=255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4}).reduce((sum,v,i)=>sum+v*[.2126,.7152,.0722][i],0);
      const contrast=(a,b)=>{const x=luminance(a),y=luminance(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05)};
      return {
        paragraph:!!para,
        paragraphContrast:para?contrast(rgb(getComputedStyle(para).color),rgb(getComputedStyle(document.body).backgroundColor)):0,
        headline:!!title,
        headlineContrast:title?contrast(rgb(getComputedStyle(title).color),rgb(getComputedStyle(document.body).backgroundColor)):0,
        imageLoaded:!!(img && img.complete && img.naturalWidth>0),
        imageMatchesArticle:!!(img && img.currentSrc.includes('/blog/images/'+location.pathname.split('/').filter(Boolean).at(-1))),
        editorialStylesheetLoaded:!!document.querySelector('link[href*="/assets/editorial-20261019.css"]'),
        mobileReadable:!para || Number.parseFloat(getComputedStyle(para).fontSize)>=15
      };
    });
    assert.ok(legibility.paragraph && legibility.paragraphContrast>=4.5, width+' '+url+': editorial paragraph must be readable');
    assert.ok(legibility.headline && legibility.headlineContrast>=4.5, width+' '+url+': editorial headline must be readable');
    assert.ok(legibility.mobileReadable,width+' '+url+': editorial text too small');
    assert.ok(legibility.imageLoaded,width+' '+url+': featured image must load');
    assert.ok(legibility.imageMatchesArticle,width+' '+url+': wrong article cover selected');
    assert.ok(legibility.editorialStylesheetLoaded,width+' '+url+': missing readable editorial CSS');
  }
  if(url==='/reviews/'){
    assert.equal(await page.locator('[data-review-share]').count(),0);
    assert.equal(await page.locator('a[href="/reviews/#write-review"]').count(),0);
    assert.equal(await page.locator('meta[name="robots"]').getAttribute('content'),'noindex,follow');
    assert.equal(await page.locator('[data-review-star]').count(),5);
    await page.locator('[data-review-star="4"]').click();
    assert.equal(await page.locator('[data-review-star="4"]').getAttribute('aria-pressed'),'true');
    await page.locator('[name="category"]').selectOption('consultations');
    assert.equal(await page.locator('[name="category"]').inputValue(),'consultations');
    assert.ok(await page.locator('input[type=file]').count());
  }
  if(url==='/consultations/'){
    assert.equal(await page.locator('.consult-topic').count(),8);
    await page.locator('[data-choose-topic="marketing"]').click();
    assert.equal(await page.locator('#consultTopic').inputValue(),'marketing');
    assert.ok(await page.locator('#consultationRequest [name="problem"]').count());
    assert.ok(await page.getByText(/مش حجز مؤكد/).count());
  }
  if(url==='/services/ecommerce-ads/'){
   assert.ok(await page.getByRole('heading',{name:'إدارة إعلانات المتاجر الإلكترونية',level:1}).count());
   assert.ok(await page.getByRole('heading',{name:/إزاي نقيس تكلفة الطلب والعائد الإعلاني/}).count());
   assert.ok(await page.locator('a[href="/services/order-management/"]').count());
  }
  if(url==='/services/ecommerce-store-development/'){
   assert.equal(await page.getByRole('heading',{name:'بناء وتصميم متجر إلكتروني في مصر',level:1}).count(),1);
   assert.ok(await page.getByRole('heading',{name:/قائمة استلام المتجر/}).count());
   assert.ok(await page.getByRole('heading',{name:/مراحل إنشاء المتجر الإلكتروني/}).count());
   assert.ok(await page.locator('a[href="/pricing/"]').count());
  }
  if(url==='/services/ecommerce-consulting/'){
   assert.equal(await page.getByRole('heading',{name:'استشارات التجارة الإلكترونية ودراسة السوق',level:1}).count(),1);
   assert.ok(await page.getByRole('heading',{name:/ما المخرجات التي يمكن أن تستلمها/}).count());
   assert.ok(await page.getByRole('heading',{name:/الفرق بين دراسة السوق ودراسة الجدوى/}).count());
   assert.ok(await page.locator('a[href="/pricing/"]').count());
  }
  if(url==='/pricing/'){
   assert.equal(await page.getByRole('heading',{name:'تكلفة إدارة المتاجر الإلكترونية والتسويق والعمليات',level:1}).count(),1);
   assert.ok(await page.getByRole('heading',{name:/أسعار إدارة المتاجر الإلكترونية: إزاي تقرأ جدول التسعير/}).count());
   assert.ok(await page.getByRole('heading',{name:/إيه المشمول وغير المشمول/}).count());
   assert.ok(await page.getByRole('heading',{name:/أسئلة شائعة عن تكلفة إدارة المتاجر الإلكترونية/}).count());
   assert.ok(await page.locator('.ptable .pt-r').count()===2);
   assert.ok(await page.locator('a[href="/services/ecommerce-management/"]').count());
  }
  if(url==='/system/'){
   assert.ok(await page.getByRole('heading',{name:/برنامج إدارة المتاجر الإلكترونية/}).count());
   assert.ok(await page.getByRole('heading',{name:/الفرق بين سيستم إدارة المتاجر الإلكترونية وخدمة إدارة المتجر/}).count());
   assert.ok(await page.getByRole('heading',{name:/المزايا اللي شغالة على متجرك فعلًا/}).count());
   assert.equal(await page.locator('.kos-checklist li').count(),6);
   assert.ok(await page.locator('a[href="/services/ecommerce-management/"]').count());
  }
  if(url==='/system/'){
   assert.ok(await page.getByRole('heading',{name:/خلّي تشغيل متجرك/}).count());
   assert.ok(await page.locator('a[href="https://app.kun-online.com/v2/"]').count()>0);
   assert.equal(await page.locator('#features .kos-card').count(),9);
   assert.ok((await page.locator('.kos-card').count())>=12);
  }
  if(url==='/system/order-management/'){
    assert.equal(await page.getByRole('heading',{name:/برنامج إدارة الطلبات/ ,level:1}).count(),1);
    assert.ok(await page.getByRole('heading',{name:/برنامج إدارة الطلبات أم خدمة تأكيد الطلبات/}).count());
    assert.equal(await page.locator('.kos-checklist li').count(),6);
    assert.ok(await page.locator('a[href="/services/order-management/"]').count());
    assert.ok(await page.locator('a[href="https://app.kun-online.com/v2/"]').count());
  }
  if(url==='/system/inventory/'){
    assert.equal(await page.getByRole('heading',{name:/برنامج إدارة المخزون/,level:1}).count(),1);
    assert.ok(await page.getByRole('heading',{name:/قائمة تحقق لتفعيل باركود المخزون/}).count());
    assert.equal(await page.locator('.kos-checklist li').count(),8);
    assert.ok(await page.locator('a[href="/system/order-management/"]').count());
    assert.ok(await page.locator('a[href="https://app.kun-online.com/v2/"]').count());
  }
  if(url==='/system/shipping/'){
    assert.equal(await page.getByRole('heading',{name:/برنامج إدارة الشحن/,level:1}).count(),1);
    assert.ok(await page.getByRole('heading',{name:/قائمة تحقق لربط الشحن والبوليصات بأمان/}).count());
    assert.ok(await page.getByRole('heading',{name:/تكامل J&T المباشر مختلف عن استيراد شيت شركة الشحن/}).count());
    assert.equal(await page.locator('.kos-checklist li').count(),8);
    assert.ok(await page.locator('a[href="/system/inventory/"]').count());
  }
  if(url==='/system/easy-orders/'){
    assert.equal(await page.getByRole('heading',{name:/ربط Easy Orders مع كن أونلاين/,level:1}).count(),1);
    assert.ok(await page.getByRole('heading',{name:/Webhook مش مجرد رابط/}).count());
    assert.ok(await page.getByRole('heading',{name:/ربط منتجات Easy Orders بالمخزون/}).count());
    assert.ok(await page.getByRole('heading',{name:/قائمة تحقق لاختبار ربط Easy Orders/}).count());
    assert.equal(await page.locator('.kos-checklist li').count(),9);
    assert.ok(await page.locator('a[href="/system/inventory/"]').count());
    assert.ok(await page.locator('a[href="https://app.kun-online.com/v2/"]').count());
  }
  if(url==='/methodology/'){
    assert.equal(await page.locator('main h1').count(),1,'methodology must have one H1');
    assert.ok(await page.getByText('مصدر البيانات', {exact:false}).count(),'methodology must show data provenance');
    assert.ok(await page.locator('a[href="/blog/real-cost-per-delivered-order"]').count(),'methodology must link to profitability guide');
    const canonical=await page.locator('link[rel="canonical"]').getAttribute('href');
    assert.equal(canonical,'https://kun-online.com/methodology/');
  }
  if(url==='/blog/'){
   assert.equal(await page.locator('.blog-card').count(),JSON.parse(fs.readFileSync(path.join(root,'blog/articles.json'),'utf8')).length);
   await page.locator('#blog-category').selectOption('ops');
   assert.equal(await page.locator('.blog-card:not([hidden])').count(),2,'Operations category must show both operational guides');
   assert.ok(await page.locator('.blog-card:not([hidden]) a[href="/blog/inventory-barcode-bundle-tracking"]').count(),'Inventory guide must be discoverable');
   await page.locator('#blog-category').selectOption('all');
   await page.locator('#blog-search').fill('مصطلحات');
   assert.ok(await page.locator('.blog-card:not([hidden])').count()>0);
   await page.locator('#blog-search').fill('zzzz-not-present');
   assert.equal(await page.locator('.blog-card:not([hidden])').count(),0);
  }
  if(url==='/'&&width===390){await page.locator('#hbg').click();assert.equal(await page.locator('#hbg').getAttribute('aria-expanded'),'true');await page.locator('#hbg').click();}
  // Keep the exact user-reported article in visual snapshots without producing
  // redundant huge screenshots for every historical guide.
  if(!url.startsWith('/blog/') || url==='/blog/' || url==='/blog/product-demand-validation-guide' || url==='/blog/ecommerce-first-30-days-plan')
    await page.screenshot({path:path.join(dir,`${width}-${url.replaceAll('/','_')||'home'}.png`),fullPage:true});
  results.push({width,url,...actual});
 }
 assert.deepEqual(errors,[]);await page.close();
}
const nojs=await browser.newPage({javaScriptEnabled:false});await nojs.goto(base+'/blog/');assert.equal(await nojs.locator('.blog-card a').count(),JSON.parse(fs.readFileSync(path.join(root,'blog/articles.json'),'utf8')).length);
const missing=await nojs.goto(base+'/unknown-page');assert.equal(missing.status(),404);await nojs.close();
const consentPage=await browser.newPage();
// Never send synthetic localhost page views or CTA events to the real GA4
// property. This still tests tag initialization, DOM consent behavior and
// dataLayer dispatch while replacing the third-party script with a stub.
await consentPage.route(/^https:\/\/www\.googletagmanager\.com\/gtag\/js(?:\?|$)/,
  route=>route.fulfill({status:200,contentType:'application/javascript',body:'/* analytics isolated in browser QA */'}));
await consentPage.route(/^https:\/\/(?:www\.)?google-analytics\.com\//,
  route=>route.abort());
await consentPage.goto(base+'/');
assert.equal(await consentPage.locator('script[src*="googletagmanager.com/gtag/js"]').count(),0,'No GA4 before consent');
assert.equal(await consentPage.locator('#kun-analytics-consent').count(),1,'Consent controls visible');
await consentPage.getByRole('button',{name:'رفض'}).click();
assert.equal(await consentPage.locator('script[src*="googletagmanager.com/gtag/js"]').count(),0,'Denial must not load GA4');
await consentPage.reload();
assert.equal(await consentPage.locator('#kun-analytics-consent').count(),0,'Rejection persisted');
assert.equal(await consentPage.locator('script[src*="googletagmanager.com/gtag/js"]').count(),0,'Denied visit does not load GA4');
await consentPage.evaluate(()=>localStorage.setItem('kun_online_analytics_consent_v1','granted'));
await consentPage.reload();
assert.equal(await consentPage.locator('script[src*="googletagmanager.com/gtag/js"]').count(),1,'Accepted visit loads one GA4 tag');
const trackedCta = await consentPage.evaluate(() => {
  const hits=[];
  window.gtag=(...args)=>hits.push(args);
  window.wa=()=>{}; // Avoid opening an external WhatsApp tab during QA.
  const button=document.querySelector('button[data-contact-channel="whatsapp"]');
  if (!button) return { found:false };
  button.click();
  return {
    found:true,
    intentEvents:window.dataLayer.filter(item=>item?.event==='whatsapp_click').length,
    gaHits:hits.filter(item=>item[0]==='event' && item[1]==='whatsapp_click').length
  };
});
assert.equal(trackedCta.found,true,'Expected an instrumented homepage WhatsApp button');
assert.equal(trackedCta.intentEvents,1,'Clicking the homepage CTA records one contact intent');
assert.equal(trackedCta.gaHits,1,'Opted-in homepage CTA sends one GA4 event');
await consentPage.getByRole('button',{name:'إعدادات التحليلات'}).click();
assert.equal(await consentPage.locator('#kun-analytics-preferences-dialog').count(),1);
await consentPage.getByRole('button',{name:'رفض التحليلات'}).click();
await consentPage.waitForLoadState('domcontentloaded');
assert.equal(await consentPage.locator('script[src*="googletagmanager.com/gtag/js"]').count(),0,'Analytics stops after withdrawing consent');
assert.equal(await consentPage.locator('#kun-analytics-consent').count(),0,'Previously rejected choice stays persisted');
await consentPage.getByRole('button',{name:'إعدادات التحليلات'}).click();
await consentPage.getByRole('button',{name:'السماح بالتحليلات'}).click();
await consentPage.waitForLoadState('domcontentloaded');
assert.equal(await consentPage.locator('script[src*="googletagmanager.com/gtag/js"]').count(),1,'Analytics can be re-enabled after explicit approval');
await consentPage.close();
const englishPrivacy=await browser.newPage();
await englishPrivacy.goto(base+'/en/');
assert.equal(await englishPrivacy.getByRole('button',{name:'Analytics preferences'}).count(),1,'English visitors see translated analytics preferences');
await englishPrivacy.close();
fs.writeFileSync(path.join(dir,'browser-qa.json'),JSON.stringify(results,null,2));console.log(JSON.stringify({passed:results.length,noJavaScriptBlog:true,notFound404:true}));
}finally{await browser.close();await new Promise(r=>server.close(r));}
