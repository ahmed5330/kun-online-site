// Reproducible, editable, first-party topic artwork with the EXACT Arabic article title.
// The title is large and RTL, within a bounded visual headline panel; no fabricated
// metrics, external media, people, faces, private instructions or remote font imports.
// The PNG/WebP publisher uses Pillow+RAQM for definitive cross-platform Arabic.
export function buildSVG(spec) {
 const slug=spec.slug;
 const themes={
  finance:['#f7bd70','#fae4b7'],checklist:['#acdf8b','#e4ffd5'],compare:['#80bfff','#d6ecff'],
  research:['#79dfcf','#c7fff0'],trend:['#af9aff','#e7ddff'],calendar:['#a8c1ff','#e0e9ff'],
  shipping:['#70e3bd','#d0fff0'],inventory:['#d2d981','#f2facb'],brand:['#ddaaff','#f0deff'],
  dashboard:['#87caff','#e1f2ff'],funnel:['#81e0c9','#d2fff2'],workflow:['#a2d78e','#e5ffd9'],
  timeline:['#edb3a7','#ffe4dd'],store:['#91d8fa','#dbf6ff']
 };
 const [accent,bright]=themes[spec.motif]||themes.store;
 const U=(n)=>Number(n.toFixed? n.toFixed(2):n);
 const R=(x,y,w,h,rad=22,fill='#12384a',stroke='#3a6978',sw=2)=>
  '<rect x="'+x+'" y="'+y+'" width="'+w+'" height="'+h+'" rx="'+rad+'" fill="'+fill+'" stroke="'+stroke+'" stroke-width="'+sw+'"/>';
 const C=(x,y,r,fill,stroke='none',sw=0)=>'<circle cx="'+x+'" cy="'+y+'" r="'+r+'" fill="'+fill+'" stroke="'+stroke+'" stroke-width="'+sw+'"/>';
 const P=(d,color=accent,sw=8,fill='none')=>'<path d="'+d+'" fill="'+fill+'" stroke="'+color+'" stroke-width="'+sw+'" stroke-linecap="round" stroke-linejoin="round"/>';
 const L=(x,y,xx,yy,color=accent,sw=7)=>P('M'+x+' '+y+'L'+xx+' '+yy,color,sw);
 const group=(x,y,s,html)=>'<g transform="translate('+x+' '+y+') scale('+s+')">'+html+'</g>';
 const icon=(name,x,y,s=1,color=accent)=>{
  let a='';
  if(name==='box')a=P('M12 32L50 12L88 32L50 53Z',color,5,'#173d4f')+P('M12 32V76L50 97L88 76V32M50 53V97',color,5);
  else if(name==='store')a=P('M15 42L25 13H75L85 42Z',color,7,'#234f60')+R(23,43,54,45,5,'#183f50',color,5)+R(38,58,22,30,2,'#72b6c9','none',0);
  else if(name==='cart')a=P('M9 15H22L36 68H82L91 34H29',color,7)+C(43,84,6,color)+C(77,84,6,color);
  else if(name==='tag')a=P('M18 17H59L91 49L60 84L18 43Z',color,6,'#21495b')+C(37,35,7,'#0c273a',color,4);
  else if(name==='coin')a=C(50,50,35,'#244d5a',color,6)+P('M40 31Q61 20 65 39Q70 49 49 51Q28 54 37 65Q46 79 65 65',color,6);
  else if(name==='chart')a=R(12,13,76,76,13,'#163e50',color,5)+P('M25 68L43 47L59 59L78 29',color,6)+P('M68 29H78V40',color,6);
  else if(name==='check')a=C(50,50,36,'#214b58',color,5)+P('M27 52L44 69L76 32',color,8);
  else if(name==='magnify')a=C(43,44,27,'#1d485a',color,6)+P('M65 66L90 91',color,8);
  else if(name==='star')a=P('M50 9L62 35L92 39L70 61L77 91L50 76L23 91L30 61L8 39L38 35Z',color,5,'#335267');
  else if(name==='calendar')a=R(13,16,74,73,9,'#1e4856',color,5)+P('M13 38H87M34 10V26M66 10V26',color,5)+R(28,50,16,15,3,color,'none',0)+R(57,50,16,15,3,'#6ca2a9','none',0);
  else if(name==='phone')a=R(25,8,51,85,12,'#183e50',color,6)+L(39,23,61,23,color,4)+C(51,80,4,color);
  else if(name==='receipt')a=P('M24 12H76V87L65 78L55 87L45 78L35 87L24 78Z',color,5,'#254c58')+P('M35 34H65M35 48H65M35 62H56',color,5);
  else if(name==='warehouse')a=P('M9 40L50 12L91 40V87H9Z',color,5,'#183e50')+R(34,54,32,33,4,'#316378',color,4);
  else if(name==='bar')a=R(12,16,76,71,8,'#123b52',color,5)+Array.from({length:12},(_,j)=>R(21+j*5.6,29,2+(j%3),46,0,color,'none',0)).join('');
  else if(name==='bullhorn')a=P('M18 38H37L77 20V76L37 58H18ZM31 59L39 84H52L45 57',color,6,'#1f5261')+P('M84 35Q96 46 84 60',color,5);
  else if(name==='target')a=C(50,50,37,'#1a4758',color,5)+C(50,50,22,'none',color,4)+C(50,50,8,color);
  else if(name==='wallet')a=R(15,30,73,53,11,'#235365',color,5)+R(58,46,34,22,6,'#133649',color,4)+C(74,57,4,color);
  else if(name==='light')a=P('M27 44Q19 20 41 15Q67 4 79 30Q87 49 65 64V74H39V64Q29 55 27 44ZM41 83H66',color,6,'#244f60')+P('M45 91H61',color,6);
  else if(name==='warning')a=P('M50 9L94 88H6Z',color,6,'#36505e')+P('M50 35V59',color,9)+C(50,76,5,color);
  else if(name==='gear')a=C(50,50,30,'#1e4858',color,7)+C(50,50,12,'#092638',color,5)+Array.from({length:8},(_,j)=>{const t=j*Math.PI/4;return L(U(50+30*Math.cos(t)),U(50+30*Math.sin(t)),U(50+43*Math.cos(t)),U(50+43*Math.sin(t)),color,7)}).join('');
  else if(name==='shield')a=P('M50 7L83 22V48Q83 76 50 94Q17 76 17 48V22Z',color,6,'#1c4755')+P('M31 51L44 64L68 35',color,6);
  else if(name==='screen')a=R(10,14,80,64,9,'#153b4e',color,6)+P('M34 88H66M50 78V88',color,6)+R(25,29,51,28,5,'#315a6b','none',0);
  else if(name==='package')a=P('M17 32L50 14L84 32V72L50 91L17 72Z',color,6,'#204757')+P('M17 32L50 51L84 32M50 51V91',color,5);
  else a=C(50,50,30,'#1d4b5a',color,5);
  return group(x,y,s,a);
 };
 const tile=(x,y,w,h,kind,scale=.9,color=accent)=>R(x,y,w,h,25,'url(#glass)','#416c7d',2)+icon(kind,x+(w-100*scale)/2,y+(h-100*scale)/2,scale,color);
 const arrow=(x,y,xx,yy,col=accent)=>P('M'+x+' '+y+'L'+xx+' '+yy+'M'+(xx-15)+' '+(yy-13)+'L'+xx+' '+yy+'L'+(xx-17)+' '+(yy+10),col,7);
 const row=(x,y,flags=4)=>Array.from({length:flags},(_,j)=>R(x,y+j*34,228-(j%3)*38,13,7,j%2?accent:'#5f899b','none',0)).join('');
 let scene='';
 switch(slug){
 case 'ecommerce-product-price-strategy':
  scene=tile(154,200,231,240,'receipt',1.2)+tile(485,153,231,294,'target',1.35,bright)+tile(815,200,231,240,'wallet',1.2)+arrow(397,311,464,311)+arrow(735,311,802,311)+R(491,480,224,16,8,accent,'none',0);break;
 case 'sales-price-vs-real-ecommerce-profit':
  scene=tile(160,202,230,265,'coin',1.65)+arrow(411,330,485,330)+R(505,177,200,290,24,'#184353','#568091',2)+icon('receipt',545,217,1.12)+R(536,388,135,13,6,'#e8b977','none',0)+tile(803,230,218,224,'wallet',1.35,bright)+arrow(718,330,783,330);break;
 case 'product-selection-checklist-20-points':
  scene=R(205,139,500,354,29,'#20495a','#83aaab',3)+R(261,118,389,53,17,accent,'none',0)+row(275,215,6)+Array.from({length:6},(_,j)=>icon('check',646,203+j*34,.33,bright)).join('')+icon('magnify',773,238,2,bright);break;
 case 'one-product-vs-multi-product-store':
  scene=R(148,173,414,328,25,'url(#glass)','#467487')+icon('package',271,228,1.7,bright)+R(622,173,414,328,25,'url(#glass)','#467487')+Array.from({length:6},(_,j)=>icon('package',648+(j%3)*129,222+Math.floor(j/3)*139,.73,j%2?accent:'#87c5db')).join('')+L(590,180,590,498,accent,3);break;
 case 'cheap-vs-expensive-products-online':
  scene=tile(170,185,270,305,'tag',1.5,accent)+R(210,444,170,12,6,'#6d96a8','none',0)+tile(753,185,270,305,'tag',1.5,bright)+R(794,422,170,34,8,accent,'none',0)+P('M481 344L603 266L713 344',bright,10)+C(602,264,17,accent);break;
 case 'product-profitability-before-launch':
  scene=tile(156,205,256,278,'receipt',1.58)+arrow(423,338,487,338)+tile(507,176,229,307,'target',1.51,bright)+arrow(752,337,806,337)+tile(824,205,210,278,'check',1.45);break;
 case 'customer-reviews-product-opportunities':
  scene=R(178,187,700,295,27,'url(#glass)','#537b8c')+Array.from({length:3},(_,j)=>R(215,222+j*76,417,58,13,'#214d60','#4d7989')+icon('star',238,225+j*76,.43,bright)+L(315,254+j*76,567,254+j*76,'#598a9a',5)).join('')+icon('magnify',763,285,1.88,accent);break;
 case 'ecommerce-competitor-analysis-sheet':
  scene=R(190,145,816,369,28,'url(#glass)','#568092')+Array.from({length:3},(_,j)=>R(224+j*246,177,212,67,12,j===1?'#275c6a':'#183d50',j===1?accent:'#467184')+icon('store',282+j*246,184,.55,j===1?bright:accent)).join('')+Array.from({length:3},(_,j)=>Array.from({length:3},(_,k)=>R(238+k*246,280+j*64,176-(j%2)*37,17,8,k===1&&j===1?accent:'#61899a','none',0)).join('')).join('');break;
 case 'test-product-before-bulk-inventory':
  scene=tile(185,194,305,288,'package',1.45,bright)+icon('check',407,214,.67)+arrow(513,329,640,329)+R(681,190,338,291,27,'url(#glass)','#477687')+Array.from({length:9},(_,j)=>icon('package',720+(j%3)*89,218+Math.floor(j/3)*83,.51,j%4?accent:'#8cc7d7')).join('');break;
 case 'viral-vs-evergreen-product-demand':
  scene=R(166,172,875,349,30,'url(#glass)','#4c7888')+Array.from({length:4},(_,j)=>L(214,233+j*70,984,233+j*70,'#345c72',2)).join('')+P('M220 465Q340 461 415 295T591 206T745 470T993 462',bright,11)+P('M220 392Q490 362 672 383T993 350',accent,11);break;
 case 'product-demand-validation-guide':
  scene=tile(180,172,390,340,'magnify',2.12,bright)+R(642,197,343,302,26,'url(#glass)','#5b8992')+row(700,262,5)+icon('check',900,366,.79,accent);break;
 case 'ecommerce-product-ideas-research':
  scene=tile(152,176,305,327,'light',1.65,bright)+Array.from({length:3},(_,j)=>tile(534+j*173,225+j%2*46,152,201,'package',.75,j%2?accent:'#83c6f0')).join('');break;
 case 'ecommerce-first-30-days-plan':
  scene=tile(187,164,485,348,'calendar',2.1,bright)+P('M724 426L776 369L821 396L883 285L978 274',accent,10)+icon('check',893,190,.78);break;
 case 'is-ecommerce-right-for-you':
  scene=tile(190,181,293,310,'target',1.6,bright)+P('M507 340H642M642 340V247H779M642 340V432H779',accent,8)+tile(795,172,219,177,'check',.88,accent)+tile(795,387,219,141,'warning',.73,'#d6ad78');break;
 case 'cod-shipping-returns-reconciliation':
  scene=tile(145,209,242,267,'package',1.35)+arrow(405,329,469,329)+tile(484,209,237,267,'wallet',1.4,bright)+arrow(739,329,807,329)+tile(821,209,237,267,'receipt',1.29)+L(932,494,270,494,'#4c998e',5);break;
 case 'inventory-barcode-bundle-tracking':
  scene=tile(162,177,263,317,'warehouse',1.63,bright)+R(495,192,560,287,27,'url(#glass)','#4a788c')+Array.from({length:6},(_,j)=>icon('package',550+(j%3)*148,223+Math.floor(j/3)*126,.92,j%2?accent:'#accf7a')).join('')+icon('bar',817,384,.74);break;
 case 'order-confirmation-delivery-rate':
  scene=tile(144,196,230,279,'cart',1.36)+arrow(390,333,457,333)+tile(477,196,232,279,'phone',1.37,bright)+arrow(730,333,790,333)+tile(805,196,232,279,'check',1.33);break;
 case 'real-cost-per-delivered-order':
  scene=tile(140,204,237,277,'bullhorn',1.4)+arrow(395,341,466,341)+tile(492,204,234,277,'package',1.39,bright)+arrow(741,341,803,341)+tile(824,204,225,277,'wallet',1.26);break;
 case 'brand-vs-product-business':
  scene=tile(180,180,342,324,'tag',1.66,bright)+tile(665,180,342,324,'package',1.68)+R(557,283,71,71,18,'#2a5769',accent,4)+icon('target',567,293,.51,bright);break;
 case 'owned-vs-rented-channels':
  scene=tile(163,171,349,329,'screen',1.72,bright)+tile(683,171,349,329,'store',1.72)+P('M534 290H653M629 270L653 290L629 310M653 390H534M558 370L534 390L558 410',accent,7);break;
 case 'essential-ecommerce-glossary':
  scene=R(151,148,898,373,28,'url(#glass)','#517b8a')+Array.from({length:4},(_,j)=>R(198+j*209,192,178,123,17,'#214d5e','#5a8190')+icon(['wallet','cart','chart','package'][j],235+j*209,205,.65,j===2?bright:accent)).join('')+Array.from({length:4},(_,j)=>R(198+j*209,350,178,22,10,j%2?accent:'#6598a7','none',0)+R(198+j*209,399,124+j%2*38,13,7,'#547e90','none',0)).join('');break;
 case 'ecommerce-funnel-explained':
  scene=Array.from({length:4},(_,j)=>P('M'+(217+j*70)+' '+(180+j*77)+'H'+(980-j*73)+'L'+(934-j*74)+' '+(238+j*77)+'H'+(258+j*70)+'Z',j===0?bright:j===3?'#3dbbaa':accent,3,j%2?'#1b5263':'#2e6578')).join('')+icon('cart',914,410,.75,bright);break;
 case 'customer-funnel-guide':
  scene=tile(128,194,239,282,'magnify',1.22)+tile(480,194,239,282,'cart',1.22,bright)+tile(831,194,239,282,'check',1.22)+P('M372 319H467M718 319H822',accent,8)+C(600,506,9,'#f4bc78');break;
 case 'product-marketing-operations-ecommerce':
  scene=tile(146,191,254,300,'package',1.49,bright)+tile(473,163,254,342,'bullhorn',1.52)+tile(798,191,254,300,'gear',1.48,bright)+P('M405 340H470M730 340H794',accent,7);break;
 case 'common-ecommerce-beginner-mistakes':
  scene=R(192,167,808,355,28,'url(#glass)','#487383')+Array.from({length:3},(_,j)=>R(240,213+j*90,688,63,14,'#204d5f','#487889')+icon('warning',258,213+j*90,.56,j===1?bright:'#efb184')+L(369,243+j*90,796-j*29,243+j*90,'#7196a2',7)).join('')+icon('check',827,397,.6);break;
 case 'startup-budget-egypt':
  scene=tile(141,165,332,339,'wallet',1.75,bright)+Array.from({length:3},(_,j)=>R(570,185+j*105,416,74,17,'#1c4a5c','#4d7a8c')+icon(['package','bullhorn','truck'][j]==='truck'?'box':['package','bullhorn','box'][j],602,196+j*105,.53,accent)+R(717,215+j*105,195-j*33,17,8,j===1?bright:accent,'none',0)).join('');break;
 case 'ecommerce-complete-journey-guide':
  scene=Array.from({length:4},(_,j)=>tile(104+j*276,207+(j%2)*35,222,248,['light','store','cart','package'][j],1.1,j%2?accent:bright)+ (j<3?arrow(333+j*276,336,365+j*276,336):'')).join('');break;
 case 'ecommerce-evolution-history':
  scene=tile(133,192,271,298,'screen',1.54)+arrow(422,338,497,338)+tile(522,179,269,324,'phone',1.58,bright)+arrow(801,338,869,338)+tile(889,209,202,261,'store',1.18);break;
 case 'what-is-ecommerce':
  scene=tile(148,183,363,328,'store',1.7,bright)+arrow(524,341,619,341)+tile(644,183,206,328,'cart',1.4)+arrow(861,341,922,341)+tile(940,204,158,282,'wallet',.92,bright);break;
 default: throw Error('No bespoke illustration storyboard for '+slug);
 }
 const xml=(value)=>String(value).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
 const headline=String(spec.title||'').trim();
 if(!headline||headline.length>125)throw Error('Invalid canonical article headline: '+slug);
 const visualWidth=(line,font)=>[...line].reduce((px,ch)=>{
   if(/[\u0600-\u06FF]/u.test(ch))return px+font*.60;
   if(/[A-Z]/u.test(ch))return px+font*.65;
   if(/[0-9]/u.test(ch))return px+font*.53;
   if(ch===' ')return px+font*.32;
   return px+font*.33;
 },0);
 const wrap=(size)=>{
   const chunks=[],words=headline.split(/\s+/);let current='';
   for(const word of words){
      const candidate=current?current+' '+word:word;
      if(current&&visualWidth(candidate,size)>462){chunks.push(current);current=word}
      else current=candidate;
      if(visualWidth(current,size)>465)throw Error('Headline word too wide: '+slug);
   }
   if(current)chunks.push(current);
   return chunks;
 };
 let size=headline.length>76?35:headline.length>62?38:headline.length>47?42:46;
 let lines=wrap(size);
 while(lines.length>4&&size>30){size-=2;lines=wrap(size)}
 if(lines.length===4&&size>40){size=40;lines=wrap(size)}
 if(lines.length>4)throw Error('Headline needs more than four rows: '+slug);
 const dy=Math.round(size*1.55),begin=355-Math.round((lines.length-1)*dy/2);
 const titleLines=lines.map((line,i)=>'<text x="885" y="'+(begin+i*dy)+'" text-anchor="middle" direction="rtl" unicode-bidi="plaintext" font-family="Cairo,Tajawal,Noto Sans Arabic,Segoe UI,Arial,sans-serif" font-size="'+size+'" font-weight="700" letter-spacing="0" fill="'+(i===lines.length-1?bright:'#f8fbff')+'">'+xml(line)+'</text>').join('\n');
 const safe=xml(spec.alt);
 const cleanTitle=xml(headline);
 // Enlarge/recenter the bespoke subject illustration in the left-hand visual stage.
 // No static label such as "no faces" is ever shown to the customer.
 return '<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630" role="img" aria-labelledby="title desc">\n'+
  '<title id="title">'+cleanTitle+'</title><desc id="desc">'+safe+'</desc>\n'+
  '<defs><linearGradient id="back" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#061d30"/><stop offset=".62" stop-color="#103b4e"/><stop offset="1" stop-color="#123b50"/></linearGradient>'+
  '<linearGradient id="glass" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#214f61"/><stop offset="1" stop-color="#143a4d"/></linearGradient>'+
  '<radialGradient id="bloom"><stop stop-color="'+accent+'" stop-opacity=".24"/><stop offset="1" stop-color="'+accent+'" stop-opacity="0"/></radialGradient></defs>\n'+
  '<rect width="1200" height="630" fill="url(#back)"/>'+
  '<circle cx="180" cy="320" r="390" fill="url(#bloom)"/>'+
  '<rect x="34" y="34" width="1132" height="562" rx="34" fill="none" stroke="#51798a" stroke-width="2"/>'+
  '<rect x="62" y="131" width="544" height="410" rx="28" fill="#0c2b3d" stroke="#365c71" stroke-width="2"/>'+
  '<g stroke="#508396" stroke-opacity=".10" stroke-width="1">'+Array.from({length:7},(_,i)=>'<path d="M'+(92+i*84)+' 155V519"/>').join('')+
  Array.from({length:4},(_,i)=>'<path d="M80 '+(193+i*83)+'H594"/>').join('')+'</g>\n'+
  '<g id="topic-illustration" transform="translate(44 122) scale(.52)">'+scene+'</g>\n'+
  '<rect x="634" y="131" width="512" height="410" rx="28" fill="#092639" stroke="#436879" stroke-width="2"/>'+
  '<rect x="685" y="170" width="115" height="8" rx="4" fill="'+accent+'"/>'+
  '<text x="1113" y="209" direction="rtl" text-anchor="start" font-family="Cairo,Tajawal,Noto Sans Arabic,Segoe UI,Arial,sans-serif" font-size="25" font-weight="700" fill="'+accent+'">كن أونلاين</text>\n'+
  '<g id="article-title">'+titleLines+'</g>\n'+
  '<path d="M691 488H1107" stroke="#426979" stroke-width="2"/>'+
  '<text x="1095" y="521" direction="rtl" text-anchor="start" font-family="Cairo,Tajawal,Noto Sans Arabic,Segoe UI,Arial,sans-serif" font-size="19" fill="#a9c8d2">مقالات التجارة الإلكترونية</text>\n'+
  '<rect x="78" y="569" width="172" height="7" rx="3.5" fill="'+accent+'"/>'+
  '<text x="1117" y="580" direction="rtl" text-anchor="start" font-family="Arial,sans-serif" font-size="15" fill="#87aebc">KUN ONLINE</text>\n</svg>\n';
}
