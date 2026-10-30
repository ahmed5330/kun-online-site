import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {routineArticleBundle} from '../scripts/routine-article-policy.mjs';
import {reviewPr,reviewLivePr} from '../scripts/seo-geo-general-reviewer.mjs';
const slug='routine-editorial-guide',base='content/approved/'+slug;
const meta={slug,approved:true,article_id:21,eligibleFrom:'2026-10-29',image:slug+'.png',category:'store',
 title:'A properly reviewed editorial title',description:'A substantive editorial description. '.repeat(4),editorialApproval:'Owner authorized editorial review and verified sources.'};
const template=readFileSync(new URL('../blog/article-template.html',import.meta.url),'utf8').replace(/\r\n/g,'\n');
const org={'@type':'Organization',name:'كن أونلاين',url:'https://kun-online.com'};
const schema={'@context':'https://schema.org','@type':'BlogPosting',headline:meta.title,description:meta.description,
 datePublished:'__PUBLICATION_DATE_ISO__',dateModified:'__PUBLICATION_DATE_ISO__',author:org,publisher:org,
 url:'https://kun-online.com/blog/'+slug,mainEntityOfPage:'https://kun-online.com/blog/'+slug,inLanguage:'ar-EG',wordCount:2000};
const scripts=[...template.matchAll(/<script\b[^>]*>[\s\S]*?<\/script>/gi)].map(m=>m[0]);
const html='<meta name="robots" content="index, follow"><link rel="canonical" href="'+schema.url+'">'+
 '<script type="application/ld+json">'+JSON.stringify(schema)+'</script>'+scripts.slice(1).join('')
 .replaceAll('{{SLUG}}',slug).replaceAll('{{CATEGORY}}','store');
const files=()=>[{filename:base+'.html.ready',status:'added',sha:'page-blob',content:html,patch:'+<link rel="canonical">'},
 {filename:base+'.json',status:'added',sha:'meta-blob',content:JSON.stringify(meta),patch:'+{}'}];
const review=f=>reviewPr({files:f,body:'SEO impact: A single new editorial guide.\nGEO impact: Preserve known organization and answer evidence.',author:'owner',headSha:'a'.repeat(40)});
test('Routine policy: added, fully validated bundle passes without independent approval',()=>{
 assert.equal(routineArticleBundle(files()).length,2);
 assert.equal(review(files()).decision,'APPROVED');
});
const mutations={
 'off-site canonical':s=>s.replace(schema.url,'https://attacker.example/'),
 'encoded canonical':s=>s.replace(schema.url,'https:&#47;&#47;kun-online.com/blog/'+slug),
 'duplicate canonical':s=>s+'<link rel="canonical" href="https://elsewhere.example">',
 'duplicate attribute':s=>s.replace('rel="canonical"','rel="canonical" href="https://elsewhere.example"'),
 'noindex':s=>s.replace('index, follow','noindex, follow'),
 'encoded noindex':s=>s.replace('index, follow','no&#105;ndex, follow'),
 'crawler override':s=>s+'<meta name="googlebot" content="none">',
 'encoded crawler':s=>s+'<meta name="google&#98;ot" content="none">',
 'refresh redirect':s=>s+'<meta http-equiv="refresh" content="0;url=https://elsewhere.example">',
 'base tag':s=>s+'<base href="https://elsewhere.example">',
 'new inline code':s=>s+'<script>location.href="https://elsewhere.example"</script>',
 'modified related loader':s=>s.replace("fetch('/blog/articles.json')","fetch('https://elsewhere.example')"),
 'external asset':s=>s.replace('/assets/site.js?v=','https://elsewhere.example/site.js?v='),
 'event handler':s=>s+'<img src="x" onerror="location.href=\'https://elsewhere.example\'">',
 'event with tag delimiter':s=>s+'<img src="/x" onerror="location.href=\'https://elsewhere.example\';/* < */">',
 'ambiguous comment':s=>s+'<!--><meta name="robots" content="none">-->',
 'encoded active link':s=>s+'<a href="java&#115;cript:alert(1)">click</a>',
 'schema type':s=>s.replace('"BlogPosting"','"Product"'),
 'schema offer':s=>s.replace('"wordCount":2000','"wordCount":2000,"offers":{"price":0}'),
 'organization edit':s=>s.replace('Kun Online','Fake Organization'),
 'malformed schema':s=>s.replace('"wordCount":2000','"wordCount":'),
};
for(const [name,change] of Object.entries(mutations))test('Routine policy stays sensitive: '+name,()=>{
 const f=files();f[0].content=change(f[0].content);
 assert.equal(routineArticleBundle(f).length,0);
 assert.equal(review(f).decision,'BLOCKED');
});
test('Routine policy: existing, missing, mixed or unapproved bundles do not qualify',()=>{
 for(const mutate of [f=>f[0].status='modified',f=>delete f[0].content,
  f=>f.push({filename:'robots.txt',status:'modified'}),f=>f[1].content='{}',f=>f[1].content=JSON.stringify({...meta,approved:false})]){
  const f=files();mutate(f);assert.equal(review(f).decision,'BLOCKED');
 }
});
test('Routine policy: explicit human changes requested still block ordinary publication',()=>{
 const r=reviewPr({files:files(),body:'SEO impact: New editorial guide only.\nGEO impact: Existing schema unchanged.',author:'owner',headSha:'a'.repeat(40),
  reviews:[{state:'CHANGES_REQUESTED',user:{login:'human',type:'User'}}]});
 assert.equal(r.decision,'BLOCKED');
});
test('Existing canonical deletion remains sensitive',()=>{
 assert.equal(review([{filename:'blog/existing.html',status:'modified',patch:'-<link rel="canonical" href="https://kun-online.com/blog/existing">'}]).decision,'BLOCKED');
});
test('Live review hydrates full article at exact head and fails closed on API mismatch',async()=>{
 const sha='a'.repeat(40),f=files(),pr={number:9,head:{sha},user:{login:'owner'},body:'SEO impact: New guide for readers.\nGEO impact: Preserve existing organization schema.'};
 const fetcher=async url=>{
  const u=new URL(url),p=u.pathname;
  const result=p.endsWith('/files')?f.map(({content,...rest})=>rest):p.endsWith('/reviews')||p.endsWith('/comments')?[]:
   p.endsWith('/pulls')?[]:p.includes('/contents/')?(()=>{
    assert.equal(u.searchParams.get('ref'),sha);
    const file=f.find(x=>p.endsWith(x.filename));return {type:'file',encoding:'base64',sha:file.sha,size:file.content.length,content:Buffer.from(file.content).toString('base64')};
   })():pr;
  return new Response(JSON.stringify(result));
 };
 const env={GITHUB_REPOSITORY:'owner/repo',GITHUB_TOKEN:'fake-test-token'};
 assert.equal((await reviewLivePr({number:9,env,fetcher})).decision,'APPROVED');
 await assert.rejects(reviewLivePr({number:9,env,fetcher:async (url,...args)=>{
  const response=await fetcher(url,...args);if(url.includes('/contents/')){const d=await response.json();return new Response(JSON.stringify({...d,sha:'mismatch'}));}return response;
 }}),/Cannot verify full article/);
});
