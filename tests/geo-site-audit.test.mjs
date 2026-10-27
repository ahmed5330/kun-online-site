import test from 'node:test';
import assert from 'node:assert/strict';
import { sitemapEntries, publicFileForPath, robotsAllows, inspectHtml } from '../scripts/geo-site-audit.mjs';

test('GEO: sitemap parser extracts canonical URLs and optional editorial lastmod', () => {
  const xml = '<urlset><url><loc>https://kun-online.com/</loc></url>' +
    '<url><loc>https://kun-online.com/blog/guide</loc><lastmod>2026-10-27</lastmod></url></urlset>';
  assert.deepEqual(sitemapEntries(xml), [
    {url: 'https://kun-online.com/', lastmod: null},
    {url: 'https://kun-online.com/blog/guide', lastmod: '2026-10-27'}
  ]);
  assert.equal(publicFileForPath('/'), 'index.html');
  assert.equal(publicFileForPath('/services/'), 'services/index.html');
  assert.equal(publicFileForPath('/blog/guide'), 'blog/guide.html');
});

test('GEO: robots logic allows core pages and blocks nonpublic files', () => {
  const robots = [
    'User-agent: *', 'Allow: /', 'Disallow: /scripts/',
    'Sitemap: https://kun-online.com/sitemap.xml'
  ].join('\n');
  for (const bot of ['Googlebot', 'Bingbot', 'OAI-SearchBot']) {
    assert.equal(robotsAllows(robots, bot, '/'), true);
    assert.equal(robotsAllows(robots, bot, '/blog/article'), true);
    assert.equal(robotsAllows(robots, bot, '/scripts/refresh_site.py'), false);
  }
});

test('GEO: explicit crawler-specific block is detected, wildcard exception respected', () => {
  const robots = [
    'User-agent: *', 'Disallow: /',
    'User-agent: OAI-SearchBot', 'Allow: /', 'Disallow: /private/',
    'User-agent: Bingbot', 'Disallow: /'
  ].join('\n');
  assert.equal(robotsAllows(robots, 'OAI-SearchBot', '/blog/guide'), true);
  assert.equal(robotsAllows(robots, 'OAI-SearchBot', '/private/test'), false);
  assert.equal(robotsAllows(robots, 'Bingbot', '/'), false);
  assert.equal(robotsAllows(robots, 'Googlebot', '/'), false);
});

test('GEO: HTML checker catches canonical mismatches, noindex, malformed schema and headings', () => {
  const good = '<html><head><title>Demo</title>' +
    '<link rel="canonical" href="https://kun-online.com/blog/demo">' +
    '<script type="application/ld+json">{"@context":"https://schema.org","@type":"Article"}</script>' +
    '</head><body><h1>Title</h1></body></html>';
  const url = 'https://kun-online.com/blog/demo';
  assert.deepEqual(inspectHtml(good, url).issues, []);
  const bad = good.replace(url, url + '-wrong').replace('<h1>Title</h1>', '<h1>Title</h1><h1>Extra</h1>')
    .replace('</head>', '<meta name="robots" content="noindex,follow"></head>')
    .replace('"@type":"Article"', '"@type":}');
  const result = inspectHtml(bad, url);
  for (const issue of ['canonical-mismatch', 'h1-count', 'noindex', 'invalid-jsonld-1']) {
    assert.ok(result.issues.includes(issue), issue);
  }
});
