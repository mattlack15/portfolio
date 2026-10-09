import {chromium,launchOptions,base} from './browser.mjs';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import snapshot from '../src/portfolio/projects.json' with {type:'json'};
const browser=await chromium.launch(launchOptions);
const context=await browser.newContext({viewport:{width:1440,height:1000},colorScheme:'dark'});
let records=structuredClone(snapshot);let failSave=false;let expired=false;const writes=[];const errors=[];
context.on('page',page=>page.on('pageerror',error=>errors.push(error.message)));
await context.addInitScript(()=>{
  if (!navigator.credentials) return;
  navigator.credentials.get=async()=>{
    const credential=Object.create(PublicKeyCredential.prototype);
    const bytes=new Uint8Array([1,2,3]).buffer;
    Object.defineProperties(credential,{id:{value:'test-credential'},rawId:{value:bytes},type:{value:'public-key'},authenticatorAttachment:{value:'platform'},response:{value:{clientDataJSON:bytes,authenticatorData:bytes,signature:bytes,userHandle:null}}});
    credential.getClientExtensionResults=()=>({});return credential;
  };
});
await context.route('**/api/**',async route=>{
 const request=route.request();const path=new URL(request.url()).pathname;
 if(path==='/api/auth/passkey/status')return route.fulfill({json:{configured:true}});
 if(path==='/api/auth/passkey/authenticate/options')return route.fulfill({json:{ceremonyId:'test',options:{publicKey:{challenge:'AQID',rpId:'localhost',allowCredentials:[]}}}});
 if(path==='/api/auth/passkey/authenticate/finish')return route.fulfill({json:{token:'test-only-editor-token'}});
 if(path==='/api/auth/session')return route.fulfill({json:{}});
 if(path==='/api/auth/logout')return route.fulfill({status:204});
 if(path==='/api/projects/list')return route.fulfill({json:records});
 if(path==='/api/projects/save') {
  assert.equal(request.headers().authorization,'Bearer test-only-editor-token');
  if(failSave)return route.fulfill({status:500});
  if(expired)return route.fulfill({status:401});
  const data=request.postDataJSON();writes.push(data);
  assert.deepEqual(Object.keys(data).sort(),['brief','description','id','imageId','orderIndex','technologies','title']);
  records=[...records.filter(p=>p.id!==data.id),data];return route.fulfill({status:200});
 }
 if(path==='/api/projects/reorder') {
  assert.equal(request.headers().authorization,'Bearer test-only-editor-token');
  const ids=request.postDataJSON();records=records.map(p=>({...p,orderIndex:ids.indexOf(p.id)}));return route.fulfill({status:200});
 }
 if(path==='/api/projects/delete') {
  assert.equal(request.headers().authorization,'Bearer test-only-editor-token');
  const id=new URL(request.url()).searchParams.get('id');records=records.filter(p=>p.id!==id);return route.fulfill({status:200});
 }
 if(path==='/api/images/upload') {assert.equal(request.headers().authorization,'Bearer test-only-editor-token');return route.fulfill({contentType:'text/plain',body:'9999999'});}
 if(path==='/api/images/9999999')return route.fulfill({contentType:'image/svg+xml',body:'<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20"><rect width="20" height="20" fill="green"/></svg>'});
 if(path.startsWith('/api/images/')) {
  const id=path.split('/').pop();let file=`public/design-assets/images/${id}.webp`;
  try {await fs.access(file);}catch {file=`public/design-assets/images/${id}.svg`;}
  return route.fulfill({path:file,contentType:file.endsWith('.svg')?'image/svg+xml':'image/webp'});
 }
 return route.fulfill({status:204});
});
const page=await context.newPage();
await page.goto(base+'/',{waitUntil:'networkidle'});
assert.equal(await page.getByRole('button',{name:'Edit project',exact:true}).count(),0);
await page.getByRole('button',{name:'Unlock editing',exact:true}).click();
await page.getByRole('button',{name:'Lock editing',exact:true}).waitFor();
assert.equal(new URL(page.url()).pathname,'/');
assert.equal(await page.getByRole('button',{name:'Edit project',exact:true}).count(),17);
assert.equal(await page.getByRole('link',{name:'Analytics',exact:true}).count(),1);
const target=page.locator('.e-project').filter({has:page.getByRole('link',{name:'Belfort Events',exact:true})});
await target.getByRole('button',{name:'Edit project',exact:true}).click();
const dialog=page.getByRole('dialog',{name:'Edit project',exact:true});
await dialog.waitFor();await page.evaluate(()=>document.fonts.ready);
assert.equal(new URL(page.url()).pathname,'/');
assert.equal(await dialog.locator('.editor-toolbar button svg').count(),11);
await dialog.getByLabel('Title',{exact:true}).fill('Belfort updated');
await dialog.getByLabel('Summary',{exact:true}).fill('A summary saved from this same page.');
await dialog.getByLabel('Technologies',{exact:true}).fill('Kotlin, React, PostgreSQL');
await dialog.getByLabel('Project description',{exact:true}).fill('# Saved from the new editor\n\nThe writeup now uses the same design.');
await dialog.getByLabel('Cover image',{exact:true}).setInputFiles({name:'cover.svg',mimeType:'image/svg+xml',buffer:Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20"/>')});
await dialog.getByRole('status').filter({hasText:'Unsaved changes'}).waitFor();
await page.screenshot({path:'/tmp/portfolio-editor-desktop.png'});
failSave=true;await dialog.getByRole('button',{name:'Save',exact:true}).click();
await dialog.getByRole('alert').waitFor();assert.equal(writes.length,0);
assert.equal(await dialog.getByLabel('Title',{exact:true}).inputValue(),'Belfort updated');
failSave=false;await dialog.getByRole('button',{name:'Save',exact:true}).click();
await dialog.waitFor({state:'hidden'});
assert.equal(writes.at(-1).title,'Belfort updated');assert.equal(writes.at(-1).imageId,'9999999');
await page.getByRole('link',{name:'Belfort updated',exact:true}).click();
await page.waitForURL('**/project/1772491993559');
await page.getByRole('heading',{name:'Saved from the new editor',exact:true}).waitFor();
assert.equal(await page.getByRole('button',{name:'Edit project',exact:true}).count(),1);
await page.getByRole('button',{name:'Edit project',exact:true}).click();
await dialog.getByLabel('Summary',{exact:true}).fill('Unsaved draft');
page.once('dialog',prompt=>prompt.dismiss());
await dialog.getByRole('button',{name:'Close editor',exact:true}).click();
assert.ok(await dialog.isVisible());
await page.setViewportSize({width:390,height:844});
assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
await dialog.getByRole('tab',{name:'Preview',exact:true}).click();
assert.ok(await dialog.getByRole('heading',{name:'Saved from the new editor',exact:true}).isVisible());
await page.screenshot({path:'/tmp/portfolio-editor-mobile.png'});
page.once('dialog',prompt=>prompt.accept());await dialog.getByRole('button',{name:'Close editor',exact:true}).click();
await dialog.waitFor({state:'hidden'});
await page.setViewportSize({width:1440,height:1000});
await page.getByRole('button',{name:'Edit project',exact:true}).click();
await dialog.getByLabel('Summary',{exact:true}).fill('Draft survives an expired session.');
expired=true;await dialog.getByRole('button',{name:'Save',exact:true}).click();
await dialog.getByRole('alert').filter({hasText:'Sign in again'}).waitFor();
assert.equal(await dialog.getByLabel('Summary',{exact:true}).inputValue(),'Draft survives an expired session.');
await dialog.getByRole('button',{name:'Sign in',exact:true}).click();
await page.getByRole('button',{name:'Lock editing',exact:true}).waitFor();
expired=false;await dialog.getByRole('button',{name:'Save',exact:true}).click();await dialog.waitFor({state:'hidden'});
assert.equal(writes.at(-1).brief,'Draft survives an expired session.');
await page.getByRole('link',{name:/Back to projects/}).click();await page.waitForURL(base+'/');
await page.getByRole('button',{name:'Add project',exact:true}).click();
const add=page.getByRole('dialog',{name:'Add project',exact:true});
await page.evaluate(()=>{document.documentElement.dataset.portfolioTheme='light'});
await page.screenshot({path:'/tmp/portfolio-editor-light.png'});
await add.getByLabel('Title',{exact:true}).fill('A new project');
await add.getByLabel('Summary',{exact:true}).fill('Created without leaving the portfolio.');
await add.getByRole('button',{name:'Save',exact:true}).click();await add.waitFor({state:'hidden'});
assert.equal(await page.locator('.e-project').count(),18);
const newCard=page.locator('.e-project').filter({has:page.getByRole('link',{name:'A new project',exact:true})});
await newCard.getByRole('button',{name:/earlier/}).click();
await page.waitForFunction(()=>[...document.querySelectorAll('.e-project h3')].at(-2).textContent==='A new project');
page.once('dialog',prompt=>prompt.accept());await newCard.getByRole('button',{name:'Delete',exact:true}).click();
await page.waitForFunction(()=>document.querySelectorAll('.e-project').length===17);
await page.getByRole('button',{name:'Lock editing',exact:true}).click();
assert.equal(await page.getByRole('button',{name:'Edit project',exact:true}).count(),0);
assert.equal(await page.getByRole('link',{name:'Analytics',exact:true}).count(),0);
assert.deepEqual(errors,[]);
await browser.close();console.log('PASS: Sign-in on the same page, authorized saves, title/summary/technologies/cover/Markdown, failed-save recovery, live writeup, unsaved-change protection, phone preview, add/reorder/delete, lock editing. All writes were intercepted.');
