/** Diagnostic only: inspect actual public Cloudflare cache headers. Never send telemetry. */
const origin='https://kun-online.com';
for (const path of ['/','/en/','/gulf/','/assets/site.js','/assets/site.js?v=cache-probe']) {
  try {
    const response=await fetch(origin+path,{
      redirect:'manual',
      signal:AbortSignal.timeout(12000),
      headers:{'user-agent':'KunOnline-CacheDiagnostics/1.0'}
    });
    const h=response.headers;
    console.log(JSON.stringify({
      path,status:response.status,
      cacheControl:h.get('cache-control'),
      age:h.get('age'),
      cfCacheStatus:h.get('cf-cache-status'),
      contentType:h.get('content-type'),
      etag:h.get('etag')
    }));
  } catch(error) {
    console.log(JSON.stringify({path,status:'unavailable',reason:error.message}));
  }
}
