# GEO-11 — Execution ledger / remaining external authorizations

**28 October 2026; source of truth: official provider data.** Public site only. The scripts below do **not** mutate the customer application, production database, robots policy, or Cloudflare WAF.

## Execution: no fabricated successes

1. **Native Google indexing:** \`scripts/geo-gsc-inspect.mjs --all\` is implemented. It needs a valid short-lived OAuth access token with \`webmasters.readonly\` scope for \`sc-domain:kun-online.com\`. Run only after configuring access in a secure environment: no tokens in GitHub issues, PRs, log files, or chat. The output is an indexed-version inspection for sitemap URLs, not the Page Indexing aggregate. Official Search Console **Pages** (indexed / not indexed + reasons/date) still requires the provider report.
2. **Cloudflare verified bots:** read-only Security Events / logs export required from zone \`kun-online.com\`; include only necessary fields \`verifiedBot\` (provider-marked), \`botName\`, \`action\`, \`edgeStatus\`, and timestamp/path when safe. The data exporter should remove IPs, cookies, tokens and visitor identifiers **before analysis**. The scorecard will never infer verification from User-Agent. Save the array outside version control in \`test-results/geo-cloudflare-verified-bots.json\`. Provider provenance must be checked against Cloudflare directly. A challenge or block event is not automatically widespread crawler denial.
3. **AI citations:** run the 12 exact questions in \`scripts/geo-ai-visibility-protocol.mjs\` through the four actual provider interfaces, retaining answer and citation evidence, with timestamps and locale. Save the observed CSV as \`test-results/geo-ai-visibility-observations.csv\`; use the template produced by \`node scripts/geo-ai-visibility-protocol.mjs\`. The report refuses to record a citation without both a valid original URL and answer evidence. \`not_run\` isn't \`not_cited\`; branded questions are separated from discovery.
4. **Bing AI Performance:** obtain the original Bing Webmaster Tools AI Performance report after the verified account is connected; log original citation counts, cited pages and dates. The presently connected GA4 / GSC Windsor.ai connector does not expose the Bing account. Bing public Search presence is not AI citation evidence.
5. **Mobile performance:** existing \`.github/workflows/lighthouse-baseline.yml\` runs real production Lighthouse mobile/desktop on schedule and manually; preserve its dated artifacts, Lighthouse version, LCP/CLS and exact URL. Lighthouse lab score is not CrUX field INP.
6. **E-E-A-T:** company/team legal identity, social profile ownership, independent numbers and publishing consent remain approval gates, not automatic code tasks.

## Generate the combined evidence status safely

\`\`\`sh
node scripts/geo-gsc-inspect.mjs --dry-run
node scripts/geo-ai-visibility-protocol.mjs
node scripts/geo-evidence-scorecard.mjs
\`\`\`

Optional inputs are **ignored by Git** in \`test-results/\`. \`geo-evidence-scorecard.json\` is an artifact and explicitly labels each dataset's provenance and caveats.

\`\`\`json
[
  {"verifiedBot": true, "botName": "OAI-SearchBot", "action": "allow", "edgeStatus": 200},
  {"verifiedBot": true, "botName": "Googlebot", "action": "block", "edgeStatus": 403}
]
\`\`\`

This is a **schema example, not real Cloudflare data**. The scorecard cannot cryptographically authenticate an uploaded export; compare it with provider-native audit logs.

## Acceptance / open evidence

- Real \`indexing verdict\` inspected for priority URLs and 47 source URLs (when authorized) plus dated Pages coverage totals.
- Authenticated Cloudflare bot requests and WAF actions, not mocked User-Agent smoke tests.
- 48 native platform outputs with exact citations and screenshots/links, not simulated generated answers.
- Bing original AI Performance with time period.
- Dated production Lighthouse result and evidence-backed E-E-A-T approvals.

**Never treat missing input as zero and never claim GEO guarantees AI recommendations.**
