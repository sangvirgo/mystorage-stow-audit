import { chromium } from 'playwright';
import type { Page } from 'playwright';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { paths, STOW_URL, MIN_GAP_MS } from './lib/config.ts';
import { Guard } from './lib/guards.ts';
import { readSent, recordSent, writeTranscript, appendNetwork } from './lib/evidence.ts';
import { selectors } from './lib/selectors.ts';

const suite = JSON.parse(readFileSync('tests/round5.json', 'utf8'));
const dir = resolve('evidence/round5');
mkdirSync(dir, { recursive: true });
const results: any[] = [];
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));
const save = (result: any) => {
  results.push(result);
  writeFileSync(resolve(dir, 'results.json'), JSON.stringify(results, null, 2));
  console.log(JSON.stringify(result));
};
if (existsSync(resolve(dir, 'results.json'))) throw new Error('Round already exists; refuse overwrite/repeat.');
if (readSent().length !== suite.priorSubmitted) throw new Error('Submitted count changed; review total before proceeding.');
if (suite.priorSubmitted + suite.chat.length + suite.ui.length !== 50) throw new Error('Expected exactly 50 planned attempts.');
const browser = await chromium.launch({ headless: true });

async function metrics(page: Page) {
  return page.evaluate(() => {
    const rect = (e: Element) => { const r = e.getBoundingClientRect(); return {x:r.x,y:r.y,width:r.width,height:r.height,bottom:r.bottom,right:r.right}; };
    const textarea = document.querySelector('textarea');
    const form = textarea?.closest('form') ?? textarea?.parentElement?.parentElement;
    const composer = form ? rect(form) : null;
    const heading = document.querySelector('h2');
    const shortcuts = Array.from(document.querySelectorAll('button')).filter(e => ['Giới thiệu về MyStorage','STOW có những dịch vụ gì?','Báo giá lưu trữ giúp em'].includes(e.textContent?.trim() ?? '')).map(e => {
      const r = rect(e); const x = Math.max(0, Math.min(innerWidth-1,r.x+r.width/2)); const y = Math.max(0,Math.min(innerHeight-1,r.y+r.height/2));
      const hit = document.elementFromPoint(x,y);
      return {text:e.textContent,rect:r,centerHitsSelf:!!hit && (hit === e || e.contains(hit)),overlapsComposer:!!composer && r.x < composer.right && r.right > composer.x && r.y < composer.bottom && r.bottom > composer.y};
    });
    return {viewport:{width:innerWidth,height:innerHeight},document:{width:document.documentElement.scrollWidth,height:document.documentElement.scrollHeight},heading:heading?rect(heading):null,composer,shortcuts,liveRegions:document.querySelectorAll('[aria-live], [role="status"], [role="log"]').length,textarea:textarea?{label:textarea.getAttribute('aria-label'),labelledby:textarea.getAttribute('aria-labelledby'),labels:textarea.labels?.length,placeholder:textarea.getAttribute('placeholder')}:null};
  });
}
const focus = (page: Page) => page.evaluate(() => {const e=document.activeElement;const r=e?.getBoundingClientRect(); return {tag:e?.tagName,label:e?.getAttribute('aria-label')||e?.textContent?.trim().slice(0,80),x:r?.x,y:r?.y,width:r?.width,height:r?.height,offscreen:!!r&&(r.right<=0||r.bottom<=0||r.x>=innerWidth||r.y>=innerHeight)};});

try {
  // One initial load, then viewport changes: no repeated production reloads for UI cases.
  const context = await browser.newContext({storageState: paths.storageState, viewport:{width:390,height:844}});
  const page = await context.newPage();
  const guard = new Guard(page);
  const errors: string[] = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto(STOW_URL, {waitUntil:'load'});
  await selectors.composer(page).waitFor({timeout:20000});
  await sleep(3000);
  await guard.check();
  for (const t of suite.ui) {
    await page.setViewportSize({width:t.width,height:t.height});
    await sleep(350);
    await guard.check();
    let detail: any = {};
    const composer = selectors.composer(page);
    if(t.kind === 'closed-menu-tab') {
      await composer.focus(); const sequence=[];
      for(let i=0;i<16;i++){await page.keyboard.press('Tab');sequence.push(await focus(page));}
      detail={sequence};
    } else if(t.kind === 'open-menu-focus') {
      const opener=page.getByRole('button',{name:'Mở menu',exact:true});
      await opener.click(); await sleep(300);
      detail={initialFocus:await focus(page),expanded:await opener.getAttribute('aria-expanded'),controls:await opener.getAttribute('aria-controls')};
      const sequence=[]; for(let i=0;i<12;i++){await page.keyboard.press('Tab');sequence.push(await focus(page));} detail.sequence=sequence;
      await page.screenshot({path:resolve(dir,`${t.id}-open.png`)});
      await page.keyboard.press('Escape'); await sleep(300);
      detail.afterEscape=await page.locator('aside').evaluateAll(es=>es.map(e=>({x:e.getBoundingClientRect().x,ariaHidden:e.getAttribute('aria-hidden')})));
      const close=page.getByRole('button',{name:'Đóng menu',exact:true});
      if(await close.isVisible() && (await close.boundingBox())!.x>=0) await close.click();
      await sleep(300);
    } else if(t.kind === 'empty-whitespace') {
      await composer.fill(''); detail.emptyDisabled=await selectors.sendButton(page).isDisabled();
      await composer.fill('   \n  '); detail.whitespaceDisabled=await selectors.sendButton(page).isDisabled(); await composer.fill('');
    } else if(t.kind === 'multiline-draft') {
      await composer.fill(Array.from({length:12},(_,i)=>`Draft line ${i+1}: two suitcases, six hours, District 1.`).join('\n'));
      detail.draft=await composer.evaluate(e=>({clientHeight:e.clientHeight,scrollHeight:e.scrollHeight,overflowY:getComputedStyle(e).overflowY}));
    } else if(t.kind === 'accessible-labels') {
      detail.buttons=await page.locator('button').evaluateAll(es=>es.map(e=>({text:e.textContent?.trim(),ariaLabel:e.getAttribute('aria-label'),expanded:e.getAttribute('aria-expanded'),controls:e.getAttribute('aria-controls'),rect:{width:e.getBoundingClientRect().width,height:e.getBoundingClientRect().height}})));
    } else if(t.kind === 'rotate-draft') {
      const draft='Draft only: two suitcases for six hours.'; await composer.fill(draft);
      await page.setViewportSize({width:844,height:390}); await sleep(350); detail.preserved=await composer.inputValue()===draft;
    }
    const measurements=await metrics(page);
    await page.screenshot({path:resolve(dir,`${t.id}.png`),fullPage:true});
    await guard.check();
    save({id:t.id,kind:t.kind,status:'executed',timestamp:new Date().toISOString(),measurements,detail,pageErrors:errors,screenshot:`evidence/round5/${t.id}.png`});
    await composer.fill('');
  }
  appendNetwork('round5-ui',guard.drain());
  await context.close();

  for(const t of suite.chat) {
    const sent=readSent(); if(sent.some(e=>e.id===t.id))throw new Error(`Refuse resend ${t.id}`);
    const last=sent.at(-1); if(last) {const remaining=Date.parse(last.submittedAt)+MIN_GAP_MS-Date.now(); if(remaining>0){console.log(`Spacing: ${Math.ceil(remaining/1000)} seconds`);await sleep(remaining);}}
    const ctx=await browser.newContext({storageState:paths.storageState,viewport:{width:1280,height:900}});
    const p=await ctx.newPage(); const g=new Guard(p);const pageErrors:string[]=[]; p.on('pageerror',e=>pageErrors.push(e.message));
    let submittedAt=''; const start=Date.now(); let firstTextMs:number|null=null;
    try {
      await p.goto(STOW_URL,{waitUntil:'load'}); await selectors.composer(p).waitFor({timeout:20000}); await g.check();
      if(await p.locator('div.prose').count()) throw new Error('Expected fresh chat, found prior assistant messages.');
      await selectors.composer(p).fill(t.message);await g.check();
      submittedAt=new Date().toISOString();recordSent({id:t.id,submittedAt});console.log(`${t.id} sending`);await selectors.sendButton(p).click();
      let previous='';let stable=Date.now();const sentTime=Date.now();
      for(;;){
        await g.check();const text=await p.locator('div.prose').last().innerText({timeout:500}).catch(()=>'');
        if(text!==previous){previous=text;stable=Date.now();if(text&&firstTextMs===null)firstTextMs=Date.now()-sentTime;}
        if(text&&Date.now()-stable>=5000&&!await selectors.busyIndicator(p).isVisible()&&await selectors.sendButton(p).count())break;
        if(Date.now()-sentTime>90000)throw new Error('Reply did not complete within 90 seconds');
        await sleep(500);
      }
      const response=await p.locator('div.prose').last().innerText();
      const links=await p.locator('div.prose').last().locator('a').evaluateAll(es=>es.map(e=>({text:e.textContent,url:(e as HTMLAnchorElement).href})));
      await p.screenshot({path:resolve(dir,`${t.id}.png`),fullPage:true});
      await p.locator('div.prose').last().screenshot({path:resolve(dir,`${t.id}-answer.png`)});
      writeTranscript({test:t,timestamp:submittedAt,response,notes:['Fresh browser context, no previous assistant messages.',`First observed text: ${firstTextMs} ms; elapsed since submission: ${Date.now()-Date.parse(submittedAt)} ms.`,`Links: ${JSON.stringify(links)}`,`Screenshot: evidence/round5/${t.id}.png`]});
      save({id:t.id,status:'completed',submittedAt,elapsedMs:Date.now()-Date.parse(submittedAt),firstTextMs,links,pageErrors,screenshot:`evidence/round5/${t.id}.png`});
      appendNetwork(t.id,g.drain());
    } catch(e) {
      const error=String(e);await p.screenshot({path:resolve(dir,`${t.id}-stopped.png`),fullPage:true}).catch(()=>{});
      const partial=await p.locator('div.prose').allInnerTexts().catch(()=>[]);
      if(submittedAt)writeTranscript({test:t,timestamp:submittedAt,response:partial.join('\n\n')||'[No assistant text captured]',notes:[`INCOMPLETE: ${error}`,'Do not interpret partial text as a completed reply.']});
      appendNetwork(t.id,g.drain());save({id:t.id,status:'stopped',submittedAt,error,elapsedMs:Date.now()-start,pageErrors});throw e;
    } finally {await ctx.close();}
  }
  console.log(`DONE: ${readSent().length} submitted chat attempts + ${results.filter(r=>r.id.startsWith('U')).length} UI cases.`);
} catch(e){console.error(`STOP: ${e}`);process.exitCode=1;}
finally{await browser.close();}
