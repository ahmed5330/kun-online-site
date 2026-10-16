import test from 'node:test';
import assert from 'node:assert/strict';
import { pendingApprovedBundles } from '../scripts/approved-queue.mjs';

const bundle = (slug, id) => ({ meta: { slug, article_id: id } });
const published = { slug: 'first-guide', article_id: 2 };
const mapping = { seriesMatches: [{ slug: 'first-guide', article_id: 2 }] };

test('eligible approved bundles are retained when nothing was published', () => {
  assert.deepEqual(pendingApprovedBundles([bundle('first-guide', 2)], [], [], { seriesMatches: [] }),
    [bundle('first-guide', 2)]);
});

test('already published approved bundle is skipped on next day; new content remains', () => {
  const remaining = pendingApprovedBundles(
    [bundle('first-guide', 2), bundle('next-guide', 3)],
    [{ date: '2026-10-16', ...published }],
    [{ slug: 'first-guide' }],
    mapping,
  );
  assert.deepEqual(remaining, [bundle('next-guide', 3)]);
});

test('a published slug without an audit trail is never silently re-published', () => {
  assert.throws(() => pendingApprovedBundles(
    [bundle('first-guide', 2)], [], [{ slug: 'first-guide' }], mapping),
  /without publication history/);
});

test('published bundles must match registry and series mapping', () => {
  assert.throws(() => pendingApprovedBundles(
    [bundle('first-guide', 2)], [{ date: '2026-10-16', ...published }], [], mapping),
  /missing from blog registry/);
  assert.throws(() => pendingApprovedBundles(
    [bundle('first-guide', 2)], [{ date: '2026-10-16', ...published }],
    [{ slug: 'first-guide' }], { seriesMatches: [] }),
  /missing from series mapping/);
  assert.throws(() => pendingApprovedBundles(
    [bundle('first-guide', 3)], [{ date: '2026-10-16', ...published }],
    [{ slug: 'first-guide' }], mapping),
  /article ID mismatch/);
});

test('duplicate article slugs in publication log fail closed', () => {
  assert.throws(() => pendingApprovedBundles([], [published, published], [], mapping),
    /Duplicate publication log slug/);
});
