#!/usr/bin/env node
// SEO-32: Publish genuine product captures only after explicit human privacy review.
// Usage: node scripts/system-screenshots.mjs --check | --write
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
const root=path.resolve(import.meta.dirname,'..');
const manifest=JSON.parse(fs.readFileSync(path.join(root,'seo/system-screenshots.json'),'utf8'));
const destinations={
  '/system/':'system/index.html',
  '/system/order-management/':'system/order-management/index.html',
  '/system/inventory/':'system/inventory/index.html',
  '/system/shipping/':'system/shipping/index.html',
  '/system/easy-orders/':'system/easy-orders/index.html'
};
const start='<!-- genuine-app-screenshots:start -->',end='<!-- genuine-app-screenshots:end -->';
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
assert.equal(manifest.version,1);
assert.ok(Array.isArray(manifest.screenshots));
const allowed=new Set(Object.keys(destinations));
const listed=new Set(),ids=new Set(),forPage=new Map();
const screenshotDir=path.join(root,'assets/system-screenshots');
const files=fs.existsSync(screenshotDir)?fs.readdirSync(screenshotDir,{withFileTypes:true}).filter(x=>x.isFile()&&/\.(png|jpe?g|webp)$/i.test(x.name)).map(x=>x.name):[];
for(const s of manifest.screenshots){
  assert.equal(s.status,'approved','Only explicitly approved captures can be published');
  assert.ok(allowed.has(s.page),'Unknown landing-page destination');
  assert.match(s.id,/^[a-z0-9-]{3,50}$/);
  assert.ok(!ids.has(s.id),'Duplicate screenshot ID');
  ids.add(s.id);
  assert.match(s.src,/^\/assets\/system-screenshots\/[a-z0-9-]+\.webp$/);
  const filename=path.basename(s.src);
  assert.ok(!listed.has(filename),'Screenshot asset is duplicated');
  listed.add(filename);
  assert.equal(s.sourceUrl,'https://app.kun-online.com/v2/','Must originate from real application');
  assert.ok(['demo-tenant','production-authorized'].includes(s.captureEnvironment));
  assert.equal(s.realUiVerified,true,'Human must confirm screenshot is actual UI, not mockup');
  assert.equal(s.privacyReviewed,true,'Human redaction and privacy approval required');
  assert.equal(s.captureAuthorized,true,'Capture consent required');
  assert.ok(typeof s.reviewer==='string'&&s.reviewer.trim().length>=3);
  assert.match(s.capturedAt,/^\d{4}-\d{2}-\d{2}T/);
  assert.ok(!Number.isNaN(Date.parse(s.capturedAt)));
  assert.match(s.sourceRevision,/^[a-f0-9]{7,40}$/);
  assert.match(s.sha256,/^[a-f0-9]{64}$/);
  assert.ok(typeof s.alt==='string'&&s.alt.length>=15&&s.alt.length<=180);
  assert.ok(typeof s.caption==='string'&&s.caption.length>=20&&s.caption.length<=250);
  assert.ok(Number.isInteger(s.width)&&s.width>=700&&s.width<=6000);
  assert.ok(Number.isInteger(s.height)&&s.height>=380&&s.height<=6000);
  const file=path.join(screenshotDir,filename);
  assert.ok(fs.existsSync(file),'Missing approved screenshot '+filename);
  const bytes=fs.readFileSync(file);
  assert.equal(bytes.toString('ascii',0,4),'RIFF','Screenshot must be a real WebP file');
  assert.equal(bytes.toString('ascii',8,12),'WEBP','Screenshot must be a real WebP file');
  assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'),s.sha256,'Screenshot asset was modified after approval');
  let offset=12;
  while(offset+8<=bytes.length){
    const fourCC=bytes.toString('ascii',offset,offset+4);
    const size=bytes.readUInt32LE(offset+4);
    assert.ok(!['EXIF','XMP '].includes(fourCC),'Strip image metadata before publication');
    offset+=8+size+(size%2);
  }
  const group=forPage.get(s.page)||[];
  group.push(s);forPage.set(s.page,group);
}
for(const name of files)assert.ok(listed.has(name),'Unreviewed screenshot asset: '+name);
const write=process.argv.includes('--write');
for(const [dest,rel] of Object.entries(destinations)){
  const file=path.join(root,rel);const before=fs.readFileSync(file,'utf8');
  assert.equal(before.split(start).length-1,1,'Missing screenshot start anchor '+rel);
  assert.equal(before.split(end).length-1,1,'Missing screenshot end anchor '+rel);
  const shots=forPage.get(dest)||[];
  const gallery=shots.length?'\n<section class="kos-section kos-real-captures" aria-labelledby="captures-'+dest.split('/').filter(Boolean).join('-')+'"><div class="kos-container"><span class="kos-tag">لقطات معتمدة من التطبيق</span><h2 id="captures-'+dest.split('/').filter(Boolean).join('-')+'">صور حقيقية من واجهة كن أونلاين</h2><p class="kos-section-sub">لقطات من نسخة موثقة بعد إخفاء بيانات العملاء؛ قد تختلف التفاصيل حسب الحساب والإصدار.</p><div class="kos-real-captures-grid">'+shots.map(s=>'<figure class="kos-real-capture"><img src="'+esc(s.src)+'" alt="'+esc(s.alt)+'" width="'+s.width+'" height="'+s.height+'" loading="lazy" decoding="async"><figcaption>'+esc(s.caption)+'</figcaption></figure>').join('')+'</div></div></section>\n':'';
  const expected=before.replace(new RegExp(''+start+'[\\s\\S]*?'+end),()=>start+gallery+end);
  if(write){if(expected!==before)fs.writeFileSync(file,expected);continue;}
  // --check rejects manually inserted image figures and enforces a clean, empty gallery until approval.
  const content=before.slice(before.indexOf(start)+start.length,before.indexOf(end));
  assert.equal(content,gallery,'Screenshot gallery must match signed-off manifest in '+rel+'; run --write to rebuild');
}
console.log('SEO-32 screenshot gate OK; approved captures:',manifest.screenshots.length);
