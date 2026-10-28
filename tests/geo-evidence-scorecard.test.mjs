import test from 'node:test';
import assert from 'node:assert/strict';
import {FIELDS,buildRows,serializeCsv} from '../scripts/geo-ai-visibility-protocol.mjs';
import {parseCsv,summarizeAi,summarizeCrawlers,summarizeGsc} from '../scripts/geo-evidence-scorecard.mjs';

test('GEO scorecard: 48 unrun tests do not become 48 failures or zero-rate evidence',()=>{
 const rows=parseCsv(serializeCsv(buildRows()));
 assert.equal(rows.length,48);
 assert.deepEqual(Object.keys(rows[0]),FIELDS);
 const result=summarizeAi(rows);
 assert.equal(result.not_run,48);
 assert.equal(result.observed,0);
 assert.equal(result.citationRate,null);
});
test('GEO scorecard: confirms citation only with genuine exact URL and evidence',()=>{
 const rows=buildRows();
 rows[0]={...rows[0],checked_at:'2026-10-28T16:00:00+03:00',
  result_status:'observed',site_mentioned:'yes',source_cited:'yes',
  exact_citation_url:'https://kun-online.com/services/',
  answer_evidence_reference:'internal-screenshot-01'};
 const result=summarizeAi(rows);
 assert.equal(result.cited,1);
 assert.equal(result.observed,1);
 assert.equal(result.citationRate,1);
 assert.equal(result.nonbrandedObserved,0);
 const tampered=rows.map(x=>({...x}));
 tampered[0].exact_citation_url='https://kun-online.com.evil.test/';
 assert.throws(()=>summarizeAi(tampered),/direct kun-online/);
 tampered[0].exact_citation_url='https://kun-online.com/';
 tampered[0].answer_evidence_reference='';
 assert.throws(()=>summarizeAi(tampered),/lacks date or original evidence/);
});
test('GEO scorecard: unobserved AI rows cannot claim citation',()=>{
 const rows=buildRows();rows[0].source_cited='yes';
 assert.throws(()=>summarizeAi(rows),/Unobserved/);
});
test('GEO scorecard: rejects duplicates or changes to original prompt',()=>{
 const rows=buildRows();
 assert.throws(()=>summarizeAi([rows[0],rows[0]]),/Duplicate/);
 const modified=[{...rows[0],query:'different'}];
 assert.throws(()=>summarizeAi(modified),/Prompt changed/);
});
test('GEO scorecard: export marked unverified only by User-Agent is excluded',()=>{
 const r=summarizeCrawlers([
  {verifiedBot:false,botName:'Googlebot',userAgent:'Googlebot',action:'allow',edgeStatus:200},
  {botName:'OAI-SearchBot',userAgent:'OAI-SearchBot',action:'allow'},
  {verifiedBot:true,botName:'Bingbot',action:'block',edgeStatus:403},
  {verifiedBot:true,botName:'OAI-SearchBot',action:'managed_challenge',edgeStatus:403}
 ]);
 assert.equal(r.providerMarkedVerified,2);
 assert.equal(r.unverifiedExcluded,2);
 assert.equal(r.byBotName.Bingbot.blocked,1);
 assert.equal(r.byBotName['OAI-SearchBot'].challenged,1);
});
test('GEO scorecard: URL sample never claims full site coverage',()=>{
 const r=summarizeGsc({status:'inspections_recorded',sitemapUrlCount:47,checked:[
  {state:'indexed'},{state:'not_indexed'},{state:'unknown'}]});
 assert.equal(r.inspected,3);
 assert.equal(r.indexed,1);
 assert.equal(r.sitewideIndexedTotal,null);
});
test('GEO scorecard: CSV supports quoted Arabic, commas and line breaks',()=>{
 const rows=buildRows();
 rows[0].notes='تفصيل، للمراجعة\nسطر ثانٍ';
 const parsed=parseCsv(serializeCsv(rows));
 assert.equal(parsed[0].notes,rows[0].notes);
});