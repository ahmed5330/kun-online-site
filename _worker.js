// Pages advanced-mode Worker: redirects only the marketing domain; serves the
// exact built assets for all other requests, including Preview deployments.
// These are repository-only editorial/source paths, not part of the public
// marketing site. Drafts must not be crawled, indexed, or shown as live articles.
// Return a real 404 rather than relying on robots.txt: disallow alone does
// not reliably remove a known URL from search results.
const PRIVATE_PREFIXES = ['/content/', '/docs/', '/seo/', '/scripts/', '/tests/', '/.github/'];
const PRIVATE_FILES = new Set(['/SKILL.md', '/seo-content-map.json', '/package.json', '/package-lock.json']);
export function isPrivatePublicPath(requestUrl) {
  const url = new URL(requestUrl);
  if (url.hostname !== 'kun-online.com' && url.hostname !== 'www.kun-online.com') return false;
  let path;
  try { path = decodeURIComponent(url.pathname); } catch { path = url.pathname; }
  const normalized = path.replace(/\\/g, '/').replace(/\/+/g, '/');
  return PRIVATE_PREFIXES.some(prefix => normalized.startsWith(prefix)) ||
    PRIVATE_FILES.has(normalized);
}
const LEGACY = new Set([
  '/كن-اونلاين-إيجنسي-تجارة-الكترونية-في-مصر-والوطن-العربي',
  '/كن-أونلاين-ايجنسي-تجارة-الكترونية',
  '/الصفحة-الرئيسية_1', '/home'
]);
const DIRECTORIES = new Set(['/blog', '/en', '/gulf', '/services', '/reviews', '/pricing', '/about', '/contact', '/system',
  '/services/ecommerce-management', '/services/ecommerce-store-development',
  '/services/ecommerce-ads', '/services/order-management', '/services/ecommerce-consulting', '/consultations', '/system/order-management', '/system/inventory', '/system/shipping', '/system/easy-orders']);
export function canonicalLocation(requestUrl) {
  const url = new URL(requestUrl);
  // Only rewrite the two public marketing hosts. Preview/custom Pages domains
  // must retain their original paths for safe preproduction verification.
  if (url.hostname !== 'kun-online.com' && url.hostname !== 'www.kun-online.com') return null;
  let changed = false;
  if (url.hostname === 'www.kun-online.com') { url.hostname = 'kun-online.com'; changed = true; }
  if (['kun-online.com', 'www.kun-online.com'].includes(url.hostname) && url.protocol !== 'https:') {
    url.protocol = 'https:'; changed = true;
  }
  let pathname;
  try { pathname = decodeURIComponent(url.pathname); } catch { pathname = url.pathname; }
  if (LEGACY.has(pathname.replace(/\/$/, ''))) { url.pathname = '/'; changed = true; }
  else if (pathname.endsWith('/index.html')) { url.pathname = pathname.slice(0, -10); changed = true; }
  else if (DIRECTORIES.has(pathname)) { url.pathname = pathname + '/'; changed = true; }
  else if (pathname.startsWith('/blog/') && !pathname.endsWith('/article-template.html') && pathname.endsWith('.html')) {
    url.pathname = pathname.slice(0,-5); changed = true;
  } else if (pathname.startsWith('/blog/') && pathname.endsWith('/') && pathname !== '/blog/') {
    url.pathname = pathname.slice(0,-1); changed = true;
  }
  return changed ? url.toString() : null;
}
export default {
  async fetch(request, env) {
    if (isPrivatePublicPath(request.url)) {
      return new Response(null, {
        status: 404,
        headers: {'Cache-Control':'no-store', 'X-Robots-Tag':'noindex, nofollow'}
      });
    }
    if (request.method === 'GET' || request.method === 'HEAD') {
      const location = canonicalLocation(request.url);
      if (location) return new Response(null, {status:301, headers:{Location:location}});
    }
    const response = await env.ASSETS.fetch(request);
    // site.js is a high-impact consent/measurement entrypoint. Force short
    // browser freshness even when the default static asset cache is longer.
    // This header is applied here because Pages advanced-mode _worker.js
    // responses do not reliably inherit rules from _headers.
    if (new URL(request.url).pathname !== '/assets/site.js') return response;
    const headers = new Headers(response.headers);
    headers.set('Cache-Control', 'public, max-age=300, must-revalidate');
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers
    });
  }
};
