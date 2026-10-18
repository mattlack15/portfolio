import {chromium,launchOptions,base} from './browser.mjs';
import assert from 'node:assert/strict';
import snapshot from '../src/portfolio/projects.json' with {type:'json'};
const browser=await chromium.launch(launchOptions);
const context=await browser.newContext({viewport:{width:1440,height:1000},colorScheme:'dark'});
const errors=[];const requests=[];const collected=[];
context.on('page',page=>page.on('pageerror',error=>errors.push(error.message)));
await context.addInitScript(()=>{
  try {sessionStorage.setItem('portfolio-editor-session','test-only-analytics');} catch {}
  Object.defineProperty(navigator,'webdriver',{get:()=>false});
});
const entries=Array.from({length:125},(_,index)=>({
 _id:`event-${String(index).padStart(3,'0')}`,type:index%3===0?'click':'pageview',
 path:index%2===0?'/':'/project/1785866116116',target:index%3===0?'#filter=systems':'',label:index%3===0?'Filter: Systems':'',
 country:index%2===0?'China':'Canada',city:index%2===0?'Beijing':'Toronto',region:index%2===0?'Beijing':'Ontario',
 referrer:index%4===0?'github.com':'',at:new Date(Date.UTC(2026,9,18,18,0,0)-index*60000).toISOString(),
}));
let failNext=false;let expired=false;
await context.route('**/api/**',async route=>{
 const request=route.request();const url=new URL(request.url());
 if(url.pathname==='/api/projects/list')return route.fulfill({json:snapshot});
 if(url.pathname==='/api/auth/session')return route.fulfill({json:{}});
 if(url.pathname==='/api/auth/logout')return route.fulfill({status:204});
 if(url.pathname==='/api/analytics/events'){collected.push(request.postDataJSON());return route.fulfill({status:204});}
 if(url.pathname==='/api/analytics/summary') {
  const count=Number(url.searchParams.get('days'));
  const daily=Array.from({length:count},(_,i)=>({date:new Date(Date.UTC(2026,9,18-(count-1-i))).toISOString().slice(0,10),visits:3+i,pageviews:5+i,clicks:2+i}));
  return route.fulfill({json:{visits:57,visitors:41,pageviews:140,clickCount:35,daily,
   pages:[{_id:'/',count:78},{_id:'/project/1785866116116',count:32}],
   clicks:[{_id:{label:'Filter: Systems',target:'#filter=systems'},count:18}],
   locations:[{_id:{city:'Beijing',region:'Beijing',country:'China'},count:32}],
   referrers:[{_id:'github.com',count:18},{_id:'',count:42}],countries:['Canada','China'],recent:[],geoAvailable:true}});
 }
 if(url.pathname==='/api/analytics/activity') {
  assert.equal(request.headers().authorization,'Bearer test-only-analytics');
  requests.push(url.searchParams);
  if(expired)return route.fulfill({status:401});
  if(failNext && url.searchParams.has('cursor')) {failNext=false;return route.fulfill({status:500});}
  const q=(url.searchParams.get('q')||'').toLowerCase();
  const result=entries.filter(row=>!q || [row.path,row.target,row.label,row.city,row.region,row.country,row.referrer].some(value=>value.toLowerCase().includes(q)))
   .filter(row=>!url.searchParams.get('type') || row.type===url.searchParams.get('type'))
   .filter(row=>!url.searchParams.get('country') || row.country===url.searchParams.get('country'))
   .filter(row=>!url.searchParams.get('path') || row.path===url.searchParams.get('path'))
   .filter(row=>!url.searchParams.get('referrer') || row.referrer===(url.searchParams.get('referrer')==='__direct__'?'':url.searchParams.get('referrer')));
  if(url.searchParams.get('order')==='oldest')result.reverse();
  const offset=Number(url.searchParams.get('cursor')||0);const end=Math.min(offset+50,result.length);
  const delay=q==='slow'?650:20;
  await new Promise(resolve=>setTimeout(resolve,delay));
  return route.fulfill({json:{items:result.slice(offset,end),total:result.length,nextCursor:end<result.length?String(end):null}}).catch(()=>{});
 }
 return route.fulfill({status:204});
});
const page=await context.newPage();
await page.goto(base+'/analytics',{waitUntil:'networkidle'});
await page.waitForFunction(()=>document.querySelectorAll('.activity-row').length===50);
await page.evaluate(()=>document.fonts.ready);
await page.screenshot({path:'/tmp/portfolio-analytics-updated-desktop.png',fullPage:false});
assert.equal(await page.getByRole('combobox',{name:'Country',exact:true}).count(),1);
assert.ok(await page.getByText('Beijing, China',{exact:true}).count()>0);
assert.equal(await page.getByText('Beijing, Beijing, China',{exact:true}).count(),0);
failNext=true;
await page.locator('.activity-more').scrollIntoViewIfNeeded();
await page.getByRole('button',{name:'Retry activity',exact:true}).waitFor();
assert.equal(await page.locator('.activity-row').count(),50);
await page.getByRole('button',{name:'Retry activity',exact:true}).click();
await page.waitForFunction(()=>document.querySelectorAll('.activity-row').length===100);
await page.locator('.activity-more').scrollIntoViewIfNeeded();
await page.waitForFunction(()=>document.querySelectorAll('.activity-row').length===125);
assert.equal(await page.locator('.activity-row').count(),125);
assert.ok(await page.getByText('All activity in this date range is loaded.',{exact:true}).isVisible());
const input=page.getByRole('searchbox',{name:'Search activity',exact:true});
await input.fill('unfinished');await input.fill('');
await page.waitForFunction(()=>document.querySelectorAll('.activity-row').length===50);
await input.fill('Beijing');
await page.waitForFunction(()=>document.querySelector('.activity-caption').textContent.includes('63 matching'));
await page.getByRole('combobox',{name:'Event',exact:true}).selectOption('click');
await page.waitForFunction(()=>document.querySelectorAll('.activity-row').length===21);
assert.ok((await page.locator('.activity-row').allTextContents()).every(text=>text.includes('Filter: Systems')));
await page.getByRole('combobox',{name:'Country',exact:true}).selectOption('Canada');
await page.getByText('No activity matches these filters.',{exact:true}).waitFor();
await page.getByRole('button',{name:'Clear filters',exact:true}).first().click();
await page.waitForFunction(()=>document.querySelectorAll('.activity-row').length===50);
await page.getByRole('combobox',{name:'Order',exact:true}).selectOption('oldest');
await page.waitForFunction(()=>document.querySelector('.activity-row time')?.getAttribute('datetime')==='2026-10-18T15:56:00.000Z');
await input.fill('slow');await page.waitForTimeout(300);await input.fill('Toronto');
await page.waitForFunction(()=>document.querySelector('.activity-caption').textContent.includes('62 matching'));
await page.waitForTimeout(700);
assert.ok((await page.locator('.activity-row').allTextContents()).every(text=>text.includes('Toronto')),'Stale searches cannot overwrite the active query');
await page.getByRole('button',{name:'Refresh analytics',exact:true}).click();
await page.waitForFunction(()=>document.querySelector('.activity-caption').textContent.includes('62 matching'));
assert.equal(await input.inputValue(),'Toronto');
await page.getByRole('button',{name:'Filter activity: /project/1785866116116',exact:true}).click();
await page.waitForFunction(()=>document.querySelector('.activity-specific')?.textContent.includes('Reverse engineering'));
assert.equal(await input.inputValue(),'');
await page.waitForFunction(()=>document.querySelectorAll('.activity-row').length===50);
assert.ok(requests.at(-1).get('path')==='/project/1785866116116');
await page.getByRole('button',{name:'90 days',exact:true}).click();
await page.waitForFunction(()=>localStorage.getItem('portfolio-analytics-days')==='90');
await page.reload({waitUntil:'networkidle'});
assert.equal(await page.getByRole('button',{name:'90 days',exact:true}).getAttribute('aria-pressed'),'true');
await page.setViewportSize({width:390,height:844});
await page.locator('.activity-heading').evaluate(element=>element.scrollIntoView({block:'start'}));
assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
await page.screenshot({path:'/tmp/portfolio-analytics-updated-mobile.png'});
await page.setViewportSize({width:1440,height:1000});
await page.locator('.activity-heading').evaluate(element=>element.scrollIntoView({block:'start'}));
await page.screenshot({path:'/tmp/portfolio-analytics-updated-activity.png'});
expired=true;
await page.getByRole('combobox',{name:'Event',exact:true}).selectOption('click');
await page.getByText('Sign in to view analytics.',{exact:true}).waitFor();
assert.equal(await page.locator('.activity-row').count(),0);
assert.equal(collected.length,0);
assert.deepEqual(errors,[]);
await browser.close();
console.log('PASS: More than 30 entries, automatic paging, load failure/retry, search, country/type/order filters, empty results, stale-search cancellation, refresh, summary filters, date preference, mobile layout, expired sessions, analytics exclusion. All API requests were intercepted.');
