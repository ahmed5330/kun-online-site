# GEO-00 — خط الأساس المؤرخ لموقع كن أونلاين

**تاريخ التقرير:** 2026-10-27  
**النطاق:** `https://kun-online.com` والمستودع `ahmed5330/kun-online-site` فقط.  
**مرجع المصدر:** `main` عند SHA `8f37e89a4454468736c60a379757d515bb652490`.  
**الحالة:** لقطة مصدر مؤكدة؛ نتائج اختبارات الفرع والقياسات الحية منفصلة ولا يمكن استنتاجها من المصدر.

## ما تحقق من الكود

- `sitemap.xml` يحوي **45** رابطًا فريدًا في لقطة المصدر.
- `seo/keyword-map.json` يحوي **45** مسارًا مطابقًا واحدًا لواحد، موزعة إلى: **5 P0، 33 P1، 7 P2**.
- لكل رابط في Sitemap ملف HTML مطابق داخل شجرة `main`: **45/45**.
- `robots.txt` في المصدر يضم `User-agent: *` و`Allow: /`، ويحظر `/scripts/` ويربط Sitemap؛ لا توجد قاعدة منفصلة لحظر OAI-SearchBot/Bingbot في هذا الملف.
- `reviews/index.html` يحتوي `noindex,follow`، وهو **خارج Sitemap**؛ إبقاء صفحة استقبال الآراء غير مفهرسة قرار مقصود حتى يتم تصميم صفحة شهادات عامة مستقلة موثقة.
- هناك فحص موقع حي موجود مسبقًا في `scripts/live-site-audit.mjs`، ويتحقق من روابط Sitemap على Cloudflare واستجابة Googlebot بمحاكاة User-Agent. الفحص الجديد يكمله ولا يحل محلّه.

## خط الأساس من Google Search Console

البيانات المعادة عبر Windsor.ai، الحساب `sc-domain:kun-online.com`، للفترة **25 سبتمبر–24 أكتوبر 2026**:

- تقرير الصفحات المعاد: **131 ظهورًا، 17 نقرة، و13 صفحة ذات ظهور مسجل**؛ الصفحة الرئيسية 106 مرات ظهور. هذه قياسات Search Analytics وليست عدد الصفحات المفهرسة أو استشهادات AI.
- تقرير Sitemap: **40 رابط submitted** في آخر سجل تم جلبه بتاريخ **23 أكتوبر 2026**، **0 أخطاء و0 تحذيرات**. لا نعتبر الفرق مع 45 رابطًا في المصدر خطأً مثبتًا؛ اللقطتان في وقتين مختلفين.
- العدد الرسمي لصفحات `Indexed / Not indexed`، وقرارات `Google-selected canonical`، وآخر زحف لكل صفحة: **غير متاح بهذا الموصل**، ويحتاج URL Inspection / Page Indexing من Google.
- عدد الإشارات أو الاقتباسات داخل ChatGPT/Copilot/Perplexity/Gemini: **غير متاح**؛ لا يُكتب صفرًا أو يُستنتج من النقرات.

## مسارات الفحص الآلي للمرحلة GEO-01

1. شغّل `node --test tests/geo-site-audit.test.mjs`.
2. شغّل `node scripts/geo-site-audit.mjs` داخل فرع PR. الناتج `test-results/geo-site-audit.json`.
3. بعد مراجعة الملفات والـPR، يمكن تشغيل `node scripts/geo-site-audit.mjs --live` لاختبار ردود HTTP الحية لعينة من Googlebot/Bingbot/OAI-SearchBot (ليس إثبات زحف موثق).
4. افحص `scripts/live-site-audit.mjs` على الموقع الحي بعد النشر، مع مطابقة SHA الإصدار في Cloudflare عند توفر صلاحية لوحة Cloudflare.
5. يجب مراجعة **Cloudflare Security Events وBot/WAF rules** للتأكد من عدم منع عناوين IP المعتمدة للزواحف، ولا يجوز اعتبار تغيير User-Agent محاكاة هوية موثقة.

## قائمة عناوين Sitemap ومصدرها

**ملاحظة:** عمود «ملف المصدر» مُراجع من شجرة `main`. «HTML check» سينتج من تشغيل اختبارات PR. «HTTP مباشر» غير مثبت في هذه اللقطة.

| URL path | Priority | Source file | Source exists | HTML check | HTTP مباشر |
|---|---|---|---|---|---|
| `/about/` | P2 | `about/index.html` | موجود | فحص PR | غير مثبت |
| `/blog/brand-vs-product-business` | P2 | `blog/brand-vs-product-business.html` | موجود | فحص PR | غير مثبت |
| `/blog/cheap-vs-expensive-products-online` | P1 | `blog/cheap-vs-expensive-products-online.html` | موجود | فحص PR | غير مثبت |
| `/blog/cod-shipping-returns-reconciliation` | P1 | `blog/cod-shipping-returns-reconciliation.html` | موجود | فحص PR | غير مثبت |
| `/blog/common-ecommerce-beginner-mistakes` | P2 | `blog/common-ecommerce-beginner-mistakes.html` | موجود | فحص PR | غير مثبت |
| `/blog/customer-funnel-guide` | P1 | `blog/customer-funnel-guide.html` | موجود | فحص PR | غير مثبت |
| `/blog/customer-reviews-product-opportunities` | P1 | `blog/customer-reviews-product-opportunities.html` | موجود | فحص PR | غير مثبت |
| `/blog/ecommerce-competitor-analysis-sheet` | P1 | `blog/ecommerce-competitor-analysis-sheet.html` | موجود | فحص PR | غير مثبت |
| `/blog/ecommerce-complete-journey-guide` | P1 | `blog/ecommerce-complete-journey-guide.html` | موجود | فحص PR | غير مثبت |
| `/blog/ecommerce-evolution-history` | P2 | `blog/ecommerce-evolution-history.html` | موجود | فحص PR | غير مثبت |
| `/blog/ecommerce-first-30-days-plan` | P1 | `blog/ecommerce-first-30-days-plan.html` | موجود | فحص PR | غير مثبت |
| `/blog/ecommerce-funnel-explained` | P1 | `blog/ecommerce-funnel-explained.html` | موجود | فحص PR | غير مثبت |
| `/blog/ecommerce-product-ideas-research` | P1 | `blog/ecommerce-product-ideas-research.html` | موجود | فحص PR | غير مثبت |
| `/blog/essential-ecommerce-glossary` | P1 | `blog/essential-ecommerce-glossary.html` | موجود | فحص PR | غير مثبت |
| `/blog/` | P1 | `blog/index.html` | موجود | فحص PR | غير مثبت |
| `/blog/inventory-barcode-bundle-tracking` | P1 | `blog/inventory-barcode-bundle-tracking.html` | موجود | فحص PR | غير مثبت |
| `/blog/is-ecommerce-right-for-you` | P1 | `blog/is-ecommerce-right-for-you.html` | موجود | فحص PR | غير مثبت |
| `/blog/one-product-vs-multi-product-store` | P1 | `blog/one-product-vs-multi-product-store.html` | موجود | فحص PR | غير مثبت |
| `/blog/order-confirmation-delivery-rate` | P1 | `blog/order-confirmation-delivery-rate.html` | موجود | فحص PR | غير مثبت |
| `/blog/owned-vs-rented-channels` | P2 | `blog/owned-vs-rented-channels.html` | موجود | فحص PR | غير مثبت |
| `/blog/product-demand-validation-guide` | P1 | `blog/product-demand-validation-guide.html` | موجود | فحص PR | غير مثبت |
| `/blog/product-marketing-operations-ecommerce` | P1 | `blog/product-marketing-operations-ecommerce.html` | موجود | فحص PR | غير مثبت |
| `/blog/product-profitability-before-launch` | P1 | `blog/product-profitability-before-launch.html` | موجود | فحص PR | غير مثبت |
| `/blog/real-cost-per-delivered-order` | P1 | `blog/real-cost-per-delivered-order.html` | موجود | فحص PR | غير مثبت |
| `/blog/startup-budget-egypt` | P1 | `blog/startup-budget-egypt.html` | موجود | فحص PR | غير مثبت |
| `/blog/test-product-before-bulk-inventory` | P1 | `blog/test-product-before-bulk-inventory.html` | موجود | فحص PR | غير مثبت |
| `/blog/viral-vs-evergreen-product-demand` | P1 | `blog/viral-vs-evergreen-product-demand.html` | موجود | فحص PR | غير مثبت |
| `/blog/what-is-ecommerce` | P2 | `blog/what-is-ecommerce.html` | موجود | فحص PR | غير مثبت |
| `/consultations/` | P1 | `consultations/index.html` | موجود | فحص PR | غير مثبت |
| `/contact/` | P2 | `contact/index.html` | موجود | فحص PR | غير مثبت |
| `/en/` | P1 | `en/index.html` | موجود | فحص PR | غير مثبت |
| `/gulf/` | P1 | `gulf/index.html` | موجود | فحص PR | غير مثبت |
| `/` | P0 | `index.html` | موجود | فحص PR | غير مثبت |
| `/pricing/` | P0 | `pricing/index.html` | موجود | فحص PR | غير مثبت |
| `/services/ecommerce-ads/` | P1 | `services/ecommerce-ads/index.html` | موجود | فحص PR | غير مثبت |
| `/services/ecommerce-consulting/` | P1 | `services/ecommerce-consulting/index.html` | موجود | فحص PR | غير مثبت |
| `/services/ecommerce-management/` | P0 | `services/ecommerce-management/index.html` | موجود | فحص PR | غير مثبت |
| `/services/ecommerce-store-development/` | P1 | `services/ecommerce-store-development/index.html` | موجود | فحص PR | غير مثبت |
| `/services/` | P1 | `services/index.html` | موجود | فحص PR | غير مثبت |
| `/services/order-management/` | P0 | `services/order-management/index.html` | موجود | فحص PR | غير مثبت |
| `/system/easy-orders/` | P1 | `system/easy-orders/index.html` | موجود | فحص PR | غير مثبت |
| `/system/` | P0 | `system/index.html` | موجود | فحص PR | غير مثبت |
| `/system/inventory/` | P1 | `system/inventory/index.html` | موجود | فحص PR | غير مثبت |
| `/system/order-management/` | P1 | `system/order-management/index.html` | موجود | فحص PR | غير مثبت |
| `/system/shipping/` | P1 | `system/shipping/index.html` | موجود | فحص PR | غير مثبت |

## سجل الحالات المفتوحة

| ID | الفحص | الوضع | شرط الإغلاق |
|---|---|---|---|
| GEO-00A | تطابق sitemap/keyword-map/الملفات | تحقق من المصدر (45/45) | نجاح فحص HTML في CI |
| GEO-00B | SHA إنتاج Cloudflare | غير مثبت | ربط deployment بالـcommit الفعلي |
| GEO-01A | robots المصدر | مسموح للمحتوى العام | مطابقة النسخة الحية + headers |
| GEO-01B | حظر/سماح زواحف AI في Cloudflare | غير متاح | مراجعة bot logs وWAF وسجل verified bots |
| GEO-01C | HTML canonical/h1/schema لكل URL | اختبار آلي أضيف على فرع | نجاح CI ثم تدقيق عينات مباشرة |
| GEO-02A | Indexed / Not indexed الرسمي | غير متاح | تصدير أو فحص URL Inspection وIndexing Pages |
| GEO-02B | Bing AI Performance | لا يوجد اتصال موثق | ربط Bing Webmaster Tools وتسجيل baseline |
| GEO-07A | الاستشهادات في AI | غير متاح | أدوات القياس المدعومة/تحقق يدوي موثق |

## قواعد المراجعة

- لا تغيير في robots أو قواعد Cloudflare/الأمان تلقائيًا لمجرد زيادة وصول bots.
- نجاح محاكاة User-Agent يعني أن HTTP لم يمنع ذلك الطلب التجريبي فقط، وليس إثبات وصول crawler حقيقي.
- عدم ظهور صفحة في Search Analytics لا يثبت عدم فهرستها.
- الفرع وPR غير مساويين للنشر؛ لا تُسجل حالة «منشور» دون فحص الإصدار الحي.
- لا تُستخدم تجارب أو شهادات عملاء بدون موافقات وأدلة، ولا يمس هذا التنفيذ `app.kun-online.com`.
