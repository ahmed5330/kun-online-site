# Single-maintainer SEO/GEO review — Kun Online marketing site ONLY

**Repository isolation:** this exception is hard-pinned to `ahmed5330/kun-online-site` and authenticated GitHub username `ahmed5330`. It does **not** change the backend `ahmed5330/kunonline`, its Android apps, other repositories, GitHub account settings, or branch rulesets.

## What changed

The existing `SEO GEO General Reviewer` remains read-only and mandatory for PRs. Noncritical SEO/GEO content changes (for example, existing `BlogPosting.image` and OG image metadata) can satisfy the sensitive-change review gate with **either** the existing independent, fresh GitHub APPROVED review **or** a GitHub issue/PR conversation comment **authored by the actual repository owner** with this exact format:

```
KUN-SOLO-APPROVE <FULL_40_CHARACTER_PR_HEAD_SHA>
```

Comments must be new, unedited, tied to the exact current PR head SHA, by GitHub account `ahmed5330` (not a bot or another user). SHA changes invalidate consent. An owner may revoke with `KUN-SOLO-REVOKE <FULL_SHA>`; the last authenticated decision for that SHA wins. A PR description alone or a ChatGPT reply is NOT machine-verifiable authorization.

This option never overrides a real independent `CHANGES_REQUESTED` review, overlapping open PRs, required SEO/GEO impact notes, failed quality tests, or branch protection.

## Critical changes still require independent review

Changes to `robots.txt`, `_headers`, `_redirects`, `wrangler*.toml`, `functions/`, `.github/CODEOWNERS`, `.github/workflows/`, and modifications to crawl directives such as canonical, robots, noindex, nofollow, Disallow/Allow remain independently gated. If no independent reviewer exists, stop those changes instead of lowering protections.

The first governance migration changes only `scripts/seo-geo-general-reviewer.mjs`, reviewer tests and these notes; workflow YAML, CODEOWNERS, branch protections, and the running site are unchanged.

## Publish checklist for the solo owner

1. Read the PR diff and confirm scope, source rights, privacy, no-face images, URL/SEO safety and regression risk.
2. Verify `Marketing site SEO and mobile QA` / browser tests and reviewer-policy tests pass for the head. Inspect PR conflicts and any failed workflows; never treat an old green run as current.
3. For noncritical content patches, add `KUN-SOLO-APPROVE <head sha>` as a PR conversation comment using the authenticated GitHub owner account. No alternate accounts needed.
4. Re-trigger `SEO GEO General Reviewer` by updating PR description (or synchronizing the PR), which runs `pull_request: edited`. The reviewer fetches GitHub comments live with read-only permissions.
5. Merge with `expected_head_sha` only after the **latest** reviewer run succeeds and the PR is mergeable, and only if branch rules allow.
6. Confirm Cloudflare Pages deployment and read-only live URL, image, metadata and sitemap responses after merge. Google image indexing requires native GSC proof.

**Risk note:** a solo owner accepting noncritical content changes does not provide the same independent scrutiny as a separate reviewer. The record is explicit about that limitation; high-risk controls remain blocked without independent oversight.

## Future maintenance

The automation remains a single general reviewer; no parallel review bot or publisher is introduced. The solo exception is limited to the literal repository and owner. Any future ownership change or broader policy requires an explicitly reviewed code change.
