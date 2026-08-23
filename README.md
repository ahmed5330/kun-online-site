# كن أونلاين — موقع الوكالة

## الهيكل
```
/               ← الصفحة الرئيسية العربية
/en             ← الصفحة الإنجليزية
/gulf           ← صفحة السوق الخليجي
/blog           ← مدونة التجارة الإلكترونية
/blog/[slug]    ← المقالات الفردية
/sitemap.xml    ← خريطة الموقع (تتحدث تلقائياً)
```

## النشر التلقائي للمقالات
GitHub Action يعمل كل يوم الساعة 8 صباحاً ويولد مقالة جديدة باستخدام Claude API.

### لتشغيل يدوي:
1. روح GitHub → Actions → Publish Daily Article
2. اضغط "Run workflow"
3. اكتب موضوع المقالة (اختياري)

### إعداد الـ Secrets:
في GitHub → Settings → Secrets → New secret:
- `ANTHROPIC_API_KEY` ← مفتاح Claude API

## الاستضافة
Cloudflare Pages — ربط تلقائي بـ GitHub
