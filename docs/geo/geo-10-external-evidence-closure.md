# GEO-10: Evidence closure — 28 October 2026

**Scope:** public marketing site `https://kun-online.com` only. **Do not touch the customer app, D1, production WAF, robots, or canonical settings.**

## Verified observations (connected reads, not estimates)

| Source | Period / capture | Observation | Limitation |
|---|---|---|---|
| GitHub PR #99 / live audit #40677783067 | 28 Oct 2026 | 27 published guides; 47 URLs in source Sitemap; earlier live 328/328 SEO and 123/123 GEO checks | Passing checks is not proof of indexing or AI citation |
| Search Console Search Analytics (`sc-domain:kun-online.com`) | 1–27 Oct 2026, latest days may lag | 14 page rows; **142 impressions**, **16 clicks**, including homepage 103 impressions/16 clicks | Page rows are not the site's complete indexed count |
| GSC Sitemaps via connected Windsor.ai | downloaded 28 Oct 2026 01:58:19 UTC | **46 submitted**, 0 errors/warnings, submission dated 23 Oct | `indexed=0` is a *deprecated field*, not evidence that zero URLs are indexed; 46 and 47 reflect different snapshots |
| GA4 property `547488425` | 1–27 Oct 2026 | `chatgpt.com / ai-assistant`: **2 sessions**, **0 recorded key events** | Referral ≠ cited source; zero key events may reflect tracking definitions |

**Unknown, not zero:** official Page Indexing totals, native Google URL Inspection status, Cloudflare verified bot access, AI platform citation observations, Bing Webmaster AI Performance citations.

## 1. Native URL Inspection (read-only)

The connected Windsor.ai Search Console adapter supports Search Analytics and Sitemaps, but **does not provide native URL Inspection**. The new `scripts/geo-gsc-inspect.mjs` uses Google's official read-only inspection API once an authorized OAuth token is available.

```sh
node scripts/geo-gsc-inspect.mjs --dry-run
# Set GSC_ACCESS_TOKEN securely in your environment, with webmasters.readonly scope:
node scripts/geo-gsc-inspect.mjs
node scripts/geo-gsc-inspect.mjs --all
```

Default sample prioritizes `/`, `/methodology/`, `/services/ecommerce-management/`, `/blog/product-selection-checklist-20-points` and first/last alphabetic blog entries that actually occur in the sitemap. `--all` inspects all sitemap URLs. Output: `test-results/geo-gsc-inspection.json` with `verdict`, `coverageState`, `indexingState`, canonical information, crawl and fetch fields. **Never commit an OAuth token or sensitive unredacted provider reports.**

An `INDEXING_ALLOWED` value by itself is **not** proof of indexing. `verdict: PASS` is the index status verdict; the API only describes Google's **indexed version**, not a live-URL test. GSC **Pages / Page indexing** still needs native coverage totals with report date and exclusion reasons.

## 2. Verified crawlers at Cloudflare

From Cloudflare Security Events / Analytics export, capture date/time, verified-bot Boolean, bot identity or supported category, host/path, WAF action and edge response status when available. **A request with a forged User-Agent is not verified crawler evidence**. Separate Googlebot, Bingbot and OAI-SearchBot by genuine verified attributes, and mark allow/block/challenge separately. Do not enable broad WAF bypass; any specific change requires reviewed authorization and evidence.

## 3. Genuine AI citations, and Bing

Run the existing `scripts/geo-ai-visibility-protocol.mjs` template: 12 questions × 4 platforms = 48 manual observations in ChatGPT, Gemini, Copilot, Perplexity. Record platform, model/interface, locale, timestamp, exact prompt, source URL as shown and original answer evidence; leave unrun entries **not_run**, not `not_cited`. Distinguish brand mention, linked citation and GA4 visit.

Bing Webmaster Tools **AI Performance** reports citations and cited pages, plus topics and grounding queries; `Topics Portfolio` beta (Oct 2026) may become available when sufficient data exists. No Bing Webmaster account is connected in the current Windsor.ai connection. Do not invent its metrics.

## 4. Outstanding release criteria

- [ ] Official GSC **Pages** indexed/not-indexed counts and dated exclusion reasons.
- [ ] Index Inspection for priority pages and representative guides with canonical/crawl fields.
- [ ] Verified Cloudflare bot events and block/challenge assessment.
- [ ] At least one documented platform observation per tested AI prompt, then the full 48 planned cells, without mislabeling missing observations.
- [ ] Original Bing AI Performance numbers and time range when authorized/available.
- [ ] Same-release production mobile LCP/CLS audit with report URL; PR #97 guards against mobile CLS regression.
- [ ] Consent-backed team biographies, independently verified client case studies and external business profiles.

Do not create imaginary testimonials, structured reviews or unapproved performance claims. Technical optimization is not a guarantee of retrieval, index coverage, citations or recommendation ranking.

## Provider references

- [Google URL Inspection API](https://developers.google.com/webmaster-tools/v1/urlInspection.index/inspect)
- [Google URL Inspection response fields](https://developers.google.com/webmaster-tools/v1/urlInspection.index/UrlInspectionResult)
- [Cloudflare verified bot](https://developers.cloudflare.com/bots/reference/bot-management-variables/)
- [Bing AI Performance](https://blogs.bing.com/webmaster/2026/2/Introducing-AI-Performance-in-Bing-Webmaster-Tools-Public-Preview/)
- [Bing Topics Portfolio, October 2026](https://blogs.bing.com/webmaster/2026/10/introducing-topics-portfolio-beta-in-ai-performance/)
