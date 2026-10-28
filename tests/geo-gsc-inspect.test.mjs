import test from 'node:test';
import assert from 'node:assert/strict';
import {extractSitemapUrls,pickInspectionUrls,summarizeInspection,inspectUrl,ORIGIN,SITE_URL,INSPECT_API} from '../scripts/geo-gsc-inspect.mjs';

test('selects canonical sitemap entries without inventing target URLs',()=>{
 const urls=extractSitemapUrls('<loc>'+ORIGIN+'/</loc><loc>'+ORIGIN+'/methodology/</loc><loc>https://example.org/</loc>');
 assert.deepEqual(urls,[ORIGIN+'/',ORIGIN+'/methodology/']);
 assert.deepEqual(pickInspectionUrls(urls),urls);
});
test('INDEXING_ALLOWED is not proof that a page was indexed',()=>{
 const r=summarizeInspection(ORIGIN+'/',{inspectionResult:{indexStatusResult:{
  verdict:'NEUTRAL',indexingState:'INDEXING_ALLOWED',coverageState:'Discovered - currently not indexed'}}},'now');
 assert.equal(r.state,'unknown');
 assert.equal(r.indexingState,'INDEXING_ALLOWED');
});
test('verdict PASS and FAIL determine per-URL indexing state',()=>{
 for(const [verdict,state] of [['PASS','indexed'],['FAIL','not_indexed'],['VERDICT_UNSPECIFIED','unknown']])
  assert.equal(summarizeInspection(ORIGIN+'/',{inspectionResult:{indexStatusResult:{verdict}}},'now').state,state);
 assert.equal(summarizeInspection(ORIGIN+'/',{},'now').state,'unknown');
});
test('uses read-only Google URL Inspection endpoint and site property',async()=>{
 let captured;
 const mock=async(endpoint,init)=>{
  captured={endpoint,init};
  return {ok:true,json:async()=>({inspectionResult:{indexStatusResult:{verdict:'PASS'}}})};
 };
 assert.equal((await inspectUrl(ORIGIN+'/','test-token',mock)).state,'indexed');
 assert.equal(captured.endpoint,INSPECT_API);
 assert.equal(captured.init.method,'POST');
 assert.equal(JSON.parse(captured.init.body).siteUrl,SITE_URL);
});
test('rejects duplicates rather than double counting',()=>{
 assert.throws(()=>pickInspectionUrls([ORIGIN+'/',ORIGIN+'/']),/Duplicate/);
});