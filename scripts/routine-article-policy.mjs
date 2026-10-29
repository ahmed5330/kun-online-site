// Owner-authorized exception for ONE newly added editorial bundle only.
// Missing full content, malformed markup or unknown schema stays sensitive.
import {readFileSync} from 'node:fs';
const TEMPLATE=readFileSync(new URL('../blog/article-template.html',import.meta.url),'utf8').replace(/\r\n/g,'\n');
const PREFIX='content/approved/';
const SITE='https://kun-online.com';
const organization={
 '@context':'https://schema.org','@type':'Organization','@id':SITE+'/#organization',
 name:'كن أونلاين',alternateName:'Kun Online',url:SITE+'/',
 address:{'@type':'PostalAddress',addressCountry:'EG',addressRegion:'أسيوط',addressLocality:'أسيوط',streetAddress:'ميدان الأزهر'},
 contactPoint:{'@type':'ContactPoint',contactType:'customer support',url:'https://wa.me/201021231619',description:'WhatsApp messages only; no voice calls.'},
 sameAs:['https://www.facebook.com/KunOnlineAgency','https://www.instagram.com/kunonlin/']
};
function equal(a,b){
 if(a===null||b===null||typeof a!=='object'||typeof b!=='object')return a===b;
 const ak=Object.keys(a).sort(),bk=Object.keys(b).sort();
 return JSON.stringify(ak)===JSON.stringify(bk)&&ak.every(k=>equal(a[k],b[k]));
}
function attributes(raw){
 const attrs={};
 let rest=raw.trim().replace(/\/$/,'').trim();
 while(rest){
  const m=/^([a-zA-Z_:][\w:.-]*)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'`=<>]+)))?\s*/.exec(rest);
  if(!m)return null;
  const key=m[1].toLowerCase();
  if(Object.hasOwn(attrs,key))return null;
  attrs[key]=m[2]??m[3]??m[4]??''; rest=rest.slice(m[0].length);
 }
 return attrs;
}
export function routineArticleBundle(files){
 try{
  if(files.length!==2||files.some(f=>f.status!=='added'||typeof f.content!=='string'))return [];
  const page=files.find(f=>/^content\/approved\/[a-z0-9]+(?:-[a-z0-9]+)*\.html\.ready$/.test(f.filename));
  if(!page)return [];
  const slug=page.filename.slice(PREFIX.length,-'.html.ready'.length);
  const data=files.find(f=>f.filename===PREFIX+slug+'.json');
  if(!data)return [];
  const meta=JSON.parse(data.content),html=page.content;
  if(meta.slug!==slug||meta.approved!==true||!Number.isInteger(meta.article_id)||meta.article_id<1||meta.article_id>100||
   typeof meta.editorialApproval!=='string'||meta.editorialApproval.length<20||!/^\d{4}-\d{2}-\d{2}$/.test(meta.eligibleFrom||'')||
   !/^[a-z]+$/.test(meta.category||'')||meta.image!==slug+'.png'||typeof meta.title!=='string'||meta.title.length<12||typeof meta.description!=='string'||meta.description.length<80)return [];
  if(html.length>250000||/<!--[\s\S]*$/.test(html.replace(/<!--[\s\S]*?-->/g,'')))return [];
  const clean=html.replace(/<!--[\s\S]*?-->/g,'');
  if(/<(?:base|iframe|object|embed|form)\b|javascript\s*:|noindex|nofollow|disallow\s*:|content-signal\s*:/i.test(clean))return [];
  const links=[],robots=[],schemas=[];
  // Validate every opening tag so duplicate/encoded directive attributes cannot hide.
  for(const tag of clean.matchAll(/<([a-z][\w:-]*)\b([^<>]*)>/gi)){
   const name=tag[1].toLowerCase(),a=attributes(tag[2]);
   if(!a)return [];
   for(const [key,value] of Object.entries(a)){
    if(key.startsWith('on')&&!((key==='onload'&&value==="this.media='all'")||
     (key==='onerror'&&value==="this.parentElement.style.display='none'")))return [];
   }
   if(name==='meta'){
    if(a['http-equiv']||/&/.test(a.name||'')||((a.name||'').toLowerCase()!=='robots'&&/bot|crawler/i.test(a.name||'')))return [];
    if((a.name||'').toLowerCase()==='robots')robots.push(a.content);
    if((a.property||'').toLowerCase()==='og:url'&&a.content!==SITE+'/blog/'+slug)return [];
   }
   if(name==='link'&&/canonical/i.test(a.rel||'')){
    if(a.rel.toLowerCase()!=='canonical')return [];
    links.push(a.href);
   }
  }
  if(links.length!==1||links[0]!==SITE+'/blog/'+slug||robots.length!==1||
   !/^index\s*,\s*follow$/i.test(robots[0]))return [];
  const scripts=[...clean.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi)];
  if(scripts.length!==4||(clean.match(/<script\b/gi)||[]).length!==4)return [];
  const normalize=s=>s.replace(/\r\n/g,'\n').trim();
  const templateScripts=[...TEMPLATE.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi)];
  const related=templateScripts.find(s=>!s[1].trim())?.[2];
  const asset=templateScripts.find(s=>attributes(s[1])?.src)?.[1];
  let relatedCount=0,assetCount=0;
  for(const script of scripts){
   const a=attributes(script[1]);
   if(equal(a,{type:'application/ld+json'}))schemas.push(JSON.parse(script[2]));
   else if(equal(a,{})&&related&&normalize(script[2])===normalize(related.replaceAll('{{SLUG}}',slug).replaceAll('{{CATEGORY}}',meta.category)))relatedCount++;
   else if(asset&&equal(a,attributes(asset))&&!script[2].trim())assetCount++;
   else return [];
  }
  if(relatedCount!==1||assetCount!==1||schemas.length!==2)return [];
  const article=schemas.find(s=>s['@type']==='BlogPosting');
  const org=schemas.find(s=>s['@type']==='Organization');
  if(!article||!equal(org,organization))return [];
  const keys=['@context','@type','headline','description','datePublished','dateModified','author','publisher','url','mainEntityOfPage','keywords','articleSection','inLanguage','wordCount','timeRequired'];
  if(Object.keys(article).some(k=>!keys.includes(k))||article['@context']!=='https://schema.org'||
   article.url!==SITE+'/blog/'+slug||article.mainEntityOfPage!==article.url||article.headline!==meta.title||article.description!==meta.description||
   article.datePublished!=='__PUBLICATION_DATE_ISO__'||article.dateModified!==article.datePublished||
   !Number.isInteger(article.wordCount)||article.wordCount<1500||article.wordCount>2500||article.inLanguage!=='ar-EG')return [];
  const publisher={'@type':'Organization',name:'كن أونلاين',url:SITE};
  if(!equal(article.author,publisher)||!equal(article.publisher,publisher))return [];
  return [page.filename,data.filename];
 }catch{return [];}
}
