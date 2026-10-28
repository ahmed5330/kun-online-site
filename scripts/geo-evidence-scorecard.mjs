/**
 * Evidence-only GEO scorecard. No API reads and no secret handling.
 * Optional inputs under test-results/ (ignored by git):
 *  - geo-gsc-inspection.json (output of geo-gsc-inspect.mjs)
 *  - geo-ai-visibility-observations.csv (manual 48-cell test record)
 *  - geo-cloudflare-verified-bots.json (Cloudflare-exported events)
 * This does not authenticate third-party exported data: preserve source provenance separately.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {PLATFORMS,PROMPTS,FIELDS} from './geo-ai-visibility-protocol.mjs';
const ROOT=path.resolve(fileURLToPath(new URL('..',import.meta.url)));
const INPUT=path.join(ROOT,'test-results');
const VALID_STATUS=new Set(['not_run','blocked','observed']);

export function parseCsv(raw){
 const records=[];let row=[],field='',quoted=false;
 for(let i=0;i<raw.length;i++){
  const c=raw[i];
  if(quoted){
   if(c==='"'&&raw[i+1]==='"'){field+='"';i++;}
   else if(c==='"')quoted=false;
   else field+=c;
  }else if(c==='"'){if(field!=='')throw Error('Unexpected quote');quoted=true;}
  else if(c===','){row.push(field);field='';}
  else if(c==='\n'){row.push(field.replace(/\r$/,''));records.push(row);row=[];field='';}
  else field+=c;
 }
 if(quoted)throw Error('Unterminated quoted CSV field');
 if(field!==''||row.length){row.push(field);records.push(row);}
 if(!records.length)throw Error('Empty CSV');
 const headers=records.shift();
 if(headers.join('|')!==FIELDS.join('|'))throw Error('Unexpected AI evidence CSV headers');
 return records.filter(row=>row.some(c=>c!=='')).map((cells,i)=>{
  if(cells.length!==headers.length)throw Error('Invalid column count at row '+(i+2));
  return Object.fromEntries(headers.map((h,j)=>[h,cells[j]]));
 });
}
function isKunUrl(input){
 try{const url=new URL(input);return url.protocol==='https:'&&url.hostname==='kun-online.com';}
 catch{return false;}
}
export function summarizeAi(rows){
 const expected=PLATFORMS.length*PROMPTS.length;
 const keys=new Set(),prompts=new Map(PROMPTS.map(p=>[p.id,p]));
 const totals={planned:expected,supplied:rows.length,observed:0,not_run:0,blocked:0,
  cited:0,mentioned:0,nonbrandedObserved:0,nonbrandedCited:0};
 const byPlatform=Object.fromEntries(PLATFORMS.map(p=>[p,{observed:0,cited:0,mentioned:0,blocked:0,not_run:0}]));
 for(const row of rows){
  const prompt=prompts.get(row.prompt_id);
  if(!prompt||!PLATFORMS.includes(row.platform))throw Error('Unknown prompt or platform');
  const key=row.prompt_id+'|'+row.platform;
  if(keys.has(key))throw Error('Duplicate AI observation '+key);
  keys.add(key);
  if(row.query!==prompt.query||row.category!==prompt.kind||row.locale!==prompt.locale)throw Error('Prompt changed '+key);
  if(!VALID_STATUS.has(row.result_status))throw Error('Unexpected result_status '+key);
  const status=row.result_status;
  totals[status]++;byPlatform[row.platform][status]++;
  if(status!=='observed'){
   if(row.source_cited||row.site_mentioned||row.exact_citation_url)
    throw Error('Unobserved row cannot claim citation or mention: '+key);
   continue;
  }
  if(!row.checked_at||Number.isNaN(Date.parse(row.checked_at))||!row.answer_evidence_reference)
   throw Error('Observed row lacks date or original evidence: '+key);
  if(!['yes','no','unknown'].includes(row.source_cited)||!['yes','no','unknown'].includes(row.site_mentioned))
   throw Error('Observed citation/mention must be yes, no or unknown: '+key);
  if(row.source_cited==='yes'){
   if(!isKunUrl(row.exact_citation_url))throw Error('Citation is not a direct kun-online.com HTTPS URL: '+key);
   totals.cited++;byPlatform[row.platform].cited++;
  }else if(row.exact_citation_url){throw Error('Uncited row cannot include citation URL: '+key);}
  if(row.site_mentioned==='yes'){totals.mentioned++;byPlatform[row.platform].mentioned++;}
  if(prompt.kind!=='navigational'){
   totals.nonbrandedObserved++;
   if(row.source_cited==='yes')totals.nonbrandedCited++;
  }
 }
 totals.missing=expected-rows.length;
 if(totals.missing<0)throw Error('Too many AI rows');
 return {status:'provided_observations_not_independently_verified',...totals,
  citationRate:totals.observed?totals.cited/totals.observed:null,
  discoveryCitationRate:totals.nonbrandedObserved?totals.nonbrandedCited/totals.nonbrandedObserved:null,
  byPlatform};
}
export function summarizeCrawlers(events){
 if(!Array.isArray(events))throw Error('Cloudflare export must be JSON array');
 const groups={};let verified=0,unverified=0;
 for(const e of events){
  if(e.verifiedBot!==true){unverified++;continue;}
  verified++;
  // A User-Agent string is never used to infer identity. The botName must come from provider export.
  const name=String(e.botName||'unknown').slice(0,64);
  const action=String(e.action||'unknown').toLowerCase();
  const key=name;
  groups[key]??={total:0,allowed:0,blocked:0,challenged:0,other:0,httpErrors:0};
  const g=groups[key];g.total++;
  if(['block','managed_challenge','js_challenge','challenge'].includes(action))
   g[action==='block'?'blocked':'challenged']++;
  else if(['allow','skip','log'].includes(action))g.allowed++;
  else g.other++;
  if(Number(e.edgeStatus)>=400)g.httpErrors++;
 }
 return {status:'provided_export_not_independently_authenticated',providedEvents:events.length,
  providerMarkedVerified:verified,unverifiedExcluded:unverified,byBotName:groups,
  warning:'Provider verification and source provenance must be confirmed from Cloudflare; UA-only results are not acceptable.'};
}
export function summarizeGsc(report){
 if(!report||!Array.isArray(report.checked))throw Error('Invalid Google Inspection report');
 const inspected=report.checked.length;
 const indexed=report.checked.filter(x=>x.state==='indexed').length;
 const notIndexed=report.checked.filter(x=>x.state==='not_indexed').length;
 const unknown=inspected-indexed-notIndexed;
 return {status:report.status||'unknown',sitemapUrls:report.sitemapUrlCount??null,
  inspected,indexed,notIndexed,unknown,
  sitewideIndexedTotal:null,
  warning:'Sample inspected count is not GSC Page Indexing site-wide indexed total.'};
}

export function summarizeGscPages(p){
 if(!p||!Number.isInteger(p.indexed)||p.indexed<0||!Number.isInteger(p.notIndexed)||p.notIndexed<0||
  !p.capturedAt||Number.isNaN(Date.parse(p.capturedAt)))throw Error('GSC Pages requires dated official indexed/notIndexed nonnegative totals');
 return {status:'provided_page_indexing_report_not_independently_authenticated',
  capturedAt:p.capturedAt,indexed:p.indexed,notIndexed:p.notIndexed,
  exclusions:Array.isArray(p.exclusions)?p.exclusions:[],providerSource:p.providerSource??null};
}
export function summarizeBing(p){
 if(!p||!p.from||!p.to||Number.isNaN(Date.parse(p.from))||Number.isNaN(Date.parse(p.to))||
  !Number.isInteger(p.totalCitations)||p.totalCitations<0||!Array.isArray(p.citedPages))
  throw Error('Bing AI Performance requires dates, totalCitations and citedPages');
 for(const page of p.citedPages){
  if(!isKunUrl(page.url)||!Number.isInteger(page.citations)||page.citations<0)
   throw Error('Invalid Bing cited page');
 }
 return {status:'provided_bing_export_not_independently_authenticated',
  from:p.from,to:p.to,totalCitations:p.totalCitations,citedPages:p.citedPages};
}

async function optional(name){
 try{return await fs.readFile(path.join(INPUT,name),'utf8');}
 catch(err){if(err.code==='ENOENT')return null;throw err;}
}
export async function run(){
 const [gsc,ai,cloudflare,gscPages,bing]=await Promise.all([
  optional('geo-gsc-inspection.json'),optional('geo-ai-visibility-observations.csv'),
  optional('geo-cloudflare-verified-bots.json'),optional('geo-gsc-pages.json'),optional('geo-bing-ai-performance.json')]);
 const report={checkedAt:new Date().toISOString(),scope:'kun-online.com',sources:{
  gsc:gsc?summarizeGsc(JSON.parse(gsc)):{status:'not_connected_to_native_inspection'},
  gscPageIndexing:gscPages?summarizeGscPages(JSON.parse(gscPages)):{status:'no_native_page_indexing_report',indexed:null,notIndexed:null},
  ai:ai?summarizeAi(parseCsv(ai)):{status:'not_run',planned:PLATFORMS.length*PROMPTS.length,observed:0},
  cloudflare:cloudflare?summarizeCrawlers(JSON.parse(cloudflare)):{status:'no_authenticated_events_export'},
  bing:bing?summarizeBing(JSON.parse(bing)):{status:'not_connected_to_bing_webmaster',citationCount:null}},
  caveats:['Absent evidence is unknown, not zero.', 'Google indexed total requires native Page Indexing coverage.',
   'GA4 referrals are not AI cited URL events.', 'Provider exports must have source provenance verified.']};
 await fs.mkdir(INPUT,{recursive:true});
 await fs.writeFile(path.join(INPUT,'geo-evidence-scorecard.json'),JSON.stringify(report,null,2)+'\n');
 console.log('GEO evidence: GSC '+report.sources.gsc.status+'; AI '+report.sources.ai.status+
  '; Cloudflare '+report.sources.cloudflare.status+'; Bing '+report.sources.bing.status);
 console.log('Report: test-results/geo-evidence-scorecard.json');
 return report;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 run().catch(e=>{console.error(e.message);process.exitCode=1;});
}