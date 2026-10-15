/** Summarize measured Lighthouse *lab* results without inventing real-user INP. */
import fs from 'node:fs/promises';

const labels = [
  ['first-contentful-paint', 'FCP'],
  ['largest-contentful-paint', 'LCP'],
  ['speed-index', 'Speed Index'],
  ['total-blocking-time', 'TBT'],
  ['cumulative-layout-shift', 'CLS']
];
const results = [];
for (const mode of ['mobile', 'desktop']) {
  const path = 'test-results/lighthouse-' + mode + '.json';
  let lhr;
  try { lhr = JSON.parse(await fs.readFile(path, 'utf8')); }
  catch (error) { throw Error('Missing Lighthouse report: ' + path + ' (' + error.message + ')'); }
  if (lhr.runtimeError || !lhr.categories?.performance) {
    throw Error('Lighthouse did not complete: ' + mode + ' ' + (lhr.runtimeError?.message || 'missing performance category'));
  }
  const metrics = Object.fromEntries(labels.map(([id, label]) => {
    const audit = lhr.audits[id];
    return [label, audit?.numericValue == null ? null : +audit.numericValue.toFixed(id === 'cumulative-layout-shift' ? 3 : 1)];
  }));
  results.push({
    mode, requestedUrl: lhr.requestedUrl, finalUrl: lhr.finalDisplayedUrl || lhr.finalUrl,
    fetchTime: lhr.fetchTime,
    lighthouseVersion: lhr.lighthouseVersion,
    performanceScore: Math.round(lhr.categories.performance.score * 100),
    seoScore: lhr.categories.seo?.score == null ? null : Math.round(lhr.categories.seo.score * 100),
    metrics,
    // Lighthouse is synthetic laboratory testing. INP is a field metric and
    // must not be filled with TBT or a fabricated number.
    INP: null, inpReason: 'Field INP unavailable from Lighthouse; use CrUX/PageSpeed Insights user data.'
  });
}
await fs.writeFile('test-results/lighthouse-summary.json', JSON.stringify({
  capturedAt: new Date().toISOString(),
  methodology: 'Lighthouse lab test from clean GitHub Actions Chrome; mobile emulated and desktop preset, first view; results vary run-to-run. NOT CrUX 28-day field data.',
  results
}, null, 2) + '\n');
const lines = [
  '## Kun Online — synthetic mobile/desktop Lighthouse baseline',
  '',
  '| Test | Performance | SEO | LCP | CLS | TBT | FCP |',
  '|---|---:|---:|---:|---:|---:|---:|',
  ...results.map(r => [
    r.mode, r.performanceScore + '/100', r.seoScore == null ? 'N/A' : r.seoScore + '/100',
    r.metrics.LCP == null ? 'N/A' : (r.metrics.LCP / 1000).toFixed(2) + ' s',
    r.metrics.CLS ?? 'N/A',
    r.metrics.TBT == null ? 'N/A' : Math.round(r.metrics.TBT) + ' ms',
    r.metrics.FCP == null ? 'N/A' : (r.metrics.FCP / 1000).toFixed(2) + ' s'
  ].join(' | ')).map(x => '| ' + x + ' |'),
  '',
  '**INP: not measured.** Lighthouse gives synthetic lab results; real-user INP, LCP, CLS need CrUX/Google Search Console Core Web Vitals and sufficient data. No false field-data claims.',
  'Comparison across runs requires matching lab settings and enough repeated samples.',
  ''
];
const markdown = lines.join('\n');
console.log(markdown);
if (process.env.GITHUB_STEP_SUMMARY) await fs.appendFile(process.env.GITHUB_STEP_SUMMARY, markdown);
