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

## نتيجة الإنتاج النهائية — تراجع واسترجاع (28 أكتوبر 2026)

**لا تعتمد تجربة B السابقة.** رغم نجاح Lighthouse ABBA المحلي (تحسن LCP من 1.894 إلى 1.652 ثانية وCLS محلي 0.025)، فإن **Lighthouse على الدومين الحقيقي بعد دمج PR #94** كشف نتائج غير آمنة:
- [Production Lighthouse 40600126751](https://github.com/ahmed5330/kun-online-site/actions/runs/40600126751): Mobile Performance **64/100**، LCP **3.25 ثانية**، **CLS 0.561**. SEO 100.
- التباين بين المحلي والإنتاج يجعل التجربة غير صالحة للإبقاء رغم تحسن نتيجة محلية؛ لا يجوز وصفها بأنها تحسين حقيقي نهائي.

**استرجاع فوري لـPR #94** عبر [PR #96](https://github.com/ahmed5330/kun-online-site/pull/96): إعادة تحميل جميع ملفات CSS والخطوط الأساسية بصورة مستقرة قبل الرسم، بدون حذف تحسينات المقالات وGEO. التحقق بعده:
- [Production Lighthouse 40600486559](https://github.com/ahmed5330/kun-online-site/actions/runs/40600486559): Mobile Performance **91/100**، LCP **2.82 ثانية**، **CLS 0.009**، وSEO 100؛ Desktop Performance 97، CLS 0.014. قراءة معملية مستقلة قد تختلف في جولة أخرى.
- [Live Cloudflare audit 40600486530](https://github.com/ahmed5330/kun-online-site/actions/runs/40600486530): **322/322** SEO، و**121/121** GEO حي على **46 URL**.
- [Marketing QA 40600486487](https://github.com/ahmed5330/kun-online-site/actions/runs/40600486487): **success** بعد الاسترجاع.

### ما تعلمناه

1. لا يكفي نجاح ABBA محلي عند تغيير حمل الـCSS أو الخطوط؛ شروط الشبكة وتوقيت تطبيق stylesheet على الإنتاج تغيّر CLS جذريًا.
2. أي تجربة جديدة ينبغي أن تتضمن قياس إنتاج مستقل وقرار Rollback موثق. لا تضف `media=print/onload` لـCSS الرئيسية بدون برهان على استقرار المحاذاة.
3. أضف بوابة آلية لفشل اختبار Lighthouse عندما يكون CLS للموبايل أعلى من **0.10**، لتظهر مشكلة التخطيط كفشل لا مجرد جدول معلومات.
4. قيمة 2.82 ثانية LCP بعد الاسترجاع قراءة واحدة، وليست إثبات تحسن دائم من 3.88 ثانية؛ تحقق من CrUX وبيانات المستخدمين عند توفرها.

**الحالة:** استقرار تخطيط الصفحة مستعاد؛ تحسين LCP المستقبلي يحتاج تجربة مختلفة لا تسبب تغيّر تصميم أثناء التحميل. لا تنشر نسخة تجربة B مرة أخرى.
