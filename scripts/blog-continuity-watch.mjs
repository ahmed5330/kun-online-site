/**
 * Cairo-day publishing watchdog.
 * Inspects committed registry, approved queue, live page, and sitemap.
 * Does NOT claim anything about Google's indexing status.
 * On missing content, emits an actionable verdict for the workflow to retry.
 */
import fs from 'node:fs';
import assert from 'node:assert/strict';
const root='.';
const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const format=new Intl.DateTimeFormat('en-CA',{timeZone:'Africa/Cairo',year:'numeric',month:'2-digit',day:'2-digit'});
const parts=format.formatToParts(new Date());
const val=t=>parts.find(x=>x.type===t)?.value;
const today=[val('year'),val('month'),val('day')].join('-');
assert.match(today,/^\d{4}-\d\d-\d\d$/);
const pub=read('content/publication-log.json');
const publicBlog=read('blog/articles.json');
const published=pub.find(x=>x.date===today);
const registered=new Set(publicBlog.map(x=>x.slug));
const bundles=fs.readdirSync('content/approved').filter(x=>x.endsWith('.json')).map(x=>read('content/approved/'+x));
const logSlugs=new Set(pub.map(x=>x.slug));
const eligible=bundles.filter(x=>x.approved===true&&!registered.has(x.slug)&&!logSlugs.has(x.slug)&&x.eligibleFrom<=today);
const upcoming=bundles.filter(x=>x.approved===true&&!registered.has(x.slug)&&!logSlugs.has(x.slug)&&x.eligibleFrom>today);
const output={today,status:null,publishedSlug:published?.slug||null,eligible:eligible.map(x=>x.slug),upcoming:upcoming.map(x=>({slug:x.slug,eligibleFrom:x.eligibleFrom})),checks:[]};
const url='https://kun-online.com';
async function fetchWithTimeout(path) {
  const r=await fetch(url+path,{redirect:'follow',signal:AbortSignal.timeout(18000),headers:{'User-Agent':'KunOnlineBlogContinuity/1.0'}});
  return {status:r.status,url:r.url,text:await r.text()};
}
if(published){
  assert.ok(registered.has(published.slug),'Published slug is missing from public registry');
  try{
    const [page,sitemap]=await Promise.all([
      fetchWithTimeout('/blog/'+published.slug),fetchWithTimeout('/sitemap.xml')
    ]);
    const canonical=url+'/blog/'+published.slug;
    output.checks=[
      {type:'article_http_200',ok:page.status===200 && page.url===canonical},
      {type:'article_canonical',ok:page.text.includes('rel="canonical" href="'+canonical+'"')},
      {type:'sitemap_http_200',ok:sitemap.status===200},
      {type:'sitemap_contains_new_article',ok:sitemap.text.includes('<loc>'+canonical+'</loc>')}
    ];
    output.status=output.checks.every(x=>x.ok)?'published_and_live':'published_but_not_live';
  }catch(error){output.status='live_check_unavailable';output.error=error.message}
} else if(eligible.length){
  output.status='missed_eligible_publication';
}else if(upcoming.length) {
  output.status='waiting_for_eligibility';
} else {
  output.status='approved_queue_depleted';
}
console.log(JSON.stringify(output,null,2));
if(process.env.GITHUB_OUTPUT) {
  fs.appendFileSync(process.env.GITHUB_OUTPUT,'verdict='+output.status+'\n');
  fs.appendFileSync(process.env.GITHUB_OUTPUT,'published='+(published?'yes':'no')+'\n');
}
if(process.env.GITHUB_STEP_SUMMARY) {
  fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY,'## Blog continuity / '+today+'\n\n'+
  'Verdict: **'+output.status+'**\n\n'+
  'Published: '+(output.publishedSlug||'none')+'\n\n'+
  'Eligible: '+(output.eligible.join(', ')||'none')+'\n\n'+
  'Upcoming: '+upcoming.length+'\n\n'+
  'Google indexing: **not tested**.\n');
}
