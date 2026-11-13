import importlib.util,json,re,sys,tempfile,types,unittest,subprocess,os
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


class PublisherWorkflowGuard(unittest.TestCase):
 def test_refresh_only_changes_cannot_claim_article_published(self):
  workflow=(ROOT/'.github/workflows/scheduled-blog-publisher.yml').read_text(encoding='utf-8')
  commit_step=workflow.split('- name: Commit at most one approved and tested article',1)[1]
  log_guard='git diff --cached --quiet -- content/publication-log.json'
  self.assertIn(log_guard,commit_step)
  self.assertIn('publication log unchanged; skip refresh-only direct push',commit_step)
  self.assertLess(commit_step.index(log_guard),commit_step.index('git commit -m'))
  self.assertLess(commit_step.index(log_guard),commit_step.index('published=true'))
  self.assertIn('node scripts/seo-geo-general-reviewer.mjs --staged --role publisher',commit_step)
  self.assertIn('cancel-in-progress: false',workflow)



class PreviewDateAfterPublication(unittest.TestCase):
 def preview(self,entries,log):
  workflow=(ROOT/'.github/workflows/blog-queued-preflight.yml').read_text(encoding='utf-8')
  step=workflow.split('- name: Resolve next unpublished approved article eligibility date',1)[1]
  script=step.split("node - <<'NODE'",1)[1].split('\n          NODE',1)[0]
  with tempfile.TemporaryDirectory() as folder:
   temp=Path(folder);approved=temp/'content'/'approved';approved.mkdir(parents=True)
   (temp/'content'/'publication-log.json').write_text(json.dumps(log),encoding='utf-8')
   for entry in entries:
    (approved/(entry['slug']+'.json')).write_text(json.dumps(entry),encoding='utf-8')
   env_file=temp/'preview.env';env=dict(os.environ);env['GITHUB_ENV']=str(env_file)
   result=subprocess.run(['node','-e',script],cwd=temp,env=env,capture_output=True,text=True)
   self.assertEqual(result.returncode,0,result.stderr)
   self.assertEqual(json.loads((temp/'content'/'publication-log.json').read_text(encoding='utf-8')),log)
   return env_file.read_text(encoding='utf-8') if env_file.exists() else ''
 def test_same_day_publication_cannot_skip_remaining_queue_validation(self):
  output=self.preview([{'slug':'next','approved':True,'eligibleFrom':'2026-11-14'}],
   [{'slug':'done','date':'2026-11-14'}])
  self.assertIn('EDITORIAL_PREVIEW_CAIRO_DATE=2026-11-15',output)
  self.assertIn('EDITORIAL_CAIRO_DATE=2026-11-15',output)
 def test_preview_still_includes_future_eligible_articles(self):
  output=self.preview([{'slug':'future','approved':True,'eligibleFrom':'2026-11-20'}],
   [{'slug':'done','date':'2026-11-14'}])
  self.assertIn('EDITORIAL_PREVIEW_CAIRO_DATE=2026-11-20',output)
 def test_exhausted_queue_does_not_invent_a_preview_candidate(self):
  output=self.preview([{'slug':'done','approved':True,'eligibleFrom':'2026-11-14'}],
   [{'slug':'done','date':'2026-11-14'}])
  self.assertEqual(output,'')

if __name__=='__main__':unittest.main()
