/**
 * VPS-free publisher for pre-approved static blog articles.
 *
 * --check   Validate all approved bundles; report publishability; never write.
 * --publish Publish at most ONE bundle on one Cairo calendar day.
 *
 * A bundle comprises content/approved/<slug>.json and <slug>.html.ready.
 * An approved JSON file and content are editorial sign-off, not AI generation.
 * This program never accesses external accounts, article APIs or a VPS.
 */
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';

const root = path.resolve(import.meta.dirname, '..');
const approvedDir = path.join(root, 'content/approved');
const lockPath = path.join(root, 'content/publication-log.json');
const mode = process.argv[2] || '--check';
assert.ok(['--check', '--publish'].includes(mode), 'Use --check or --publish');
const readJson = file => JSON.parse(fs.readFileSync(file, 'utf8'));
const writeJson = (file, data) => fs.writeFileSync(file, JSON.stringify(data, null, 2) + '\n');
const isDate = value => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) &&
  Number.isFinite(Date.parse(value + 'T00:00:00Z'));
const parts = new Intl.DateTimeFormat('en-US', { timeZone: 'Africa/Cairo', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date());
const part = type => parts.find(item => item.type === type)?.value;
const cairoDate = part('year') + '-' + part('month') + '-' + part('day');
assert.ok(isDate(cairoDate), 'Cannot resolve Cairo publication date');
const arabicMonths = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
const dateLabel = Number(part('day')) + ' ' + arabicMonths[Number(part('month')) - 1] + ' ' + part('year');
const safeSlug = slug => /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug);
const wordsIn = html => {
  const body = html.match(/<article\b[^>]*>([\s\S]*?)<\/article>/i)?.[1] || '';
  assert.ok(body, 'Approved article must have a real <article> body');
  return body.replace(/<script[\s\S]*?<\/script>/gi, '').replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]*>/g, ' ').replace(/&(?:[a-z]+|#\d+);/gi, ' ')
    .trim().split(/\s+/).filter(Boolean).length;
};
const registryPath = path.join(root, 'blog/articles.json');
const planPath = path.join(root, 'seo-content-map.json');
const mappingPath = path.join(root, 'seo/published-series-mapping.json');
const keywordsPath = path.join(root, 'seo/keyword-map.json');
const blog = readJson(registryPath);
const plan = readJson(planPath);
const mapping = readJson(mappingPath);
const keywordMap = readJson(keywordsPath);
const log = readJson(lockPath);
assert.ok(Array.isArray(log), 'Publication log must be an array');
assert.ok(Array.isArray(blog) && Array.isArray(plan.queue) && Array.isArray(mapping.seriesMatches));
assert.ok(!log.some(entry => !isDate(entry.date) || !safeSlug(entry.slug)), 'Malformed publication history');
assert.equal(new Set(log.map(entry => entry.date)).size, log.length, 'Only one recorded publication per Cairo day');
assert.equal(new Set(blog.map(entry => entry.slug)).size, blog.length, 'Duplicated blog article slugs');

const publishedToday = blog.some(article => typeof article.dateISO === 'string' &&
  article.dateISO.slice(0, 10) === cairoDate);
const alreadyLoggedToday = log.some(entry => entry.date === cairoDate);
const approved = fs.readdirSync(approvedDir).filter(file => file.endsWith('.json')).sort().map(file => {
  const slug = file.slice(0, -5);
  assert.ok(safeSlug(slug), 'Unsafe approved bundle filename: ' + file);
  const meta = readJson(path.join(approvedDir, file));
  assert.equal(meta.slug, slug, 'Bundle name must match slug: ' + slug);
  assert.equal(meta.approved, true, 'Never auto-publish an unapproved bundle: ' + slug);
  assert.ok(isDate(meta.eligibleFrom), 'Bundle missing eligibleFrom YYYY-MM-DD: ' + slug);
  assert.ok(Number.isInteger(meta.article_id) && meta.article_id >= 1 && meta.article_id <= 100, 'Invalid planned article ID');
  const source = path.join(approvedDir, slug + '.html.ready');
  assert.ok(fs.existsSync(source), 'Approved HTML is missing: ' + slug);
  return { meta, source };
}).sort((a, b) => a.meta.article_id - b.meta.article_id);

function validateBundle({ meta, source }) {
  const { slug, article_id: id } = meta;
  assert.ok(!blog.some(article => article.slug === slug), 'Slug already published: ' + slug);
  assert.ok(!fs.existsSync(path.join(root, 'blog', slug + '.html')), 'An article HTML with the slug already exists: ' + slug);
  assert.ok(!mapping.seriesMatches.some(match => match.article_id === id || match.slug === slug), 'Planned topic already mapped: ' + id);
  assert.ok(!mapping.supplementalPublished.some(item => item.slug === slug), 'Slug exists as supplemental content');
  const target = plan.queue.find(topic => topic.article_id === id);
  assert.ok(target && ['queued', 'needs_review'].includes(target.status), 'Planned topic already completed: ' + id);
  assert.ok(typeof meta.title === 'string' && meta.title.length > 12, 'Missing editorial title');
  assert.ok(typeof meta.description === 'string' && meta.description.length >= 80, 'Missing description');
  assert.ok(typeof meta.primaryKeyword === 'string' && meta.primaryKeyword.length >= 4, 'Missing primary keyword');
  assert.ok(Array.isArray(meta.secondaryKeywords) && meta.secondaryKeywords.length >= 1, 'Missing secondary keywords');
  assert.ok(typeof meta.category === 'string' && meta.category.length > 0, 'Missing category');
  assert.ok(typeof meta.categoryLabel === 'string' && meta.categoryLabel.length > 0, 'Missing readable category');
  assert.ok(Array.isArray(meta.inboundFrom) && new Set(meta.inboundFrom).size >= 2, 'Require at least two reviewed inbound article links');
  assert.ok(meta.inboundFrom.every(other => blog.some(item => item.slug === other) && other !== slug), 'Inbound links must point to already published guides');
  assert.ok(typeof meta.editorialApproval === 'string' && meta.editorialApproval.length >= 8, 'Record an explicit editorial approval reference');
  const index = fs.readFileSync(path.join(root, 'blog/index.html'), 'utf8');
  assert.ok(index.includes('<option value="' + meta.category + '">'), 'Blog category filter must support the approved category: ' + meta.category);
  assert.equal(keywordMap.metricsAvailable, false, 'Never fabricate keyword demand data');
  assert.ok(!keywordMap.pages.some(page => page.path === '/blog/' + slug), 'Keyword map already contains this URL');
  const imageFile = meta.image;
  assert.ok(typeof imageFile === 'string' && imageFile === slug + '.png', 'Featured image must be a uniquely named PNG');
  const imagePath = path.join(root, 'blog/images', imageFile);
  assert.ok(fs.existsSync(imagePath), 'Approved featured image is missing: ' + imagePath);
  const image = fs.readFileSync(imagePath);
  assert.ok(image.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10])), 'Featured image must be a genuine PNG');
  assert.equal(image.readUInt32BE(16), 1200, 'Featured image must be 1200 pixels wide');
  assert.equal(image.readUInt32BE(20), 630, 'Featured image must be 630 pixels high');
  let html = fs.readFileSync(source, 'utf8');
  const canonical = 'https://kun-online.com/blog/' + slug;
  assert.ok(html.includes('href="' + canonical + '"'), 'Approved page missing self canonical');
  assert.ok(html.includes('content="' + canonical + '"'), 'Approved page missing canonical social URL');
  assert.ok(html.includes('https://kun-online.com/blog/images/' + imageFile), 'Approved page missing social image');
  assert.ok(html.includes('src="/blog/images/' + imageFile + '"'), 'Approved article does not render its image');
  assert.equal((html.match(/<h1\b/gi) || []).length, 1, 'Must contain exactly one H1');
  assert.ok((html.match(/<h2\b/gi) || []).length >= 5, 'Must have at least five H2 sections');
  assert.ok(html.includes('<main') && html.includes('</main>'), 'Main landmark missing');
  assert.ok(html.includes('type="application/ld+json"'), 'Structured data missing');
  assert.ok(html.includes('rel="canonical"'), 'Self canonical missing');
  assert.ok(html.includes('<meta name="description"'), 'Meta description missing');
  assert.ok(html.includes('__PUBLICATION_DATE_ISO__') && html.includes('__PUBLICATION_DATE_AR__'), 'Replaceable publication dates are required');
  assert.ok(!html.includes('{{'), 'Unresolved template token');
  assert.ok(!/<meta[^>]*name=["']robots["'][^>]*content=["'][^"']*noindex/i.test(html), 'Approved article must be indexable');
  assert.ok(html.includes('https://wa.me/201021231619') && !/href=["']tel:/i.test(html), 'WhatsApp-only contact required');
  const words = wordsIn(html);
  assert.ok(words >= 1500 && words <= 2200, 'Quality gate: 1500–2200 article words, got ' + words);
  const outgoing = [...new Set([...html.matchAll(/href=["']\/blog\/([a-z0-9-]+)/g)].map(match => match[1]))];
  assert.ok(outgoing.filter(other => blog.some(item => item.slug === other)).length >= 3,
    'Must link to at least three already published guides');
  html = html.replaceAll('__PUBLICATION_DATE_ISO__', cairoDate).replaceAll('__PUBLICATION_DATE_AR__', dateLabel);
  for (const match of html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) JSON.parse(match[1]);
  return { html, words, canonical, outgoing };
}

// Even a manual run cannot override this guard. Future publication runs get a
// fresh checkout of main; conflicting concurrent git pushes are non-fast-forward.
if (publishedToday || alreadyLoggedToday) {
  console.log('NO PUBLICATION: a blog post has already been published on ' + cairoDate + ' Cairo time.');
  process.exit(0);
}
if (approved.length === 0) {
  console.log('NO PUBLICATION: there are no editorially approved bundles in content/approved/.');
  process.exit(0);
}
const ready = approved.filter(bundle => bundle.meta.eligibleFrom <= cairoDate);
if (ready.length === 0) {
  console.log('NO PUBLICATION: approved articles are not eligible yet.');
  process.exit(0);
}
// Always validate *every eligible approved bundle* to surface dangerous drift.
const validated = ready.map(bundle => ({ ...bundle, validated: validateBundle(bundle) }));
const chosen = validated[0];
if (mode === '--check') {
  console.log('DRY RUN: first eligible article ' + chosen.meta.article_id + ' / ' + chosen.meta.slug +
    ', Cairo date ' + cairoDate + ', approved candidates ' + validated.length);
  process.exit(0);
}
const { meta, validated: result } = chosen;
const target = plan.queue.find(topic => topic.article_id === meta.article_id);
assert.ok(target && target.status !== 'published');
const newArticle = {
  slug: meta.slug,
  title: meta.title,
  excerpt: meta.description,
  description: meta.description,
  category: meta.category,
  categoryLabel: meta.categoryLabel,
  keywords: [meta.primaryKeyword, ...meta.secondaryKeywords],
  date: dateLabel,
  dateISO: cairoDate,
  readTime: Math.ceil(result.words / 170),
  wordCount: result.words,
  icon: '📘',
  image: meta.image,
  dateModified: cairoDate
};
blog.unshift(newArticle);
const link = '<section class="related-static" aria-label="مقال ذو صلة"><p>اقرأ أيضًا: <a href="/blog/' + meta.slug + '">' +
  meta.title.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('"', '&quot;') + '</a></p></section>';
for (const slug of meta.inboundFrom) {
  const file = path.join(root, 'blog', slug + '.html');
  const existing = fs.readFileSync(file, 'utf8');
  assert.ok(existing.includes('</main>'), 'Related source missing main landmark: ' + slug);
  assert.ok(!existing.includes('href="/blog/' + meta.slug + '"'), 'Related source already links to article: ' + slug);
  fs.writeFileSync(file, existing.replace('</main>', link + '</main>'));
}
fs.writeFileSync(path.join(root, 'blog', meta.slug + '.html'), result.html);
writeJson(registryPath, blog);
mapping.seriesMatches.push({ article_id: meta.article_id, slug: meta.slug, reason: 'Approved published series article; ' + meta.editorialApproval });
writeJson(mappingPath, mapping);
// Required by the site's existing "every indexable page is keyword mapped" test.
keywordMap.pages.push({
  path: '/blog/' + meta.slug,
  primary: meta.primaryKeyword,
  secondary: meta.secondaryKeywords,
  market: meta.market || 'EG+GCC',
  pillar: 'editorial',
  intent: 'informational',
  priority: 'P1',
  notes: 'Article approved editorially; search volume and keyword difficulty are unverified.'
});
writeJson(keywordsPath, keywordMap);
// Reconciliation is the authoritative source for series dates/links and counts.
execFileSync(process.execPath, [path.join(root, 'scripts/reconcile-content-plan.mjs'), '--write'], { cwd: root, stdio: 'inherit' });
log.push({ date: cairoDate, slug: meta.slug, article_id: meta.article_id, editorialApproval: meta.editorialApproval });
writeJson(lockPath, log);
console.log('PREPARED ONE ARTICLE: ' + meta.slug + '. The workflow must pass npm test and commit before this is publicly deployed.');
