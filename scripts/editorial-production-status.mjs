/**
 * Editorial production planner. Never silently publishes AI-generated copy.
 * Reads the 100-topic canonical plan and current approved/public inventory.
 * Emits deterministic JSON suitable for a recurring GitHub Actions issue.
 */
import fs from 'node:fs';
const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const plan=read('seo-content-map.json');
const articles=read('blog/articles.json');
const log=read('content/publication-log.json');
const entries=fs.readdirSync('content/approved').filter(x=>x.endsWith('.json')).map(x=>read('content/approved/'+x));
const published=new Set(articles.map(x=>x.slug));
const logged=new Set(log.map(x=>x.slug));
const pending=entries.filter(x=>!published.has(x.slug)&&!logged.has(x.slug));
const done=new Set((read('seo/published-series-mapping.json').seriesMatches||[]).map(x=>x.article_id));
const preparedIds=new Set(pending.map(x=>x.article_id));
const next=plan.queue.find(x=>!done.has(x.article_id)&&!preparedIds.has(x.article_id)&&x.status!=='published');
const result={
  generatedAt:new Date().toISOString(),
  nextArticle:next ? {
    article_id:next.article_id,original_title:next.original_title,brief:next.brief,
    research_space:next.research_space,chapter:next.chapter,
    currentStatus:next.status,draft_file:next.draft_file||null
  }:null,
  approvedReady:pending.length,approvedSlugs:pending.map(x=>x.slug),approvedUpcoming:pending.map(x=>({article_id:x.article_id,slug:x.slug,eligibleFrom:x.eligibleFrom})).sort((a,b)=>a.article_id-b.article_id),
  totalPublicArticles:articles.length,totalSeriesPublished:done.size,
  checklist:[
    'Fresh research and primary sources; avoid unsupported claims or fabricated numbers',
    'Arabic original 1500–2200 words; single H1 and at least 5 H2 headings',
    'Original 1200x630 PNG and complete SEO metadata/BlogPosting',
    'Self canonical, indexed-eligible HTML, 3 outbound and 2 inbound relevant blog links',
    'Editorial signoff recorded in content/approved/<slug>.json',
    'Publish via guarded workflow only; verify production route and sitemap',
    'Check Google Search Console Page Indexing and URL Inspection independently'
  ]
};
const output=JSON.stringify(result,null,2)+'\n';
if(process.argv.includes('--json'))process.stdout.write(output);
else {
 console.log('Approved unpublished bundles: '+pending.length);
 console.log('Next series topic: '+(next ? next.article_id+' - '+next.original_title : 'none'));
}
