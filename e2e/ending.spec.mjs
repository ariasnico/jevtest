import { test, expect } from '@playwright/test';
const invitation = 'Vení, lindo. Te guardamos lugar… pero portarte bien es opcional.';
const initial = { turns: 0, maxTurns: 6, score: 12, version: 0, status: 'playing', mood: 'Cara de póker', line: 'Dame una buena razón.' };
async function win(page) {
  await page.route('**/api/start', route => route.fulfill({ json: initial }));
  await page.route('**/api/talk', route => route.fulfill({ json: {
    ...initial, turns: 3, version: 3, score: 87, status: 'won', mood: 'Estás adentro', line: 'Pasá. Me caíste bien.'
  } }));
  await page.goto('/');
  await page.getByLabel('¿Qué le decís al patova?').fill('Gracias por escucharme.');
  await page.getByRole('button', { name: 'Enviar mensaje al patova' }).click();
  await expect(page.getByRole('button', { name: 'Entrar', exact: true })).toBeEnabled();
}

for (const width of [320, 390, 768]) {
  test(`win, skip and restart at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 });
    const errors = []; const calls = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('request', request => { if (request.url().includes('/api/')) calls.push(request.url()); });
    await win(page);
    await expect(page.locator('#guard-line')).toHaveText('Pasá. Me caíste bien.');
    await expect(page.locator('#cinematic')).toBeHidden();
    await page.getByRole('button', { name: 'Entrar', exact: true }).click();
    await page.getByRole('button', { name: 'Saltar', exact: true }).click();
    await expect(page.getByText(invitation)).toBeVisible();
    await expect(page.locator('#ending-art')).toHaveAttribute('src', /06-table/);
    expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
    expect(calls.length).toBe(3); // Resume + start + talk; playback makes no API calls.
    await page.screenshot({ path: `test-results/ending-${width}.png` });
    await page.locator('#ending-restart').click();
    await expect(page.locator('#scene')).toHaveAttribute('data-ending-state', 'door');
    await expect(page.locator('#send')).toBeEnabled();
    await expect(page.locator('#cinematic')).toBeHidden();
    expect(errors).toEqual([]);
  });
}
test('plays all anchors then preserves invitation', async ({ page }) => {
  await win(page);
  await page.locator('#enter').click();
  await expect(page.locator('#ending-art')).toHaveAttribute('src', /01-step-aside/);
  await expect(page.locator('#scene')).toHaveAttribute('data-ending-state', 'inside', { timeout: 8000 });
  await expect(page.getByText(invitation)).toBeVisible({ timeout: 10000 });
  await expect(page.locator('#ending-art')).toHaveAttribute('src', /06-table/);
});
test('pause and hidden tab freeze the active clock; restart cancels it', async ({ page }) => {
  await win(page); await page.locator('#enter').click();
  await expect(page.locator('#ending-pause')).toBeVisible();
  await page.locator('#ending-pause').click();
  const frame = await page.locator('#cinematic').getAttribute('data-frame');
  await page.waitForTimeout(500);
  expect(await page.locator('#cinematic').getAttribute('data-frame')).toBe(frame);
  await page.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, value: true }); document.dispatchEvent(new Event('visibilitychange')); });
  await page.locator('#ending-pause').click();
  await page.waitForTimeout(500);
  expect(await page.locator('#cinematic').getAttribute('data-frame')).toBe(frame);
  await page.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, value: false }); document.dispatchEvent(new Event('visibilitychange')); });
  await expect(page.locator('#cinematic')).not.toHaveAttribute('data-frame', frame);
  await page.locator('#ending-restart').click();
  await page.waitForTimeout(700);
  await expect(page.locator('#scene')).toHaveAttribute('data-ending-state', 'door');
  await expect(page.locator('#cinematic')).toBeHidden();
});
test('reduced motion skips straight to a static invitation', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await win(page); await page.locator('#enter').click();
  await expect(page.getByText(invitation)).toBeVisible();
  await expect(page.locator('#ending-pause')).toBeHidden();
  expect(await page.locator('#ending-art').evaluate(el => getComputedStyle(el).transform)).toBe('none');
});
for (const all of [false, true]) {
  test(`asset failure remains playable (${all ? 'all' : 'one'})`, async ({ page }) => {
    await page.route(all ? '**/assets/ending/**' : '**/assets/ending/06-table.webp', route => route.abort());
    await win(page); await page.locator('#enter').click();
    await expect(page.getByText(invitation)).toBeVisible();
    await expect(page.locator('#cinematic-caption')).toContainText('no pudo cargar');
    if (all) await expect(page.locator('#ending-art')).toBeHidden();
    else await expect(page.locator('#ending-art')).toHaveAttribute('src', /05-invite/);
    await page.locator('#ending-restart').click();
    await expect(page.locator('#send')).toBeEnabled();
  });
}
test('losing does not expose the winning cinematic', async ({ page }) => {
  await page.route('**/api/start', route => route.fulfill({ json: initial }));
  await page.route('**/api/talk', route => route.fulfill({ json: { ...initial, turns: 6, version: 6, status: 'lost', line: 'Hoy no, maestro.' } }));
  await page.goto('/');
  await page.locator('#message').fill('Hola'); await page.locator('#send').click();
  await expect(page.locator('#again')).toBeVisible();
  await expect(page.locator('#enter')).toBeHidden();
  await expect(page.locator('#cinematic')).toBeHidden();
});
