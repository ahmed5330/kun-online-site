import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import vm from 'node:vm';

const root = resolve(import.meta.dirname, '..');
function* htmlFiles(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith('.') || ['node_modules', 'test-results'].includes(entry.name)) continue;
    const pathname = join(dir, entry.name);
    if (entry.isDirectory()) yield* htmlFiles(pathname);
    else if (entry.name.endsWith('.html') && !entry.name.endsWith('.draft')) yield pathname;
  }
}

test('SEO-19: all public HTML content uses titles and copy, not meta keywords', () => {
  for (const file of htmlFiles(root)) {
    assert.doesNotMatch(readFileSync(file, 'utf8'), /<meta\s+name=["']keywords["'][^>]*>/i, file);
  }
});

function runClick({ href, pathname, search = '', service = null, button = false, consent = false }) {
  const script = readFileSync(join(root, 'assets/site.js'), 'utf8');
  let handler;
  const document = { addEventListener: (type, fn) => {
    assert.equal(type, 'click');
    handler = fn;
  }};
  const window = { location: { pathname, search }, dataLayer: [], __kunGa4Started: consent };
  if (consent) window.gtag = (...args) => window.dataLayer.push(args);
  vm.runInNewContext(script, { document, window, URLSearchParams });
  const anchor = { getAttribute: name => name === 'href' ? (button ? null : href) : name === 'data-contact-channel' ? (button ? 'whatsapp' : null) : null, closest: () => service && ({ getAttribute: () => service }) };
  handler({ target: { closest: selector => selector === 'a[href],button[data-contact-channel="whatsapp"]' ? anchor : null } });
  return JSON.parse(JSON.stringify(window.dataLayer));
}

test('SEO-40: WhatsApp click has path, service, sanitized campaign and legacy event', () => {
  const result = runClick({
    href: 'https://wa.me/201021231619',
    pathname: '/services/ecommerce-ads/',
    search: '?utm_source=google&utm_medium=organic&utm_campaign=brand_2026'
  });
  assert.deepEqual(result.map(x => x.event), ['contact_click', 'whatsapp_click']);
  assert.equal(result[1].service_type, 'ads_management');
  assert.equal(result[1].page_path, '/services/ecommerce-ads/');
  assert.equal(result[1].utm_campaign, 'brand_2026');
  assert.equal(result[1].utm_source, 'google');
});

test('SEO-40: reject unsafe query values and never log full URLs, numbers or message text', () => {
  const result = runClick({
    href: 'https://wa.me/201021231619?text=secret',
    pathname: '/system/inventory/',
    search: '?utm_campaign=foo%40bar.com&utm_source=https%3A%2F%2Fbad.test%2F'
  });
  assert.equal(result[1].service_type, 'commerce_software');
  assert.equal(result[1].utm_campaign, undefined);
  assert.equal(result[1].utm_source, undefined);
  assert.ok(!JSON.stringify(result).includes('secret'));
  assert.ok(!JSON.stringify(result).includes('201021231619'));
});

test('SEO-40: non-contact links produce no event', () => {
  assert.deepEqual(runClick({ href: '/pricing/', pathname: '/' }), []);
});

test('SEO-40: a telephone link is not counted as a WhatsApp intent', () => {
  const result = runClick({ href: 'tel:+200000', pathname: '/' });
  assert.equal(result.length, 1);
  assert.equal(result[0].event, 'contact_click');
  assert.equal(result[0].contact_channel, 'phone');
});

test('SEO-40: homepage and regional WhatsApp buttons are counted', () => {
  const result = runClick({button: true, pathname: '/gulf/', search: '?utm_campaign=saudi'});
  assert.deepEqual(result.map(x => x.event), ['contact_click', 'whatsapp_click']);
  assert.equal(result[1].utm_campaign, 'saudi');
});

test('SEO-40: opted-in WhatsApp button passes a single explicit hit to gtag', () => {
  const result = runClick({button: true, consent: true, pathname: '/services/ecommerce-ads/'});
  const hits = result.filter(x => Array.isArray(x) && x[0] === 'event' && x[1] === 'whatsapp_click');
  assert.equal(hits.length, 1);
  assert.equal(hits[0][2].service_type, 'ads_management');
});

test('SEO-40: all homepage language variants mark every JavaScript WhatsApp CTA', () => {
  for (const p of ['index.html','en/index.html','gulf/index.html']) {
    const html = readFileSync(join(root,p),'utf8');
    const total = (html.match(/<button[^>]*onclick="wa\(/g)||[]).length;
    const tagged = (html.match(/<button[^>]*data-contact-channel="whatsapp"[^>]*onclick="wa\(/g)||[]).length;
    assert.ok(total>0, p + ' should have JavaScript CTA buttons');
    assert.equal(tagged,total,p + ' untracked CTA');
  }
});
