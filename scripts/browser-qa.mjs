import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {serve} from './serve-test.mjs';
const require=createRequire(import.meta.url);
const {chromium}=require('playwright');
const server=await serve();const base=`http://127.0.0.1:${server.address().port}`;
const root=path.resolve(import.meta.dirname,'..');
const dir=path.join(root,'test-results');fs.mkdirSync(dir,{recursive:true});
const browser=await chromium.launch({headless:true,...(process.env.SITE_BROWSER_EXECUTABLE?{executablePath:process.env.SITE_BROWSER_EXECUTABLE}:{})});
const results=[];
try{
for(const width of [390,1440]){
 const page=await browser.newPage({viewport:{width,height:900}});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 for(const url of ['/','/blog/','/blog/essential-ecommerce-glossary','/services/','/services/ecommerce-management/','/services/ecommerce-ads/','/services/ecommerce-store-development/','/services/ecommerce-consulting/','/pricing/','/contact/','/system/','/system/order-management/','/system/inventory/','/system/shipping/','/system/easy-orders/','/en/','/gulf/']){
  const response=await page.goto(base+url,{waitUntil:'domcontentloaded'});
  await page.locator('h1').waitFor();
  await page.evaluate(()=>document.fonts.ready);
  assert.equal(response.status(),200,url);
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
  if(url==='/blog/'){
   assert.equal(await page.locator('.blog-card').count(),11);
   await page.locator('#blog-search').fill('مصطلحات');
   assert.ok(await page.locator('.blog-card:not([hidden])').count()>0);
   await page.locator('#blog-search').fill('zzzz-not-present');
   assert.equal(await page.locator('.blog-card:not([hidden])').count(),0);
  }
  if(url==='/'&&width===390){await page.locator('#hbg').click();assert.equal(await page.locator('#hbg').getAttribute('aria-expanded'),'true');await page.locator('#hbg').click();}
  await page.screenshot({path:path.join(dir,`${width}-${url.replaceAll('/','_')||'home'}.png`),fullPage:true});
  results.push({width,url,...actual});
 }
 assert.deepEqual(errors,[]);await page.close();
}
const nojs=await browser.newPage({javaScriptEnabled:false});await nojs.goto(base+'/blog/');assert.equal(await nojs.locator('.blog-card a').count(),11);
const missing=await nojs.goto(base+'/unknown-page');assert.equal(missing.status(),404);await nojs.close();
fs.writeFileSync(path.join(dir,'browser-qa.json'),JSON.stringify(results,null,2));console.log(JSON.stringify({passed:results.length,noJavaScriptBlog:true,notFound404:true}));
}finally{await browser.close();await new Promise(r=>server.close(r));}
