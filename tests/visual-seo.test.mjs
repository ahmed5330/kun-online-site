import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const read = path => readFileSync(join(root, path), 'utf8');
const items = JSON.parse(read('blog/articles.json'));
const policy = JSON.parse(read('seo/visual-seo-policy.json'));
const sitemap = read('sitemap.xml');

test('VISUAL-01: face-free editorial policy and source-generated vector assets', () => {
  assert.equal(policy.facesAllowed, false);
  assert.equal(policy.recognizablePeopleAllowed, false);
  assert.equal(policy.doNotPublishIfFaceOrIdentityUncertain, true);
  assert.equal(policy.humanReviewRequiredForImportedVisuals, true);
  for (const name of ['commerce-workflow', 'editorial-analytics']) {
    const svg = read('assets/visuals/' + name + '.svg');
    assert.match(svg, /^<svg /);
    assert.match(svg, /<title /);
    assert.match(svg, /<desc /);
    assert.doesNotMatch(svg, /<image(?:\s|\/|>)/i, 'No imported photos in the approved geometric SVGs');
    assert.doesNotMatch(svg, /<script|<foreignObject|onload=|href="https?:|data:/i, 'No embedded remote assets or scripts');
  }
  const coverScript = read('scripts/generate-approved-covers.py');
  assert.match(coverScript, /def cover_topic\(/);
  assert.match(coverScript, /def draw_motif\(/);
  assert.match(coverScript, /Image\.new\("RGB", SIZE\)/);
  assert.match(coverScript, /\.with_suffix\("\.webp"\)/);
  assert.match(coverScript, /name\+"-640\.webp"/);
});

test('VISUAL-02: every published article has crawlable, descriptive, shareable image', () => {
  assert.ok(items.length > 0);
  for (const item of items) {
    const png = item.slug + '.png';
    assert.equal(item.image, png);
    assert.ok(existsSync(join(root, 'blog/images', png)), 'Missing real cover: ' + png);
    const source = read('blog/' + item.slug + '.html');
    const absolute = 'https://kun-online.com/blog/images/' + png;
    assert.ok(source.includes('property="og:image" content="' + absolute + '"'), 'OG cover: ' + item.slug);
    assert.ok(source.includes('name="twitter:image" content="' + absolute + '"'), 'Twitter cover: ' + item.slug);
    assert.match(source, /property="og:image:width" content="1200"/, 'Cover width: ' + item.slug);
    assert.match(source, /property="og:image:height" content="630"/, 'Cover height: ' + item.slug);
    assert.match(source, /property="og:image:alt" content="[^"]{10,}"/, 'OG image alt: ' + item.slug);
    const figures = [...source.matchAll(/<img\b[^>]*>/gi)].map(x => x[0]);
    assert.ok(figures.some(tag => tag.includes('/blog/images/' + png) &&
      /\balt="[^"]{10,}"/.test(tag) && /\bwidth="1200"/.test(tag) &&
      /\bheight="630"/.test(tag)), 'Visible accessible image: ' + item.slug);
    const jsonld = [...source.matchAll(/<script\b[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi)]
      .map(x => JSON.parse(x[1]));
    assert.ok(jsonld.some(x => x['@type'] === 'BlogPosting' && x.image === absolute),
      'BlogPosting.image must match the visible cover: ' + item.slug);
  }
});

test('VISUAL-03: image sitemap describes published covers and original illustrations', () => {
  assert.match(sitemap, /xmlns:image="http:\/\/www\.google\.com\/schemas\/sitemap-image\/1\.1"/);
  for (const item of items) {
    assert.ok(sitemap.includes('<image:loc>https://kun-online.com/blog/images/' + item.image + '</image:loc>'),
      'Sitemap missing ' + item.slug);
  }
  for (const asset of ['commerce-workflow.svg', 'editorial-analytics.svg']) {
    assert.ok(sitemap.includes('<image:loc>https://kun-online.com/assets/visuals/' + asset + '</image:loc>'));
  }
});

test('VISUAL-04: home, services and blog use real HTML images with ALT and dimensions', () => {
  for (const [path, file] of [['index.html', 'commerce-workflow.svg'],
    ['services/index.html', 'commerce-workflow.svg'],
    ['blog/index.html', 'editorial-analytics.svg']]) {
    const source = read(path);
    const tag = [...source.matchAll(/<img\b[^>]*>/gi)].map(x => x[0])
      .find(t => t.includes('/assets/visuals/' + file));
    assert.ok(tag, 'Image missing: ' + path);
    assert.match(tag, /\balt="[^"]{25,}"/);
    assert.match(tag, /\bwidth="1200"/);
    assert.match(tag, /\bheight="630"/);
    assert.match(tag, /\bdecoding="async"/);
  }
});
