export function synchronizeArticleMetrics(html,words){
 if(!Number.isInteger(words)||words<1)throw Error('Invalid article word count');
 const minutes=Math.ceil(words/170);
 let found=0;
 const result=html.replace(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g,(tag,json)=>{
  const data=JSON.parse(json);
  if(data['@type']!=='BlogPosting')return tag;
  found++;
  data.wordCount=words;
  data.timeRequired='PT'+minutes+'M';
  return '<script type="application/ld+json">'+JSON.stringify(data,null,2)+'</script>';
 });
 if(found!==1)throw Error('Expected exactly one BlogPosting schema');
 return result;
}
