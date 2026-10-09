import {chromium,launchOptions,base} from './browser.mjs';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import snapshot from '../../src/designs/projects.json' with {type:'json'};

const browser=await chromium.launch(launchOptions);
const errors=[];
const checks=[];
await fs.mkdir('review/portfolio-designs',{recursive:true});
await fs.mkdir('public/design-assets/previews',{recursive:true});
const page=await browser.newPage();
page.on('pageerror',e=>errors.push(e.message));
async function verifyPage(path,width,height) {
  await page.setViewportSize({width,height});
  await page.goto(base+path,{waitUntil:'networkidle'});
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,`${path} overflow at ${width}px`);
  assert.equal(await page.locator('h1').count(),1,`${path} needs one page heading`);
  assert.equal(await page.locator('img').evaluateAll(images=>images.some(img=>img.complete&&img.naturalWidth===0)),false,`${path} has a failed image`);
  checks.push({path,width,result:'pass'});
}
for(const id of ['editorial','workbench','gallery','index']) {
  for(const [width,height] of [[1440,1000],[768,1024],[390,844],[320,740]]) {
    await verifyPage(`/designs/${id}`,width,height);
    if(width===1440) {
      await page.screenshot({path:`review/portfolio-designs/${id}-desktop.png`,fullPage:true});
      await page.screenshot({path:`public/design-assets/previews/${id}.jpg`,type:'jpeg',quality:90});
    }
    if(id==='workbench' && width<=390)assert.ok(await page.locator('.w-sidebar').evaluate(el=>el.getBoundingClientRect().height)<130,'Mobile header should stay compact');
    if(width===390)await page.screenshot({path:`review/portfolio-designs/${id}-mobile.png`,fullPage:true});
  }
  await verifyPage(`/designs/${id}/project/${snapshot[0].id}`,390,844);
  await verifyPage(`/designs/${id}/project/${snapshot[2].id}`,1440,1000);
}
await verifyPage('/designs',1440,1000);
await verifyPage('/designs',390,844);
await page.setViewportSize({width:1440,height:1000});
await page.goto(base+'/designs/editorial');
await page.locator('.design-filter').getByRole('button',{name:'Hardware',exact:true}).click();
assert.equal(await page.locator('.e-project').count(),2);
await page.locator('.e-project').first().click();
await page.waitForURL('**/project/**');
assert.match(page.url(),/\/project\//);
await page.getByRole('link',{name:'Back to projects'}).click();
await page.waitForURL('**/designs/editorial');
assert.equal(new URL(page.url()).pathname,'/designs/editorial');
checks.push({behavior:'Editorial filter, project link, and return navigation',result:'pass'});
await page.goto(base+'/designs/gallery');
await page.locator('.g-filters').getByRole('button',{name:'Mobile',exact:true}).click();
assert.equal(await page.locator('.g-project').count(),1);
assert.match(await page.locator('.g-caption h3').textContent(),/Wordle/);
checks.push({behavior:'Gallery category filtering',result:'pass'});
await page.goto(base+'/designs/workbench');
await page.locator('.w-list').getByRole('button',{name:/Belfort Events/}).click();
assert.equal(await page.locator('.w-inspector h3').textContent(),'Belfort Events');
await page.locator('.w-inspector-tabs').getByRole('button',{name:'Technologies'}).click();
assert.match(await page.locator('.w-stack').textContent(),/Stripe/);
await page.locator('.w-filters').getByRole('button',{name:'Hardware',exact:true}).click();
assert.equal(await page.locator('.w-list button').count(),2);
assert.match(await page.locator('.w-inspector h3').textContent(),/iPhone/);
checks.push({behavior:'Workbench project selection, stack tab, and filter selection reset',result:'pass'});
await page.goto(base+'/designs/index');
const search=page.getByRole('searchbox');
await search.fill('Jetpack');
assert.equal(await page.locator('.i-row').count(),1);
await page.locator('.i-row-heading').click();
assert.equal(await page.locator('.i-row-detail').count(),1);
await search.fill('not-a-project');
assert.match(await page.getByRole('status').textContent(),/No projects match/);
await search.fill('');
assert.equal(await page.locator('.i-row').count(),17);
checks.push({behavior:'Index technology search, expansion, empty state, and reset',result:'pass'});
await page.goto(base+'/designs');
await page.getByRole('button',{name:'Research & decisions'}).click();
assert.equal(await page.locator('.dr-research').count(),1);
assert.equal(await page.locator('.dr-research-grid a').count(),4);
await page.getByRole('button',{name:'The four designs'}).click();
if(await fs.access('public/design-assets/demos/editorial.mp4').then(()=>true,()=>false)) {
  await page.waitForFunction(()=>document.querySelectorAll('.dr-video video').length===4);
  await page.locator('.dr-video video').evaluateAll(videos=>videos.forEach(video=>video.load()));
  await page.waitForFunction(()=>[...document.querySelectorAll('.dr-video video')].every(video=>video.readyState>=1));
  assert.equal(await page.locator('.dr-video video').evaluateAll(videos=>videos.every(video=>!video.error&&video.duration>40&&video.duration<60)),true);
  await page.locator('.dr-video summary').first().click();
  await page.locator('.dr-video video').first().evaluate(video=>{video.currentTime=5;});
  await page.waitForFunction(()=>document.querySelector('.dr-video video').readyState>=2);
  checks.push({behavior:'All four videos load, and the first video decodes after seeking',result:'pass'});
}
await page.getByRole('link',{name:'Try this design'}).first().focus();
await page.keyboard.press('Enter');
await page.waitForURL('**/designs/editorial');
assert.equal(new URL(page.url()).pathname,'/designs/editorial');
checks.push({behavior:'Research tab and keyboard navigation',result:'pass'});
await page.goto(base+'/designs/editorial/project/'+snapshot[12].id);
assert.equal(await page.locator('.dp-empty-note').count(),1);
await page.goto(base+'/designs/editorial/project/missing');
assert.match(await page.locator('h1').textContent(),/not found/);
await page.goto(base+'/designs/missing');
assert.match(await page.locator('h1').textContent(),/not found/);
checks.push({behavior:'Missing writeup, missing project, and missing design states',result:'pass'});
// Capture the existing site using local assets without any production writes.
await page.route('**/api/projects/list',route=>route.fulfill({json:snapshot}));
await page.route('**/api/images/*',async route=>{
  const id=route.request().url().split('/').pop();
  let path=`public/design-assets/images/${id}.webp`;
  try{await fs.access(path);}catch{path=`public/design-assets/images/${id}.svg`;}
  await route.fulfill({path,contentType:path.endsWith('.svg')?'image/svg+xml':'image/webp'});
});
await page.setViewportSize({width:1440,height:1000});
await page.goto(base,{waitUntil:'networkidle'});
await page.waitForTimeout(2000);
await page.screenshot({path:'review/portfolio-designs/before.png',fullPage:true});
await page.screenshot({path:'public/design-assets/previews/before.jpg',type:'jpeg',quality:90});
assert.match(await page.locator('h1').textContent(),/Matt/);
checks.push({behavior:'Original homepage preserved and populated from the local snapshot',result:'pass'});
assert.deepEqual(errors,[],'Browser exceptions');
await fs.writeFile('review/portfolio-designs/verification.json',JSON.stringify({date:'2026-10-09',browser:'Chromium',checks,errors},null,2)+'\n');
console.log(`Passed ${checks.length} checks, with no browser exceptions.`);
await browser.close();
