import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {canonicalLocation} from '../_worker.js';
const root=resolve(import.meta.dirname,'..'),read=f=>readFileSync(join(root,f),'utf8');
test('real public review form is available on homepage and shareable review URL',()=>{
 for(const path of ['index.html','reviews/index.html']){
  const html=read(path);
  for(const token of ['data-kun-reviews','data-review-form','data-review-star="5"','name="reviewText"','name="reviewConsent"','name="category"','type="file"','data-review-list'])assert.ok(html.includes(token),path+' '+token);
  assert.match(html,/خدمات كن أونلاين/);
  assert.match(html,/استشارات كن أونلاين/);
  assert.match(html,/قبل مراجعة الإدارة|بعد موافقة الإدارة/);
  assert.doesNotMatch(html,/AggregateRating|aggregateRating|ratingCount|reviewCount/);
 }
 assert.equal(canonicalLocation('https://kun-online.com/reviews'),'https://kun-online.com/reviews/');
 assert.match(read('_redirects'),/\/reviews \/reviews\/ 301/);
 assert.doesNotMatch(read('sitemap.xml'),/<loc>https:\/\/kun-online\.com\/reviews\/<\/loc>/);
 assert.doesNotMatch(read('seo/keyword-map.json'),/"path": "\/reviews\/"/);
 assert.match(read('reviews/index.html'),/<meta name="robots" content="noindex,follow">/);
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


test('review invitation links are only distributed by administrators, never public controls',()=>{
 for(const path of ['index.html','reviews/index.html']){
  const html=read(path);
  assert.doesNotMatch(html,/data-review-share|data-review-link|data-review-share-status|رابط التقييم للمشاركة|مشاركة لينك التقييم|href="\/reviews\/#write-review"/);
 }
 for(const path of ['index.html','en/index.html','gulf/index.html'])assert.doesNotMatch(read(path),/href="\/reviews\/"/);
 const script=read('assets/reviews.js');
 assert.doesNotMatch(script,/navigator\.share|data-review-share|navigator\.clipboard|\/reviews\//);
 assert.match(read('reviews/index.html'),/data-review-form/);
});
