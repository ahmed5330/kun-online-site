# Non-destructive published image parity

This directory contains only approved editorial bundles; this document is **not** an article.

The existing scheduled publisher is triggered by changes to this directory on `main`.
The Visual SEO maintenance change restores missing `<slug>.webp` and
`<slug>-640.webp` derivatives using each existing approved PNG without
overwriting that PNG or previously reviewed responsive images. The
one-article-per-Cairo-day publication lock, SEO/GEO General Reviewer,
and post-publication QA remain in force.

Do not bulk regenerate raster artwork or touch `lastmod` just to restore
responsive image file parity. Production changes must be verified from
GitHub Actions and the live Cloudflare release audit, not inferred from source.
