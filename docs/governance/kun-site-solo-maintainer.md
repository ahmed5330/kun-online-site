# Limited sole-maintainer publication review — 14 November 2026

The owner explicitly authorized the limited policy below after receiving the tested proposal. This is delegated owner acceptance of release risk, not an independent human review.

## Repository and account isolation

Only ahmed5330/kun-online-site, an owner-authored PR and an authenticated GitHub User comment by ahmed5330 qualify. No other repository, including ahmed5330/kunonline, account settings or branch rules are changed.

## Consent levels

Ordinary sensitive content retains the existing exact-head marker:

```
KUN-SOLO-APPROVE <FULL_40_CHARACTER_CURRENT_HEAD_SHA>
```

The explicit critical-owner marker is permitted only for these four paths:

- .github/workflows/blog-queued-preflight.yml
- .github/workflows/scheduled-blog-publisher.yml
- scripts/seo-geo-general-reviewer.mjs
- tests/seo-geo-general-reviewer.test.mjs

```
KUN-SOLO-CRITICAL-APPROVE <FULL_40_CHARACTER_CURRENT_HEAD_SHA>
```

A critical owner route also needs concrete non-placeholder Risk review: and Validation: lines in the PR description. These notes do not substitute for successful real check runs. A marker alone never merges or publishes.

Robots/canonical/noindex directives, redirects, headers, WAF/Cloudflare configuration, CODEOWNERS, routine-article-policy code and all unrelated workflows remain outside this exception. They still require independent current-head human review. Even one such critical path in a mixed PR disqualifies the limited owner route.

## Authenticity and revocation

Markers must be new unedited comments by the actual owner, user type User, with the exact current 40-character head SHA. Bots, other users/repositories, wrong PR author, stale or malformed SHA, edited comments and extra marker text fail closed. New head commits invalidate prior consent.

Either KUN-SOLO-REVOKE or KUN-SOLO-CRITICAL-REVOKE for that SHA withdraws both owner-consent levels. Ordinary reapproval cannot restore withdrawn critical consent; a fresh critical marker is required.

An assistant may record a specific decision only at the owner's explicit direction, with delegated-authorization provenance recorded separately. This is never called independent human scrutiny. There is no general authorization to approve arbitrary future changes automatically.

## Required release checks

Owner consent never waives:
- outstanding human CHANGES_REQUESTED decisions;
- overlapping open PR files;
- required SEO/GEO impact notes;
- current-head editorial, site, browser, reviewer-policy and relevant queue/future preflight checks;
- GitHub branch protections or GitHub-required independent human review.

Independent fresh human approval remains an alternative to owner consent. Merge only with expected_head_sha after the latest reviewer and all required QA checks succeed, and only when GitHub permits it. The existing Cairo-day publisher remains the only publication path, at most one approved article per day; verify production article, cover, sitemap and publication log after a real release.

The same General Reviewer stays read-only. Its 08:33 Africa/Cairo schedule, staged publisher file-scope checks and unauthorized direct-push detection are unchanged. No alternate identity, extra email, replacement reviewer or parallel automation is created.

## Administrative limits

This custom comment policy does not alter GitHub's rule preventing PR authors from independently approving their own PRs. Existing stronger administrative rules are not bypassed.

Issue #105 remains open for safe migration of direct-main publication and administrative enforcement. No branch rules or live security/crawl controls are changed by this revision. Sole-owner acceptance provides less independent scrutiny than a second human; that distinction is explicit.
