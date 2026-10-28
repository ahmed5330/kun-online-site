# SEO & GEO General Reviewer — control design and limits (29 Oct 2026)

**Scope:** public marketing repository `ahmed5330/kun-online-site`. No access to the customer app, live D1, customer records or Cloudflare WAF. This reviewer does not rewrite articles, force sitemap resubmission, or invent search/AI indexing evidence.

## 1. Ownership matrix

| Files | Responsible workstream | Reviewer treatment |
|---|---|---|
| `seo/**`, `seo-content-map.json`, SEO scripts/tests | SEO | SEO_ONLY |
| `docs/geo/**`, GEO scripts/tests | GEO | GEO_ONLY |
| `blog/**`, `content/**`, `index.html`, services, other public HTML, sitemap, robots, redirect headers | Content / SEO / GEO | SHARED_SEO_GEO: independent impact notes |
| `.github/workflows/**`, `package.json`, assets and infrastructure scripts | Technical infrastructure | TECHNICAL_INFRASTRUCTURE; require code-owner rules for non-bypassable protection |
| Approved scheduled publication stage | CONTENT_PUBLISHING | Restrict staged files to approved blog outputs, publication log, sitemap and SEO maps |

The classifications are based on actual changed file paths; filename labels and PR descriptions cannot override them. A PR touching SEO_ONLY and GEO_ONLY is SHARED_SEO_GEO by composition.

## 2. Active checks

- **PR general-review:** `.github/workflows/seo-geo-general-reviewer.yml` is a separate, read-only job. It fetches the PR file list and all other open PR file lists (up to 500) through GitHub REST. A shared-content change requires **SEO impact:** and **GEO impact:** sections. Any overlapping filenames in other open PRs blocks approval even when the changes are individually valid.
- **Sensitive policies:** changes to robots, redirects, Cloudflare config and added canonical / noindex / structured-data or crawler directives require an **APPROVED review from a human other than the PR author on the current head commit**. Stale approvals, self-approvals and bots are not accepted. CODEOWNERS file changes after initial installation also require independent review.
- **Publisher preflight:** the daily `scheduled-blog-publisher.yml` and the `site-quality.yml` optimized-asset commit both run `node scripts/seo-geo-general-reviewer.mjs --staged --role publisher` *after staging and before committing/pushing*. Unexpected files fail the job.
- **Post-push audit:** an audit on main checks whether the head commit came from a merged PR or one of the recognized publisher jobs. Unauthorized direct writes are reported as a failure **after the fact**, not automatically reverted.
- **Daily scheduled review:** re-evaluates all currently open PRs, conflicting paths and approvals and saves an artifact. No redundant changes are made when nothing needs remediation.
- Unit regression tests: `tests/seo-geo-general-reviewer.test.mjs` are part of `npm test` and run independently in the general review workflow.

All decisions appear in `test-results/seo-geo-general-review.json` and GitHub Actions artifacts. `APPROVED` means reviewer policy passed, **not** a claim of independent search-engine evidence.

## 3. Essential administrative setup — NOT claimably finished by GitHub App

GitHub connector can read the repository and edit PR files, but the GitHub branch protection API currently rejects requests with `403 Resource not accessible by integration`; repository `rulesets` list was empty when checked. This tool cannot configure mandatory rulesets.

To make this gate **non-bypassable**, a repository administrator must go to **Settings → Rules → Rulesets** and configure a main-branch rule requiring pull requests, code-owner reviews, and status checks:

- **SEO GEO General Reviewer / general-review** (actual Actions check name/ID should be selected from the UI after the first successful run)
- **Marketing site SEO and mobile QA / verify**
- Relevant production release checks, where supported

Require fresh approval on the current head revision; disable bypass rights for normal automation accounts where possible. Confirm the rule with a deliberate blocked example and a successful authorized PR.

**IMPORTANT: Current daily blog publisher and the site-quality image optimizer still push directly to main.** Requiring a PR for every change without first migrating those two jobs to a reviewed PR publishing process will break daily content publication. This release adds safe **pre-push file scope** checks and post-push auditing but does **not** claim full non-bypassability. Stage that migration in a separately tested PR before hardening the main-branch ruleset. Avoid silent disruption to the existing article publication cadence.

`.github/CODEOWNERS` names @ahmed5330, but a PR authored by that account cannot be independently approved by the same account. Add another authorized reviewer as appropriate for policy-sensitive changes; a bot must not impersonate their approval.

## 4. Regression tests before claiming completion

- Shared blog/HTML PR with only SEO impact → **BLOCKED**
- Two open PRs change the same file → **BLOCKED** on both until reconciled
- Robots/canonical change without independent current-commit review → **BLOCKED**
- Independent GEO documentation PR with no collision → **APPROVED**
- Publisher staged `robots.txt` or workflow update → **BLOCKED before push**
- Normal, authorized article publication file set → **APPROVED**
- Unassociated direct main push → **failed after-the-fact audit**, not rollback
- Latest PR CI success plus production SEO/GEO audits successful before declaring technical completion

## 5. How to maintain the control

The reviewer is governance, not a replacement for SEO, GEO, editorial automation or actual GSC/Cloudflare/Bing permissions. Coordinate issue #100 for GEO evidence, and link any related SEO issues in PR descriptions. Only approved/reconciled changes proceed. For emergency fixes, explicitly document a separate authorized exception rather than disabling checks.

GitHub workflows cannot make themselves mandatory. A real, enforced reviewer requires the administrative ruleset **plus** migration of the remaining direct-to-main publication paths.
