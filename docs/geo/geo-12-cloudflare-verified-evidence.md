# GEO-12 — Provider-verified Cloudflare bot evidence, Oct 28 2026

## Measured now (external evidence, without extrapolation)
- Google Search Console through Windsor.ai: **14 page-result rows, 142 impressions, 16 clicks** from 1–28 October 2026. Eight article pages have result rows. This is **not the total indexed count**. A separate daily-dimension read yielded 132 impressions / 16 clicks through 26 October (32 impressions and 5 clicks for 1–13 Oct; 100 impressions and 11 clicks for 14–26 Oct). Page-dimension 142 vs date-dimension 132 must NOT be silently combined; Google warns that aggregation/privacy filtering and data grouping change the totals (https://support.google.com/webmasters/answer/17010575). Visible query-dimension rows sum only 33 impressions and 2 clicks due to query-anonymization/aggregation, not proof that other search queries do not exist.
- GA4 property 547488425: **2 chatgpt.com / ai-assistant sessions**. Referral **does not** establish a linked AI answer citation.
- Cloudflare bot data: **not yet authorized**. No verified real crawler totals, WAF actions or per-path counts were available.
- Native URL Inspection, Page Indexing totals and Bing AI Performance: not yet connected.

## Read bot detections from Cloudflare without changing WAF

Official references:
- https://developers.cloudflare.com/ai-crawl-control/reference/bots/
- https://developers.cloudflare.com/ai-crawl-control/reference/graphql-api/
- https://developers.cloudflare.com/analytics/graphql-api/

Cloudflare's botDetectionIds_hasany filter is **Bot Management plan-gated**, and is more reliable than User-Agent matching. Selected verified IDs: Googlebot (120623194, 33554459), Bingbot (117479730, 33554461), OAI-SearchBot (126255384, 33563986), ChatGPT-User (132995013, 33563857), GPTBot (123815556, 33563875), PerplexityBot (33563889).

1. In Cloudflare, create a **zone-scoped API token with Analytics:Read only** for the zone hosting kun-online.com. Don't change WAF settings; never paste the token into chat, issues or PRs.
2. Add secrets to GitHub repository Actions: CF_ANALYTICS_READ_TOKEN and CF_ZONE_ID (actual Cloudflare zone identifier, not domain). Use GitHub → Settings → Secrets and variables → Actions.
3. Run Actions → GEO Cloudflare verified crawler evidence (read only) → Run workflow. It queries the last **24 hours**, and uploads a JSON artifact for **14 days**.
4. The report groups Cloudflare-detected bots by edge status, path and, when available, security action. If securityAction is restricted, the query retries only without that dimension. If detection IDs are restricted, it reports unavailable and **never falls back to User-Agent**. Aggregated results may be sampled and limited to 1000 groups. Zero observed is not proof a bot never visited.
5. Differentiate *GPTBot* (training crawler) from *OAI-SearchBot* (AI search crawler) and *ChatGPT-User* (assistant retrieval). A policy-blocked GPTBot is not automatically a GEO failure: never relax training restrictions to improve search indexing. The script stores no IP, client identity, cookies, query strings or secrets. Investigate any blocked or challenged events against native Cloudflare Security Events. A 403 alone does not conclusively prove a WAF block.

Test without credentials: run node scripts/geo-cloudflare-bot-evidence.mjs, then node scripts/geo-evidence-scorecard.mjs. It records not_authorized without making a Cloudflare request.

### If Bot Management is unavailable
Cloudflare may reject the verified detection-ID query. Use a provider-native AI Crawl Control / Security Events export containing provider-verified identities, if supported. Plain User-Agent evidence must be marked unverified_agent_observation, never verified_bot. Do not upgrade the Cloudflare plan until the relevant available data and cost have been confirmed.

## Remaining external outcomes
- Google URL Inspection workflow requires OAuth read-only; Page Indexing totals require the official provider report.
- 48 AI answers on ChatGPT / Gemini / Copilot / Perplexity need independent native sessions with original answer and linked citation.
- Bing AI Performance needs account connection and the original report.
- Claims, team biographies and case studies require real sources and publishing consent.
