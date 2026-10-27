# GEO mobile LCP — controlled investigation (28 Oct 2026)

**Scope:** public marketing homepage `/` only, without any changes to the order-management app, Cloudflare WAF, customer databases, or consent tracking.

## Original Lighthouse evidence
Source artifact: [GitHub Actions run 40538125741](https://github.com/ahmed5330/kun-online-site/actions/runs/40538125741), Lighthouse 12.8.2, emulated mobile.

- Mobile Performance **80/100**, SEO **100/100**, LCP **3884 ms**.
- Lighthouse identifies `main#main-content > section.hero > div.hero-c > h1` as the actual LCP element. It is **text**, not the decorative system preview or a product image.
- Phase timings: TTFB approximately **576 ms** (15%), **render delay approximately 3308 ms (85%)**.
- Render-blocking resource audit estimates **1002 ms potential savings**, involving `assets/site.css`, `assets/reviews.css`, `assets/system.css`, and Google Fonts CSS.
- Lighthouse lab results are variable; they do not establish real-user INP or CrUX Core Web Vitals.

## Experiment — PR #94
- Retain all original CSS assets and fonts. On the homepage only, request their stylesheets with `media=print` and switch to `all` after onload.
- Add a `noscript` normal stylesheet link next to each deferred stylesheet so content remains styled without JavaScript.
- Keep preconnect to Google fonts and its `display=swap` policy. The hero title remains visible as ordinary HTML without script dependency.
- Preserve all interactions, company content, page URLs and metadata.

## Acceptance and rollback
1. Static assertions for four deferred stylesheets and normal no-script fallbacks must pass.
2. Browser screenshots, mobile/desktop QA, internal links and forms should pass, including no flash/major spacing regressions.
3. CI Lighthouse ABBA experiment compares **two mobile baseline runs** vs **two candidate runs** on identical local runner configurations. Accept only when there is meaningful median LCP benefit, low CLS and SEO unchanged.
4. If testing finds layout shift, missing stylesheet with script blocked, or reduced mobile LCP is not reproducible, **do not merge** the candidate.
5. After approved deployment run live Cloudflare tests and a fresh production Lighthouse run to verify the real domain.

**Do not equate a lab improvement to improved field INP or guarantee of higher search ranking.**

## تجربة A — مرفوضة (Lighthouse PR run 40598819554)

استخدمت النسخة الأولى تحميلًا غير حاجب لأربعة ملفات CSS، ومنها ملف `site.css` الذي يحدد `body line-height` وتصميمًا أساسيًا. أظهرت مقارنة ABBA على نفس جهاز الاختبار:
- **Main baseline:** متوسط LCP للموبايل **1881 ms**، CLS أقصى **0.009**، Performance **98/100**.
- **Candidate A:** متوسط LCP **1883 ms**، CLS أقصى **0.970**، Performance **75/100**.
- وبالتالي **لم يتحسن LCP**، وحدث تراجع غير مقبول في تخطيط الصفحة. **يُحظر اعتماد النسخة الأولى** حتى لو اجتازت بعض اختبارات المحتوى.

## تجربة B — تحت الاختبار

- إعادة `site.css` إلى رابط CSS متزامن لتعريف تخطيط الصفحة قبل أول رسم.
- إبقاء اختبار التحميل غير الحاجب للخطوط وملفي CSS الخاصين بأقسام `reviews` و`system` فقط، مع `noscript` fallback لكل ملف مؤجل.
- **معيار القبول ثابت:** LCP حقيقي أفضل، CLS قريب من baseline وأقل من 0.1، ولا أخطاء متصفح/SEO. إذا فشل، لا يتم دمج هذا PR.
