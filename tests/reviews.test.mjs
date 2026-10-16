import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {canonicalLocation} from '../_worker.js';
const root=resolve(import.meta.dirname,'..'),read=f=>readFileSync(join(root,f),'utf8');
test('real public review form is available on homepage and shareable review URL',()=>{
 for(const path of ['index.html','reviews/index.html']){
  const html=read(path);
  for(const token of ['data-kun-reviews','data-review-form','data-review-star="5"','name="reviewText"','name="reviewConsent"','name="category"','type="file"','data-review-share','/reviews/#write-review','data-review-list'])assert.ok(html.includes(token),path+' '+token);
  assert.match(html,/خدمات كن أونلاين/);
  assert.match(html,/استشارات كن أونلاين/);
  assert.match(html,/بعد مراجعته/);
  assert.doesNotMatch(html,/AggregateRating|aggregateRating|ratingCount|reviewCount/);
 }
 assert.equal(canonicalLocation('https://kun-online.com/reviews'),'https://kun-online.com/reviews/');
 assert.match(read('_redirects'),/\/reviews \/reviews\/ 301/);
 assert.match(read('sitemap.xml'),/<loc>https:\/\/kun-online\.com\/reviews\/<\/loc>/);
 assert.match(read('seo/keyword-map.json'),/"path": "\/reviews\/"/);
});
test('review component never invents reviews and sanitizes displayed user text',()=>{
 const js=read('assets/reviews.js');
 assert.match(js,/textContent=text/);
 assert.match(js,/approved\.filter\(/);
 assert.match(js,/r\.status==='approved'/);
 assert.match(js,/https:\/\/app\.kun-online\.com\/api\/public-reviews/);
 assert.match(js,/toDataURL\('image\/jpeg'/);
 assert.doesNotMatch(js,/innerHTML\s*=/);
 assert.doesNotMatch(js,/localStorage\.setItem|sessionStorage\.setItem/);
});
