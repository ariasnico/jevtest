import {test,expect} from '@playwright/test';
const door={chapter:'door',turns:0,maxTurns:6,score:12,status:'playing',mood:'Cara de póker',line:'Dame una buena razón.',version:0};
const vip={...door,chapter:'vip',version:4,previousTurns:3,mood:'Te mide de arriba abajo',line:'La mesa está llena de gente pidiendo selfies. ¿Vos qué traés a la noche?'};
async function mockNight(page,{failContinue=false,vipLost=false,resume=null}={}) {
  let current=resume,continues=0;
  await page.route('**/api/resume',r=>r.fulfill({json:{game:current}}));
  await page.route('**/api/start',r=>{current={...door};return r.fulfill({json:current});});
  await page.route('**/api/continue',async r=>{
    continues++;
    if(failContinue&&continues===1)return r.fulfill({status:503,json:{error:'La conexión falló. Reintentá.'}});
    current={...vip};return r.fulfill({json:current});
  });
  await page.route('**/api/talk',r=>{
    current={...current,turns:3,version:current.version+3,score:87,status:vipLost&&current.chapter==='vip'?'lost':'won',
      line:current.chapter==='vip'?(vipLost?'Con esa onda, a mi mesa no.':'Sentate con nosotros. Tenés lugar en la mesa VIP.'):'Pasá. Me caíste bien.'};
    return r.fulfill({json:current});
  });
  await page.goto('/');
  return {getContinueCount:()=>continues};
}
async function winDoor(page) {
  await page.locator('#message').fill('Festejo mi primer sueldo.');await page.locator('#send').click();
  await page.locator('#enter').click();
  if(await page.locator('#ending-skip').isVisible())await page.locator('#ending-skip').click();
  await expect(page.locator('#continue')).toBeVisible();
}
for(const width of [320,390,768]) {
  test(`chapter two unlock, mobile layout, win and full restart at ${width}px`,async({page})=>{
    await page.setViewportSize({width,height:844});await page.emulateMedia({reducedMotion:'reduce'});
    const errors=[];page.on('pageerror',e=>errors.push(e.message));
    await mockNight(page);await expect(page.locator('#continue')).toBeHidden();
    await winDoor(page);await page.locator('#continue').click();
    await expect(page.locator('#chapter-label')).toHaveText('02 / LA MESA VIP');
    await expect(page.locator('#guard-bubble .speaker')).toHaveText('CLAVICULAR');
    await expect(page.locator('#chapter-note')).toBeVisible();
    await expect(page.locator('#turns')).toHaveText('INTENTOS 0 / 6');
    await expect(page.locator('#messages li')).toHaveCount(0);
    await expect(page.locator('#player-bubble')).toBeHidden();
    await expect(page.locator('.scene-art')).toHaveAttribute('src','/assets/vip/clavicular-vip.webp');
    await expect(page.locator('#send')).toBeEnabled();
    await page.locator('.scene-art').evaluate(img=>img.decode());
    expect(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)).toBe(false);
    await page.screenshot({path:`test-results/vip-${width}.png`});
    await page.locator('#message').fill('Te propongo bailar con todo el grupo.');await page.locator('#send').click();
    await expect(page.locator('#enter')).toHaveText('Sentarme en la mesa');await page.locator('#enter').click();
    await expect(page.locator('#cinematic-outcome h2')).toHaveText('De la vereda al VIP.');
    await expect(page.locator('#ending-art')).toHaveAttribute('src','/assets/vip/vip-table.webp');
    await expect(page.locator('#continue')).toBeHidden();
    await page.screenshot({path:`test-results/vip-win-${width}.png`});
    await page.locator('#ending-restart').click();
    await expect(page.locator('#chapter-label')).toHaveText('01 / LA PUERTA');
    await expect(page.locator('#send')).toBeEnabled();expect(errors).toEqual([]);
  });
}
test('failed chapter transition is retryable without erasing victory',async({page})=>{
  await page.emulateMedia({reducedMotion:'reduce'});const mock=await mockNight(page,{failContinue:true});
  await winDoor(page);await page.locator('#continue').click();
  await expect(page.locator('#continue-error')).toBeVisible();
  await expect(page.locator('#chapter-label')).toHaveText('01 / LA PUERTA');
  await page.locator('#continue').click();await expect(page.locator('#chapter-label')).toHaveText('02 / LA MESA VIP');
  expect(mock.getContinueCount()).toBe(2);
});
test('refresh restores VIP progress instead of replaying the door',async({page})=>{
  const calls=[];page.on('request',r=>calls.push(r.url()));
  await mockNight(page,{resume:{...vip,turns:2,version:6,score:62,line:'¿Qué tema pondrías?'}});
  await expect(page.locator('#turns')).toHaveText('INTENTOS 2 / 6');
  await page.reload();await expect(page.locator('#guard-line')).toHaveText('¿Qué tema pondrías?');
  await expect(page.locator('#chapter-label')).toHaveText('02 / LA MESA VIP');
  expect(calls.some(url=>url.endsWith('/api/start'))).toBe(false);
});
test('VIP loss does not unlock another chapter or show the victory table',async({page})=>{
  await mockNight(page,{resume:vip,vipLost:true});
  await page.locator('#message').fill('Insulto');await page.locator('#send').click();
  await expect(page.locator('#ending-title')).toHaveText('Nos vemos en la pista.');
  await expect(page.locator('#enter')).toBeHidden();await expect(page.locator('#continue')).toBeHidden();
});
test('VIP art failure keeps the dialogue and controls usable',async({page})=>{
  await page.route('**/assets/vip/clavicular-vip.webp',r=>r.abort());await mockNight(page,{resume:vip});
  await expect(page.locator('#art-error')).toBeVisible();await expect(page.locator('#send')).toBeEnabled();
});
test('VIP idle animation reloads its texture and the short ending reaches the table',async({page})=>{
  await mockNight(page);await winDoor(page);await page.locator('#continue').click();
  await expect(page.locator('.scene-motion')).toHaveAttribute('data-running','true');
  await page.locator('#message').fill('Pongo música y dejo el celular guardado.');await page.locator('#send').click();
  await page.locator('#enter').click();
  await expect(page.locator('#cinematic-outcome h2')).toHaveText('De la vereda al VIP.',{timeout:10000});
  await expect(page.locator('#ending-art')).toHaveAttribute('src','/assets/vip/vip-table.webp');
});
