/**
 * GEO-07: create a reproducible MANUAL AI-answer visibility test worksheet.
 * This does not query AI platforms or assert citation/rank/visibility.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root=path.resolve(fileURLToPath(new URL('..',import.meta.url)));
export const PLATFORMS=['ChatGPT','Google Gemini','Microsoft Copilot','Perplexity'];
export const PROMPTS=[
 {id:'BRAND-01',kind:'navigational',locale:'ar-EG',query:'ما هي كن أونلاين وما الخدمات التي تقدمها للمتاجر الإلكترونية؟'},
 {id:'BRAND-02',kind:'navigational',locale:'ar-EG',query:'كيف أتواصل مع كن أونلاين لإدارة متجري الإلكتروني؟'},
 {id:'AGENCY-01',kind:'commercial',locale:'ar-EG',query:'كيف أختار شركة متخصصة في إدارة المتاجر الإلكترونية في مصر؟'},
 {id:'AGENCY-02',kind:'commercial',locale:'ar-EG',query:'ما الفرق بين الاستعانة بفريق لتأكيد الأوردرات واستخدام برنامج إدارة الطلبات؟'},
 {id:'OPS-01',kind:'informational',locale:'ar-EG',query:'ما الطريقة الصحيحة لحساب نسبة تأكيد الطلبات ونسبة التسليم في متجر الدفع عند الاستلام؟'},
 {id:'OPS-02',kind:'informational',locale:'ar-EG',query:'كيف أطابق بوليصات الشحن مع تحصيل COD والمرتجعات؟'},
 {id:'OPS-03',kind:'informational',locale:'ar-EG',query:'ما الفرق بين SKU وباركود القطعة عند تتبع باندل في المخزون؟'},
 {id:'FINANCE-01',kind:'informational',locale:'ar-EG',query:'كيف أحسب تكلفة الطلب المسلم الحقيقية بعد الإعلان والشحن والمرتجع؟'},
 {id:'FINANCE-02',kind:'informational',locale:'ar-EG',query:'كيف أحسب هامش المساهمة ونقطة التعادل قبل شراء منتج للمتجر الإلكتروني؟'},
 {id:'GCC-01',kind:'commercial',locale:'ar-SA',query:'ما أهم معايير اختيار وكالة لإدارة متجر إلكتروني في السعودية؟'},
 {id:'GCC-02',kind:'informational',locale:'ar-SA',query:'كيف أحدد هل متجر منتج واحد أو متجر متخصص أكثر مناسبة للتوسع؟'},
 {id:'GEO-01',kind:'informational',locale:'ar-EG',query:'كيف أتأكد أن مقال التجارة الإلكترونية يذكر مصادر ومعادلات موثوقة ويمكن الاستفادة منه في إجابات الذكاء الاصطناعي؟'}
];

export function buildRows(){
 return PROMPTS.flatMap(p=>PLATFORMS.map(platform=>({
  prompt_id:p.id,category:p.kind,locale:p.locale,platform,query:p.query,
  checked_at:'',result_status:'not_run',site_mentioned:'',source_cited:'',
  exact_citation_url:'',answer_evidence_reference:'',notes:''
 })));
}
export const FIELDS=[
 'prompt_id','category','locale','platform','query','checked_at','result_status',
 'site_mentioned','source_cited','exact_citation_url','answer_evidence_reference','notes'
];
const csvCell=value=>'"'+String(value??'').replaceAll('"','""')+'"';
export function serializeCsv(rows){
 return [FIELDS.map(csvCell).join(','),...rows.map(row=>FIELDS.map(k=>csvCell(row[k])).join(','))].join('\n')+'\n';
}
export async function run(){
 const rows=buildRows();
 const out=path.join(root,'test-results/geo-ai-visibility-template.csv');
 await fs.mkdir(path.dirname(out),{recursive:true});
 await fs.writeFile(out,serializeCsv(rows),'utf8');
 console.log('GEO answer experiment template: '+PROMPTS.length+' prompts x '+PLATFORMS.length+
  ' platforms = '+rows.length+' unrun observations. No AI calls or citation claims made.');
 console.log('Report: test-results/geo-ai-visibility-template.csv');
 return rows;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 run().catch(error=>{console.error(error);process.exitCode=1;});
}
