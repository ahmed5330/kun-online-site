import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const read = file => readFileSync(path.join(root, file), 'utf8');
const schema = html => [...html.matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)].map(m => JSON.parse(m[1]));
const byType = (html, type) => schema(html).find(x => x['@type'] === type);
const ORG = 'https://kun-online.com/#organization';
const WEBSITE = 'https://kun-online.com/#website';

test('GEO-03: homepage graph publishes one stable canonical organization identity', () => {
  const home = read('index.html');
  const local = byType(home, 'LocalBusiness');
  const org = byType(home, 'Organization');
  const site = byType(home, 'WebSite');
  assert.equal(local?.['@id'], ORG);
  assert.equal(org?.['@id'], ORG);
  assert.equal(site?.['@id'], WEBSITE);
  assert.equal(site?.publisher?.['@id'], ORG);
  for (const entity of [local, org]) {
    assert.equal(entity.name, 'كن أونلاين');
    assert.equal(entity.url, 'https://kun-online.com/');
    assert.equal(entity.contactPoint?.url, 'https://wa.me/201021231619');
    assert.equal(entity.address?.addressCountry, 'EG');
  }
  assert.deepEqual(local.sameAs, org.sameAs, 'publicly stated identity profiles must match');
});

test('GEO-03: public About and Contact agree on messages-only contact channel', () => {
  const about = read('about/index.html');
  const contact = read('contact/index.html');
  assert.match(about, /رسالة عبر واتساب قبل الزيارة/);
  assert.doesNotMatch(about, /تواصل هاتفيًا قبل الزيارة|اتصل هاتفيًا/);
  assert.match(contact, /ولا نستقبل مكالمات هاتفية/);
  assert.match(about, /لا نستقبل مكالمات هاتفية/);
  assert.match(about, /منهجنا في نشر الأدلة والمحتوى/);
  assert.equal(byType(about, 'Organization')?.['@id'], ORG);
  assert.equal(byType(contact, 'Organization')?.['@id'], ORG);
});

test('GEO-03: all system pages link to the same publisher and website entity', () => {
  const pages = [
    'system/index.html',
    'system/order-management/index.html',
    'system/inventory/index.html',
    'system/shipping/index.html',
    'system/easy-orders/index.html'
  ];
  for (const file of pages) {
    const html = read(file);
    const page = byType(html, 'WebPage');
    assert.ok(page, file + ' missing WebPage JSON-LD');
    assert.equal(page.publisher?.['@id'], ORG, file);
    assert.equal(page.isPartOf?.['@id'], WEBSITE, file);
    assert.ok(page['@id']?.startsWith('https://kun-online.com/system/'), file);
  }
});

test('GEO-03: service schemas use stable publisher identity rather than invented personnel', () => {
  for (const file of [
    'services/ecommerce-management/index.html',
    'services/ecommerce-store-development/index.html',
    'services/ecommerce-ads/index.html',
    'services/order-management/index.html',
    'services/ecommerce-consulting/index.html',
    'consultations/index.html'
  ]) {
    const service = byType(read(file), 'Service');
    assert.equal(service?.provider?.['@id'], ORG, file);
    assert.ok(service?.['@id']?.startsWith('https://kun-online.com/'), file);
  }
});

test('GEO-03: published articles credit the existing business identity consistently', () => {
  const entries = JSON.parse(read('blog/articles.json'));
  const attributableToKun = entity => entity?.['@id'] === ORG ||
    (entity?.['@type'] === 'Organization' &&
      entity.name === 'كن أونلاين' &&
      (entity.url === 'https://kun-online.com' || entity.url === 'https://kun-online.com/'));
  assert.ok(entries.length >= 15, 'unexpectedly missing published articles');
  for (const entry of entries) {
    const file = 'blog/' + entry.slug + '.html';
    const posting = byType(read(file), 'BlogPosting');
    assert.ok(posting, file + ': missing BlogPosting');
    assert.ok(attributableToKun(posting.publisher), file + ': inconsistent publisher');
    assert.ok(attributableToKun(posting.author), file + ': author not yet documented');
    assert.equal(posting.mainEntityOfPage, 'https://kun-online.com/blog/' + entry.slug, file);
  }
});
