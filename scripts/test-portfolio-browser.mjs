import {chromium, launchOptions, base} from './design-review/browser.mjs';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import snapshot from '../src/designs/projects.json' with {type:'json'};

const live = process.argv.includes('--live');
const browser = await chromium.launch(launchOptions);
const errors = [];
const checks = [];
const screenshots = live ? '/tmp/portfolio-live' : '/tmp/portfolio-release';
async function context(options = {}) {
  const ctx = await browser.newContext({colorScheme:'light', ...options});
  ctx.on('page', page => page.on('pageerror', error => errors.push(error.message)));
  // Keep browser verification out of visitor analytics, including editor login checks.
  await ctx.route('**/api/analytics/events', route => route.fulfill({status:204}));
  await ctx.route('**/api/auth/passkey/status', route => route.fulfill({json:{configured:true}}));
  await ctx.route('**/api/auth/passkey/authenticate/options', route => route.fulfill({status:503,json:{message:'Browser verification does not sign in.'}}));
  if (!live) {
    await ctx.route('**/api/projects/list', route => route.fulfill({json:snapshot}));
    await ctx.route('**/api/images/*', async route => {
      const id = new URL(route.request().url()).pathname.split('/').pop();
      let path = `public/design-assets/images/${id}.webp`;
      try { await fs.access(path); } catch { path = `public/design-assets/images/${id}.svg`; }
      await route.fulfill({path, contentType:path.endsWith('.svg')?'image/svg+xml':'image/webp'});
    });
  }
  return ctx;
}
async function visit(page, path) {
  const response = await page.goto(base + path, {waitUntil:'networkidle'});
  assert.equal(response.status(),200);
  await page.evaluate(() => document.fonts.ready);
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth),false,`Overflow on ${path}`);
}
const ctx = await context();
const page = await ctx.newPage();
for (const width of [1440,768,390,320]) {
  await page.setViewportSize({width,height:width===1440?1000:844});
  await visit(page,'/');
  assert.equal(await page.locator('.review-bar').count(),0);
  assert.equal(await page.locator('.e-project').count(),17);
  assert.equal(await page.locator('h1').count(),1);
  assert.ok(await page.locator('.e-header').getByRole('button',{name:'Dark mode',exact:true}).isVisible());
  const mode = page.getByRole('button',{name:'Dark mode',exact:true});
  // Verify light and dark render without changing page geometry.
  await page.evaluate(()=>localStorage.removeItem('portfolio-theme'));
  await page.reload({waitUntil:'networkidle'});
  await page.evaluate(() => document.fonts.ready);
  assert.equal(await mode.getAttribute('aria-pressed'),'false');
  await page.screenshot({path:`${screenshots}-light-${width}.png`});
  await mode.click();
  assert.equal(await mode.getAttribute('aria-pressed'),'true');
  assert.equal(await page.evaluate(()=>getComputedStyle(document.querySelector('.editorial')).backgroundColor),'rgb(25, 30, 34)');
  assert.equal(await page.locator('.e-read-link').first().evaluate(el=>getComputedStyle(el).backgroundColor),'rgb(37, 44, 49)');
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth > innerWidth),false);
  await page.screenshot({path:`${screenshots}-dark-${width}.png`});
  await page.reload({waitUntil:'networkidle'});
  assert.equal(await mode.getAttribute('aria-pressed'),'true');
  await page.getByRole('button',{name:'Hardware',exact:true}).click();
  assert.equal(await page.locator('.e-project').count(),2);
  await page.locator('.e-project h3 a').first().focus();
  await page.keyboard.press('Enter');
  await page.waitForURL('**/project/1785866116116');
  await page.waitForLoadState('networkidle');
  assert.equal(await page.locator('.review-bar').count(),0);
  assert.equal(await mode.getAttribute('aria-pressed'),'true');
  assert.ok(await page.getByRole('heading',{name:'RP2350 Logic Analyzer',exact:true}).isVisible());
  if (width === 1440) {
    assert.ok(await page.locator('.dp-prose img').evaluateAll(async images => (await Promise.all(images.map(image=>image.decode().then(()=>true,()=>false)))).every(Boolean)), 'Article images must load');
  }
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth > innerWidth),false);
  await page.screenshot({path:`${screenshots}-project-dark-${width}.png`});
  await mode.click();
  assert.equal(await mode.getAttribute('aria-pressed'),'false');
  await page.getByRole('link',{name:/Back to projects/}).click();
  await page.waitForURL(base+'/');
  assert.equal(await mode.getAttribute('aria-pressed'),'false');
  checks.push(`Home and project at ${width}px: both themes, filters, keyboard navigation, persisted preference`);
}
await visit(page,'/project/1772491993559');
assert.ok(await page.locator('.dp-prose').isVisible());
assert.equal(await page.getByRole('link',{name:'Edit',exact:true}).getAttribute('href'),'/editor/project/1772491993559');
await visit(page,'/editor');
await page.getByRole('button',{name:'Unlock editing',exact:true}).click();
await page.getByRole('button',{name:'Close'}).waitFor();
await page.keyboard.press('Escape');
await page.locator('h3').filter({hasText:'Belfort Events'}).click();
await page.waitForURL('**/editor/project/1772491993559');
await page.getByRole('heading',{name:'Belfort Events',exact:true}).waitFor();
await visit(page,'/analytics');
await page.getByText('Use the key button to sign in.').waitFor();
checks.push('Direct project links, editor login access, editor project route, analytics access');
await visit(page,'/project/missing');
await page.getByRole('heading',{name:'Project not found',exact:true}).waitFor();
await ctx.close();

const automatic = await context({colorScheme:'dark'});
const autoPage = await automatic.newPage();
await visit(autoPage,'/');
assert.equal(await autoPage.getByRole('button',{name:'Dark mode',exact:true}).getAttribute('aria-pressed'),'true');
await autoPage.emulateMedia({colorScheme:'light'});
await autoPage.waitForFunction(()=>document.documentElement.dataset.portfolioTheme==='light');
await autoPage.getByRole('button',{name:'Dark mode',exact:true}).click();
await autoPage.emulateMedia({colorScheme:'dark'});
await autoPage.emulateMedia({colorScheme:'light'});
assert.equal(await autoPage.getByRole('button',{name:'Dark mode',exact:true}).getAttribute('aria-pressed'),'true');
const tab = await automatic.newPage();await visit(tab,'/');
assert.equal(await tab.getByRole('button',{name:'Dark mode',exact:true}).getAttribute('aria-pressed'),'true');
await tab.getByRole('button',{name:'Dark mode',exact:true}).click();
await autoPage.waitForFunction(()=>document.documentElement.dataset.portfolioTheme==='light');
checks.push('System preference, explicit override, persistence in new tabs, synchronization between tabs');
await automatic.close();

if (!live) {
  const updated = await context();
  await updated.route('**/api/projects/list',route=>route.fulfill({json:[...snapshot.map(p=>p.id===snapshot[1].id?{...p,title:'Updated project name',brief:'Updated summary from the editor',description:'# Updated writeup\nNew backend content.'}:p),{id:'new-project',title:'New project',brief:'Added after the snapshot',description:'A new writeup.',technologies:[],orderIndex:99}]}));
  const updatedPage = await updated.newPage();
  await visit(updatedPage,'/');
  assert.equal(await updatedPage.locator('.e-project').count(),18);
  await updatedPage.getByRole('link',{name:'Updated project name',exact:true}).click();
  await updatedPage.waitForURL('**/project/'+snapshot[1].id);
  await updatedPage.getByRole('heading',{name:'Updated writeup',exact:true}).waitFor();
  assert.ok(await updatedPage.getByText('Updated summary from the editor',{exact:true}).isVisible());
  await visit(updatedPage,'/project/new-project');
  assert.ok(await updatedPage.getByRole('heading',{name:'New project',exact:true}).isVisible());
  await updated.close();
  checks.push('New projects and edited titles, summaries, and writeups come from the backend');
}
assert.deepEqual(errors,[]);
await browser.close();
console.log(checks.map(check=>'PASS: '+check).join('\n'));
