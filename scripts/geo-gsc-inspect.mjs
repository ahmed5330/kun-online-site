/**
 * Read-only Search Console URL Inspection. No indexing submissions or tokens persisted.
 * --dry-run lists URLs; --all inspects entire sitemap; default samples priorities.
 * The API returns the Google-indexed version, NOT a live-URL test.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const ROOT=path.resolve(fileURLToPath(new URL('..',import.meta.url)));
export const ORIGIN='https://kun-online.com';
export const SITE_URL='sc-domain:kun-online.com';
export const INSPECT_API='https://searchconsole.googleapis.com/v1/urlInspection/index:inspect';
export const KEY_ROUTES=['/','/methodology/','/services/ecommerce-management/','/blog/product-selection-checklist-20-points'];

export function extractSitemapUrls(xml){
 return [...xml.matchAll(/<loc>\s*(https:\/\/kun-online\.com\/[^<\s]*)\s*<\/loc>/g)].map(m=>m[1]);
}
export function pickInspectionUrls(urls,all=false){
 if(new Set(urls).size!==urls.length)throw Error('Duplicate sitemap URLs');
 if(urls.some(u=>!u.startsWith(ORIGIN+'/')||new URL(u).origin!==ORIGIN))
  throw Error('Sitemap URLs outside canonical origin');
 if(all)return urls;
 const blogs=urls.filter(u=>new URL(u).pathname.startsWith('/blog/')&&new URL(u).pathname!=='/blog/').sort();
 return [...new Set([...KEY_ROUTES.map(r=>ORIGIN+r),...blogs.slice(0,2),...blogs.slice(-2)])]
  .filter(u=>urls.includes(u));
}
export function summarizeInspection(url,payload,inspectedAt){
 const r=payload?.inspectionResult?.indexStatusResult;
 if(!r||typeof r.verdict!=='string')return {url,inspectedAt,state:'unknown',error:'Missing Google verdict'};
 // INDEXING_ALLOWED does not mean that Google indexed a page.
 const state=r.verdict==='PASS'?'indexed':r.verdict==='FAIL'?'not_indexed':'unknown';
 return {url,inspectedAt,state,verdict:r.verdict,coverageState:r.coverageState??null,
  indexingState:r.indexingState??null,robotsTxtState:r.robotsTxtState??null,
  pageFetchState:r.pageFetchState??null,lastCrawlTime:r.lastCrawlTime??null,
  googleCanonical:r.googleCanonical??null,userCanonical:r.userCanonical??null,
  sitemap:r.sitemap??[]};
}
export async function inspectUrl(url,token,fetcher=fetch){
 const response=await fetcher(INSPECT_API,{
  method:'POST',headers:{Authorization:'Bearer '+token,'content-type':'application/json'},
  body:JSON.stringify({inspectionUrl:url,siteUrl:SITE_URL,languageCode:'ar'}),
  signal:AbortSignal.timeout(20000)
 });
 const data=await response.json();
 if(!response.ok)throw Error('GSC URL Inspection '+response.status+': '+String(data?.error?.message||'HTTP error').slice(0,160));
 return summarizeInspection(url,data,new Date().toISOString());
}
export async function run(args=process.argv.slice(2)){
 const dryRun=args.includes('--dry-run'),all=args.includes('--all');
 if(args.some(a=>!['--dry-run','--all'].includes(a)))throw Error('Supported flags: --dry-run, --all');
 const xml=await fs.readFile(path.join(ROOT,'sitemap.xml'),'utf8');
 const urls=extractSitemapUrls(xml);
 if(!urls.length)throw Error('No canonical URLs in sitemap.xml');
 const planned=pickInspectionUrls(urls,all);
 const report={generatedAt:new Date().toISOString(),property:SITE_URL,
  sitemapUrlCount:urls.length,inspectionScope:all?'all-sitemap-urls':'priority-sample',
  checked:[],planned:planned.length,
  limits:['URL Inspection returns the indexed-version status, not a live-page test.',
   'Sample counts cannot prove site-wide indexing.',
   'Search Analytics impressions and deprecated sitemap indexed field are not URL Inspection.']};
 if(dryRun){report.status='dry_run_only';report.plannedUrls=planned;}
 else{
  const token=process.env.GSC_ACCESS_TOKEN;
  if(!token)throw Error('Missing GSC_ACCESS_TOKEN. Use --dry-run or authorize Google OAuth webmasters.readonly.');
  for(const url of planned){
   try{report.checked.push(await inspectUrl(url,token));}
   catch(err){report.checked.push({url,inspectedAt:new Date().toISOString(),state:'unknown',error:String(err.message)});}
  }
  report.status=report.checked.some(v=>v.state==='unknown')?'partial_evidence':'inspections_recorded';
  report.indexedInInspectedSample=report.checked.filter(v=>v.state==='indexed').length;
  report.notIndexedInInspectedSample=report.checked.filter(v=>v.state==='not_indexed').length;
  report.unknownInInspectedSample=report.checked.filter(v=>v.state==='unknown').length;
 }
 const output=path.join(ROOT,'test-results/geo-gsc-inspection.json');
 await fs.mkdir(path.dirname(output),{recursive:true});
 await fs.writeFile(output,JSON.stringify(report,null,2)+'\n');
 console.log('GSC inspection: '+report.status+'; '+report.checked.length+'/'+planned.length+
  ' URLs queried; sitemap='+urls.length);
 console.log('Report: test-results/geo-gsc-inspection.json');
 return report;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 run().catch(err=>{console.error(err.message);process.exitCode=1;});
}