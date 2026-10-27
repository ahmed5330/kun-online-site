/**
 * GEO-00/GEO-01: repeatable crawl/indexability checks for the marketing site.
 * Static mode runs in PR CI without network access or changing production.
 * --live adds public HTTP checks, including user-agent parity smoke tests.
 * A forged User-Agent NEVER proves verified crawler access or search indexing.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const ORIGIN = 'https://kun-online.com';
const root = path.resolve(fileURLToPath(new URL('..', import.meta.url)));

export function sitemapEntries(xml) {
  return [...xml.matchAll(/<url>([\s\S]*?)<\/url>/g)].map(match => {
    const body = match[1];
    return {
      url: body.match(/<loc>\s*([^<]+)\s*<\/loc>/)?.[1]?.trim() || '',
      lastmod: body.match(/<lastmod>\s*([^<]+)\s*<\/lastmod>/)?.[1]?.trim() || null
    };
  });
}

export function publicFileForPath(pathname) {
  if (pathname === '/') return 'index.html';
  if (pathname.endsWith('/')) return pathname.slice(1) + 'index.html';
  return pathname.slice(1) + '.html';
}

function patternMatches(pattern, pathname) {
  if (!pattern) return false;
  const anchored = pattern.endsWith('$');
  const body = anchored ? pattern.slice(0, -1) : pattern;
  const safe = body.split('*').map(s => s.replace(/[|\\{}()[\]^$+?.]/g, '\\$&')).join('.*');
  return new RegExp('^' + safe + (anchored ? '$' : '')).test(pathname);
}

export function robotsAllows(content, agent, pathname) {
  const groups = [];
  let agents = [], rules = [], startedRules = false;
  const flush = () => {
    if (agents.length) groups.push({ agents, rules });
    agents = []; rules = []; startedRules = false;
  };
  for (const line of content.split(/\r?\n/)) {
    const match = line.replace(/#.*/, '').trim().match(/^([a-z-]+)\s*:\s*(.*?)\s*$/i);
    if (!match) continue;
    const type = match[1].toLowerCase(), value = match[2].trim();
    if (type === 'user-agent') {
      if (startedRules) flush();
      agents.push(value.toLowerCase());
    } else if ((type === 'allow' || type === 'disallow') && agents.length) {
      startedRules = true;
      rules.push({ type, path: value });
    }
  }
  flush();
  const a = agent.toLowerCase();
  const selected = groups.map(group => {
    const scores = group.agents.map(token => token === '*' ? 0 : (a.includes(token) ? token.length : -1));
    return { ...group, score: Math.max(-1, ...scores) };
  });
  const specificity = Math.max(-1, ...selected.map(group => group.score));
  if (specificity < 0) return true;
  const applicable = selected.filter(group => group.score === specificity).flatMap(group => group.rules);
  const matching = applicable.filter(rule => patternMatches(rule.path, pathname));
  if (!matching.length) return true;
  matching.sort((x, y) => {
    const score = r => r.path.replace(/\*/g, '').replace(/\$$/, '').length;
    return score(y) - score(x) || (x.type === 'allow' ? -1 : 1);
  });
  return matching[0].type === 'allow';
}

export function inspectHtml(html, expectedCanonical) {
  const issues = [];
  const canonicalTags = [...html.matchAll(/<link\b[^>]*rel=["']canonical["'][^>]*>/gi)];
  const canonical = canonicalTags[0]?.[0].match(/\bhref=["']([^"']+)["']/i)?.[1] || null;
  if (canonicalTags.length !== 1 || canonical !== expectedCanonical)
    issues.push('canonical-mismatch');
  if ((html.match(/<h1\b/gi) || []).length !== 1) issues.push('h1-count');
  if (!/<title>\s*[^<]+\s*<\/title>/i.test(html)) issues.push('title-missing');
  const robotsTag = [...html.matchAll(/<meta\b[^>]*name=["']robots["'][^>]*>/gi)];
  if (robotsTag.some(m => /\bnoindex\b/i.test(m[0]))) issues.push('noindex');
  const scripts = [...html.matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
  for (const [i, block] of scripts.entries()) {
    try { JSON.parse(block[1]); }
    catch { issues.push('invalid-jsonld-' + (i + 1)); }
  }
  return { canonical, h1Count: (html.match(/<h1\b/gi) || []).length, schemaBlockCount: scripts.length, issues };
}

function check(report, name, ok, evidence = '') {
  report.checks.push({ name, passed: !!ok, evidence: String(evidence).slice(0, 220) });
  if (!ok) report.failures.push(name);
}

async function inspectLive(report, staticUrls) {
  const base = (process.env.GEO_LIVE_BASE || ORIGIN).replace(/\/$/, '');
  if (base !== ORIGIN) throw new Error('Live audit accepts the canonical production origin only');
  const retrieve = async (route, agent = 'KunOnline-GEO-Audit/1.0') => {
    const response = await fetch(base + route, {
      redirect: 'manual',
      headers: { 'user-agent': agent },
      signal: AbortSignal.timeout(15000)
    });
    return { response, html: await response.text() };
  };
  const robots = await retrieve('/robots.txt');
  check(report, 'live-robots-200', robots.response.status === 200, robots.response.status);
  check(report, 'live-robots-sitemap', robots.html.includes('Sitemap: ' + ORIGIN + '/sitemap.xml'));
  const sitemap = await retrieve('/sitemap.xml');
  check(report, 'live-sitemap-200', sitemap.response.status === 200, sitemap.response.status);
  const published = sitemapEntries(sitemap.html).map(e => e.url).sort();
  check(report, 'live-sitemap-parity-with-branch', JSON.stringify(published) === JSON.stringify([...staticUrls].sort()),
    'published=' + published.length + ' source=' + staticUrls.length);
  const sample = ['/', '/services/ecommerce-management/', '/blog/real-cost-per-delivered-order'];
  for (const agent of ['Googlebot', 'Bingbot', 'OAI-SearchBot']) {
    for (const route of sample) {
      try {
        const {response, html} = await retrieve(route, agent);
        const header = response.headers.get('x-robots-tag') || '';
        const challenge = response.headers.get('cf-mitigated') || '';
        const inspected = inspectHtml(html, ORIGIN + route);
        check(report, 'live-ua-smoke-' + agent + '-' + route,
          response.status === 200 && !/\bnoindex\b/i.test(header) &&
          !challenge && !inspected.issues.includes('canonical-mismatch') &&
          !inspected.issues.includes('noindex'),
          'http=' + response.status + ' cf-mitigated=' + challenge +
          ' x-robots-tag=' + header + ' canonical=' + inspected.canonical);
      } catch (error) {
        check(report, 'live-ua-smoke-' + agent + '-' + route, false, error.message);
      }
    }
  }
  report.limitations.push('Changing a User-Agent string cannot establish verified bot status or bypass Cloudflare WAF. Inspect Cloudflare Security Events and verified bot configuration separately.');
  report.limitations.push('HTTP 200 and indexable markup do not establish Google/Bing indexing or AI citations.');
}

export async function run({ live = false } = {}) {
  const report = {
    checkedAt: new Date().toISOString(), mode: live ? 'static-and-live' : 'static',
    source: 'GitHub checkout', base: ORIGIN,
    checks: [], failures: [], pages: [], limitations: [
      'Static findings describe source code, not proof of production deployment.',
      'Search Console URL Inspection, index coverage, Cloudflare bot activity and AI citations require separate provider evidence.'
    ]
  };
  const xml = await fs.readFile(path.join(root, 'sitemap.xml'), 'utf8');
  const robots = await fs.readFile(path.join(root, 'robots.txt'), 'utf8');
  const keywords = JSON.parse(await fs.readFile(path.join(root, 'seo/keyword-map.json'), 'utf8'));
  const entries = sitemapEntries(xml), urls = entries.map(e => e.url);
  const mapped = keywords.pages.map(p => ORIGIN + p.path);
  check(report, 'sitemap-has-urls', entries.length > 0, entries.length);
  check(report, 'sitemap-unique', new Set(urls).size === urls.length, urls.length);
  check(report, 'sitemap-keyword-map-exact', new Set(mapped).size === mapped.length &&
    mapped.length === urls.length && mapped.every(u => urls.includes(u)), 'sitemap=' + urls.length + ' keywordMap=' + mapped.length);
  check(report, 'robots-sitemap', robots.includes('Sitemap: ' + ORIGIN + '/sitemap.xml'));
  for (const agent of ['Googlebot', 'Bingbot', 'OAI-SearchBot']) {
    for (const route of ['/', '/services/', '/system/', '/blog/real-cost-per-delivered-order']) {
      check(report, 'source-robots-' + agent + '-' + route, robotsAllows(robots, agent, route));
    }
  }
  for (const entry of entries) {
    let parsed;
    try { parsed = new URL(entry.url); }
    catch { check(report, 'valid-url-' + entry.url, false); continue; }
    const pathname = parsed.pathname;
    const file = publicFileForPath(pathname);
    const row = {url: entry.url, file, lastmod: entry.lastmod, issues: [], schemaBlockCount: 0};
    report.pages.push(row);
    if (parsed.origin !== ORIGIN || parsed.search || parsed.hash) {
      check(report, 'canonical-origin-' + entry.url, false);
      row.issues.push('wrong-origin-or-parameters');
      continue;
    }
    if (pathname.includes('/article-template') || pathname === '/reviews/' || pathname === '/404.html') {
      check(report, 'not-intended-for-sitemap-' + pathname, false);
      row.issues.push('nonindexable-page-listed');
      continue;
    }
    let html;
    try { html = await fs.readFile(path.join(root, file), 'utf8'); }
    catch { check(report, 'source-file-' + pathname, false, file); row.issues.push('missing-file'); continue; }
    const details = inspectHtml(html, entry.url);
    row.schemaBlockCount = details.schemaBlockCount;
    row.issues.push(...details.issues);
    check(report, 'source-html-indexable-' + pathname, details.issues.length === 0,
      details.issues.join(', ') || 'canonical=' + details.canonical + ' schemaBlocks=' + details.schemaBlockCount);
    const match = keywords.pages.find(p => p.path === pathname);
    row.priority = match?.priority || 'unmapped';
    row.pillar = match?.pillar || 'unmapped';
    check(report, 'keyword-route-' + pathname, !!match, row.priority);
  }
  if (live) await inspectLive(report, urls);
  const out = path.join(root, 'test-results/geo-site-audit.json');
  await fs.mkdir(path.dirname(out), { recursive: true });
  await fs.writeFile(out, JSON.stringify(report, null, 2) + '\n');
  const passing = report.checks.length - report.failures.length;
  console.log('GEO audit: ' + passing + '/' + report.checks.length + ' checks passed; ' +
    report.pages.length + ' sitemap URLs; mode=' + report.mode);
  for (const failure of report.failures) console.error('FAIL ' + failure);
  console.log('Report: test-results/geo-site-audit.json');
  if (report.failures.length) process.exitCode = 1;
  return report;
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  run({live: process.argv.includes('--live')}).catch(error => {
    console.error(error);
    process.exitCode = 1;
  });
}
