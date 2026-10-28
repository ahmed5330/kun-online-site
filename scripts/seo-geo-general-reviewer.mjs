/**
 * SEO/GEO General Reviewer — change ownership, overlap and publish safety.
 * Read-only GitHub API. Does not write status/labels, merge PRs or mutate production.
 * PR mode: checks evidence, shared impact and overlapping open PR file paths.
 * Staged publisher mode: checks ONLY the already-approved site's article release paths.
 * Push audit: detects unauthorized direct pushes after the fact. Branch rules are
 * still necessary to prevent a bypass before a push reaches main.
 */
import fs from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const ROOT=path.resolve(fileURLToPath(new URL('..',import.meta.url)));
const OUT=path.join(ROOT,'test-results','seo-geo-general-review.json');

const PUBLISH_PATHS=[
 /^blog\/(?:[^/]+\.html|images\/[^/]+\.(?:webp|png|jpg|jpeg))$/i,
 /^seo-content-map\.json$/,
 /^seo\/(?:keyword-map|published-series-mapping)\.json$/,
 /^sitemap\.xml$/,
 /^content\/publication-log\.json$/
];
const HIGH_RISK=/^(?:robots\.txt|_headers|_redirects|wrangler(?:\.[^/]*)?\.toml|functions\/|\.github\/CODEOWNERS$)/;
const CONTENT=/^(?:index\.html|(?:blog|services|system|gulf|pricing|consultations|methodology|content)\/|[^/]+\.html$)/;
const SEO=/^(?:seo\/|seo-content-map\.json$|sitemap\.xml$|robots\.txt$|_redirects$|scripts\/seo-|tests\/seo-)/;
const GEO=/^(?:docs\/geo\/|scripts\/geo-|tests\/geo-|geo\/)/;
const SHARED=/^(?:index\.html|(?:blog|services|system|gulf|pricing|consultations|methodology|content)\/|sitemap\.xml$|robots\.txt$|_headers$|_redirects$)/;
const INFRA=/^(?:\.github\/|package\.json$|assets\/|scripts\/refresh_site\.py$|scripts\/seo-geo-general-reviewer\.mjs$|tests\/seo-geo-general-reviewer\.test\.mjs$)/;
const SENSITIVE_ADD=/^\+[^+].*(?:<link[^>]*rel=["']canonical|<meta[^>]*name=["']robots|<meta[^>]*name=["']googlebot|noindex|nofollow|<script[^>]*application\/ld\+json|Content-Signal:|Disallow:|Allow:)/im;

export function classifyFile(file){
 if(SHARED.test(file)||CONTENT.test(file))return 'SHARED_SEO_GEO';
 if(SEO.test(file))return 'SEO_ONLY';
 if(GEO.test(file))return 'GEO_ONLY';
 if(INFRA.test(file))return 'TECHNICAL_INFRASTRUCTURE';
 return 'OTHER';
}
export function classifySet(files){
 const classes=[...new Set(files.map(x=>classifyFile(typeof x==='string'?x:x.filename)))];
 if(classes.includes('SHARED_SEO_GEO')||(classes.includes('SEO_ONLY')&&classes.includes('GEO_ONLY')))
  return 'SHARED_SEO_GEO';
 if(classes.includes('SEO_ONLY'))return 'SEO_ONLY';
 if(classes.includes('GEO_ONLY'))return 'GEO_ONLY';
 if(classes.includes('TECHNICAL_INFRASTRUCTURE'))return 'TECHNICAL_INFRASTRUCTURE';
 return 'OTHER';
}
export function reviewPublisherPaths(files){
 const rejected=files.filter(f=>!PUBLISH_PATHS.some(rule=>rule.test(f)));
 const duplicates=files.filter((f,i)=>files.indexOf(f)!==i);
 return {decision:rejected.length||duplicates.length?'BLOCKED':'APPROVED',
  owner:'CONTENT_PUBLISHING',changedFiles:files,
  violations:[...rejected.map(f=>'Publisher may not change '+f),...duplicates.map(f=>'Duplicate changed path '+f)],
  limits:['This validates allowed publication paths, not article quality.','npm test/editorial approval must also pass.']};
}
function bodyHasImpact(body,label){
 const escaped=label==='SEO'?'SEO':'GEO';
 return new RegExp('(?:^|\\n)\\s*'+escaped+'\\s+impact\\s*:\\s*[^\\n\\r]{8,}','i').test(body||'');
}
function matchesApproval(reviews,author,headSha){
 const latest=new Map();
 for(const r of reviews){
  if(!r.user?.login||r.user.login===author||r.user.type==='Bot')continue;
  if(!['APPROVED','CHANGES_REQUESTED','DISMISSED'].includes(r.state))continue;
  const cur=latest.get(r.user.login);
  if(!cur||String(r.submitted_at||'')>=String(cur.submitted_at||''))latest.set(r.user.login,r);
 }
 return [...latest.values()].some(r=>r.state==='APPROVED'&&r.commit_id===headSha);
}
export function reviewPr({number,files,otherPrFiles=[],body='',author='',headSha='',reviews=[]}){
 const list=files.map(f=>typeof f==='string'?{filename:f,patch:''}:f);
 const names=list.map(f=>f.filename);
 const scope=classifySet(names);
 const issues=[],warnings=[];
 if(!names.length)issues.push('PR has no changed files');
 if(new Set(names).size!==names.length)issues.push('Duplicate file paths');
 for(const other of otherPrFiles){
  if(other.number===number)continue;
  const overlap=names.filter(f=>other.files.includes(f));
  if(overlap.length)issues.push('OPEN_PR_OVERLAP: #'+other.number+' modifies '+overlap.slice(0,12).join(', '));
 }
 const shared=scope==='SHARED_SEO_GEO';
 if(shared){
  if(!bodyHasImpact(body,'SEO'))issues.push('MISSING_SEO_IMPACT: PR body needs SEO impact: ...');
  if(!bodyHasImpact(body,'GEO'))issues.push('MISSING_GEO_IMPACT: PR body needs GEO impact: ...');
 }
 const sensitive=list.filter(f=>HIGH_RISK.test(f.filename)||SENSITIVE_ADD.test(f.patch||''))
  .map(f=>f.filename);
 const approved=matchesApproval(reviews,author,headSha);
 if(sensitive.length&&!approved){
  issues.push('SENSITIVE_CHANGE_APPROVAL: latest head commit needs approval from a different non-bot reviewer for '+sensitive.join(', '));
 }
 if(names.some(n=>n.startsWith('.github/workflows/')))
  warnings.push('Workflow modifications need repository CODEOWNERS/branch rules to guarantee human review and prevent bypass.');
 if(names.some(n=>n.includes('seo-geo-general-reviewer')))
  warnings.push('Reviewer implementation change: inspect tests and policy diff independently before merge.');
 return {
  decision:issues.length?'BLOCKED':'APPROVED',scope,changedFiles:names,
  overlapCount:issues.filter(v=>v.startsWith('OPEN_PR_OVERLAP')).length,
  sensitiveFiles:sensitive,hasIndependentApproval:approved,
  violations:issues,warnings
 };
}
export function reviewPush({sha,actor,subject,prNumbers=[]}){
 const byPr=prNumbers.length>0;
 const publisher=actor==='github-actions[bot]'&&(
  subject.startsWith('blog: publish one pre-approved article')||
  subject.startsWith('build: optimize verified marketing images'));
 return {decision:byPr||publisher?'APPROVED':'BLOCKED',
  source:byPr?'merged_pull_request':publisher?'known_publisher_automation':'direct_unreviewed_main_push',
  sha,actor,subject,
  violations:byPr||publisher?[]:['Direct push has no associated PR or recognized approved publisher commit. Audit after push does not roll back the commit.']};
}
async function gh(endpoint,env=process.env,fetcher=fetch){
 const repo=env.GITHUB_REPOSITORY,token=env.GITHUB_TOKEN;
 if(!repo||!token)throw Error('GitHub API unavailable: missing repository or read-only token');
 const res=await fetcher('https://api.github.com/repos/'+repo+endpoint,{
  headers:{authorization:'Bearer '+token,accept:'application/vnd.github+json',
   'x-github-api-version':'2022-11-28'},signal:AbortSignal.timeout(20000)});
 if(!res.ok)throw Error('GitHub read-only API '+res.status+' at '+endpoint.split('?')[0]);
 return res.json();
}
async function paginated(endpoint,env,fetcher){
 const out=[];
 for(let page=1;page<=5;page++){
  const rows=await gh(endpoint+(endpoint.includes('?')?'&':'?')+'per_page=100&page='+page,env,fetcher);
  if(!Array.isArray(rows))throw Error('Unexpected API collection');
  out.push(...rows);
  if(rows.length<100)return out;
 }
 throw Error('More than 500 items; fail closed rather than omit overlaps');
}
export async function reviewLivePr({number,env=process.env,fetcher=fetch}){
 const me=await gh('/pulls/'+number,env,fetcher);
 const [files,prs,reviews]=await Promise.all([
  paginated('/pulls/'+number+'/files',env,fetcher),
  paginated('/pulls?state=open',env,fetcher),
  paginated('/pulls/'+number+'/reviews',env,fetcher)
 ]);
 const candidates=prs.filter(p=>p.number!==number);
 const otherPrFiles=await Promise.all(candidates.map(async p=>({
  number:p.number,
  files:(await paginated('/pulls/'+p.number+'/files',env,fetcher)).map(x=>x.filename)
 })));
 return reviewPr({number,files,otherPrFiles,body:me.body,author:me.user?.login,
  headSha:me.head?.sha,reviews});
}
export async function reviewLivePush({sha,env=process.env,fetcher=fetch}){
 const [associated,commit]=await Promise.all([
  gh('/commits/'+sha+'/pulls',env,fetcher),
  gh('/commits/'+sha,env,fetcher)
 ]);
 if(!Array.isArray(associated))throw Error('Cannot verify commit PR association');
 return reviewPush({sha,actor:env.GITHUB_ACTOR,subject:(commit.commit?.message||'').split('\n')[0],
  prNumbers:associated.map(p=>p.number)});
}
async function save(result){
 await fs.mkdir(path.dirname(OUT),{recursive:true});
 await fs.writeFile(OUT,JSON.stringify({...result,reviewedAt:new Date().toISOString()},null,2)+'\n','utf8');
 console.log('SEO/GEO GENERAL REVIEW: '+result.decision+' | '+(result.scope||result.owner||result.source));
 for(const problem of result.violations||[])console.error('BLOCKER: '+problem);
 for(const warning of result.warnings||[])console.warn('CAUTION: '+warning);
 console.log('Evidence: test-results/seo-geo-general-review.json');
 return result.decision==='APPROVED'?0:1;
}
export async function run(args=process.argv.slice(2),env=process.env){
 let result;
 if(args.includes('--staged')){
  if(args.includes('--role')&&args[args.indexOf('--role')+1]!=='publisher')
   throw Error('Only publisher staged review is allowed');
  const b=execFileSync('git',['diff','--cached','--name-only','-z'],{cwd:ROOT});
  result=reviewPublisherPaths(b.toString().split('\0').filter(Boolean));
 }else if(args.includes('--pr')){
  const n=Number(args[args.indexOf('--pr')+1]);
  if(!Number.isSafeInteger(n)||n<1)throw Error('Missing PR number');
  result=await reviewLivePr({number:n,env});
 }else if(args.includes('--push')){
  if(!env.GITHUB_SHA)throw Error('Missing GITHUB_SHA');
  result=await reviewLivePush({sha:env.GITHUB_SHA,env});
 }else throw Error('Select --pr NUMBER, --push or --staged --role publisher');
 return save(result);
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 run().then(code=>{process.exitCode=code;}).catch(e=>{console.error('REVIEWER_UNAVAILABLE: '+e.message);process.exitCode=1;});
}