import test from 'node:test';
import assert from 'node:assert/strict';
import { pendingApprovedBundles } from '../scripts/approved-queue.mjs';

const bundle = (slug, id) => ({ meta: { slug, article_id: id } });
const published = { slug: 'first-guide', article_id: 2 };
const mapping = { seriesMatches: [{ slug: 'first-guide', article_id: 2 }] };

test('eligible approved bundles are retained when nothing was published', () => {
  assert.deepEqual(pendingApprovedBundles([bundle('first-guide', 2)], [], [], { seriesMatches: [] }),
    [bundle('first-guide', 2)]);
});

test('already published approved bundle is skipped on next day; new content remains', () => {
  const remaining = pendingApprovedBundles(
    [bundle('first-guide', 2), bundle('next-guide', 3)],
    [{ date: '2026-10-16', ...published }],
    [{ slug: 'first-guide' }],
    mapping,
  );
  assert.deepEqual(remaining, [bundle('next-guide', 3)]);
});

test('a published slug without an audit trail is never silently re-published', () => {
  assert.throws(() => pendingApprovedBundles(
    [bundle('first-guide', 2)], [], [{ slug: 'first-guide' }], mapping),
  /without publication history/);
});

test('published bundles must match registry and series mapping', () => {
  assert.throws(() => pendingApprovedBundles(
    [bundle('first-guide', 2)], [{ date: '2026-10-16', ...published }], [], mapping),
  /missing from blog registry/);
  assert.throws(() => pendingApprovedBundles(
    [bundle('first-guide', 2)], [{ date: '2026-10-16', ...published }],
    [{ slug: 'first-guide' }], { seriesMatches: [] }),
  /missing from series mapping/);
  assert.throws(() => pendingApprovedBundles(
    [bundle('first-guide', 3)], [{ date: '2026-10-16', ...published }],
    [{ slug: 'first-guide' }], mapping),
  /article ID mismatch/);
});

test('duplicate article slugs in publication log fail closed', () => {
  assert.throws(() => pendingApprovedBundles([], [published, published], [], mapping),
    /Duplicate publication log slug/);
});

import fs from 'node:fs';
const publishedSlugs = new Set(JSON.parse(fs.readFileSync('blog/articles.json', 'utf8')).map(a => a.slug));
for (const slug of ['choose-ecommerce-brand-name', 'branding-beyond-logo-ecommerce']) {
  test(slug + ' has reviewed published inbound sources and truthful word counts', () => {
    const meta = JSON.parse(fs.readFileSync('content/approved/' + slug + '.json', 'utf8'));
    const html = fs.readFileSync('content/approved/' + slug + '.html.ready', 'utf8');
    assert.ok(Array.isArray(meta.inboundFrom) && new Set(meta.inboundFrom).size >= 2);
    assert.ok(meta.inboundFrom.every(source => publishedSlugs.has(source) && source !== slug));
    const article = html.match(/<article\b[^>]*>([\s\S]*?)<\/article>/i)?.[1];
    assert.ok(article);
    const words = article.replace(/<script[\s\S]*?<\/script>/gi, '').replace(/<style[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]*>/g, ' ').replace(/&(?:[a-z]+|#\d+);/gi, ' ').trim().split(/\s+/).filter(Boolean).length;
    assert.ok(words >= 1500 && words <= 2200);
    assert.equal(meta.qualityReview.words, words);
    const schema = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)]
      .map(m => JSON.parse(m[1])).flatMap(s => s['@graph'] || [s]).find(s => s['@type'] === 'BlogPosting');
    assert.equal(schema.wordCount, words);
  });
}

import {inspectEditorialMetadata} from '../scripts/editorial-bundle-readiness.mjs';
test('readiness never counts an approved flag as proof of publishable metadata', () => {
 const slug='choose-ecommerce-brand-name';
 const meta=JSON.parse(fs.readFileSync('content/approved/'+slug+'.json','utf8'));
 const html=fs.readFileSync('content/approved/'+slug+'.html.ready','utf8');
 assert.equal(inspectEditorialMetadata(meta,html,publishedSlugs).metadataReady,true);
 for(const invalid of [{...meta,inboundFrom:undefined},{...meta,inboundFrom:['unpublished-one','unpublished-two']},
   {...meta,qualityReview:{...meta.qualityReview,words:1}}]) {
   assert.equal(inspectEditorialMetadata(invalid,html,publishedSlugs).metadataReady,false);
 }
 assert.equal(inspectEditorialMetadata(meta,html.replace(/("wordCount"\s*:\s*)\d+/,'$1'+'1'),publishedSlugs).metadataReady,false);
 assert.equal(inspectEditorialMetadata(meta,html.replace(/href="\/blog\/[^"#]+"/g,'href="/not-a-guide"'),publishedSlugs).metadataReady,false);
 assert.equal(inspectEditorialMetadata(meta,'<article>short</article>',publishedSlugs).metadataReady,false);
});
