import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import './routine-article-policy.test.mjs';
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
 assert.equal(reviewPublisherPaths(['blog/articles.json','blog/new.html','blog/images/new.webp','sitemap.xml',
  'seo/keyword-map.json','content/publication-log.json']).decision,'APPROVED');
 const b=reviewPublisherPaths(['blog/new.html','robots.txt','.github/workflows/a.yml']);
 assert.equal(b.decision,'BLOCKED');
 assert.equal(b.violations.length,2);
 assert.equal(reviewPublisherPaths(['blog/other.json']).decision,'BLOCKED');
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


const owner='ahmed5330', siteRepo='ahmed5330/kun-online-site', pinnedSha='a'.repeat(40);
function ownerComment(sha=pinnedSha, action='APPROVE',id=20,user={login:owner,type:'User'}){
 return {id,user,body:'KUN-SOLO-'+action+' '+sha,created_at:'2026-10-30T12:00:00Z',updated_at:'2026-10-30T12:00:00Z'};
}
const visualChange=[{filename:'blog/guide.html',status:'modified',
 patch:'@@\n+<script type="application/ld+json">\n+{"@type":"BlogPosting","image":"https://kun-online.com/blog/images/guide.png"}'}];
const solo=(files,extra={})=>reviewPr({number:110,files,body:impact,author:owner,
 headSha:pinnedSha,reviews:[],comments:[],repository:siteRepo,otherPrFiles:[],...extra});

test('Solo-maintainer: repository-scoped owner comment permits only ordinary image-schema change',()=>{
 assert.equal(solo(visualChange).decision,'BLOCKED');
 const result=solo(visualChange,{comments:[ownerComment()]});
 assert.equal(result.decision,'APPROVED');
 assert.equal(result.hasSoloOwnerConsent,true);
 assert.equal(result.hasIndependentApproval,false);
 assert.deepEqual(result.criticalFiles,[]);
});

test('Solo-maintainer: no approval outside the exact repository or owner',()=>{
 const comments=[ownerComment()];
 assert.equal(solo(visualChange,{repository:'ahmed5330/kunonline',comments}).decision,'BLOCKED');
 assert.equal(solo(visualChange,{repository:'ahmed5330/another-project',comments}).decision,'BLOCKED');
 assert.equal(solo(visualChange,{author:'different-owner',comments}).decision,'BLOCKED');
});

test('Solo-maintainer: SHA changes, forged user, bot, edited comment and malformed note fail closed',()=>{
 const changed='b'.repeat(40);
 for(const comments of [
  [ownerComment(changed)], [ownerComment(pinnedSha,'APPROVE',20,{login:'attacker',type:'User'})],
  [ownerComment(pinnedSha,'APPROVE',20,{login:owner,type:'Bot'})],
  [{...ownerComment(),updated_at:'2026-10-30T12:20:00Z'}],
  [{...ownerComment(),body:'KUN-SOLO-APPROVE '+pinnedSha+' extra'}],
  [{...ownerComment(),body:'KUN-SOLO-APPROVE '+pinnedSha.toUpperCase()}]
 ])assert.equal(solo(visualChange,{comments}).decision,'BLOCKED');
 assert.equal(solo(visualChange,{headSha:changed,comments:[ownerComment()]}).decision,'BLOCKED');
});

test('Solo-maintainer: last authentic decision for SHA is authoritative and revocable',()=>{
 assert.equal(solo(visualChange,{comments:[ownerComment(),ownerComment(pinnedSha,'REVOKE',25)]}).decision,'BLOCKED');
 assert.equal(solo(visualChange,{comments:[ownerComment(),ownerComment(pinnedSha,'REVOKE',25),ownerComment(pinnedSha,'APPROVE',30)]}).decision,'APPROVED');
});

test('Solo-maintainer: ordinary owner consent cannot authorize critical directives or infrastructure',()=>{
 for(const files of [
  [{filename:'robots.txt',patch:'+Disallow: /blog'}],
  [{filename:'_headers',patch:'+/*\n+  Content-Signal: noindex'}],
  [{filename:'.github/CODEOWNERS',status:'modified',patch:'+* @owner'}],
  [{filename:'.github/workflows/site-quality.yml',patch:'+permissions: write'}],
  [{filename:'index.html',patch:'@@\n+<link rel="canonical" href="https://attacker.example/">'}],
  [{filename:'blog/guide.html',patch:'@@\n+<meta name="robots" content="noindex">'}],
  [{filename:'blog/guide.html',patch:'@@\n-<link rel="canonical" href="https://kun-online.com/blog/guide">'}]
 ]) {
  const verdict=solo(files,{comments:[ownerComment()]});
  assert.equal(verdict.decision,'BLOCKED',files[0].filename);
  assert.ok(verdict.criticalFiles.length>0);
 }
});

test('Solo-maintainer: independent changes requested and open PR overlap still block',()=>{
 const reviews=[{state:'CHANGES_REQUESTED',commit_id:pinnedSha,
  user:{login:'second-reviewer',type:'User'},submitted_at:'2026-10-30T13:00:00Z'}];
 assert.equal(solo(visualChange,{comments:[ownerComment()],reviews}).decision,'BLOCKED');
 assert.equal(solo(visualChange,{comments:[ownerComment()],
  otherPrFiles:[{number:123,files:['blog/guide.html']}]}).decision,'BLOCKED');
 assert.equal(solo(visualChange,{comments:[ownerComment()],body:'SEO impact: fine'}).decision,'BLOCKED');
});


test('Solo-maintainer: minified pages with unchanged crawl directives can be image-only reviewed',()=>{
 const prefix='<!doctype html><head><link rel="canonical" href="https://kun-online.com/blog/"><meta name="robots" content="index,follow"></head><body>';
 const file={filename:'blog/index.html',patch:
  '@@\n-'+prefix+'<main>Old content</main></body>\n+'+prefix+
  '<main><img src="/assets/visuals/editorial-analytics.svg" alt="Original illustration"></main></body>'};
 const v=solo([file],{comments:[ownerComment()]});
 assert.equal(v.decision,'APPROVED');
 assert.deepEqual(v.criticalFiles,[]);
 const danger={...file,patch:file.patch.replace(
   '+<!doctype html><head><link rel="canonical" href="https://kun-online.com/blog/">',
   '+<!doctype html><head><link rel="canonical" href="https://wrong.example/blog/">')};
 assert.equal(solo([danger],{comments:[ownerComment()]}).decision,'BLOCKED');
});


const criticalImpact=impact+'\nRisk review: The owner accepts the specific documented release risk after reviewing its scope.\nValidation: All exact-head release tests must pass before merge; no automatic publication.';
const criticalComment=(sha=pinnedSha,action='APPROVE',id=40,user={login:owner,type:'User'})=>
 ({...ownerComment(sha,action,id,user),body:'KUN-SOLO-CRITICAL-'+action+' '+sha});
const criticalFiles=[
 {filename:'.github/workflows/scheduled-blog-publisher.yml',status:'modified',patch:'+name: revised publisher'},
 {filename:'scripts/seo-geo-general-reviewer.mjs',status:'modified',patch:'+// explicit owner policy'}
];
test('Solo critical: explicit exact-head consent permits critical controls without claiming independent review',()=>{
 for(const f of criticalFiles){
  const result=solo([f],{body:criticalImpact,comments:[criticalComment()]});
  assert.equal(result.decision,'APPROVED',f.filename);
  assert.equal(result.hasSoloOwnerCriticalConsent,true);
  assert.equal(result.hasIndependentApproval,false);
  assert.ok(result.warnings.some(s=>s.includes('not an independent human review')));
 }
});
test('Solo critical: reviewer implementation and tests require critical consent themselves',()=>{
 for(const filename of ['scripts/seo-geo-general-reviewer.mjs','scripts/routine-article-policy.mjs','tests/seo-geo-general-reviewer.test.mjs']){
  assert.equal(solo([{filename,patch:'+// policy'}]).decision,'BLOCKED');
  assert.equal(solo([{filename,patch:'+// policy'}],{comments:[ownerComment()],body:criticalImpact}).decision,'BLOCKED');
 }
});
test('Solo critical: revocation withdraws consent and ordinary reapproval cannot restore critical consent',()=>{
 for(const revoke of [ownerComment(pinnedSha,'REVOKE',50),criticalComment(pinnedSha,'REVOKE',50)]){
  assert.equal(solo(criticalFiles,{body:criticalImpact,comments:[criticalComment(),revoke]}).decision,'BLOCKED');
  assert.equal(solo(criticalFiles,{body:criticalImpact,comments:[criticalComment(),revoke,ownerComment(pinnedSha,'APPROVE',60)]}).decision,'BLOCKED');
  assert.equal(solo(criticalFiles,{body:criticalImpact,comments:[criticalComment(),revoke,criticalComment(pinnedSha,'APPROVE',60)]}).decision,'APPROVED');
 }
});
test('Solo critical: stale, forged, bot, edited and malformed markers fail closed',()=>{
 for(const comments of [[criticalComment('b'.repeat(40))],
  [criticalComment(pinnedSha,'APPROVE',40,{login:'attacker',type:'User'})],
  [criticalComment(pinnedSha,'APPROVE',40,{login:owner,type:'Bot'})],
  [{...criticalComment(),updated_at:'2026-10-30T14:00:00Z'}],
  [{...criticalComment(),body:criticalComment().body+' extra'}],
  [{...criticalComment(),body:criticalComment().body.toLowerCase()}]]){
  assert.equal(solo(criticalFiles,{comments,body:criticalImpact}).decision,'BLOCKED');
 }
 assert.equal(solo(criticalFiles,{body:criticalImpact,comments:[criticalComment()],headSha:'b'.repeat(40)}).decision,'BLOCKED');
});
test('Solo critical: repository and PR-author isolation remain mandatory',()=>{
 for(const extra of [{repository:'ahmed5330/kunonline'},{repository:'another/repo'},{author:'another-owner'}])
  assert.equal(solo(criticalFiles,{body:criticalImpact,comments:[criticalComment()],...extra}).decision,'BLOCKED');
});
test('Solo critical: owner consent cannot waive impacts, overlaps or changes requested',()=>{
 const extra={body:criticalImpact,comments:[criticalComment()]};
 const files=[...criticalFiles,{filename:'robots.txt',patch:'+Disallow: /private'}];
 assert.equal(solo(files,{...extra,body:'Risk review: This specific risk has been reviewed and understood.\nValidation: All release tests remain mandatory and no merge is automatic.'}).decision,'BLOCKED');
 assert.equal(solo(criticalFiles,{...extra,otherPrFiles:[{number:120,files:[criticalFiles[0].filename]}]}).decision,'BLOCKED');
 assert.equal(solo(criticalFiles,{...extra,reviews:[{state:'CHANGES_REQUESTED',commit_id:pinnedSha,user:{login:'human-reviewer',type:'User'},submitted_at:'2026-11-13T04:00:00Z'}]}).decision,'BLOCKED');
});
test('Solo critical: missing or placeholder risk and validation sections block owner route',()=>{
 for(const body of [impact,impact+'\nRisk review: TODO describe risk\nValidation: All required tests must pass before release',
  impact+'\nRisk review: Specific workflow change accepted after reading its diff',
  impact+'\nRisk review: Specific workflow change accepted after reading its diff\nValidation: TBD explain checks']){
  const result=solo(criticalFiles,{body,comments:[criticalComment()]});
  assert.equal(result.decision,'BLOCKED');
  assert.ok(result.violations.some(s=>s.includes('OWNER_CRITICAL_RISK_REVIEW')));
 }
});
test('Solo critical: independent current-head approval remains an alternative',()=>{
 const reviews=[{state:'APPROVED',commit_id:pinnedSha,user:{login:'independent-human',type:'User'},submitted_at:'2026-11-13T04:00:00Z'}];
 const result=solo(criticalFiles,{reviews});
 assert.equal(result.decision,'APPROVED');
 assert.equal(result.hasIndependentApproval,true);
 assert.equal(result.hasSoloOwnerCriticalConsent,false);
});

test('Solo critical: limited publication consent cannot authorize crawl, security, routine policy or unrelated workflow changes',()=>{
 for(const file of [
  {filename:'robots.txt',patch:'+Disallow: /blog'},
  {filename:'_headers',patch:'+/*\n+ Content-Signal: noindex'},
  {filename:'_redirects',patch:'+/blog /elsewhere 301'},
  {filename:'wrangler.toml',patch:'+workers_dev=true'},
  {filename:'.github/CODEOWNERS',status:'modified',patch:'+* @owner'},
  {filename:'.github/workflows/site-quality.yml',patch:'+permissions: write'},
  {filename:'scripts/routine-article-policy.mjs',patch:'+// broaden routine exemption'},
  {filename:'index.html',patch:'+<link rel="canonical" href="https://wrong.example/">'},
  {filename:'blog/guide.html',patch:'+<meta name="robots" content="noindex">'}]){
  const result=solo([...criticalFiles,file],{body:criticalImpact,comments:[criticalComment()]});
  assert.equal(result.decision,'BLOCKED',file.filename);
 }
});
