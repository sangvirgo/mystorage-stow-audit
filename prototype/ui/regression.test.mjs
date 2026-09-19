import { test } from 'node:test';
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { resolve } from 'node:path';
import { mkdir } from 'node:fs/promises';
const app=process.env.UI_BASE_URL ?? `file://${resolve(import.meta.dirname,'app.html')}`;
async function withPage(state,fn,viewport={width:390,height:844}) {
  const browser=await chromium.launch();
  try { const page=await browser.newPage({viewport}); const errors=[];page.on('pageerror',e=>errors.push(e.message));
    await page.goto(`${app}?mode=fixed&state=${state}`);await fn(page);assert.deepEqual(errors,[]);
  } finally {await browser.close();}
}
test('open drawer contains keyboard focus in both directions and Escape restores it',()=>withPage('welcome',async p=>{
  await p.locator('#menu-btn').click();
  for(let i=0;i<10;i++){await p.keyboard.press('Tab'); assert.equal(await p.evaluate(()=>!!document.activeElement.closest('#drawer')),true);}
  for(let i=0;i<5;i++){await p.keyboard.press('Shift+Tab'); assert.equal(await p.evaluate(()=>!!document.activeElement.closest('#drawer')),true);}
  await p.keyboard.press('Escape');assert.equal(await p.locator('#menu-btn').getAttribute('aria-expanded'),'false');
  assert.equal(await p.evaluate(()=>document.activeElement.id),'menu-btn');
}));
test('stop restores a usable composer in conversation demo',()=>withPage('chat',async p=>{
  await p.locator('#send').click();
  assert.equal(await p.locator('#send').getAttribute('aria-label'),'Gửi');
  assert.equal(await p.locator('.thinking').count(),0);
  await p.locator('textarea').fill('Next question');await p.locator('#send').click();
  assert.match(await p.locator('#log').innerText(),/Next question/);
}));
test('new chat resets draft, attachment and conversation',()=>withPage('chat',async p=>{
  await p.locator('textarea').fill('draft');await p.locator('#menu-btn').click();await p.locator('.new-chat').click();
  assert.equal(await p.locator('html').getAttribute('data-state'),'welcome');assert.equal(await p.locator('textarea').inputValue(),'');
  assert.equal(await p.locator('#drawer').getAttribute('aria-hidden'),'true');
}));
test('compact attachment has a working remove action',()=>withPage('chat',async p=>{
  const button=p.locator('.compact-attach button[aria-label="Gỡ ảnh đính kèm"]');
  assert.equal(await button.count(),1);await button.click();assert.equal(await p.locator('.attach-block').isVisible(),false);
}));
test('long unbroken messages reflow without horizontal scrolling',()=>withPage('welcome',async p=>{
  await p.locator('textarea').fill('x'.repeat(600));await p.locator('#send').click();
  assert.equal(await p.evaluate(()=>document.querySelector('#stage').scrollWidth<=innerWidth),true);
},{width:320,height:568}));
test('short-height multiline draft leaves room for content and keeps send reachable',()=>withPage('welcome',async p=>{
  await p.locator('textarea').fill(('One line of a longer draft\n').repeat(20));
  const r=await p.locator('#send').boundingBox();assert.ok(r&&r.x>=0&&r.x+r.width<=320&&r.y+r.height<=400);
  assert.ok(await p.locator('#stage').evaluate(e=>e.clientHeight)>=80);
},{width:320,height:400}));

for (const [width,height] of [[280,480],[320,568],[360,640],[390,844],[414,736],[568,320],[844,390],[768,1024],[1280,720]]) {
  for (const state of ['welcome','chat']) test(`fixed layout ${state} ${width}x${height}`,()=>withPage(state,async p=>{
    const dimensions=await p.evaluate(()=>({overflow:document.documentElement.scrollWidth>innerWidth,stage:document.querySelector('#stage').clientHeight}));
    assert.equal(dimensions.overflow,false);assert.ok(dimensions.stage>=80);
    if(state==='welcome') for(const chip of await p.locator('.chip').all()) {
      await chip.scrollIntoViewIfNeeded();
      const r=await chip.boundingBox(), dock=await p.locator('#dock').boundingBox();
      assert.ok(r.y>=0&&r.y+r.height<=dock.y+1);
    }
    await p.locator('#stage').evaluate(el=>{el.scrollTop=0;});
    const directory=resolve(import.meta.dirname,'../../evidence/local-fixes');await mkdir(directory,{recursive:true});
    await p.screenshot({path:resolve(directory,`${state}-${width}x${height}.png`)});
  },{width,height}));
}
