import test from 'node:test';
import assert from 'node:assert/strict';
import {synchronizeArticleMetrics} from '../scripts/article-metrics.mjs';
const schema=(data)=>'<script type="application/ld+json">'+JSON.stringify(data)+'</script>';
test('1738 words yields 11 minutes and preserves approved body, dates and URLs',()=>{
 const html='<article>Approved text</article>'+schema({'@type':'BlogPosting',timeRequired:'PT10M',wordCount:1738,datePublished:'__PUBLICATION_DATE_ISO__',url:'https://kun-online.com/blog/test'});
 const result=synchronizeArticleMetrics(html,1738);
 assert(result.startsWith('<article>Approved text</article>'));
 const data=JSON.parse(result.match(/<script[^>]*>([\s\S]*)<\/script>/)[1]);
 assert.equal(data.timeRequired,'PT11M');assert.equal(data.wordCount,1738);
 assert.equal(data.datePublished,'__PUBLICATION_DATE_ISO__');assert.equal(data.url,'https://kun-online.com/blog/test');
 assert.equal(synchronizeArticleMetrics(result,1738),result);
});
test('does not alter other structured data',()=>{
 const other=schema({'@type':'Organization',name:'KUN'});
 assert(synchronizeArticleMetrics(other+schema({'@type':'BlogPosting'}),170).startsWith(other));
});
test('fails closed on missing, duplicate or invalid schemas',()=>{
 assert.throws(()=>synchronizeArticleMetrics('<article>body</article>',100));
 assert.throws(()=>synchronizeArticleMetrics(schema({'@type':'BlogPosting'})+schema({'@type':'BlogPosting'}),100));
 assert.throws(()=>synchronizeArticleMetrics('<script type="application/ld+json">{</script>',100));
 assert.throws(()=>synchronizeArticleMetrics(schema({'@type':'BlogPosting'}),0));
});
