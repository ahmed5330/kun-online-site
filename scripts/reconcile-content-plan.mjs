/**
 * Reconcile a *human-reviewed* bridge between the 100-topic publication plan and
 * the existing live blog. A similar-sounding article does NOT automatically
 * complete a planned topic. New matches require explicit editorial approval in
 * seo/published-series-mapping.json.
 *
 * node scripts/reconcile-content-plan.mjs --check  # CI: fail on drift
 * node scripts/reconcile-content-plan.mjs --write  # update the committed plan
 */
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';

const root = path.resolve(import.meta.dirname, '..');
const readJson = relative => JSON.parse(fs.readFileSync(path.join(root, relative), 'utf8'));
const mapPath = path.join(root, 'seo-content-map.json');
const plan = readJson('seo-content-map.json');
const blog = readJson('blog/articles.json');
const bridge = readJson('seo/published-series-mapping.json');

assert.equal(plan.project.total_articles, 100, 'Unexpected project scope: review before changing the 100-article plan');
assert.equal(plan.queue.length, 100, 'Planned series must retain 100 unique topics');
assert.equal(bridge.version, 1);
assert.ok(/^\d{4}-\d{2}-\d{2}$/.test(bridge.reviewedOn));
const articleIds = new Set(plan.queue.map(item => item.article_id));
assert.equal(articleIds.size, 100, 'Duplicate planned article ID');
const blogBySlug = new Map(blog.map(item => [item.slug, item]));
assert.equal(blogBySlug.size, blog.length, 'Duplicate published blog slug');
const matches = new Map();
const accountedFor = new Set();
for (const entry of bridge.seriesMatches) {
  assert.ok(Number.isInteger(entry.article_id) && articleIds.has(entry.article_id), 'Unknown planned article: ' + entry.article_id);
  assert.ok(!matches.has(entry.article_id), 'Planned topic assigned twice: ' + entry.article_id);
  assert.ok(!accountedFor.has(entry.slug), 'Published slug assigned twice: ' + entry.slug);
  assert.ok(entry.reason && entry.reason.trim().length > 15, 'Document why each existing article matches a planned topic');
  assert.ok(blogBySlug.has(entry.slug), 'Mapped article is not published: ' + entry.slug);
  matches.set(entry.article_id, entry.slug);
  accountedFor.add(entry.slug);
}
for (const entry of bridge.supplementalPublished) {
  assert.ok(entry.reason && entry.reason.trim().length > 15, 'Document why each supplemental article is not a series completion');
  assert.ok(!accountedFor.has(entry.slug), 'Published slug appears twice: ' + entry.slug);
  assert.ok(blogBySlug.has(entry.slug), 'Supplemental article not in published blog: ' + entry.slug);
  accountedFor.add(entry.slug);
}
assert.deepEqual([...accountedFor].sort(), [...blogBySlug.keys()].sort(),
  'Every live blog article must be intentionally marked series-matched or supplemental. Review new content before updating the plan.');

const pages = new Map();
const getHtml = slug => {
  if (!pages.has(slug)) pages.set(slug, fs.readFileSync(path.join(root, 'blog', slug + '.html'), 'utf8'));
  return pages.get(slug);
};
const extractText = html => html.replace(/<[^>]*>/g, ' ').replace(/&amp;/g, '&')
  .replace(/&quot;/g, '"').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
const relatedSlugs = html => [...new Set([...html.matchAll(/href=["']\/blog\/([a-z0-9-]+)(?:\/)?(?:[?#][^"']*)?["']/gi)]
  .map(match => match[1]).filter(slug => blogBySlug.has(slug)))].sort();
const allRelated = new Map(blog.map(item => [item.slug, relatedSlugs(getHtml(item.slug))]));
const computed = structuredClone(plan);
for (const row of computed.queue) {
  const slug = matches.get(row.article_id);
  if (!slug) {
    // Existing planned topics that are not one-to-one matches remain queued.
    // Do not reset unrelated failure/needs-review states on a subsequent sync.
    continue;
  }
  const article = blogBySlug.get(slug);
  const html = getHtml(slug);
  const canonical = html.match(/<link\s+rel=["']canonical["']\s+href=["']([^"']+)/i)?.[1];
  const expectedUrl = 'https://kun-online.com/blog/' + slug;
  assert.equal(canonical, expectedUrl, 'Published canonical does not match mapped slug ' + slug);
  const title = extractText(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] || '');
  const heading = extractText(html.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i)?.[1] || '');
  assert.ok(title && heading, 'Published mapped article needs a title and H1: ' + slug);
  assert.ok(/^\d{4}-\d{2}-\d{2}/.test(article.dateISO), 'Missing published date: ' + slug);
  row.status = 'published';
  row.slug = slug;
  row.url = expectedUrl;
  row.published_date = article.dateISO.slice(0, 10);
  row.final_h1 = heading;
  row.seo_title = title;
  row.word_count = article.wordCount ?? null; // article registry metadata, not an independently verified fresh count
  row.primary_keyword = article.keywords?.[0] || null;
  row.secondary_keywords = article.keywords?.slice(1) || [];
  row.search_intent = 'informational';
  row.internal_links_out = allRelated.get(slug).map(other => 'https://kun-online.com/blog/' + other);
  row.internal_links_in = [...allRelated.entries()].filter(([other, links]) => other !== slug && links.includes(slug))
    .map(([other]) => 'https://kun-online.com/blog/' + other).sort();
  row.failure_reason = null;
}
const count = computed.queue.filter(item => item.status === 'published').length;
const pending = computed.queue.find(item => item.status !== 'published');
computed.progress.articles_published = count;
computed.progress.articles_remaining = computed.project.total_articles - count;
computed.progress.project_completion_percentage = Math.round(count / computed.project.total_articles * 10000) / 100;
computed.progress.current_article = null;
computed.progress.next_article = pending?.article_id ?? null;
computed.progress.last_published_date = computed.queue.filter(item => item.status === 'published')
  .map(item => item.published_date).sort().at(-1) ?? null;
// Do not invent last_run_date: reconciliation is NOT a daily publisher invocation.
if (count === computed.project.total_articles) computed.project.status = 'CONTENT_PROJECT_COMPLETE';

const mode = process.argv[2] || '--check';
if (mode === '--write') {
  fs.writeFileSync(mapPath, JSON.stringify(computed, null, 2) + '\n');
} else if (mode === '--check') {
  assert.deepEqual(plan, computed,
    'The 100-topic plan disagrees with the manually approved live-blog mapping; run node scripts/reconcile-content-plan.mjs --write after reviewing mappings.');
} else {
  throw new Error('Use --check or --write');
}
console.log(JSON.stringify({
  seriesMatched: matches.size,
  supplementalPublished: bridge.supplementalPublished.length,
  blogTotal: blog.length,
  queuedInSeries: computed.progress.articles_remaining,
  nextTopic: computed.progress.next_article,
  mode
}));