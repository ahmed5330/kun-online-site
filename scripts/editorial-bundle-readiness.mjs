// Metadata readiness only. The existing publisher and SEO/mobile QA remain release gates.
export function inspectEditorialMetadata(meta, html, publishedSlugs) {
  const blockers = [];
  const fail = (condition, reason) => { if (!condition) blockers.push(reason); };
  fail(Array.isArray(meta.inboundFrom) && new Set(meta.inboundFrom).size >= 2,
    'Require at least two reviewed inbound article links');
  if (Array.isArray(meta.inboundFrom)) fail(meta.inboundFrom.every(s => publishedSlugs.has(s) && s !== meta.slug),
    'Inbound links must point to already published guides');
  const body = html.match(/<article\b[^>]*>([\s\S]*?)<\/article>/i)?.[1] || '';
  const words = body.replace(/<script[\s\S]*?<\/script>/gi, '').replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]*>/g, ' ').replace(/&(?:[a-z]+|#\d+);/gi, ' ').trim().split(/\s+/).filter(Boolean).length;
  fail(!!body && words >= 1500 && words <= 2200, 'Article body must contain 1500–2200 words');
  fail(meta.qualityReview?.words === words, 'Editorial word count differs from actual article body');
  try {
    const schemas = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)]
      .flatMap(m => { const s = JSON.parse(m[1]); return s['@graph'] || [s]; });
    const article = schemas.find(s => s['@type'] === 'BlogPosting');
    fail(article?.wordCount === words, 'BlogPosting word count differs from actual article body');
  } catch { blockers.push('Invalid structured data JSON'); }
  const outgoing = new Set([...html.matchAll(/href=["']\/blog\/([a-z0-9-]+)/g)]
    .map(m => m[1]).filter(s => publishedSlugs.has(s)));
  fail(outgoing.size >= 3, 'Must link to at least three already published guides');
  return {metadataReady: blockers.length === 0, words, blockers};
}
