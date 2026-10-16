/**
 * Exclude approved bundles already published and recorded by the daily publisher.
 * The approval files intentionally remain in git as editorial evidence.
 *
 * Fail closed if the publication log, registry, and series mapping disagree.
 */
import assert from 'node:assert/strict';

export function pendingApprovedBundles(approved, log, blog, mapping) {
  const loggedBySlug = new Map();
  for (const item of log) {
    assert.ok(!loggedBySlug.has(item.slug), 'Duplicate publication log slug: ' + item.slug);
    loggedBySlug.set(item.slug, item);
  }

  const registeredSlugs = new Set(blog.map(article => article.slug));
  return approved.filter(({ meta }) => {
    const entry = loggedBySlug.get(meta.slug);
    if (!entry) {
      // A matching published slug without a log is a corruption, not a fresh article.
      assert.ok(!registeredSlugs.has(meta.slug),
        'Approved slug is already in the public registry without publication history: ' + meta.slug);
      return true;
    }

    assert.equal(entry.article_id, meta.article_id,
      'Publication history article ID mismatch for ' + meta.slug);
    assert.ok(registeredSlugs.has(meta.slug),
      'Published article missing from blog registry: ' + meta.slug);
    assert.ok(mapping.seriesMatches.some(match =>
      match.slug === meta.slug && match.article_id === meta.article_id),
    'Published article missing from series mapping: ' + meta.slug);
    return false;
  });
}
