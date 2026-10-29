import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {classifyFile,classifySet,reviewPublisherPaths,reviewPr,reviewPush}
 from '../scripts/seo-geo-general-reviewer.mjs';

const impact='SEO impact: Preserve existing canonicals and search snippets.\nGEO impact: Preserve evidence and answer content on page.';
const r=(files,extra={})=>reviewPr({
 number:17,files,body:impact,otherPrFiles:[],author:'author',headSha:'abc',
 reviews:[],...extra
});
test('General reviewer: review lifecycle refreshes the same PR gate with read-only permissions',()=>{
 const workflow=readFileSync(new URL('../.github/workflows/seo-geo-general-reviewer.yml',import.meta.url),'utf8');
 assert.match(workflow,/pull_request_review:\s*\n\s+types: \[submitted, edited, dismissed\]/);
 assert.match(workflow,/if: github.event_name == 'pull_request' \|\| github.event_name == 'pull_request_review'/);
 assert.match(workflow,/group: seo-geo-general-review-\$\{\{ github.event.pull_request.number \|\| github.ref \}\}/);
 assert.match(workflow,/permissions:\s*\n\s+contents: read\s*\n\s+pull-requests: read/);
 assert.doesNotMatch(workflow,/pull_request_target|checks: write|contents: write/);
});
test('General reviewer: article #21 remains sensitive through approval and revocation lifecycle',()=>{
 const files=[{filename:'content/approved/sales-price-vs-real-ecommerce-profit.html.ready',status:'added',
  patch:'@@\n+<link rel="canonical" href="https://kun-online.com/blog/sales-price-vs-real-ecommerce-profit">\n+<script type="application/ld+json">'}];
 const approval={state:'APPROVED',commit_id:'abc',user:{login:'independent',type:'User'},submitted_at:'2026-10-29T08:00:00Z'};
 assert.equal(r(files).decision,'BLOCKED');
 assert.equal(r(files,{reviews:[approval]}).decision,'APPROVED');
 assert.equal(r(files,{headSha:'new-head',reviews:[approval]}).decision,'BLOCKED');
 assert.equal(r(files,{reviews:[{...approval,state:'DISMISSED'}]}).decision,'BLOCKED');
 assert.equal(r(files,{reviews:[approval,{...approval,state:'CHANGES_REQUESTED',submitted_at:'2026-10-29T08:01:00Z'}]}).decision,'BLOCKED');
});
test('General reviewer: shared content is not mislabeled SEO-only or GEO-only',()=>{
 assert.equal(classifyFile('blog/real-cost-per-delivered-order.html'),'SHARED_SEO_GEO');
 assert.equal(classifyFile('services/ecommerce-management/index.html'),'SHARED_SEO_GEO');
 assert.equal(classifyFile('docs/geo/geo-12-cloudflare-verified-evidence.md'),'GEO_ONLY');
 assert.equal(classifyFile('seo/keyword-map.json'),'SEO_ONLY');
 assert.equal(classifySet(['docs/geo/a.md','seo/keyword-map.json']),'SHARED_SEO_GEO');
});
test('General reviewer: shared HTML requires independent SEO and GEO impact notes',()=>{
 const files=[{filename:'blog/real-cost-per-delivered-order.html',patch:''}];
 assert.equal(r(files).decision,'APPROVED');
 const fail=r(files,{body:'SEO impact: Improve search snippets.'});
 assert.equal(fail.decision,'BLOCKED');
 assert.ok(fail.violations.some(x=>x.includes('MISSING_GEO_IMPACT')));
});
test('General reviewer: overlapping open PR files block merging regardless of owner',()=>{
 const v=r([{filename:'blog/test.html'}],{otherPrFiles:[
  {number:18,files:['docs/geo/test.md','blog/test.html']},
  {number:19,files:['blog/elsewhere.html']}]});
 assert.equal(v.decision,'BLOCKED');
 assert.equal(v.overlapCount,1);
 assert.ok(v.violations.some(x=>x.includes('#18')));
});
test('General reviewer: independent PRs with disjoint files are allowed',()=>{
 const v=r([{filename:'blog/test.html'}],{otherPrFiles:[{number:19,files:['blog/different.html']}]});
 assert.equal(v.decision,'APPROVED');
});
test('General reviewer: robots and canonical changes need approved review on head commit',()=>{
 const files=[{filename:'robots.txt',patch:'+Disallow: /blog'}];
 assert.equal(r(files).decision,'BLOCKED');
 const approved={state:'APPROVED',commit_id:'abc',user:{login:'different',type:'User'},submitted_at:'2026-10-29T01:00:00Z'};
 assert.equal(r(files,{reviews:[approved]}).decision,'APPROVED');
 const stale={...approved,commit_id:'previous-sha'};
 assert.equal(r(files,{reviews:[stale]}).decision,'BLOCKED');
});
test('General reviewer: PR author and bot cannot self-approve dangerous changes',()=>{
 const f=[{filename:'index.html',patch:'@@\n+<link rel="canonical" href="https://example.com/">'}];
 assert.equal(r(f,{reviews:[{state:'APPROVED',commit_id:'abc',user:{login:'author',type:'User'}}]}).decision,'BLOCKED');
 assert.equal(r(f,{reviews:[{state:'APPROVED',commit_id:'abc',user:{login:'a-bot',type:'Bot'}}]}).decision,'BLOCKED');
});
test('General reviewer: newer changes requested cancel an earlier approval',()=>{
 const f=[{filename:'robots.txt'}];
 const reviews=[
  {state:'APPROVED',commit_id:'abc',user:{login:'reviewer',type:'User'},submitted_at:'2026-10-29T01:00:00Z'},
  {state:'CHANGES_REQUESTED',commit_id:'abc',user:{login:'reviewer',type:'User'},submitted_at:'2026-10-29T01:10:00Z'}
 ];
 assert.equal(r(f,{reviews}).decision,'BLOCKED');
});
test('General reviewer: ordinary GEO-only documentation can pass',()=>{
 const v=r([{filename:'docs/geo/daily-status.md'}],{body:'Document verified crawler data'});
 assert.equal(v.decision,'APPROVED');
 assert.equal(v.scope,'GEO_ONLY');
});
test('General reviewer: publisher can modify only its approved publication files',()=>{
 assert.equal(reviewPublisherPaths(['blog/new.html','blog/images/new.webp','sitemap.xml',
  'seo/keyword-map.json','content/publication-log.json']).decision,'APPROVED');
 const b=reviewPublisherPaths(['blog/new.html','robots.txt','.github/workflows/a.yml']);
 assert.equal(b.decision,'BLOCKED');
 assert.equal(b.violations.length,2);
});
test('General reviewer: publisher rejects duplicate staged files',()=>{
 assert.equal(reviewPublisherPaths(['sitemap.xml','sitemap.xml']).decision,'BLOCKED');
});
test('General reviewer: direct main push without PR or publisher identity gets flagged',()=>{
 assert.equal(reviewPush({sha:'abc',actor:'author',subject:'fix: change robots',prNumbers:[]}).decision,'BLOCKED');
 assert.equal(reviewPush({sha:'abc',actor:'author',subject:'fix: patch',prNumbers:[42]}).decision,'APPROVED');
});
test('General reviewer: recognized publisher commit is not mislabeled unauthorized',()=>{
 const v=reviewPush({sha:'abc',actor:'github-actions[bot]',
  subject:'blog: publish one pre-approved article (Cairo date guard)',prNumbers:[]});
 assert.equal(v.decision,'APPROVED');
 assert.equal(v.source,'known_publisher_automation');
 assert.equal(reviewPush({sha:'abc',actor:'hacker',
   subject:'blog: publish one pre-approved article (Cairo date guard)',prNumbers:[]}).decision,'BLOCKED');
});

test('General reviewer: writing about noindex in docs/tests is not a real canonical policy change',()=>{
 const v=r([{filename:'docs/geo/indexing-notes.md',
  patch:'@@\n+Never claim noindex is a proof that a page was not visited.'}],{
  body:'GEO documentation and evidence'});
 assert.equal(v.decision,'APPROVED');
});
test('General reviewer: adding first CODEOWNERS is safe, later modification needs human review',()=>{
 assert.equal(r([{filename:'.github/CODEOWNERS',status:'added'}],{body:'Initial owner mapping'}).decision,'APPROVED');
 assert.equal(r([{filename:'.github/CODEOWNERS',status:'modified'}],{body:'Change owner mapping'}).decision,'BLOCKED');
});


test('General reviewer: accept bullet-form SEO/GEO impact explanations in PR bodies',()=>{
 const body='- SEO impact: No canonical or search performance changes are expected.\n- GEO impact: The crawler verification policy remains unchanged.';
 const v=r([{filename:'blog/new-guide.html'}],{body});
 assert.equal(v.decision,'APPROVED');
});

test('General reviewer: reject boilerplate impacts left in PR template',()=>{
 const v=r([{filename:'blog/delivery-guide.html'}],{body:'SEO impact: TODO — describe search effect.\nGEO impact: Describe how AI answer citations change.'});
 assert.equal(v.decision,'BLOCKED');
 assert.ok(v.violations.some(s=>s.includes('MISSING_SEO_IMPACT')));
 assert.ok(v.violations.some(s=>s.includes('MISSING_GEO_IMPACT')));
});

test('General reviewer: outstanding changes-requested from another human vetoes approval',()=>{
 const reviews=[
  {state:'APPROVED',commit_id:'abc',user:{login:'reviewer-a',type:'User'},submitted_at:'2026-10-29T00:00:00Z'},
  {state:'CHANGES_REQUESTED',commit_id:'abc',user:{login:'reviewer-b',type:'User'},submitted_at:'2026-10-29T00:01:00Z'}
 ];
 const v=r([{filename:'robots.txt'}],{reviews});
 assert.equal(v.decision,'BLOCKED');
});
