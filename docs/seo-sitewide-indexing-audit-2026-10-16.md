# تدقيق SEO الشامل وفهرسة صفحات كن أونلاين — 16 أكتوبر 2026

> نطاق التدقيق: موقع كن أونلاين التسويقي **https://kun-online.com/** في GitHub `ahmed5330/kun-online-site`، وليس تطبيق العملاء `app.kun-online.com`. هذا تقرير بتاريخ محدد؛ مصدر الإنتاج GitHub وCloudflare، وبيانات Google المتاحة من Search Console عبر Windsor.ai. **لا تتوافر في الاتصال الحالي أداة URL Inspection أو تقرير Page Indexing لكل صفحة.**

## الحكم التنفيذي

- **خريطة الموقع الفنية مطابقة:** عدد روابط `sitemap.xml` = **33**، وعدد العناوين في `seo/keyword-map.json` = **33**، وجميع الروابط تتطابق واحدًا لواحد ولا توجد روابط Sitemap مكررة.
- **خريطة الاستهداف الكلمات:** لكل صفحة Primary Keyword غير فارغ ومختلف عن باقي الصفحات؛ 5 صفحات أولوية P0 و21 صفحة P1 و7 صفحات P2. التخصص التجاري مفصول عن نية شراء البرنامج: `/services/order-management/` خدمة بشرية، و`/system/order-management/` برنامج.
- **إمكانية الزحف الفنية:** `robots.txt` يسمح بصفحات الموقع وبه رابط Sitemap الصحيح. اختبارات GitHub/Cloudflare تفحص 33 عنوانًا مع HTTP 200 وCanonical وH1 وعنوان الصفحة وغياب noindex. التحويلات من `www` والروابط العربية القديمة مُعرفة كـ301 في `_worker.js`. نجاح الاختبار الفني لا يساوي تأكيد فهرسة جوجل.
- **فجوة غير مغلقة:** سجل Google Search Console للـSitemap يظهر **24 URL submitted** من آخر جلب **13 أكتوبر 2026**، مقابل 33 عنوانًا حاليًا (توجد صفحات أحدث من آخر جلب). هذا تأخير قراءة/إرسال لا إثبات أن 9 صفحات غير مفهرسة.
- **العدد الحقيقي المفهرس:** **غير قابل للجزم** من Windsor.ai؛ الحقل `indexed` موسوم رسميًا في الموصل `deprecated`. لا تستخدم `0` منه لإعلان عدم فهرسة كل الصفحات.
- **الحماية:** جرى تعديل Cloudflare Worker ضمن هذا الإصلاح لرد HTTP 404 مع `X-Robots-Tag: noindex` على ملفات المسودات والخطط والتقارير البرمجية، بدل عرض ملفات التحرير كصفحات عامة.

## بيانات Search Console الموثقة

- مصدر الحساب المتصل: `sc-domain:kun-online.com`. ملف الخريطة: `https://kun-online.com/sitemap.xml`.
- `last_submitted=2026-10-13T12:51:46.753Z`، `last_downloaded=2026-10-13T12:51:48.531Z`؛ `submitted=24`، `errors=0`، `warnings=0`.
- بحث Google (1–13 أكتوبر): **5 نقرات / 32 ظهورًا** في تجميع الأيام؛ أحدث يوم مُعاد 13 أكتوبر. أغسطس: 20 نقرة / 78 ظهورًا، سبتمبر: 11 نقرة / 42 ظهورًا.
- البحث حسب الصفحة (1 أغسطس–16 أكتوبر المحددة في الطلب): ظهرت **5 صفوف صفحات فقط**، تشمل `https://www.kun-online.com/`، و`https://kun-online.com/`، وثلاثة مسارات عربية قديمة على `www`. هذه **صفحات ظهرت في تقارير الأداء التاريخية**، وليست تعدادًا مؤكدًا للصفحات المفهرسة اليوم، ولا دليلًا على أن الـ301 الحالي غير فعال.
- تجميع الصفحات أعاد 39 نقرة / 169 ظهورًا؛ يختلف عن تجميع التواريخ 36/152، ويجب تجنّب جمع المجموعتين أو اختراع تفسير قبل مراجعة المصدر وفترة تجميع Google.
- لا يظهر من هذا الاتصال عدد `Indexed` و`Not indexed` النهائي ولا أسباب `Crawled - currently not indexed` أو `Discovered - currently not indexed`، ولا `Google-selected canonical` لكل URL. هذه تتطلب URL Inspection / Page Indexing من Google نفسها، المتصل بهذا الحساب لم يوفّر الإجراء بعد.

## جدول جميع الصفحات المطلوب فحص فهرستها

**P0 أولًا** للصفحات التجارية الأساسية (5)، ثم **P1** للـ21 صفحة التالية، ثم **P2** للـ7 صفحات الأقل أولوية. ترتيب هذا الجدول لفحص الفهرسة وليس تأكيدًا لترتيب جوجل.

| الأولوية | الرابط | الكلمة المستهدفة الرئيسية | نوع الصفحة | حالة الفهرسة الفعلية |
|---|---|---|---|---|
| P0 | `/` | بناء وإدارة المتاجر الإلكترونية | agency | غير معروف من URL Inspection |
| P0 | `/services/ecommerce-management/` | إدارة المتاجر الإلكترونية في مصر | agency | غير معروف من URL Inspection |
| P0 | `/services/order-management/` | خدمة تأكيد الطلبات للمتاجر الإلكترونية | agency | غير معروف من URL Inspection |
| P0 | `/system/` | برنامج إدارة المتاجر الإلكترونية | software | غير معروف من URL Inspection |
| P0 | `/pricing/` | تكلفة إدارة المتاجر الإلكترونية | agency | غير معروف من URL Inspection |
| P1 | `/en/` | ecommerce agency in Egypt | agency | غير معروف من URL Inspection |
| P1 | `/gulf/` | وكالة تجارة إلكترونية في الخليج | agency | غير معروف من URL Inspection |
| P1 | `/services/` | خدمات إدارة المتاجر الإلكترونية | agency | غير معروف من URL Inspection |
| P1 | `/services/ecommerce-store-development/` | تصميم متجر إلكتروني في مصر | agency | غير معروف من URL Inspection |
| P1 | `/services/ecommerce-ads/` | إدارة إعلانات المتاجر الإلكترونية | agency | غير معروف من URL Inspection |
| P1 | `/services/ecommerce-consulting/` | استشارات التجارة الإلكترونية | agency | غير معروف من URL Inspection |
| P1 | `/system/order-management/` | برنامج إدارة الطلبات للمتاجر الإلكترونية | software | غير معروف من URL Inspection |
| P1 | `/system/inventory/` | برنامج إدارة المخزون والباركود للمتاجر الإلكترونية | software | غير معروف من URL Inspection |
| P1 | `/system/shipping/` | برنامج إدارة الشحن والبوليصات للمتاجر الإلكترونية | software | غير معروف من URL Inspection |
| P1 | `/system/easy-orders/` | ربط Easy Orders مع كن أونلاين | software | غير معروف من URL Inspection |
| P1 | `/blog/` | مدونة التجارة الإلكترونية | informational | غير معروف من URL Inspection |
| P1 | `/blog/customer-funnel-guide` | تحسين معدل تحويل المتجر الإلكتروني | informational | غير معروف من URL Inspection |
| P1 | `/blog/ecommerce-complete-journey-guide` | كيفية بدء التجارة الإلكترونية في مصر | informational | غير معروف من URL Inspection |
| P1 | `/blog/ecommerce-funnel-explained` | قمع المبيعات في التجارة الإلكترونية | informational | غير معروف من URL Inspection |
| P1 | `/blog/essential-ecommerce-glossary` | مصطلحات التجارة الإلكترونية | informational | غير معروف من URL Inspection |
| P1 | `/blog/product-marketing-operations-ecommerce` | عوامل نجاح المتجر الإلكتروني | informational | غير معروف من URL Inspection |
| P1 | `/blog/startup-budget-egypt` | تكلفة بدء التجارة الإلكترونية في مصر | informational | غير معروف من URL Inspection |
| P1 | `/blog/cod-shipping-returns-reconciliation` | تسوية تحصيل شركات الشحن | informational | غير معروف من URL Inspection |
| P1 | `/blog/inventory-barcode-bundle-tracking` | إدارة المخزون بالباركود | informational | غير معروف من URL Inspection |
| P1 | `/blog/order-confirmation-delivery-rate` | نسبة تأكيد الطلبات | informational | غير معروف من URL Inspection |
| P1 | `/blog/real-cost-per-delivered-order` | تكلفة الطلب الفعلية | informational | غير معروف من URL Inspection |
| P2 | `/about/` | عن كن أونلاين | brand | غير معروف من URL Inspection |
| P2 | `/contact/` | التواصل مع كن أونلاين | brand | غير معروف من URL Inspection |
| P2 | `/blog/brand-vs-product-business` | متى تبدأ بناء براند | informational | غير معروف من URL Inspection |
| P2 | `/blog/common-ecommerce-beginner-mistakes` | أخطاء التجارة الإلكترونية للمبتدئين | informational | غير معروف من URL Inspection |
| P2 | `/blog/ecommerce-evolution-history` | تطور التجارة الإلكترونية | informational | غير معروف من URL Inspection |
| P2 | `/blog/owned-vs-rented-channels` | متجر إلكتروني أم منصات البيع | informational | غير معروف من URL Inspection |
| P2 | `/blog/what-is-ecommerce` | ما هي التجارة الإلكترونية | informational | غير معروف من URL Inspection |

## عناصر SEO التي تم تدقيقها

1. **Canonical والنسخ المكررة:** كل صفحة مُعدة بكانونيكال يشير لمسارها على `https://kun-online.com`، وتحويل `www` و`http` والروابط العربية القديمة نحو النسخة الصحيحة؛ إعادة الزحف من Google قد تحتاج وقتًا.
2. **Hreflang:** القالب الإقليمي بين `/` و`/gulf/` و`/en/` مُراجع باللغات `ar-EG` و`ar-SA` و`ar-AE` و`ar-KW` و`en` و`x-default`، مع الإشارة إلى صفحات موجودة بالفعل. لا تُعتبر المدونة مترجمة إلى كل تلك اللغات.
3. **الهيكل التجاري:** عشر صفحات وكالة/خدمات، وخمس صفحات برنامج/سيستم، وصفحتا ثقة/علامة، و16 صفحة معلومات/مدونة (بما فيها فهرس المدونة). هذا تصنيف `pillar` وليس انطباعًا عن عدد الصفحات المفهرسة.
4. **الفهرسة المؤهلة:** لكل صفحة HTML في المخطط عنوان وH1 ووصف، واختبارات محلية للروابط الداخلية وJSON-LD والتوافق الفني. هذه لا تحكم على الجودة التحريرية لكل صفحة أو ترتيبها.
5. **Content Gap:** يوجد 15 مقالًا منشورًا و9 موضوعات من سلسلة الـ100 محددة على أنها مغطاة؛ الموضوع رقم 2 معتمد في قائمة النشر لكنه **غير منشور في لحظة هذا التدقيق**، لذلك لم يُدرج في قائمة الروابط الـ33.
6. **حجم البحث وصعوبة الكلمات:** `seo/keyword-map.json` مصمم على نية البحث وموضوع الصفحة، لكن `metricsAvailable=false`؛ لا توجد أرقام حجم بحث أو KD حقيقية مؤكدة لمصر أو السعودية، لذلك لا يجوز القول إن توزيع الكلمات هو الأمثل تجاريًا قبل توفر بيانات فعلية كافية.

## ما يلزم لإغلاق الفهرسة بالدليل

1. افتح خاصية `sc-domain:kun-online.com` في Search Console ثم **Indexing → Sitemaps**؛ تأكد أن الخريطة الجديدة تم اكتشافها وأُعيد جلبها وأن العدد المُرسَل توافق مع النسخة الحالية بعد أي تحديث، دون استنتاج الفهرسة من عدد Submitted.
2. في **Indexing → Pages** افحص إجمالي `Indexed` و`Not indexed` وتقسيم الأسباب. احفظ لقطة مؤرخة للتقرير دون بيانات شخصية.
3. في **URL Inspection** افحص عناوين **P0 الخمسة** أولًا، ثم الـ21 من P1، ثم الـ7 من P2. لكل URL احفظ `verdict` و`coverageState` و`googleCanonical` و`userCanonical` و`lastCrawlTime` و`sitemap` و`pageFetchState`.
4. اطلب الفهرسة **للروابط الجديدة أو المصححة والمؤهلة فقط** بعد سلامة HTTP 200 وCanonical والمحتوى؛ الطلب لا يضمن قبول الفهرسة أو ترتيبًا معينًا.
5. راقب ظهور الانخفاض التدريجي لعناوين `www` والروابط العربية القديمة بعد 301؛ لا تحذف إعادة التوجيهات لمجرد استمرار ظهورها في سجلات الأداء التاريخية.
6. اربط مراجعة 14 نوفمبر بمخرجات Page Indexing وتقارير الأداء بتاريخ واضح، وواصل مراقبة GA4 وتفاعل واتساب كمؤشرات مستقلة؛ لا تخلط بينهما وبين عدد الصفحات المفهرسة.

## مصادر وأساليب المراجعة

- ملفات المصدر: `sitemap.xml`، `seo/keyword-map.json`، `robots.txt`، `_worker.js`، `_redirects`، `tests/site.test.mjs`، `scripts/live-site-audit.mjs`.
- نتائج Windsor.ai Search Console على خاصية النطاق — 16 أكتوبر 2026؛ تدقيق GitHub Actions وCloudflare Pages من الإصدار المقابل.
- [Google Search Console URL Inspection API](https://developers.google.com/webmaster-tools/v1/urlInspection.index/inspect): يتطلب صلاحية وصول مباشرة ويدعم قراءة نسخة الفهرس؛ واجهة API لا تختبر صفحة حية. Windsor.ai الحالي يعرض بيانات Search Analytics/Sitemaps فقط ولا يدعم إجراء URL Inspection.
- لا تعتمد على نتائج بحث `site:` لتعداد المفهرس؛ هي أداة استكشاف غير شاملة، وغير كافية لإغلاق اختبار جميع الصفحات.

**وضع الإغلاق:** تدقيق الخريطة الفنية مكتمل من المصدر، حماية المسودات في مسار اختبار/نشر، لكن **مهمة إثبات الفهرسة في Google ما زالت مفتوحة** لحين مخرجات Search Console URL Inspection / Page Indexing.


## استكمال معالجة المحتوى — 16 أكتوبر 2026

بعد تدقيق 33 مسارًا مطابقًا لخريطة الكلمات، حُسّن **11 مقالًا قائمًا** يقل طول متن كل منها عن 1500 كلمة، وأصبحت المقالات الـ15 المسجلة في المدونة بين 1504 و1712 كلمة وفق العد الموحد. أضيفت تفاصيل مفيدة للنية التعليمية عن التسويق والتشغيل، بدل إدراج كلمات مفتاحية بشكل آلي أو تكرار فقرات. حدثت أوقات القراءة، وبيانات BlogPosting، وصححت خريطة الروابط الداخلية ودلالة lastmod للمقالات التي تغير متنها فعلًا. لم يتغير العدد العام للصفحات في Sitemap: **33 URL**.

**الحد الفاصل:** أصبح المحتوى أعمق وقابلًا لإعادة الزحف، لكن لا يوجد لدينا في هذا الاتصال `URL Inspection` أو `Page indexing` الرسمي لتحديد ما إذا كانت صفحة بعينها غير مفهرسة. لم نرسل أمر طلب فهرسة نيابة عن صاحب الموقع. لا يجوز استخدام Google Indexing API للمقالات التجارية العادية؛ واجهته الرسمية مخصصة فقط لصفحات الوظائف `JobPosting` أو أحداث البث المباشر `BroadcastEvent` المرتبطة بفيديو. الطريقة الصحيحة هي تقديم Sitemap الحالية ومراجعة URL Inspection من Console ذي الصلاحيات المناسبة. طلب الفهرسة لا يضمن قبول الصفحة في النتائج.

**التحديثات الفنية ليست بديلًا عن قرار Google:** نشر `lastmod` لمقال تغيّر متنه يساعد جوجل على ملاحظة التحديث عندما يزحف، ولا يثبت أن الملف أعيد إرساله أو جرى فهرسته. قرار الفهرسة الفعلي يبقى مفتوحًا.
