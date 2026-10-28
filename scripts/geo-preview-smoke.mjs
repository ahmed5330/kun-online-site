/**
 * GEO release candidate preview check.
 * Read-only HTTP checks against the PR's Cloudflare Pages preview, never production.
 * Preview pages may be intentionally noindex; indexing decisions are post-release.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root=path.resolve(fileURLToPath(new URL('..',import.meta.url)));
const base=(process.env.GEO_PREVIEW_BASE||'').replace(/\/+$/,'');
const specs=[
  {path:'/methodology/',canonical:'https://kun-online.com/methodology/',
   text:['كيف نراجع تشغيل المتجر الإلكتروني ونقيس نتائجه؟','مصدر البيانات','هامش المساهمة']},
  {path:'/about/',canonical:'https://kun-online.com/about/',
   text:['رسالة عبر واتساب قبل الزيارة','منهجنا في نشر الأدلة والمحتوى','/methodology/'],
   absent:['تواصل هاتفيًا قبل الزيارة']},
  {path:'/services/ecommerce-management/',canonical:'https://kun-online.com/services/ecommerce-management/',
   text:['/methodology/']},
  {path:'/blog/owned-vs-rented-channels',canonical:'https://kun-online.com/blog/owned-vs-rented-channels',
   text:['https://www.shopify.com/pricing','https://sell.amazon.eg/pricing'],
   absent:['بين 750 إلى 3000 جنيه','15% إلى 45% حسب فئة المنتج']},
  ...[
    'ecommerce-complete-journey-guide',
    'common-ecommerce-beginner-mistakes',
    'ecommerce-funnel-explained',
    'inventory-barcode-bundle-tracking',
    'customer-funnel-guide',
    'product-profitability-before-launch',
    'real-cost-per-delivered-order',
    'order-confirmation-delivery-rate',
    'cod-shipping-returns-reconciliation'
  ].map(slug=>({
    path:'/blog/'+slug,canonical:'https://kun-online.com/blog/'+slug,
    text:['الإجابة المختصرة:'],
    absent:slug==='ecommerce-complete-journey-guide' ?
      ['trial مجاني 3 شهور','ROAS أقل من 2x','10-25 جنيه بين المدن'] : []
  }))
];
// The October editorial release is opt-in for its own PR preview only.
// These added checks must not make older branch previews fail for unpublished copy.
if(process.env.GEO_REQUIRE_20261028_EDITORIAL==='1'){
 const revised=[
  'product-selection-checklist-20-points',
  'one-product-vs-multi-product-store',
  'cheap-vs-expensive-products-online',
  'ecommerce-competitor-analysis-sheet',
  'viral-vs-evergreen-product-demand',
  'is-ecommerce-right-for-you',
  'test-product-before-bulk-inventory',
  'product-demand-validation-guide',
  'ecommerce-first-30-days-plan',
  'customer-reviews-product-opportunities',
  'ecommerce-product-ideas-research'
 ];
 for(const slug of revised){
  specs.push({path:'/blog/'+slug,canonical:'https://kun-online.com/blog/'+slug,
   text:['الإجابة المختصرة:']});
 }
 const sources={
  'real-cost-per-delivered-order':'https://support.google.com/analytics/answer/13428834?hl=en',
  'order-confirmation-delivery-rate':'https://help.shopify.com/en/manual/fulfillment/managing-orders/order-status',
  'cod-shipping-returns-reconciliation':'https://help.shopify.com/en/manual/fulfillment/managing-orders/returns'
 };
 for(const spec of specs){
  const slug=spec.path.startsWith('/blog/')?spec.path.slice('/blog/'.length):'';
  if(sources[slug])spec.text.push(sources[slug]);
 }
}
function canonical(html){
 const link=[...html.matchAll(/<link\b[^>]*>/gi)]
   .find(x=>/\brel=["']canonical["']/i.test(x[0]))?.[0]||'';
 return link.match(/\bhref=["']([^"']+)["']/i)?.[1]||null;
}
function check(condition,message){if(!condition)throw Error(message);}
async function fetchWithRetry(url){
 let last;
 for(let i=0;i<4;i++){
  try{
   const r=await fetch(url,{redirect:'manual',signal:AbortSignal.timeout(12000),
    headers:{'user-agent':'KunOnline-GEO-Preview-QA/1.0'}});
   if(r.status===200)return {r,html:await r.text()};
   last=Error('HTTP '+r.status+' at '+url);
   if(![404,429,500,502,503,504].includes(r.status))break;
  }catch(e){last=e;}
  if(i<3)await new Promise(resolve=>setTimeout(resolve,1500*(i+1)));
 }
 throw last||Error('Unknown preview fetch failure');
}
async function run(){
 const target=new URL(base);
 check(target.protocol==='https:'&&target.hostname.endsWith('.kun-online-site.pages.dev'),
   'GEO_PREVIEW_BASE must be an HTTPS kun-online-site.pages.dev preview URL');
 const rows=[];
 for(const spec of specs){
  try{
   const {r,html}=await fetchWithRetry(base+spec.path);
   const issues=[];
   if(!/text\/html/i.test(r.headers.get('content-type')||''))issues.push('not-html');
   if(canonical(html)!==spec.canonical)issues.push('canonical-mismatch '+canonical(html));
   if((html.match(/<h1\b/gi)||[]).length!==1)issues.push('h1-not-singular');
   for(const value of spec.text)if(!html.includes(value))issues.push('missing-text '+value);
   for(const value of spec.absent||[])if(html.includes(value))issues.push('outdated-text '+value);
   rows.push({path:spec.path,status:r.status,passed:issues.length===0,issues});
  }catch(err){rows.push({path:spec.path,passed:false,issues:[err.message]});}
 }
 const urlSitemap=base+'/sitemap.xml';
 let sitemapCount=null;
 try{
  const {html,r}=await fetchWithRetry(urlSitemap);
  sitemapCount=[...html.matchAll(/<loc>([^<]+)<\/loc>/g)].length;
  const sourceXml=await fs.readFile(path.join(root,'sitemap.xml'),'utf8');
  const sourceCount=[...sourceXml.matchAll(/<loc>([^<]+)<\/loc>/g)].length;
  check(r.status===200&&sitemapCount===sourceCount,'Preview sitemap='+sitemapCount+' source='+sourceCount);
  rows.push({path:'/sitemap.xml',passed:true,count:sitemapCount});
 }catch(e){rows.push({path:'/sitemap.xml',passed:false,issues:[e.message]});}
 const report={base,checkedAt:new Date().toISOString(),tested:rows.length,
  passed:rows.filter(row=>row.passed).length,rows,notes:[
   'HTTP preview checks do not prove Google indexing, verified bot access or AI citation.',
   'Cloudflare Pages preview may have preview-specific robots/X-Robots rules; do not remove them for SEO.'
  ]};
 await fs.mkdir(path.join(root,'test-results'),{recursive:true});
 await fs.writeFile(path.join(root,'test-results/geo-preview-smoke.json'),JSON.stringify(report,null,2)+'\n');
 console.log('GEO Cloudflare Pages preview smoke '+report.passed+'/'+report.tested+
  ' passed at '+base+'; preview sitemap='+sitemapCount);
 for(const row of rows.filter(row=>!row.passed))console.error('FAIL '+row.path+' '+JSON.stringify(row.issues));
 if(report.passed!==report.tested)process.exitCode=1;
}
run().catch(e=>{console.error(e);process.exitCode=1;});