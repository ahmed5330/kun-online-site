import test from 'node:test';
import assert from 'node:assert/strict';
import {BOT_IDS,buildQuery,summarizeVerifiedGroups,queryCloudflare}
 from '../scripts/geo-cloudflare-bot-evidence.mjs';

test('Cloudflare GEO: use Cloudflare verified detection IDs, never User-Agent strings',()=>{
 const query=buildQuery();
 assert.match(query,/botDetectionIds_hasany:/);
 assert.ok(query.includes(String(BOT_IDS['OAI-SearchBot'][0])));
 assert.ok(query.includes(String(BOT_IDS.Googlebot[0])));
 assert.ok(query.includes(String(BOT_IDS.Bingbot[0])));
 assert.ok(!query.includes('userAgent_like'));
});
test('Cloudflare GEO: verified bot groups separate success, denial, challenges and page paths',()=>{
 const result=summarizeVerifiedGroups([
  {count:3,dimensions:{botDetectionIds:[126255384],clientRequestHTTPHost:'kun-online.com',
   clientRequestPath:'/blog/real-cost-per-delivered-order',edgeResponseStatus:200,securityAction:'allow'}},
  {count:2,dimensions:{botDetectionIds:[33563986],clientRequestHTTPHost:'kun-online.com',
   clientRequestPath:'/',edgeResponseStatus:403,securityAction:'block'}},
  {count:1,dimensions:{botDetectionIds:[117479730],clientRequestHTTPHost:'kun-online.com',
   clientRequestPath:'/',edgeResponseStatus:403,securityAction:'managed_challenge'}}
 ],{from:'2026-10-27T00:00:00Z',to:'2026-10-28T00:00:00Z',withSecurityAction:true});
 assert.equal(result.sampledAttributableRequests,6);
 assert.equal(result.byBot['OAI-SearchBot'].sampledRequests,5);
 assert.equal(result.byBot['OAI-SearchBot'].success2xx,3);
 assert.equal(result.byBot['OAI-SearchBot'].blocked,2);
 assert.equal(result.byBot.Bingbot.challenged,1);
});
test('Cloudflare GEO: ambiguous IDs and other hosts are excluded',()=>{
 const result=summarizeVerifiedGroups([
  {count:2,dimensions:{botDetectionIds:[126255384,120623194],clientRequestHTTPHost:'kun-online.com'}},
  {count:4,dimensions:{botDetectionIds:[120623194],clientRequestHTTPHost:'other-site.com'}},
  {count:1,dimensions:{botDetectionIds:[],clientRequestHTTPHost:'kun-online.com'}}
 ],{from:'now',to:'later',withSecurityAction:false});
 assert.equal(result.sampledAttributableRequests,0);
 assert.equal(result.ambiguousDetectionGroups,3);
 assert.equal(result.otherHostGroups,4);
});
test('Cloudflare GEO: plan-gated securityAction retries, preserving verified ID filter',async()=>{
 const calls=[];
 const fake=async (uri,opts)=>{
  const payload=JSON.parse(opts.body);calls.push(payload);
  if(calls.length===1)return {ok:true,json:async()=>({errors:[{message:'Cannot query field "securityAction"'}]})};
  return {ok:true,json:async()=>({data:{viewer:{zones:[{httpRequestsAdaptiveGroups:[
   {count:4,dimensions:{botDetectionIds:[33554459],clientRequestHTTPHost:'kun-online.com',
    clientRequestPath:'/',edgeResponseStatus:200}}
  ]}]}}})};
 };
 const r=await queryCloudflare({token:'fake-test-secret',zone:'fake-test-zone',
  from:'2026-10-27T00:00:00Z',to:'2026-10-28T00:00:00Z',fetcher:fake});
 assert.equal(calls.length,2);
 assert.equal(r.securityActionAvailable,false);
 assert.equal(r.byBot.Googlebot.success2xx,4);
 assert.equal(r.byBot.Googlebot.blocked,0);
 assert.ok(!JSON.stringify(r).includes('fake-test-secret'));
 assert.ok(calls[1].query.includes('botDetectionIds_hasany'));
});
test('Cloudflare GEO: plan unavailable is not reported as zero bots',async()=>{
 const fake=async()=>({ok:true,json:async()=>({errors:[{message:'Field botDetectionIds_hasany unavailable on plan'}]})});
 await assert.rejects(queryCloudflare({token:'test',zone:'test',
  from:'2026-10-27T00:00:00Z',to:'2026-10-28T00:00:00Z',fetcher:fake}),
  /denied\/unavailable/);
});
test('Cloudflare GEO: aggregation requires counts and no arbitrary ID identity',()=>{
 assert.throws(()=>summarizeVerifiedGroups([
  {count:'bad',dimensions:{botDetectionIds:[120623194],clientRequestHTTPHost:'kun-online.com'}}
 ],{from:'now',to:'later',withSecurityAction:false}),/Invalid sampled group count/);
 const result=summarizeVerifiedGroups([{count:8,dimensions:{botDetectionIds:[99999],
  clientRequestHTTPHost:'kun-online.com'}}],{from:'now',to:'later',withSecurityAction:false});
 assert.equal(result.ambiguousDetectionGroups,8);
 assert.equal(result.sampledAttributableRequests,0);
});