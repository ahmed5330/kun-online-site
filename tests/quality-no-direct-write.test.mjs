import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

test('Site QA cannot push generated assets and preserves a reviewable binary patch',()=>{
 const workflow=readFileSync(new URL('../.github/workflows/site-quality.yml',import.meta.url),'utf8');
 assert.match(workflow,/contents: read/);
 assert.doesNotMatch(workflow,/contents: write|git push|git commit|gh pr merge/);
 assert.match(workflow,/git diff --cached --binary > test-results\/optimized-assets.patch/);
 assert.match(workflow,/node scripts\/seo-geo-general-reviewer.mjs --staged --role publisher/);
 assert.match(workflow,/name: optimized-assets-review-patch/);
});
