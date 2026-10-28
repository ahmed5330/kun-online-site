/**
 * Read-only Cloudflare Bot Management GraphQL evidence.
 * Requires zone-scoped Analytics:Read API token and Bot Management detection IDs.
 * Never accepts User-Agent as proof of a verified bot.
 * No request IPs, cookies, account secrets or visitor identifiers are stored.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(fileURLToPath(new URL('..',import.meta.url)));
const output=path.join(root,'test-results/geo-cloudflare-bot-detections.json');
export const BOT_IDS=Object.freeze({
 'Googlebot':[120623194,33554459],
 'Bingbot':[117479730,33554461],
 'OAI-SearchBot':[126255384,33563986],
 'ChatGPT-User':[132995013,33563857],
 'GPTBot':[123815556,33563875],
 'PerplexityBot':[33563889]
});
const allIds=[...new Set(Object.values(BOT_IDS).flat())];
const byId=new Map(Object.entries(BOT_IDS).flatMap(([name,ids])=>ids.map(id=>[id,name])));
export const ENDPOINT='https://api.cloudflare.com/client/v4/graphql';
export const LIMIT=1000;
export function buildQuery({includeSecurityAction=true}={}){
 return [
 'query GeoVerifiedBots($zoneTag: string, $start: Time, $end: Time) {',
 ' viewer { zones(filter: {zoneTag: $zoneTag}) {',
 ' httpRequestsAdaptiveGroups(',
 ' filter: {datetime_geq: $start, datetime_leq: $end,',
 ' requestSource: "eyeball", botDetectionIds_hasany: ['+allIds.join(',')+']}',
 ' limit: '+LIMIT+' orderBy: [count_DESC]) {',
 ' count dimensions { botDetectionIds clientRequestHTTPHost clientRequestPath edgeResponseStatus',
 includeSecurityAction?' securityAction':'',
 ' } } } } }'].join('\n');
}
export function summarizeVerifiedGroups(groups,{from,to,withSecurityAction}){
 if(!Array.isArray(groups))throw Error('Missing Cloudflare bot detection groups');
 const byBot={};
 let total=0,ambiguous=0,offHost=0;
 for(const row of groups){
  const count=Number(row.count);
  if(!Number.isSafeInteger(count)||count<0)throw Error('Invalid sampled group count');
  const d=row.dimensions||{};
  const names=[...new Set((Array.isArray(d.botDetectionIds)?d.botDetectionIds:[]).map(x=>byId.get(Number(x))).filter(Boolean))];
  if(d.clientRequestHTTPHost!=='kun-online.com'){offHost+=count;continue;}
  if(names.length!==1){ambiguous+=count;continue;}
  const name=names[0];
  const b=byBot[name]??={sampledRequests:0,success2xx:0,redirect3xx:0,denied4xx:0,error5xx:0,
   blocked:0,challenged:0,otherSecurityAction:0,topPaths:{}};
  b.sampledRequests+=count; total+=count;
  const status=Number(d.edgeResponseStatus);
  if(status>=200&&status<300)b.success2xx+=count;
  else if(status>=300&&status<400)b.redirect3xx+=count;
  else if(status>=400&&status<500)b.denied4xx+=count;
  else if(status>=500)b.error5xx+=count;
  if(withSecurityAction){
   const action=String(d.securityAction??'unknown').toLowerCase();
   if(action==='block')b.blocked+=count;
   else if(['challenge','managed_challenge','js_challenge'].includes(action))b.challenged+=count;
   else if(!['allow','skip','log','unknown',''].includes(action))b.otherSecurityAction+=count;
  }
  const p=String(d.clientRequestPath||'/').slice(0,120);
  b.topPaths[p]=(b.topPaths[p]||0)+count;
 }
 for(const b of Object.values(byBot)){
  b.topPaths=Object.fromEntries(Object.entries(b.topPaths).sort((a,c)=>c[1]-a[1]).slice(0,12));
 }
 return {
  status:'provider_detection_ids_query_completed',
  source:'Cloudflare GraphQL httpRequestsAdaptiveGroups',
  scope:'kun-online.com',from,to,
  verifiedBy:'Cloudflare Bot Management detection IDs (not User-Agent)',
  sampleBasis:'adaptive Cloudflare aggregated analytics; may be sampled and limited; not total requests',
  groupsReturned:groups.length,groupsLimit:LIMIT,truncatedOrLimitReached:groups.length>=LIMIT,
  sampledAttributableRequests:total,ambiguousDetectionGroups:ambiguous,otherHostGroups:offHost,
  securityActionAvailable:withSecurityAction,byBot,
  caveats:['No rows means none observed within accessible sampled window; not proof bots never crawled.',
   '4xx/5xx are edge responses, not necessarily WAF blocks.',
   'Bot Management detection IDs are plan-dependent; do not substitute spoofable User-Agent.',
   'This query does not directly verify Google URL indexing or an AI answer citation.']
 };
}
export async function queryCloudflare({token,zone,from,to,fetcher=fetch}){
 if(!token||!zone)throw Error('Missing Cloudflare credentials');
 for(const withSecurityAction of [true,false]){
  const res=await fetcher(ENDPOINT,{method:'POST',headers:{
   authorization:'Bearer '+token,'content-type':'application/json'
  },body:JSON.stringify({query:buildQuery({includeSecurityAction:withSecurityAction}),
    variables:{zoneTag:zone,start:from,end:to}}),signal:AbortSignal.timeout(20000)});
  if(!res.ok)throw Error('Cloudflare GraphQL HTTP '+res.status);
  const json=await res.json();
  const errors=json.errors||[];
  if(errors.length){
   const securityOnly=withSecurityAction&&errors.every(e=>/securityAction/.test(e.message||''));
   if(securityOnly)continue;
   const msg=errors.map(e=>String(e.message||'GraphQL error').slice(0,120)).join('; ');
   throw Error('Cloudflare GraphQL denied/unavailable: '+msg);
  }
  const zones=json?.data?.viewer?.zones;
  if(!Array.isArray(zones)||zones.length!==1)throw Error('Cloudflare zone not accessible');
  return summarizeVerifiedGroups(zones[0].httpRequestsAdaptiveGroups,
   {from,to,withSecurityAction});
 }
 throw Error('Cloudflare securityAction field retry failed');
}
export async function run({env=process.env,clock=Date.now(),fetcher=fetch}={}){
 const to=new Date(clock).toISOString(),from=new Date(clock-24*60*60*1000).toISOString();
 const token=env.CF_ANALYTICS_READ_TOKEN,zone=env.CF_ZONE_ID;
 let result;
 if(!token||!zone)result={status:'not_authorized',from,to,
  needed:'CF_ANALYTICS_READ_TOKEN and CF_ZONE_ID in GitHub repository secrets'};
 else{
  try{result=await queryCloudflare({token,zone,from,to,fetcher});}
  catch(e){result={status:'provider_query_unavailable',from,to,
    reason:String(e.message).slice(0,300),note:'Do not treat missing verification as zero'};}
 }
 await fs.mkdir(path.dirname(output),{recursive:true});
 await fs.writeFile(output,JSON.stringify(result,null,2)+'\n');
 console.log('Cloudflare verified bot evidence: '+result.status+
  '; reported bots: '+Object.keys(result.byBot||{}).length);
 console.log('Report: test-results/geo-cloudflare-bot-detections.json');
 return result;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 run().catch(e=>{console.error(e.message);process.exitCode=1;});
}