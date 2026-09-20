import {test,expect} from '@playwright/test';
test('mobile invitation handles failure, hides password and returns to the game',async({page})=>{
  await page.setViewportSize({width:320,height:700});
  let allowed=false;
  await page.route('**/api/login',route=>route.fulfill({status:allowed?200:401,contentType:'application/json',
    body:JSON.stringify(allowed?{ok:true}:{error:'Esa no es la contraseña.'})}));
  await page.route('**/api/start',route=>route.fulfill({status:200,contentType:'application/json',
    body:JSON.stringify({turns:0,maxTurns:6,score:12,status:'playing',mood:'Cara de póker',line:'Buenas.',version:0})}));
  await page.goto('/login.html');
  await expect(page.locator('#password')).toHaveAttribute('type','password');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.getByLabel('TU CONTRASEÑA').fill('test-only');
  await page.getByRole('button',{name:'ESTOY EN LA LISTA'}).click();
  await expect(page.getByRole('alert')).toContainText('Esa no es');
  allowed=true;
  await page.getByRole('button',{name:'ESTOY EN LA LISTA'}).click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.locator('#guard-line')).toHaveText('Buenas.');
});
