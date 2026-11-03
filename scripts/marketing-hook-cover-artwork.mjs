import {buildSVG as original} from './editorial-cover-artwork.mjs';
// Unique short editorial hook; no fictional numbers and no internal production notes.
const esc=x=>String(x).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
const hues={finance:'#ffcc72',checklist:'#a9e0a0',compare:'#83cefa',research:'#66e4d1',trend:'#cbb1ff',calendar:'#ffc778',shipping:'#80e7be',inventory:'#b4e6a9',brand:'#d1b7ff',dashboard:'#80cbf5',funnel:'#ffcf87',workflow:'#91e4b4',timeline:'#c4c7ff',store:'#8de1ed',repeat:'#ffd17d',cart:'#7adbf6',acquisition:'#f8c986'};
function wrap(text){
 let size=text.length>30?54:text.length>24?57:text.length>18?62:67;
 const measure=s=>[...s].reduce((v,c)=>v+size*(c===' '?0.3:/[0-9٠-٩]/.test(c)?0.50:0.55),0);
 let lines=[];
 const breakText=()=>{let current='';lines=[];for(const w of text.trim().split(/\s+/)){const candidate=current?current+' '+w:w;if(current&&measure(candidate)>493){lines.push(current);current=w;}else current=candidate;}if(current)lines.push(current);};
 breakText();while(lines.length>3&&size>45){size-=3;breakText()}
 if(lines.length>3||lines.some(l=>measure(l)>515))throw Error('Hook cannot fit '+text);
 return {size,lines};
}
function sceneOld(spec){
 const originalSVG=original({...spec,title:spec.seoTitle||spec.title});
 const begin='<g id="topic-illustration" transform="translate(44 122) scale(.52)">';
 const st=originalSVG.indexOf(begin),end=originalSVG.indexOf('<rect x="634" y="131"',st);
 if(st<0||end<0)throw Error('Missing topical motif '+spec.slug);
 return originalSVG.slice(st+begin.length,end).trim().replace(/<\/g>\s*$/,'');
}
function special(slug){
 if(slug==='viral-vs-evergreen-product-demand')return '<g>'+
 '<rect x="115" y="180" width="278" height="335" rx="36" fill="#09293d" stroke="#89dce8" stroke-width="10"/>'+
 '<rect x="138" y="219" width="232" height="251" rx="20" fill="#1b4d67"/>'+
 '<circle cx="253" cy="330" r="71" fill="#f4c36e"/><path d="M233 291L294 330L233 369Z" fill="#0c3347"/>'+
 '<path d="M405 338H488M465 320L490 338L466 359" stroke="#ffe18e" stroke-width="12" fill="none" stroke-linecap="round"/>'+
 '<path d="M510 320L591 273L673 320L591 365Z" fill="#ffe2aa"/>'+
 '<path d="M510 320L591 365V475L510 427Z" fill="#b98651"/>'+
 '<path d="M591 365L673 320V427L591 475Z" fill="#e2ab67"/>'+
 '<path d="M486 472H692L706 437H510" stroke="#67e2d0" stroke-width="11" fill="none"/>'+
 '<circle cx="535" cy="493" r="16" fill="#ffce69"/><circle cx="669" cy="493" r="16" fill="#ffce69"/></g>';
 if(slug==='customer-lifetime-value-ltv-ecommerce')return '<g>'+
 '<path d="M153 275Q316 122 495 278M480 249L496 278L469 293" stroke="#62e4c7" stroke-width="15" fill="none" stroke-linecap="round"/>'+
 '<path d="M151 424Q323 559 493 423M477 451L493 423L466 412" stroke="#ffc676" stroke-width="15" fill="none" stroke-linecap="round"/>'+
 '<g fill="#edc88e"><rect x="105" y="283" width="139" height="112" rx="14"/><rect x="298" y="169" width="147" height="126" rx="14"/><rect x="327" y="421" width="143" height="105" rx="14"/></g>'+
 '<g stroke="#97682f" stroke-width="7" fill="none"><path d="M105 302L177 338L244 302M177 338V395M298 191L371 226L445 191M371 226V295M327 443L398 475L470 443M398 475V526"/></g>'+
 '<ellipse cx="607" cy="466" rx="73" ry="20" fill="#f6b34a"/><path d="M535 401V466Q607 502 679 465V400Z" fill="#b97b2e"/><ellipse cx="607" cy="400" rx="72" ry="21" fill="#ffe08d"/>'+
 '<path d="M535 355V401Q607 440 679 401V354Z" fill="#ce9140"/><ellipse cx="607" cy="354" rx="72" ry="23" fill="#ffd375"/></g>';
 if(slug==='average-order-value-aov-ecommerce')return '<g>'+
 '<path d="M95 270H618L565 481H183Z" fill="#286f83" stroke="#b4eff3" stroke-width="12"/>'+
 '<path d="M165 268L133 186H88" stroke="#e5fcff" stroke-width="15" fill="none"/>'+
 '<path d="M230 312V464M350 309V477M477 306V470" stroke="#7dbcc8" stroke-width="10"/>'+
 '<circle cx="232" cy="511" r="23" fill="#ffd075"/><circle cx="541" cy="511" r="23" fill="#ffd075"/>'+
 '<rect x="214" y="176" width="131" height="96" rx="15" fill="#f4ce83"/>'+
 '<rect x="372" y="138" width="133" height="135" rx="20" fill="#eaac60"/>'+
 '<rect x="526" y="213" width="91" height="61" rx="13" fill="#75d7d1"/></g>';
 if(slug==='customer-acquisition-cost-cac-ecommerce')return '<g>'+
 '<rect x="90" y="167" width="242" height="312" rx="28" fill="#204f6c" stroke="#87d5ee" stroke-width="9"/>'+
 '<path d="M132 259L189 212L246 273L300 222" stroke="#ffd276" stroke-width="13" fill="none"/>'+
 '<path d="M126 340H293M126 387H234" stroke="#7cb7c9" stroke-width="10"/>'+
 '<path d="M358 308H435M415 289L438 308L415 329" fill="none" stroke="#f7cb72" stroke-width="12"/>'+
 '<path d="M472 280L568 232L666 280L568 330Z" fill="#f3d495"/>'+
 '<path d="M472 280L568 330V485L472 428Z" fill="#b58a5d"/>'+
 '<path d="M568 330L666 280V428L568 485Z" fill="#e5b06c"/>'+
 '<circle cx="670" cy="453" r="35" fill="#ffcf75"/><path d="M651 452L662 465L689 433" stroke="#13546e" stroke-width="10" fill="none"/></g>';
 return null;
}
export function buildMarketingCover(spec,creative){
 if(!spec?.slug||!spec?.alt||!creative?.hook)throw Error('Missing marketing-cover facts');
 const accent=['finance','trend','calendar','funnel','repeat','brand'].includes(spec.motif)?'#ffca64':'#51d6d3';
 const {size,lines}=wrap(creative.hook);
 let artwork=special(spec.slug)||sceneOld({...spec,seoTitle:creative.seoTitle});
 const specialUsed=!!special(spec.slug);
 let draw= specialUsed?
 '<g id="topic-art" filter="url(#drop)" transform="translate(-15 0) scale(.90)">'+artwork+'</g>':
 '<g id="topic-art" filter="url(#drop)" transform="translate(40 108) scale(.75)">'+artwork+'</g>';
 const yy=lines.length===1?334:lines.length===2?278:230,step=size*1.33;
 const hook=lines.map((line,i)=>'<text x="893" y="'+Math.round(yy+i*step)+'" direction="rtl" unicode-bidi="plaintext" text-anchor="middle" font-family="Cairo,Tajawal,Segoe UI,Arial,sans-serif" font-size="'+size+'" font-weight="900" fill="'+(i===lines.length-1?accent:'#ffffff')+'">'+esc(line)+'</text>').join('');
 let sub=String(creative.subline||'').trim();
 if(sub.length>49)throw Error('Subline too long '+spec.slug);
 return '<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630" role="img" aria-labelledby="title desc">'+
 '<title id="title">'+esc(creative.seoTitle||creative.hook)+'</title><desc id="desc">'+esc(spec.alt)+'</desc>'+
 '<defs><linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#061b2d"/><stop offset=".62" stop-color="#0a364b"/><stop offset="1" stop-color="#041728"/></linearGradient>'+
 '<radialGradient id="glow"><stop stop-color="'+accent+'" stop-opacity=".23"/><stop offset="1" stop-color="'+accent+'" stop-opacity="0"/></radialGradient>'+
 '<linearGradient id="glass" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#2b6675"/><stop offset="1" stop-color="#15384b"/></linearGradient>'+
 '<filter id="drop" x="-30%" y="-30%" width="170%" height="170%"><feDropShadow dx="0" dy="17" stdDeviation="16" flood-color="#010e19" flood-opacity=".45"/></filter></defs>'+
 '<rect width="1200" height="630" fill="url(#bg)"/><circle cx="290" cy="310" r="381" fill="url(#glow)"/>'+
 '<path d="M36 79H600" stroke="'+accent+'" stroke-width="3" opacity=".6"/>'+
 draw+
 '<text x="1005" y="101" direction="rtl" text-anchor="middle" font-family="Cairo,Tajawal,Segoe UI,Arial,sans-serif" font-size="29" font-weight="700" fill="#def2f5">كن أونلاين</text>'+
 '<rect x="1036" y="122" width="85" height="7" rx="3" fill="'+accent+'"/>'+
 '<g id="hook">'+hook+'</g>'+
 '<text x="895" y="505" direction="rtl" text-anchor="middle" font-family="Cairo,Tajawal,Segoe UI,Arial,sans-serif" font-size="27" fill="#c8dce5">'+esc(sub)+'</text>'+
 
 '</svg>\n';
}