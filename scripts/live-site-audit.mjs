/**
 * Checks Cloudflare's real public domain rather than GitHub's source tree.
 * A successful unit test or Pages build is not proof that an asset was published.
 * Run by GitHub Actions after main changes or manually via workflow_dispatch.
 */
import fs from 'node:fs/promises';
import { createHash } from 'node:crypto';

const base = (process.env.SEO_LIVE_BASE || 'https://kun-online.com').replace(/\/$/, '');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const pages = [
  '/', '/en/', '/gulf/', '/services/', '/system/', '/system/order-management/',
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
async function inspect(path, { redirects = 'follow', userAgent = 'KunOnlineSEO-LiveAudit/1.0 (+GitHub Actions)' } = {}) {
  const url = path.startsWith('https:') ? path : base + path;
  const response = await fetch(url, {
    redirect: redirects,
    signal: AbortSignal.timeout(18000),
    headers: { 'user-agent': userAgent }
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
  const source=await fs.readFile('assets/site.js','utf8');
  const sourceHash=createHash('sha1').update(Buffer.from('blob '+Buffer.byteLength(source)+'\0')).update(source).digest('hex').slice(0,12);
  const versionedSource='/assets/site.js?v='+sourceHash;
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
        check('Live page references current JS bundle: ' + page,
          r.body.includes('src="'+versionedSource+'"'));
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
  // Search Console may lag behind deployment. Independently crawl every one
  // of the *published* sitemap's canonical URLs, not just the small smoke list.
  const sitemapUrls=[...sitemap.matchAll(/<loc>\s*(https:\/\/[^<]+)\s*<\/loc>/g)].map(m=>m[1]);
  const declared=JSON.parse(await fs.readFile('seo/keyword-map.json','utf8')).pages;
  const expected=declared.map(p=>base+p.path);
  check('Sitemap contains each and only each declared indexable URL',
    sitemapUrls.length===expected.length && expected.every(url=>sitemapUrls.includes(url)),
    'actual='+sitemapUrls.length+' mapped='+expected.length);
  check('Sitemap has no duplicate canonical URLs',
    sitemapUrls.length===new Set(sitemapUrls).size);
  for (const url of sitemapUrls) {
    let target;
    try { target=new URL(url); } catch(error) {
      check('Valid sitemap URL: '+url,false,error.message);continue;
    }
    // Do not fetch arbitrary remote hosts supplied by a live XML response.
    if(target.origin!==base) {
      check('Sitemap URL stays on canonical origin: '+url,false);continue;
    }
    if(pages.includes(target.pathname)) continue; // Existing smoke checks above
    try {
      const r=await inspect(url);
      check('Sitemap route HTTP 200: '+target.pathname,
        r.response.status===200 && r.response.url===url,
        'status='+r.response.status+' final='+r.response.url);
      if(r.response.status===200) {
        check('Sitemap page self-canonical: '+target.pathname,
          r.body.includes('rel="canonical" href="'+url+'"'));
        check('Sitemap page has title and single H1: '+target.pathname,
          /<title>[^<]+<\/title>/i.test(r.body) &&
          (r.body.match(/<h1\b/gi)||[]).length===1);
        check('Sitemap page is not noindex: '+target.pathname,
          !/<meta[^>]*name=["']robots["'][^>]*content=["'][^"']*noindex/i.test(r.body));
        check('Sitemap page has no obsolete keywords meta: '+target.pathname,
          !/<meta\s+name=["']keywords["'][^>]*>/i.test(r.body));
        check('Sitemap page references current JS bundle: '+target.pathname,
          r.body.includes('src="'+versionedSource+'"'));
      }
    } catch(error) {check('Sitemap route HTTP 200: '+target.pathname,false,error.message);}
  }
  // Parity audit catches accidental Cloudflare challenges targeting crawlers.
  // A forged User-Agent is only a smoke test, NOT proof that Google indexed it.
  for (const pathname of ['/', '/services/', '/system/', '/blog/real-cost-per-delivered-order']) {
    try {
      const r=await inspect(pathname,{userAgent:'Googlebot'});
      check('Googlebot user-agent receives indexable 200: '+pathname,
        r.response.status===200 &&
        r.body.includes('rel="canonical" href="'+base+pathname+'"') &&
        !/<meta[^>]*name=["']robots["'][^>]*content=["'][^"']*noindex/i.test(r.body),
        'status='+r.response.status);
    } catch(error) {check('Googlebot user-agent receives indexable 200: '+pathname,false,error.message);}
  }
  for (const article of newArticles) {
    check('Sitemap contains ' + article,
      sitemap.includes('<loc>' + base + article + '</loc>'));
  }
  const cro = records.get('/blog/customer-funnel-guide')?.body || '';
  check('Revised CRO guide actually deployed',
    cro.includes('ابنِ لوحة قياس واحدة') &&
    cro.includes('أحداث GA4 المناسبة') &&
    cro.includes('2026-10-15'));
  const unversionedJs=records.get('/assets/site.js')?.body || '';
  let js=unversionedJs;
  try {
    const live=await inspect(versionedSource);
    check('Versioned analytics script returns HTTP 200',
      live.response.status===200,'status='+live.response.status);
    check('Versioned analytics script matches published GitHub source',
      live.body===source, 'expectedSourceBytes='+Buffer.byteLength(source)+
      ' liveBytes='+Buffer.byteLength(live.body));
    // Unlike /assets/site.js without a query, the HTML references the exact
    // Git-blob fingerprint in versionedSource. A 24h browser TTL is safe for
    // content-identical versioned URLs; the prior 300-second assertion was
    // incompatible with the real Cloudflare zone's Browser Cache TTL.
    // This is only accepted together with the source-identity check above.
    const cacheHeader=live.response.headers.get('cache-control')||'';
    const ttlMatch=cacheHeader.match(/(?:^|,)\\s*max-age=(\\d+)(?:,|$)/i);
    const ttl=ttlMatch ? Number(ttlMatch[1]) : null;
    const shortOrVersioned=/(?:^|,)\\s*(?:no-cache|no-store)(?:,|$)/i.test(cacheHeader) ||
      (ttl !== null && Number.isFinite(ttl) && ttl <= 86400);
    check('Fingerprinted consent script has safe bounded cache and current source',
      live.body===source && shortOrVersioned,
      'cache-control='+cacheHeader+' version='+sourceHash+
      ' bytes='+Buffer.byteLength(live.body));
    if(live.response.ok) js=live.body;
  } catch(error) { check('Versioned script fetch succeeds',false,error.message); }
  check('Published consent gate and WhatsApp event',
    js.includes('kun_online_analytics_consent_v1') &&
    js.includes('whatsapp_click') &&
    js.includes('G-F2XBVGWB5X'));
  for (const region of ['/', '/en/', '/gulf/']) {
    const html = records.get(region)?.body || '';
    const marked = (html.match(/<button[^>]*data-contact-channel="whatsapp"[^>]*onclick="wa\(/g) || []).length;
    check('All five WhatsApp buttons tagged for attribution: ' + region,
      marked === 5, 'found=' + marked + '; expected=5');
  }
  check('Published JavaScript delegates to WhatsApp anchors and buttons',
    js.includes('button[data-contact-channel="whatsapp"]') &&
    js.includes("window.gtag('event', 'whatsapp_click'"));
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
