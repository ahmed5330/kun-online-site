import test from 'node:test';
import assert from 'node:assert/strict';
import { inspectPublishedArticle } from '../scripts/geo-editorial-audit.mjs';

const meta={slug:'example-guide',dateModified:'2026-10-27',wordCount:1700};
const good=[
 '<html><head><title>Example guide | Kun</title>',
 '<link rel="canonical" href="https://kun-online.com/blog/example-guide">',
 '<script type="application/ld+json">{"@type":"BlogPosting","dateModified":"2026-10-27","author":{"@type":"Organization","name":"كن أونلاين"}}</script></head>',
 '<body><main><article><h1>عنوان المقال</h1><p>باختصار: ابدأ بمراجعة تكاليفك.</p>',
 '<h2>لماذا تختبر المنتج؟</h2><p>مثال افتراضي للمقارنة.</p>',
 '<a href="https://developers.google.com/search/docs">Official documentation</a>',
 '<a href="/blog/guide-a">الأول</a><a href="/blog/guide-b">الثاني</a></article></main></body></html>'
].join('\n');

test('GEO-05: extract basic citation-friendly signals from valid article',()=>{
 const d=inspectPublishedArticle(good,meta);
 assert.deepEqual(d.blockers,[]);
 assert.equal(d.signals.externalSourcesCount,1);
 assert.equal(d.signals.relatedBlogLinks,2);
 assert.equal(d.signals.hasIntroAnswerCue,true);
 assert.equal(d.signals.exampleLabeled,true);
 assert.ok(d.opportunities.includes('consider-verified-human-editor'));
 assert.ok(!d.opportunities.includes('review-primary-source-links'));
});

test('GEO-05: flag canonical and schema problems as blockers, not inferred AI visibility',()=>{
 const bad=good.replace('https://kun-online.com/blog/example-guide','https://kun-online.com/blog/wrong')
 .replace('"dateModified":"2026-10-27"','"dateModified":"2026-10-20"')
 .replace('باختصار:','');
 const d=inspectPublishedArticle(bad,meta);
 assert.deepEqual(d.blockers,['canonical-mismatch','dateModified-registry-mismatch']);
 assert.ok(d.opportunities.includes('review-answer-first-paragraph'));
});

test('GEO-05: evidence checks never interpret public contact links as citations',()=>{
 const sample=good.replace('https://developers.google.com/search/docs','https://wa.me/201021231619')
 .replace('<a href="/blog/guide-b">الثاني</a>','');
 const d=inspectPublishedArticle(sample,meta);
 assert.equal(d.signals.externalSourcesCount,0);
 assert.equal(d.signals.relatedBlogLinks,1);
 assert.ok(d.opportunities.includes('review-primary-source-links'));
 assert.ok(d.opportunities.includes('review-related-guides'));
});
