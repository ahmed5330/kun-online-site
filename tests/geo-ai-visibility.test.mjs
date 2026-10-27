import test from 'node:test';
import assert from 'node:assert/strict';
import { PROMPTS, PLATFORMS, FIELDS, buildRows, serializeCsv } from '../scripts/geo-ai-visibility-protocol.mjs';

test('GEO-07: test bank preserves stable, non-duplicated user questions',()=>{
 assert.ok(PROMPTS.length>=10);
 assert.equal(new Set(PROMPTS.map(p=>p.id)).size,PROMPTS.length);
 assert.equal(new Set(PROMPTS.map(p=>p.query)).size,PROMPTS.length);
 assert.ok(PROMPTS.every(p=>p.query.includes('؟')));
 assert.ok(PROMPTS.some(p=>p.locale==='ar-SA'));
 assert.ok(PROMPTS.some(p=>p.kind==='commercial'));
});
test('GEO-07: no observation, citation or ranking is invented',()=>{
 const rows=buildRows();
 assert.equal(rows.length,PROMPTS.length*PLATFORMS.length);
 assert.equal(new Set(rows.map(r=>r.prompt_id+'|'+r.platform)).size,rows.length);
 for(const row of rows){
  assert.equal(row.result_status,'not_run');
  for(const field of ['checked_at','site_mentioned','source_cited','exact_citation_url','answer_evidence_reference','notes'])
   assert.equal(row[field],'',field+' must require actual test evidence');
 }
});
test('GEO-07: CSV exports all mandatory fields and quotes Arabic questions',()=>{
 const rows=buildRows(),csv=serializeCsv(rows);
 assert.equal(csv.trimEnd().split('\n').length,rows.length+1);
 assert.ok(FIELDS.every(field=>csv.split('\n')[0].includes('"'+field+'"')));
 assert.ok(csv.includes('"ar-EG"'));
 assert.ok(csv.includes('"not_run"'));
});
