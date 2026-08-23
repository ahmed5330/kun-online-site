#!/usr/bin/env python3
"""
سكريبت توليد المقالات التلقائي لمدونة كن أونلاين
يعمل عن طريق GitHub Actions كل يوم
"""

import anthropic
import json
import os
import re
from datetime import datetime, timezone
from pathlib import Path

# ── إعدادات ──────────────────────────────────────────────
SITE_ROOT = Path(__file__).parent.parent
BLOG_DIR = SITE_ROOT / "blog"
ARTICLES_JSON = BLOG_DIR / "articles.json"
TEMPLATE_FILE = BLOG_DIR / "article-template.html"

CATEGORIES = [
    {"id": "store",   "label": "بناء المتجر",       "keywords": "بناء متجر إلكتروني, تصميم متجر اون لاين مصر"},
    {"id": "ads",     "label": "إدارة الإعلانات",   "keywords": "إعلانات فيسبوك مصر, إعلانات جوجل, تيك توك"},
    {"id": "ops",     "label": "إدارة العمليات",    "keywords": "إدارة أوردرات, خدمة عملاء متجر, شحن مصر"},
    {"id": "seo",     "label": "السيو",              "keywords": "تحسين محركات البحث, SEO متجر إلكتروني"},
    {"id": "gulf",    "label": "السوق الخليجي",     "keywords": "تجارة إلكترونية السعودية, متجر الإمارات"},
    {"id": "finance", "label": "الإدارة المالية",   "keywords": "ROAS, تكلفة الأوردر, ربحية المتجر"},
    {"id": "content", "label": "المحتوى",           "keywords": "محتوى سوشيال ميديا, تصوير منتجات"},
]

ICONS = {
    "store": "🏪", "ads": "📢", "ops": "⚙️",
    "seo": "🔍", "gulf": "🌍", "finance": "💰", "content": "📱"
}

TOPICS = [
    ("store",   "كيف تبني متجراً إلكترونياً ناجحاً على Shopify في مصر خطوة بخطوة"),
    ("ads",     "كيف تخفض تكلفة الأوردر في إعلانات فيسبوك وتضاعف ROAS"),
    ("ops",     "كيف تدير طلبات متجرك الإلكتروني بكفاءة من غير فوضى"),
    ("seo",     "كيف تصدّر نتائج جوجل بمتجرك الإلكتروني في مصر"),
    ("gulf",    "كيف تدخل السوق السعودي بمتجرك الإلكتروني بنجاح"),
    ("ads",     "الفرق بين إعلانات Meta وTikTok وGoogle — أيها الأنسب لمتجرك؟"),
    ("finance", "كيف تحسب الربح الحقيقي لمتجرك الإلكتروني"),
    ("content", "كيف تصور منتجاتك باحتراف بهاتفك لترفع مبيعاتك"),
    ("store",   "Salla أم Shopify — أيهما أفضل لمتجرك في مصر؟"),
    ("gulf",    "سناب شات الإعلانات — دليلك الكامل لاستهداف السوق الخليجي"),
    ("ops",     "كيف تقلل المرتجعات في متجرك الإلكتروني"),
    ("seo",     "كيف تكتب وصف منتجات يبيع ويتصدر جوجل"),
    ("ads",     "كيف تختبر منتجاً جديداً بميزانية إعلانية صغيرة"),
    ("finance", "استراتيجية التسعير الصح للمتاجر الإلكترونية في مصر"),
    ("content", "خطة محتوى شهرية لمتجرك الإلكتروني — قالب جاهز"),
]

def get_next_topic():
    """اختيار الموضوع القادم بناءً على المقالات المنشورة"""
    published = load_articles()
    published_titles = {a.get("title","") for a in published}
    
    for cat_id, title in TOPICS:
        if title not in published_titles:
            cat = next(c for c in CATEGORIES if c["id"] == cat_id)
            return cat_id, cat["label"], title, cat["keywords"]
    
    # لو خلصت المواضيع — اختار عشوائي
    import random
    choice = random.choice(TOPICS)
    cat = next(c for c in CATEGORIES if c["id"] == choice[0])
    return choice[0], cat["label"], choice[1], cat["keywords"]

def load_articles():
    if ARTICLES_JSON.exists():
        with open(ARTICLES_JSON, "r", encoding="utf-8") as f:
            return json.load(f)
    return []

def save_articles(articles):
    with open(ARTICLES_JSON, "w", encoding="utf-8") as f:
        json.dump(articles, f, ensure_ascii=False, indent=2)

def slugify(text):
    text = re.sub(r'[^\w\s-]', '', text)
    text = re.sub(r'[\s_]+', '-', text)
    return text.strip('-')[:60]

def generate_article(title, category_id, category_label, keywords):
    """توليد المقالة باستخدام Claude API"""
    client = anthropic.Anthropic(api_key=os.environ["ANTHROPIC_API_KEY"])
    
    prompt = f"""أنت كاتب محتوى متخصص في التجارة الإلكترونية لمدونة "كن أونلاين" — وكالة تجارة إلكترونية مصرية.

اكتب مقالة شاملة ومفيدة بالعربية العامية المصرية الواضحة بعنوان:
"{title}"

متطلبات المقالة:
- الطول: 800-1200 كلمة
- الأسلوب: عملي ومباشر، بالعامية المصرية البسيطة
- الكلمات المفتاحية للسيو: {keywords}
- اذكر "كن أونلاين" بشكل طبيعي مرة أو مرتين كمرجع
- اختم بـ Call to Action للتواصل على واتساب

اكتب المقالة بتنسيق HTML فقط — استخدم:
<h2> للعناوين الرئيسية
<h3> للعناوين الفرعية  
<p> للفقرات
<ul><li> للقوائم
<strong> للتأكيد
<blockquote> للاقتباسات المهمة
<div class="highlight-box"><h4>عنوان</h4><p>محتوى</p></div> لصناديق التمييز

لا تكتب أي شيء قبل أو بعد الـ HTML — الـ HTML فقط بدون تفسير."""

    message = client.messages.create(
        model="claude-haiku-4-5",
        max_tokens=4000,
        messages=[{"role": "user", "content": prompt}]
    )
    
    return message.content[0].text

def count_words(html_content):
    text = re.sub(r'<[^>]+>', '', html_content)
    return len(text.split())

def generate_description(title, content):
    """توليد وصف قصير للمقالة"""
    client = anthropic.Anthropic(api_key=os.environ["ANTHROPIC_API_KEY"])
    
    msg = client.messages.create(
        model="claude-haiku-4-5",
        max_tokens=200,
        messages=[{"role": "user", "content": f"اكتب وصف SEO قصير (150-160 حرف) بالعربية لمقالة بعنوان: {title}\nلا تكتب غير الوصف فقط."}]
    )
    return msg.content[0].text.strip()

def main():
    print("🚀 بدء توليد المقالة...")
    
    # اختيار الموضوع
    topic_input = os.environ.get("TOPIC", "")
    if topic_input:
        cat_id = "store"
        cat_label = "بناء المتجر"
        title = topic_input
        keywords = "تجارة إلكترونية مصر, متجر اون لاين"
    else:
        cat_id, cat_label, title, keywords = get_next_topic()
    
    print(f"📝 الموضوع: {title}")
    print(f"📁 التصنيف: {cat_label}")
    
    # توليد المحتوى
    content_html = generate_article(title, cat_id, cat_label, keywords)
    description = generate_description(title, content_html)
    word_count = count_words(content_html)
    read_time = max(3, word_count // 200)
    
    # إعداد البيانات
    now = datetime.now(timezone.utc)
    slug = slugify(title) + "-" + now.strftime("%Y%m%d")
    date_iso = now.strftime("%Y-%m-%dT%H:%M:%SZ")
    date_display = now.strftime("%d/%m/%Y")
    excerpt = re.sub(r'<[^>]+>', '', content_html)[:200].strip() + "..."
    
    # قراءة القالب
    template = TEMPLATE_FILE.read_text(encoding="utf-8")
    
    # ملء القالب
    article_html = template
    replacements = {
        "{{TITLE}}": title,
        "{{DESCRIPTION}}": description,
        "{{KEYWORDS}}": keywords + ", " + cat_label + ", تجارة إلكترونية مصر",
        "{{SLUG}}": slug,
        "{{DATE}}": date_iso,
        "{{DATE_DISPLAY}}": date_display,
        "{{CATEGORY}}": cat_id,
        "{{CATEGORY_LABEL}}": cat_label,
        "{{READ_TIME}}": str(read_time),
        "{{WORD_COUNT}}": str(word_count),
        "{{CONTENT}}": content_html,
    }
    for k, v in replacements.items():
        article_html = article_html.replace(k, v)
    
    # حفظ ملف المقالة
    article_file = BLOG_DIR / f"{slug}.html"
    article_file.write_text(article_html, encoding="utf-8")
    print(f"✅ ملف المقالة: {article_file}")
    
    # تحديث articles.json
    articles = load_articles()
    articles.insert(0, {
        "slug": slug,
        "title": title,
        "description": description,
        "excerpt": excerpt,
        "category": cat_id,
        "categoryLabel": cat_label,
        "keywords": keywords,
        "date": date_display,
        "dateISO": date_iso,
        "readTime": read_time,
        "wordCount": word_count,
        "icon": ICONS.get(cat_id, "📝")
    })
    save_articles(articles)
    print(f"✅ articles.json محدّث — إجمالي المقالات: {len(articles)}")
    
    # تحديث sitemap
    update_sitemap(articles)
    print("✅ sitemap.xml محدّث")
    print("🎉 تم بنجاح!")

def update_sitemap(articles):
    """تحديث sitemap.xml بالمقالات الجديدة"""
    sitemap = '''<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>https://www.kun-online.com/</loc><priority>1.0</priority><changefreq>monthly</changefreq></url>
  <url><loc>https://www.kun-online.com/en</loc><priority>0.9</priority><changefreq>monthly</changefreq></url>
  <url><loc>https://www.kun-online.com/gulf</loc><priority>0.9</priority><changefreq>monthly</changefreq></url>
  <url><loc>https://www.kun-online.com/blog</loc><priority>0.8</priority><changefreq>daily</changefreq></url>
'''
    for art in articles:
        sitemap += f'  <url><loc>https://www.kun-online.com/blog/{art["slug"]}</loc><lastmod>{art["dateISO"][:10]}</lastmod><priority>0.7</priority><changefreq>monthly</changefreq></url>\n'
    
    sitemap += '</urlset>'
    
    sitemap_file = SITE_ROOT / "sitemap.xml"
    sitemap_file.write_text(sitemap, encoding="utf-8")

if __name__ == "__main__":
    main()
