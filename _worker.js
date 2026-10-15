// Pages advanced-mode Worker: redirects only the marketing domain; serves the
// exact built assets for all other requests, including Preview deployments.
const LEGACY = new Set([
  '/كن-اونلاين-إيجنسي-تجارة-الكترونية-في-مصر-والوطن-العربي',
  '/كن-أونلاين-ايجنسي-تجارة-الكترونية',
  '/الصفحة-الرئيسية_1', '/home'
]);
const DIRECTORIES = new Set(['/blog', '/en', '/gulf', '/services', '/pricing', '/about', '/contact', '/system',
  '/services/ecommerce-management', '/services/ecommerce-store-development',
  '/services/ecommerce-ads', '/services/order-management', '/services/ecommerce-consulting', '/system/order-management', '/system/inventory', '/system/shipping', '/system/easy-orders']);
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
    if (request.method === 'GET' || request.method === 'HEAD') {
      const location = canonicalLocation(request.url);
      if (location) return new Response(null, {status:301, headers:{Location:location}});
    }
    return env.ASSETS.fetch(request);
  }
};
