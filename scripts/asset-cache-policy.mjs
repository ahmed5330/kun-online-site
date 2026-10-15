/**
 * A content-fingerprinted asset may safely use a longer browser TTL.
 * Only accept it when the live response bytes match the exact release source.
 * Returns false for a missing/unknown cache policy or an unexpectedly long TTL.
 */
export function safeVersionedCachePolicy(cacheControl, sourceMatches) {
  if (!sourceMatches || typeof cacheControl !== 'string') return false;
  const directives=cacheControl.split(',').map(x=>x.trim().toLowerCase());
  if (directives.includes('no-cache') || directives.includes('no-store')) return true;
  const matches=directives.map(x=>/^max-age\s*=\s*(\d+)$/.exec(x)).filter(Boolean);
  if(matches.length!==1) return false;
  const ttl=Number(matches[0][1]);
  return Number.isSafeInteger(ttl) && ttl>=0 && ttl<=86400;
}
