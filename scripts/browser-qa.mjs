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
 for(const url of ['/','/blog/','/blog/essential-ecommerce-glossary','/services/','/services/ecommerce-management/','/pricing/','/contact/','/system/','/en/','/gulf/']){
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
   assert.ok(placement.afterCore,\`\${width} \${url}: system interrupted main sections\`);
   assert.ok(placement.beforeFinalCta,\`\${width} \${url}: system section is beyond final CTA\`);
  }
  if(url==='/system/'){
   assert.ok(await page.getByRole('heading',{name:/خلّي تشغيل متجرك/}).count());
   assert.ok(await page.locator('a[href="https://app.kun-online.com/v2/"]').count()>0);
   assert.equal(await page.locator('.kos-card').count(),12);
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
