import {chromium,launchOptions,base} from './browser.mjs';
import fs from 'node:fs/promises';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import snapshot from '../../src/designs/projects.json' with {type:'json'};

const specs = [
  {id:'editorial',name:'First design',number:'01',intro:'The same layout, with a system font and a direct introduction.',focus:'The heading names the project. The divider rules and colored accents are gone.',interaction:'The project arrangement is unchanged. Filters use plain text.',detail:'The system font and simpler styling continue into the project writeup.',mobile:['The original layout is retained','Headings use the system font','No decorative rules or accents','The same project filters and links']},
  {id:'workbench',name:'Workbench',number:'02',intro:'A project explorer with a sidebar and an inspection pane.',focus:'Select a project without leaving the collection.',interaction:'Inspect the actual technology stack, then narrow the project list.',detail:'Open the complete writeup when you want more detail.',mobile:['The sidebar becomes a header','A compact, scrollable explorer','The inspection pane sits below','Overview and stack tabs remain']},
  {id:'gallery',name:'Gallery',number:'03',intro:'A blue masthead, large typography, and a gallery of real project images.',focus:'Different image sizes give the work room to breathe.',interaction:'Browse a project type, with short captions beside the screenshots.',detail:'Each project opens into its own page with the full writeup.',mobile:['The masthead scales down','Images stack in one column','Project types remain available','The full writeups still follow']},
  {id:'index',name:'Personal Index',number:'04',intro:'A brief personal introduction and a compact index of all 17 projects.',focus:'Expand a project to see its image, summary, and technologies.',interaction:'Search by name or technology; the list narrows as you type.',detail:'Open a full project page from an expanded row.',mobile:['Small, direct navigation','Search works at phone widths','Rows expand below their titles','Images stay with the summaries']},
];
const temp=await fs.mkdtemp('/tmp/portfolio-design-demos-');
await fs.mkdir('public/design-assets/demos',{recursive:true});
const browser=await chromium.launch(launchOptions);

function stamp(t) {
  const ms=Math.round(t*1000);
  return `${String(Math.floor(ms/3600000)).padStart(2,'0')}:${String(Math.floor(ms/60000)%60).padStart(2,'0')}:${String(Math.floor(ms/1000)%60).padStart(2,'0')}.${String(ms%1000).padStart(3,'0')}`;
}
async function localBaseline(page) {
  await page.route('**/api/projects/list',route=>route.fulfill({json:snapshot}));
  await page.route('**/api/images/*',async route=>{
    const id=route.request().url().split('/').pop();
    let file=`public/design-assets/images/${id}.webp`;
    try {await fs.access(file);} catch {file=`public/design-assets/images/${id}.svg`;}
    await route.fulfill({path:file,contentType:file.endsWith('.svg')?'image/svg+xml':'image/webp'});
  });
}
async function record(spec) {
  const directory=path.join(temp,spec.id);
  await fs.mkdir(directory,{recursive:true});
  const context=await browser.newContext({viewport:{width:1440,height:1000},deviceScaleFactor:1,recordVideo:{dir:directory,size:{width:1440,height:1000}}});
  const origin=Date.now();
  const page=await context.newPage();
  await localBaseline(page);
  if(spec.id==='editorial') {
    await page.goto(`${base}/designs/editorial`,{waitUntil:'networkidle'});
    await page.setContent(`<html><body style="margin:0;background:#f4f1e8"><img src="${base}/design-assets/previews/editorial-v1.jpg" alt="Previous draft screenshot" style="display:block;width:100%"></body></html>`,{waitUntil:'domcontentloaded'});
    await page.waitForFunction(()=>document.querySelector('img').complete&&document.querySelector('img').naturalWidth>0);
  } else {
    await page.goto(base,{waitUntil:'networkidle'});
  }
  let start=Date.now();
  const desktopOffset=(start-origin)/1000;
  const cues=[];
  async function caption(chapter,text) {
    const now=(Date.now()-start)/1000;
    if(cues.length)cues.at(-1).end=now;
    cues.push({start:now,chapter,text});
    await page.evaluate(({chapter,text})=>{
      let bar=document.getElementById('portfolio-demo-caption');
      if(!bar){
        const style=document.createElement('style');
        style.textContent='#portfolio-demo-caption{position:fixed;bottom:0;left:0;right:0;z-index:999999;background:#181818f5;color:#f5f6ef;padding:14px 30px 17px;pointer-events:none;font:18px/1.5 Arial,sans-serif;border:0}#portfolio-demo-caption strong{display:block;color:#bdbdbd;font:12px/1.5 Arial,sans-serif;letter-spacing:0;margin-bottom:5px}#portfolio-demo-cursor{position:fixed;top:-40px;left:-40px;width:17px;height:17px;border:2px solid #252525;border-radius:50%;background:#ffffff88;pointer-events:none;z-index:999998;box-shadow:0 0 0 2px #fff8;transform:translate(-50%,-50%)}';
        document.head.append(style);bar=document.createElement('div');bar.id='portfolio-demo-caption';document.body.append(bar);
        const cursor=document.createElement('div');cursor.id='portfolio-demo-cursor';document.body.append(cursor);
        document.addEventListener('mousemove',e=>{cursor.style.left=e.clientX+'px';cursor.style.top=e.clientY+'px';});
      }
      bar.replaceChildren();const label=document.createElement('strong');label.textContent=chapter;const copy=document.createElement('span');copy.textContent=text;bar.append(label,copy);
    },{chapter,text});
  }
  async function hold(ms=2400){await page.waitForTimeout(ms);}
  async function scrollTo(selector) {
    await page.evaluate(selector=>{const el=document.querySelector(selector);if(el)window.scrollTo({top:el.getBoundingClientRect().top+scrollY-25,behavior:'smooth'});},selector);
    await hold(750);
  }
  async function click(locator) {await locator.hover();await hold(450);await locator.click();await hold(350);}
  if(spec.id==='editorial') {
    await caption('BEFORE / PREVIOUS DRAFT SCREENSHOT','The earlier draft used serif type, slogans, color accents, and decorative rules.');
    await hold(4000);
  } else {
    await caption('BEFORE / CURRENT SITE','The current homepage introduces skills before the project collection.');
    await hold(2400);
    await scrollTo('#services');await hold(1600);
  }
  await page.goto(`${base}/designs/${spec.id}`,{waitUntil:'networkidle'});
  await caption(`${spec.number} / ${spec.name.toUpperCase()}`,spec.intro);await hold(4000);

  if(spec.id==='editorial') {
    await scrollTo('.e-feature');await caption('PROJECTS FIRST',spec.focus);await hold(2800);
    await scrollTo('#e-work');await caption('BROWSE THE COLLECTION',spec.interaction);await hold(1800);
    await click(page.locator('.design-filter').getByRole('button',{name:'Hardware',exact:true}));await hold(2300);
    await click(page.locator('.design-filter').getByRole('button',{name:'Web',exact:true}));await hold(2300);
    await click(page.locator('.e-project').filter({has:page.locator('h3',{hasText:'Belfort Events'})}));
  } else if(spec.id==='workbench') {
    await scrollTo('#w-projects');await caption('PROJECT INSPECTION',spec.focus);await hold(2200);
    await click(page.locator('.w-list').getByRole('button',{name:/MidnightSky/}));await hold(2400);
    await caption('THE TECHNOLOGY STACK',spec.interaction);
    await click(page.locator('.w-inspector-tabs').getByRole('button',{name:'Technologies'}));await hold(2300);
    await click(page.locator('.w-filters').getByRole('button',{name:'Hardware',exact:true}));
    await click(page.locator('.w-inspector-tabs').getByRole('button',{name:'Overview'}));await hold(2300);
    await click(page.getByRole('link',{name:'Open project writeup'}));
  } else if(spec.id==='gallery') {
    await scrollTo('#g-work');await caption('REAL PROJECT IMAGES',spec.focus);await hold(3200);
    await caption('PROJECT TYPES',spec.interaction);
    await click(page.locator('.g-filters').getByRole('button',{name:'Web',exact:true}));await hold(2800);
    await scrollTo('.g-project');await hold(2400);
    await click(page.locator('.g-project').first());
  } else {
    await scrollTo('#i-projects');await caption('AN EXPANDABLE INDEX',spec.focus);await hold(2400);
    await click(page.locator('.i-row-heading').filter({hasText:'MidnightSky'}));await hold(2600);
    await caption('SEARCH THE WORK',spec.interaction);
    await page.getByRole('searchbox').pressSequentially('Jetpack',{delay:150});await hold(2500);
    await click(page.locator('.i-row-heading').first());await hold(2200);
    await click(page.getByRole('link',{name:'Read about this project'}));
  }
  await page.waitForLoadState('networkidle');
  await caption('THE COMPLETE PROJECT',spec.detail);await hold(3200);
  await scrollTo('.dp-prose');await hold(3200);
  await page.goto(`${base}/designs/${spec.id}`,{waitUntil:'networkidle'});
  await caption('DESKTOP / '+spec.name.toUpperCase(),'A complete local preview, with the actual projects and their longer writeups.');await hold(1800);
  cues.at(-1).end=(Date.now()-start)/1000;
  const desktopVideo=page.video();await context.close();
  const desktopPath=await desktopVideo.path();

  const mobileContext=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:1,isMobile:true,hasTouch:true,recordVideo:{dir:directory,size:{width:390,height:844}}});
  const mobileOrigin=Date.now();
  const mobile=await mobileContext.newPage();
  await mobile.goto(`${base}/designs/${spec.id}`,{waitUntil:'networkidle'});
  const mobileOffset=(Date.now()-mobileOrigin)/1000;
  await mobile.waitForTimeout(3200);
  const anchor={editorial:'.e-feature',workbench:'#w-projects',gallery:'#g-work',index:'#i-projects'}[spec.id];
  await mobile.evaluate(selector=>{const el=document.querySelector(selector);window.scrollTo({top:el.getBoundingClientRect().top+scrollY-18,behavior:'smooth'});},anchor);
  await mobile.waitForTimeout(3300);
  if(spec.id==='editorial') {
    await mobile.locator('#e-work').scrollIntoViewIfNeeded();
    await mobile.locator('.design-filter').getByRole('button',{name:'Hardware',exact:true}).tap();
    await mobile.waitForTimeout(3000);await mobile.locator('.e-project').first().scrollIntoViewIfNeeded();
  } else if(spec.id==='workbench') {
    await mobile.locator('.w-list').getByRole('button',{name:/Belfort Events/}).tap();
    await mobile.locator('.w-inspector').scrollIntoViewIfNeeded();await mobile.waitForTimeout(3000);
    await mobile.locator('.w-inspector-tabs').getByRole('button',{name:'Technologies'}).tap();
  } else if(spec.id==='gallery') {
    await mobile.locator('.g-filters').getByRole('button',{name:'Games',exact:true}).tap();
    await mobile.waitForTimeout(3000);await mobile.locator('.g-project').first().scrollIntoViewIfNeeded();
  } else {
    await mobile.getByRole('searchbox').fill('Ktor');
    await mobile.locator('.i-row-heading').first().tap();
    await mobile.waitForTimeout(3000);await mobile.locator('.i-row-detail').scrollIntoViewIfNeeded();
  }
  await mobile.waitForTimeout(4000);
  const mobileVideo=mobile.video();await mobileContext.close();
  const mobilePath=await mobileVideo.path();
  const metadata={...spec,desktopPath,mobilePath,desktopOffset,mobileOffset,cues};
  await fs.writeFile(path.join(directory,'metadata.json'),JSON.stringify(metadata,null,2));
  console.log(`Recorded ${spec.name}: desktop walkthrough and mobile interaction.`);
  return metadata;
}

const onlyIndex=process.argv.indexOf('--only');
const selectedSpecs=onlyIndex<0?specs:specs.filter(spec=>spec.id===process.argv[onlyIndex+1]);
if(!selectedSpecs.length)throw new Error('Choose a known design for --only.');
const results=[];
for(let i=0;i<selectedSpecs.length;i+=2)results.push(...await Promise.all(selectedSpecs.slice(i,i+2).map(record)));
await browser.close();
const priorExports=await fs.readFile('review/portfolio-designs/demos.json','utf8').then(JSON.parse,()=>[]);
const exported=priorExports.filter(spec=>!selectedSpecs.some(selected=>selected.id===spec.id));
for(const result of results) {
  const metadata=path.join(temp,result.id,'metadata.json');
  const panel=path.join(temp,result.id,'mobile-panel.png');
  const python=spawnSync('python3',['scripts/design-review/video-panel.py',metadata,panel],{encoding:'utf8'});
  if(python.status!==0)throw new Error(python.stderr);
  const output=`public/design-assets/demos/${result.id}.mp4`;
  const args=['-y','-hide_banner','-loglevel','error','-ss',String(result.desktopOffset),'-i',result.desktopPath,'-ss',String(result.mobileOffset),'-i',result.mobilePath,'-loop','1','-i',panel,'-filter_complex','[0:v]fps=30,setsar=1[desktop];[1:v]fps=30,setsar=1[phone];[2:v]fps=30,setsar=1[panel];[panel][phone]overlay=900:78:shortest=1[mobile];[desktop][mobile]concat=n=2:v=1:a=0[out]','-map','[out]','-c:v','libx264','-preset','fast','-crf','20','-pix_fmt','yuv420p','-movflags','+faststart',output];
  const encode=spawnSync('ffmpeg',args,{encoding:'utf8'});
  if(encode.status!==0)throw new Error(encode.stderr);
  const probe=spawnSync('ffprobe',['-v','error','-show_entries','format=duration','-of','json',output],{encoding:'utf8'});
  const duration=Number(JSON.parse(probe.stdout).format.duration);
  const desktopProbe=spawnSync('ffprobe',['-v','error','-show_entries','format=duration','-of','json',result.desktopPath],{encoding:'utf8'});
  const desktopEnd=Number(JSON.parse(desktopProbe.stdout).format.duration)-result.desktopOffset;
  const captionScale=desktopEnd/result.cues.at(-1).end;
  result.cues=result.cues.map(cue=>({...cue,start:cue.start*captionScale,end:cue.end*captionScale}));
  result.cues.push({start:desktopEnd,end:duration,chapter:'MOBILE / 390 PX',text:`${result.name} on a phone. ${result.mobile.join('. ')}.`});
  const vtt='WEBVTT\n\n'+result.cues.map((cue,i)=>`${i+1}\n${stamp(cue.start)} --> ${stamp(cue.end)}\n${cue.chapter}\n${cue.text}\n`).join('\n');
  await fs.writeFile(`public/design-assets/demos/${result.id}.vtt`,vtt);
  exported.push({id:result.id,name:result.name,number:result.number,duration,changes:[result.intro,result.focus,result.interaction,result.detail],mobile:result.mobile});
  console.log(`Exported ${output} (${duration.toFixed(1)} seconds).`);
}
await fs.writeFile('review/portfolio-designs/demos.json',JSON.stringify(exported.sort((a,b)=>a.number.localeCompare(b.number)),null,2)+'\n');
console.log(`Source recordings: ${temp}`);
