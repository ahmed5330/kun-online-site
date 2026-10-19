/* Reviews widget shared by homepage and admin-invited reviews landing */
(function(){
  'use strict';
  const API='https://app.kun-online.com/api/public-reviews';
  const root=document.querySelector('[data-kun-reviews]');
  if(!root)return;
  const $=s=>root.querySelector(s), esc=String;
  const starButtons=Array.from(root.querySelectorAll('[data-review-star]'));
  const form=$('[data-review-form]'),status=$('[data-review-status]'),rateStatus=$('[data-rating-status]');
  let selected=0,approved=[],filter='all';
  const type=new URLSearchParams(location.search).get('type');
  const category=$('[name="category"]');
  if(['services','consultations'].includes(type))category.value=type;
  const updateStars=()=>{
    for(const button of starButtons){
      const value=Number(button.dataset.reviewStar);
      button.dataset.filled=String(value<=selected);
      button.setAttribute('aria-pressed',String(value===selected));
    }
    rateStatus.textContent=selected?selected+' من 5 نجوم':'اختر عدد النجوم';
  };
  starButtons.forEach(b=>b.addEventListener('click',()=>{selected=Number(b.dataset.reviewStar);updateStars();}));
  updateStars();
  root.querySelectorAll('[data-review-filter]').forEach(btn=>{
    btn.addEventListener('click',()=>{
      filter=btn.dataset.reviewFilter;
      root.querySelectorAll('[data-review-filter]').forEach(b=>b.setAttribute('aria-pressed',String(b===btn)));
      render();
    });
  });
  function node(tag,className,text){
    const x=document.createElement(tag);if(className)x.className=className;if(text!==undefined)x.textContent=text;return x;
  }
  function render(){
    const list=$('[data-review-list]');list.replaceChildren();
    const visible=approved.filter(r=>filter==='all'||r.category===filter).slice(0,8);
    if(!visible.length){list.append(node('p','rv-muted',approved.length?'لا توجد تقييمات منشورة لهذا النوع حتى الآن.':'لا توجد تقييمات منشورة حتى الآن. يمكنك إضافة أول تقييم.'));return;}
    for(const r of visible){
      const card=node('article','rv-quote'),head=node('div','rv-person');
      if(r.photo&&/^data:image\/jpeg;base64,[A-Za-z0-9+/]+={0,2}$/.test(r.photo)&&r.photo.length<=120000){
        const img=node('img');img.src=r.photo;img.alt='صورة أرفقها صاحب التقييم';img.loading='lazy';head.append(img);
      }else{head.append(node('span','rv-avatar',(r.name||'؟').trim().slice(0,1)));}
      const info=node('div'),name=node('strong',null,r.name);
      info.append(name);
      if(r.storeName||r.storePhoto){
        const store=node('div','rv-store-brand');
        if(typeof r.storePhoto==='string'&&r.storePhoto.length<=120000&&r.storePhoto.startsWith('data:image/jpeg;base64,')){
          const logo=node('img','rv-store-logo');
          logo.src=r.storePhoto;
          logo.alt='صورة متجر '+(r.storeName||'العميل');
          logo.loading='lazy';
          store.append(logo);
        }
        if(r.storeName)store.append(node('small','rv-store-name','المتجر: '+r.storeName));
        info.append(store);
      }
      info.append(node('small',null,r.category==='services'?'تقييم خدمات كن أونلاين':'تقييم استشارات كن أونلاين'));
      head.append(info);card.append(head);
      card.append(node('div','rv-rate','★'.repeat(r.rating)+'☆'.repeat(5-r.rating)));
      card.append(node('p',null,r.text));
      list.append(card);
    }
  }
  async function load(){
    const feedback=$('[data-review-load]');
    try{
      const response=await fetch(API,{mode:'cors',credentials:'omit',cache:'no-store'});
      const body=await response.json();
      if(!response.ok||!body.ok)throw Error(body.error||'تعذر قراءة التقييمات');
      approved=Array.isArray(body.reviews)?body.reviews.filter(r=>r.status==='approved'):[];
      feedback.textContent=approved.length?approved.length+' تقييم منشور بعد مراجعة الإدارة':'التقييمات المنشورة فقط — بعد مراجعة الإدارة.';
      render();
    }catch(e){
      approved=[];render();feedback.textContent='تعذر عرض التقييمات حاليًا. حاول تحديث الصفحة لاحقًا.';
    }
  }
  async function jpg(file){
    if(!file)return null;
    if(!['image/jpeg','image/png','image/webp'].includes(file.type))throw Error('الصورة لازم تكون JPG أو PNG أو WebP.');
    if(file.size>5*1024*1024)throw Error('حجم الصورة الأصلي لازم يكون أقل من 5 ميجابايت.');
    const image=await createImageBitmap(file);
    try{
      let edge=260,q=.76,data='';
      for(let i=0;i<4;i++){
        const factor=Math.min(1,edge/Math.max(image.width,image.height));
        const c=document.createElement('canvas');c.width=Math.max(1,Math.round(image.width*factor));c.height=Math.max(1,Math.round(image.height*factor));
        const ctx=c.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,c.width,c.height);ctx.drawImage(image,0,0,c.width,c.height);
        data=c.toDataURL('image/jpeg',q);
        if(data.length<=115000)return data;
        edge=Math.round(edge*.75);q-=.1;
      }
      throw Error('لم نتمكن من ضغط الصورة. اختار صورة أصغر.');
    }finally{image.close?.();}
  }
  form?.addEventListener('submit',async event=>{
    event.preventDefault();
    if(!form.reportValidity())return;
    if(!selected){status.textContent='اختار تقييم النجوم من 1 إلى 5.';starButtons[0]?.focus();return;}
    const button=form.querySelector('button[type=submit]');
    button.disabled=true;status.textContent='جاري إرسال التقييم…';
    try{
      const photo=await jpg(form.querySelector('input[type=file]').files[0]);
      const payload={name:form.elements.name.value.trim(),storeName:form.elements.storeName.value.trim(),text:form.elements.reviewText.value.trim(),
        category:category.value,rating:selected,photo,consent:form.elements.reviewConsent.checked,
        website:form.elements.website?.value||''};
      const response=await fetch(API,{method:'POST',mode:'cors',credentials:'omit',
        headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
      const data=await response.json().catch(()=>({}));
      if(!response.ok||!data.ok)throw Error(data.error||'تعذر إرسال التقييم');
      status.textContent='تم استلام تقييمك. شكرًا لك! سيظهر بعد مراجعته من إدارة كن أونلاين.';
      form.reset();selected=0;updateStars();
      if(['services','consultations'].includes(type))category.value=type;
    }catch(e){status.textContent=e.message||'حصلت مشكلة، حاول تاني.';}
    finally{button.disabled=false;}
  });
  load();
})();
