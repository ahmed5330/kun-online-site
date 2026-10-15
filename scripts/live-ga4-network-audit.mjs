/**
 * Public-site measurement smoke test. It NEVER transmits synthetic analytics
 * events: every outgoing origin other than site/gtag JS is blocked first.
 * The external gtag.js library itself is real, not the stub used by browser QA.
 */
import { chromium } from 'playwright';
import fs from 'node:fs/promises';

const base='https://kun-online.com';
const measurementId='G-F2XBVGWB5X';
const observed=[];
const errors=[];
let tagLoaded=false;
const browser=await chromium.launch({headless:true});
let page;
try {
  const context=await browser.newContext({locale:'ar-EG'});
  await context.route('**/*', async route=>{
    const url=route.request().url();
    if (url.startsWith(base+'/') || /^https:\/\/www\.googletagmanager\.com\/gtag\/js(?:\?|$)/.test(url)) {
      return route.continue();
    }
    // Record network intent before blocking it; never contact GA4.
    try {
      const u=new URL(url);
      if (u.hostname==='www.google-analytics.com' || u.hostname==='google-analytics.com' ||
          /\.google-analytics\.com$/.test(u.hostname)) {
        if (u.pathname.includes('/collect')) observed.push({
          name:u.searchParams.get('en') || 'unknown',
          property:u.searchParams.get('tid') || '',
          pathPresent:u.searchParams.has('dl'),
          sent:false
        });
        // A browser-level block may make gtag disable later telemetry.
        // Emulate a successful no-content response without contacting Google.
        return route.fulfill({status:204,headers:{'access-control-allow-origin':'*'},body:''});
      }
    } catch {}
    return route.abort('blockedbyclient');
  });
  page=await context.newPage();
  page.on('response',response=>{
    if (/googletagmanager\.com\/gtag\/js/.test(response.url()) && response.ok()) tagLoaded=true;
  });
  page.on('requestfailed',request=>{
    if (/googletagmanager\.com\/gtag\/js/.test(request.url()))
      errors.push('Google tag script request failed: '+(request.failure()?.errorText||'unknown'));
  });
  await page.goto(base+'/',{waitUntil:'domcontentloaded',timeout:22000});
  await page.locator('#kun-analytics-consent').waitFor({timeout:12000});
  const scriptsBefore=await page.locator('script[src*="googletagmanager.com/gtag/js"]').count();
  const eventsBefore=observed.length;
  await page.getByRole('button',{name:'موافق',exact:true}).click();
  await page.waitForTimeout(8500);
  const tagInserted=await page.locator('script[src*="googletagmanager.com/gtag/js"]').count();
  await page.evaluate(()=>{
    window.wa=()=>{}; // prevent external WhatsApp tab and message
    window.__gaProbeClickTrusted=false;
    document.addEventListener('click',e=>{
      if(e.target.closest('button[data-contact-channel="whatsapp"]'))
        window.__gaProbeClickTrusted=e.isTrusted;
    },{once:true});
  });
  const cta=page.locator('button[data-contact-channel="whatsapp"]').first();
  const clicked=(await cta.count())>0;
  if(clicked) await cta.click({timeout:9000}); // real browser input, not element.click()
  await page.waitForTimeout(5500);
  const debug=await page.evaluate(()=>({
    started:Boolean(window.__kunGa4Started),
    trustedClick:Boolean(window.__gaProbeClickTrusted),
    gtagAvailable:typeof window.gtag==='function',
    dataLayerEvents:(window.dataLayer||[]).slice(-8).map(item=>
      item?.event || (item?.length ? String(item[0])+':'+String(item[1]) : 'other'))
  }));
  const pageView=observed.some(x=>x.name==='page_view' && x.property===measurementId);
  const whatsapp=observed.some(x=>x.name==='whatsapp_click' && x.property===measurementId);
  const result={
    checkedAt:new Date().toISOString(),
    site:base,
    measurementId,
    scriptsBefore,eventsBefore,tagInserted,tagLoaded,clicked,
    events:observed,
    debug,
    errors,
    noSyntheticHitsSent:true,
    success:scriptsBefore===0 && eventsBefore===0 && tagInserted===1 &&
      tagLoaded && clicked && pageView && whatsapp
  };
  await fs.mkdir('test-results',{recursive:true});
  await fs.writeFile('test-results/live-ga4-network-audit.json',JSON.stringify(result,null,2)+'\n');
  const summary='GA4 live browser dry-run: '+(result.success?'PASS':'NOT VERIFIED')+
    '; real gtag.js loaded='+tagLoaded+
    ', page_view attempt='+pageView+
    ', whatsapp_click attempt='+whatsapp+
    '. All analytics network hits intercepted and blocked.\n';
  console.log(summary);
  if (process.env.GITHUB_STEP_SUMMARY) await fs.appendFile(process.env.GITHUB_STEP_SUMMARY,summary);
  if(!result.success) process.exitCode=1;
} finally {
  await browser.close();
}
