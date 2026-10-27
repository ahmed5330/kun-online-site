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
// PR builds measure main and the candidate from localhost on the *same runner*.
// This removes the production-vs-local mismatch. A single run still varies.
let maxPRCandidateCLS = null;
try {
  const baseline = JSON.parse(await fs.readFile('test-results/lighthouse-baseline-mobile.json', 'utf8'));
  if (!baseline.categories?.performance) throw new Error('Invalid baseline LHR');
  const changed = results.find(r => r.mode === 'mobile');
  const baseScore = Math.round(baseline.categories.performance.score * 100);
  const baseLcp = baseline.audits['largest-contentful-paint']?.numericValue;
  const baseTbt = baseline.audits['total-blocking-time']?.numericValue;
  const baseCls = baseline.audits['cumulative-layout-shift']?.numericValue;
  const ms = (value) => value == null ? 'N/A' : Math.round(value) + ' ms';
  lines.push(
    '',
    '### Same-runner PR comparison: branch versus main',
    '| Metric | Main baseline | Candidate |',
    '|---|---:|---:|',
    '| Mobile performance | ' + baseScore + '/100 | ' + changed.performanceScore + '/100 |',
    '| Mobile LCP | ' + ms(baseLcp) + ' | ' + ms(changed.metrics.LCP) + ' |',
    '| Mobile TBT | ' + ms(baseTbt) + ' | ' + ms(changed.metrics.TBT) + ' |',
    '| Mobile CLS | ' + (baseCls ?? 'N/A') + ' | ' + (changed.metrics.CLS ?? 'N/A') + ' |',
    '',
    'Comparison uses a local static server for both revisions and is NOT equivalent to Cloudflare production.',
    'Do not ship if CLS/UX regresses; rerun to confirm any performance difference.'
  );
  // Counter-balanced ABBA comparison: first/last are baseline, middle
  // runs are candidate. Shows both observations; two runs are still not
  // statistically robust and the test should be repeated before claiming gains.
  const baselineRepeat=JSON.parse(await fs.readFile('test-results/lighthouse-baseline-mobile-repeat.json','utf8'));
  const candidateFirst=JSON.parse(await fs.readFile('test-results/lighthouse-mobile.json','utf8'));
  const candidateRepeat=JSON.parse(await fs.readFile('test-results/lighthouse-mobile-repeat.json','utf8'));
  maxPRCandidateCLS = Math.max(...[candidateFirst,candidateRepeat].map(lhr=>lhr.audits['cumulative-layout-shift']?.numericValue ?? Infinity));
  const pairs=[
    {label:'Main',runs:[baseline,baselineRepeat]},
    {label:'Candidate',runs:[candidateFirst,candidateRepeat]}
  ];
  const average=(values)=>values.reduce((a,b)=>a+b,0)/values.length;
  const score=(lhr)=>Math.round(lhr.categories.performance.score*100);
  const lcp=(lhr)=>lhr.audits['largest-contentful-paint']?.numericValue;
  const cls=(lhr)=>lhr.audits['cumulative-layout-shift']?.numericValue;
  lines.push(
    '',
    '### Counter-balanced A-B-B-A comparison (two mobile runs each)',
    '| Variant | Run 1 score | Run 2 score | Mean score | Mean LCP | Max CLS |',
    '|---|---:|---:|---:|---:|---:|',
    ...pairs.map(p=>[
      p.label, score(p.runs[0]), score(p.runs[1]),
      average(p.runs.map(score)).toFixed(1),
      Math.round(average(p.runs.map(lcp)))+' ms',
      Math.max(...p.runs.map(cls)).toFixed(3)
    ].join(' | ')).map(x=>'| '+x+' |'),
    '',
    'Interpretation: GitHub-hosted Lighthouse lab readings can vary significantly.',
    'The live production and CrUX results remain separate release gates.'
  );

} catch (error) {
  if (process.env.GITHUB_EVENT_NAME === 'pull_request') throw error;
}

const mobile = results.find(r => r.mode === 'mobile');
const mobileCLS = mobile?.metrics.CLS;
const clsThreshold = 0.10;
const isMobileCLSValid = Number.isFinite(mobileCLS) && mobileCLS <= clsThreshold &&
  (maxPRCandidateCLS == null || (Number.isFinite(maxPRCandidateCLS) && maxPRCandidateCLS <= clsThreshold));
lines.push('', '**Mobile layout stability gate:** ' + (isMobileCLSValid ? 'PASS' : 'FAIL') +
  ' — max permitted CLS '+clsThreshold+', observed primary run '+(mobileCLS ?? 'missing') +
  (maxPRCandidateCLS == null ? '' : ', candidate ABBA maximum '+maxPRCandidateCLS.toFixed(3)) +
  '. Synthetic lab gate only; not a substitute for CrUX.', '');
const markdown = lines.join('\n');
console.log(markdown);
if (process.env.GITHUB_STEP_SUMMARY) await fs.appendFile(process.env.GITHUB_STEP_SUMMARY, markdown);
if (!isMobileCLSValid) {
  throw new Error('Mobile CLS safety gate exceeded: primary='+mobileCLS+
    ' maxABBA='+(maxPRCandidateCLS ?? 'not_run')+
    ' threshold='+clsThreshold+'. Do NOT ship a layout-shifting homepage.');
}
