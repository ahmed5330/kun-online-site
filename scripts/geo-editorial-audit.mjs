/**
 * GEO-05 editorial discovery audit (read-only).
 *
 * Reports visible source and answer-first opportunities in published guides.
 * It does NOT score generative-engine ranking, infer AI citations, or validate
 * external claims; editorial judgement and original evidence are still needed.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root=path.resolve(fileURLToPath(new URL('..',import.meta.url)));
const base='https://kun-online.com/blog/';
const materialSlugs=new Set([
  'real-cost-per-delivered-order',
  'order-confirmation-delivery-rate',
  'cod-shipping-returns-reconciliation',
  'inventory-barcode-bundle-tracking',
  'customer-funnel-guide',
  'product-profitability-before-launch',
  'ecommerce-complete-journey-guide'
]);
const stripTags=s=>s.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,' ')
 .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi,' ')
 .replace(/<[^>]*>/g,' ').replace(/&(?:nbsp|amp|lt|gt|quot);/gi,' ')
 .replace(/\s+/g,' ').trim();

export function inspectPublishedArticle(html,meta){
 const slug=meta.slug;
 const canonical=html.match(/<link\b[^>]*rel=["']canonical["'][^>]*>/i)?.[0].match(/href=["']([^"']+)["']/i)?.[1]||null;
 const title=stripTags(html.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i)?.[1]||'');
 const h1=(html.match(/<h1\b/gi)||[]).length;
 const scripts=[...html.matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
 let posting=null,badSchema=false;
 for(const s of scripts){try{const j=JSON.parse(s[1]);if(j['@type']==='BlogPosting')posting=j;}catch{badSchema=true;}}
 const main=html.match(/<main\b[^>]*>([\s\S]*?)<\/main>/i)?.[1]||'';
 const article=main.match(/<article\b[^>]*>([\s\S]*?)<\/article>/i)?.[1]||main;
 const visible=stripTags(article);
 const headings=[...article.matchAll(/<h2\b[^>]*>([\s\S]*?)<\/h2>/gi)].map(m=>stripTags(m[1]));
 const links=[...article.matchAll(/\bhref=["']([^"'#]+)["']/gi)].map(m=>m[1]);
 const external=[...new Set(links.filter(u=>/^https?:\/\//i.test(u) &&
   !/^https?:\/\/(?:www\.)?kun-online\.com\b/i.test(u) &&
   !/^https?:\/\/(?:wa\.me|www\.facebook\.com|www\.instagram\.com)\b/i.test(u)))];
 const blogLinks=[...new Set(links.filter(u=>/^\/blog\/[a-z0-9-]+/.test(u)))];
 const intro=stripTags(article.slice(0,2500));
 const directAnswerCue=/(?:الإجابة المختصرة|الجواب المختصر|باختصار|الخلاصة|ملخص سريع|إجابة سريعة)/i.test(intro);
 const hasExample=/مثال|سيناريو|تجربة افتراضية/.test(visible);
 const exampleLabeled=/(افتراض|افتراضي|توضيحي|مثال تعليمي)/.test(visible);
 const blockers=[];
 if(!title)blockers.push('missing-title');
 if(canonical!==base+slug)blockers.push('canonical-mismatch');
 if(h1!==1)blockers.push('h1-count');
 if(!posting||badSchema)blockers.push('blogposting-invalid');
 if(posting&&posting.dateModified!==meta.dateModified)blockers.push('dateModified-registry-mismatch');
 if(!main)blockers.push('missing-main');
 const opportunities=[];
 if(!directAnswerCue)opportunities.push('review-answer-first-paragraph');
 if(external.length===0)opportunities.push('review-primary-source-links');
 if(blogLinks.length<2)opportunities.push('review-related-guides');
 if(hasExample&&!exampleLabeled)opportunities.push('review-example-labeling');
 if(posting?.author?.['@type']==='Organization'||posting?.author?.['@id'])
  opportunities.push('consider-verified-human-editor');
 return {slug,title,canonical,blockers,opportunities,
  signals:{hasQuestionH2:headings.some(h=>h.includes('؟')),h2Count:headings.length,
   externalSourcesCount:external.length,relatedBlogLinks:blogLinks.length,
   hasIntroAnswerCue:directAnswerCue,exampleLabeled:exampleLabeled,
   wordCountInRegistry:meta.wordCount||null},
  sourceLinkExamples:external.slice(0,5)};
}

export async function run(){
 const articles=JSON.parse(await fs.readFile(path.join(root,'blog/articles.json'),'utf8'));
 const rows=[];
 for(const meta of articles){
  const file=path.join(root,'blog',meta.slug+'.html');
  const html=await fs.readFile(file,'utf8');
  rows.push(inspectPublishedArticle(html,meta));
 }
 const gaps=rows.filter(row=>row.blockers.length);
 const priority=[...rows].sort((a,b)=>{
  const aFocus=materialSlugs.has(a.slug)?1:0,bFocus=materialSlugs.has(b.slug)?1:0;
  return bFocus-aFocus||b.opportunities.length-a.opportunities.length||a.slug.localeCompare(b.slug);
 }).slice(0,10).map(row=>({slug:row.slug,topics:row.opportunities,sourceSignals:row.signals}));
 const report={checkedAt:new Date().toISOString(),mode:'read-only-source',
   observedArticles:rows.length,technicalBlockers:gaps.length,rows,editorialShortlist:priority,
   limitations:[
    'These are literal HTML/metadata signals, not proof of source accuracy, helpfulness or citation by an AI engine.',
    'Missing external references is a review opportunity, not an automatic claim that an article is false.',
    'Answer-first cues are detected by phrases only; editors must read the actual paragraph before rewriting.',
    'Do not publish customer claims, staff credentials or testimonials without original source evidence and permission.'
   ]};
 await fs.mkdir(path.join(root,'test-results'),{recursive:true});
 await fs.writeFile(path.join(root,'test-results/geo-editorial-audit.json'),JSON.stringify(report,null,2)+'\n');
 console.log('GEO editorial inventory: '+rows.length+' articles; technical blockers: '+gaps.length+
  '; answer-first review: '+rows.filter(r=>!r.signals.hasIntroAnswerCue).length+
  '; source-link review: '+rows.filter(r=>!r.signals.externalSourcesCount).length);
 for(const p of priority)console.log('REVIEW '+p.slug+': '+p.topics.join(', '));
 if(gaps.length){for(const x of gaps)console.error('BLOCK '+x.slug+': '+x.blockers.join(', '));process.exitCode=1;}
 return report;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 run().catch(e=>{console.error(e);process.exitCode=1;});
}
