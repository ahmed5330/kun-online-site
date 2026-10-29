# Reviewer approval lifecycle repair (Issue #105)

**Updated authorization:** The owner subsequently requested solo-maintainer policy support and explicitly said to implement and publish. This PR now also adds the strict full-content routine-new-bundle exception documented in `docs/geo/seo-geo-general-reviewer.md`. The original observations and draft-only boundary below describe the earlier investigation; they are superseded for this authorized release only. The sensitive-policy human gate remains for changes outside the validated exception. No human approval is fabricated.

PR #106 at `145312e7e23578665e125bfbb43c715641b9b3dd` adds a canonical, robots metadata and BlogPosting structured data in a queued article. Under the existing documented policy this is sensitive. No independent review exists at inspection time. `SENSITIVE_CHANGE_APPROVAL` is therefore an intentional gate, not a false positive that can safely be waived.

The actual workflow defect is missing review events: submitting or dismissing a human review did not refresh the PR check. Add `pull_request_review` for submitted, edited and dismissed events; route those events to the same read-only PR evaluation and concurrency group. Evaluate current API reviews and current head, never trust the event's approval state alone. No sensitive-file exemption, self-approval, bot approval, stale approval or publisher bypass is added.

## Release boundary

This repair remains a draft PR. Do not merge or publish article #21 without independent human approval and explicit release authorization. Once this workflow repair is authorized and merged, verify real review submission and revocation refresh the existing gate. Unit tests verify configuration and decision lifecycle, not GitHub event delivery.

Issue #105 remains open: migrate scheduled publisher and site-quality asset direct writes to reviewed PRs/non-mutating outputs before enforcing main rules. Main was unprotected and repository Rulesets empty at inspection. Do not enable rules prematurely or add automation bypasses.

## Production observations

- Main remains `c75459da6130cb8fd174c852d70ac28ff1678a4b`.
- Publisher run [40879158677](https://github.com/ahmed5330/kun-online-site/actions/runs/40879158677) completed, logging no eligible approved article and no publication. Success is not proof of new publication.
- Article #21 [PR #106](https://github.com/ahmed5330/kun-online-site/pull/106): SEO/mobile QA passed; general reviewer blocked for missing independent approval.
- Previous main live audit [40782270306](https://github.com/ahmed5330/kun-online-site/actions/runs/40782270306) succeeded; this historical result is not a new production verification of this repair.

## Automation resumption checklist

1. Independent authorized human reviews current article head; rerun checks as needed until workflow repair is installed.
2. Resolve Issue #105 publishing migration and enforcement through separate reviewed changes.
3. Authorize merge/release, preserve Cairo-day single-publication lock, verify public URL and sitemap.
4. Locate the existing paused ChatGPT article-production task in the correct account and resume only after the above safety conditions are confirmed. Do not create a duplicate task.
5. Inspect the separate daily SEO/GEO report task for 09:00 Africa/Cairo, last run/result and notification settings; do not confuse it with the indexing monitor or GitHub publisher schedules. UI absence does not prove task deletion or delivery failure.
