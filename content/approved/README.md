# Approved blog publication queue - no VPS

OpenClaw and its expired VPS are no longer required. Drafts under docs/editorial-drafts are never auto-published.
To queue an article, add two reviewed files on a pull request:
- content/approved/<slug>.json : approved editorial metadata.
- content/approved/<slug>.html.ready : complete ready-to-publish HTML.
Also add blog/images/<slug>.png (genuine 1200x630 image).

Required JSON keys: slug, article_id (1-100), approved (true), eligibleFrom (YYYY-MM-DD),
editorialApproval (human editorial review reference), title, description (80+ characters),
primaryKeyword, secondaryKeywords (array), category, categoryLabel, image (<slug>.png),
market (e.g. EG+GCC), inboundFrom (two distinct already-published blog slugs).

HTML requirements: a single H1, at least five H2, 1500-2200 article words, valid BlogPosting JSON-LD,
self canonical, OG url and featured image, at least 3 links to existing blog articles, a visible
featured image, and the same WhatsApp-only public contact. Use __PUBLICATION_DATE_ISO__ and
__PUBLICATION_DATE_AR__ placeholders, which the publisher fills at the actual time of publication.
Keep exact approved section links and editorial claims; no fake demand numbers, prices or reviews.

Daily GitHub Actions schedule: 09:17 Africa/Cairo. On no approved bundles: no publication.
At most one new post per local calendar day. Publication date is written to
content/publication-log.json and is also checked against blog/articles.json.
Manual test: GitHub Actions > VPS-free blog publisher > Run workflow > dry_run = true.
Manual publish: dry_run = false, only when genuinely editorially approved.

No content is generated automatically without an external AI service or human authoring.
The scheduler itself uses no external VPS, API subscription, token, or OpenClaw process.
Do not reactivate a second independent article publisher: it would bypass the lock.


## Visual SEO — mandatory no-face rule
Every new cover, image or illustration **MUST contain no human face** (photographic, AI-generated or illustrated). Use packaging, products, charts, anonymized real UI, or original geometric graphics instead. Manually imported images require recorded human review for faces, rights, privacy and accurate claims. If unclear, do not approve. See `seo/visual-seo-policy.md`.

Generated 1200×630 PNG covers now also have 1200×630 and 640×336 WebP derivatives for responsive cards. The publisher retains the PNG primary asset and uses the existing SEO/GEO reviewer. Do not claim image indexing without native Search Console evidence.
