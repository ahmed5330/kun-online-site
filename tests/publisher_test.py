import importlib.util,json,re,sys,tempfile,types,unittest
from pathlib import Path
from unittest.mock import patch

ROOT=Path(__file__).resolve().parent.parent
sys.modules.setdefault('anthropic',types.SimpleNamespace())
spec=importlib.util.spec_from_file_location('publisher',ROOT/'scripts/generate_article.py')
publisher=importlib.util.module_from_spec(spec);spec.loader.exec_module(publisher)

class PublisherSafety(unittest.TestCase):
 def test_quotes_do_not_break_schema_or_html(self):
  temp_root=ROOT/'test-results';temp_root.mkdir(exist_ok=True)
  with tempfile.TemporaryDirectory(dir=temp_root) as directory:
   self.assertTrue(Path(directory).resolve().is_relative_to(temp_root.resolve()))
   temp=Path(directory);blog=temp/'blog';blog.mkdir()
   template=ROOT/'blog/article-template.html'
   with patch.multiple(publisher,SITE_ROOT=temp,BLOG_DIR=blog,ARTICLES_JSON=blog/'articles.json',TEMPLATE_FILE=template),patch.object(publisher,'get_next_topic',return_value=('store','بناء المتجر','عنوان "خاص" & متجر','كلمات "بحث"')),patch.object(publisher,'generate_article',return_value='<h2>اختبار</h2><p>محتوى تعليمي توضيحي</p>'),patch.object(publisher,'generate_description',return_value='وصف "خاص" & واضح'):
    with patch.dict('os.environ',{'TOPIC':''}):publisher.main()
   s=next((temp/'docs'/'editorial-drafts').glob('*.html.review')).read_text(encoding='utf-8')
   self.assertFalse((blog/'articles.json').exists(), 'Generator must never publish unreviewed blog registry')
   review_file=next((temp/'docs'/'editorial-drafts').glob('*.review.json'))
   review=json.loads(review_file.read_text(encoding='utf-8'))
   self.assertEqual(review['status'],'DRAFT_REQUIRES_EDITORIAL_REVIEW')
   self.assertNotIn('{{',s)
   self.assertIn('&quot;خاص&quot; &amp; واضح',s)
   blocks=re.findall(r'<script type="application/ld\+json">([\s\S]*?)</script>',s)
   self.assertGreaterEqual(len(blocks),2)
   for block in blocks:json.loads(block)
   self.assertIn('href="/services/"',s)

if __name__=='__main__':unittest.main()
