/**
 * Checks Cloudflare's real public domain rather than GitHub's source tree.
 * A successful unit test or Pages build is not proof that an asset was published.
 * Run by GitHub Actions after main changes or manually via workflow_dispatch.
 */
import fs from 'node:fs/promises';

const base = (process.env.SEO_LIVE_BASE || 'https://kun-online.com').replace(/\/$/, '');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const pages = [
  '/', '/services/', '/system/', '/system/order-management/',
  '/blog/customer-funnel-guide',
  '/system/inventory/', '/system/shipping/', '/system/easy-orders/',
  '/blog/', '/blog/real-cost-per-delivered-order',
  '/blog/order-confirmation-delivery-rate',
  '/blog/inventory-barcode-bundle-tracking',
  '/blog/cod-shipping-returns-reconciliation'
];
const newArticles = pages.filter(p => p.startsWith('/blog/') && p !== '/blog/');
const checks = [];
const failures = [];
async function inspect(path, { redirects = 'follow' } = {}) {
  const url = path.startsWith('https:') ? path : base + path;
  const response = await fetch(url, {
    redirect: redirects,
    signal: AbortSignal.timeout(18000),
    headers: { 'user-agent': 'KunOnlineSEO-LiveAudit/1.0 (+GitHub Actions)' }
  });
  const body = await response.text();
  return { response, body, url };
}
function check(name, predicate, evidence = '') {
  const passed = Boolean(predicate);
  checks.push({ name, passed, evidence: String(evidence).slice(0, 350) });
  if (!passed) failures.push(name);
}
async function run() {
  const records = new Map();
  for (const page of pages) {
    try {
      const r = await inspect(page);
      records.set(page, r);
      check('HTTP 200: ' + page, r.response.status === 200,
        'status=' + r.response.status + ' final=' + r.response.url);
      if (r.response.ok) {
        check('Title and H1: ' + page,
          /<title>[^<]+<\/title>/i.test(r.body) && /<h1\b/i.test(r.body));
        check('Self canonical: ' + page,
          r.body.includes('rel="canonical" href="' + base + page + '"'));
        check('No meta keywords: ' + page,
          !/<meta\s+name=["']keywords["'][^>]*>/i.test(r.body));
        check('No public phone link: ' + page, !/href=["']tel:/i.test(r.body));
      }
    } catch (error) {
      check('HTTP 200: ' + page, false, error.message);
    }
  }
  const requests = [
    ['/sitemap.xml', 'application'],
    ['/robots.txt', 'robots'],
    ['/assets/site.js', 'javascript']
  ];
  for (const [path, type] of requests) {
    try {
      const r = await inspect(path);
      records.set(path, r);
      check('Published ' + path, r.response.status === 200 &&
        (type === 'application' ? /<urlset\b/i.test(r.body)
          : type === 'robots' ? /Sitemap:/i.test(r.body)
          : r.body.includes('G-F2XBVGWB5X')),
        'status=' + r.response.status + ' bytes=' + r.body.length);
    } catch (error) { check('Published ' + path, false, error.message); }
  }
  const sitemap = records.get('/sitemap.xml')?.body || '';
  for (const article of newArticles) {
    check('Sitemap contains ' + article,
      sitemap.includes('<loc>' + base + article + '</loc>'));
  }
  const cro = records.get('/blog/customer-funnel-guide')?.body || '';
  check('Revised CRO guide actually deployed',
    cro.includes('ابنِ لوحة قياس واحدة') &&
    cro.includes('أحداث GA4 المناسبة') &&
    cro.includes('2026-10-15'));
  const js = records.get('/assets/site.js')?.body || '';
  check('Published consent gate and WhatsApp event',
    js.includes('kun_online_analytics_consent_v1') &&
    js.includes('whatsapp_click') &&
    js.includes('G-F2XBVGWB5X'));
  const old = [
    ['https://www.kun-online.com/', base + '/'],
    [base + '/system', base + '/system/'],
    [base + '/blog/what-is-ecommerce.html', base + '/blog/what-is-ecommerce'],
    [base + '/الصفحة-الرئيسية_1', base + '/']
  ];
  for (const [from, expected] of old) {
    try {
      const r = await inspect(from, { redirects: 'manual' });
      const location = r.response.headers.get('location');
      check('301 redirect: ' + from, r.response.status === 301 &&
        new URL(location || '', from).href === expected,
        'status=' + r.response.status + ' location=' + location);
    } catch (error) { check('301 redirect: ' + from, false, error.message); }
  }
  const result = { checkedAt: new Date().toISOString(), base, count: checks.length,
    passed: checks.filter(x => x.passed).length, failures, checks };
  await fs.mkdir('test-results', { recursive: true });
  await fs.writeFile('test-results/live-site-audit.json', JSON.stringify(result, null, 2));
  const summary = [
    '## Cloudflare live SEO release verification',
    '',
    'Checked: ' + result.checkedAt,
    'Domain: ' + base,
    'Passed: **' + result.passed + '/' + result.count + '**',
    '',
    ...(failures.length ? ['### Failed', ...failures.map(x => '- ' + x)] : ['All expected public routes, redirects and measurement assets passed.']),
    '',
    'This is HTTP/source verification only; Google URL Inspection and GA4 Realtime still require separate evidence.'
  ].join('\n') + '\n';
  if (process.env.GITHUB_STEP_SUMMARY)
    await fs.appendFile(process.env.GITHUB_STEP_SUMMARY, summary);
  console.log(summary);
  if (failures.length) process.exitCode = 1;
}
const attempts = Math.max(1, Number(process.env.SEO_LIVE_ATTEMPTS || '6'));
for (let runIndex = 0; runIndex < attempts; runIndex++) {
  failures.length = 0; checks.length = 0;
  await run();
  if (!failures.length) break;
  if (runIndex < attempts - 1) {
    console.log('Deployment might be propagating; retry ' + (runIndex + 2) + '/' + attempts);
    process.exitCode = 0;
    await sleep(20000);
  }
}
