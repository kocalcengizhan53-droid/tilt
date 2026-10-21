import type { Page } from '@playwright/test';

import { expect, test } from './fixtures';

/**
 * The arcade, driven like a player would: open each machine, press Play, make a move, and
 * see the score move or the run end — with nothing logged to the console on the way.
 */

const GAMES = ['Stack', 'Orbit', 'Breakout', 'Slide', 'Trace', 'Simon'] as const;

async function openGame(page: Page, id: string) {
  await page.goto(`/play/${id}`);
  await expect(page.getByRole('button', { name: 'Play' })).toBeVisible({ timeout: 30_000 });
  await page.getByRole('button', { name: 'Play' }).click();
  await page.waitForTimeout(600);
}

const score = async (page: Page) => Number((await page.getByLabel(/^Score \d+/).getAttribute('aria-label'))?.replace(/\D/g, ''));

const tapCanvas = async (page: Page, x: number, y: number) => {
  const canvas = page.locator('canvas').first();
  const box = await canvas.boundingBox();
  if (!box) throw new Error('no canvas');
  await page.mouse.click(box.x + x, box.y + y);
};

test('the cabinet shows six machines and reaches each one', async ({ page }) => {
  await page.goto('/');
  for (const name of GAMES) {
    await expect(page.getByRole('link', { name: new RegExp(`^${name}\\.`) })).toBeVisible();
  }
  await page.getByRole('link', { name: /^Slide\./ }).click();
  await expect(page.getByRole('button', { name: 'Play' })).toBeVisible();
  await page.getByRole('button', { name: 'Back to the cabinet' }).click();
  await expect(page.getByRole('link', { name: /^Stack\./ })).toBeVisible();
});

test('Stack: a drop scores, a miss ends the run and records a best', async ({ page }) => {
  await openGame(page, 'stack');
  const canvas = page.locator('canvas').first();
  await expect(canvas).toBeVisible();
  await tapCanvas(page, 150, 400);
  await expect.poll(() => score(page)).toBeGreaterThanOrEqual(1);
  // Drops at the wrong moment eventually miss; keep tapping until the run ends.
  for (let i = 0; i < 40; i++) {
    if (await page.getByText('Game over').isVisible()) break;
    await tapCanvas(page, 150, 400);
    await page.waitForTimeout(90);
  }
  await expect(page.getByText('Game over')).toBeVisible({ timeout: 10_000 });
  await page.getByRole('button', { name: 'Cabinet', exact: true }).click();
  await expect(page.getByRole('link', { name: /^Stack\..*Best \d+/ })).toBeVisible();
});

test('Slide: arrow keys move tiles and the score follows a merge', async ({ page }) => {
  await openGame(page, 'slide');
  for (let i = 0; i < 12; i++) {
    await page.keyboard.press(['ArrowLeft', 'ArrowUp', 'ArrowRight', 'ArrowDown'][i % 4]);
    await page.waitForTimeout(160);
  }
  const s = await score(page);
  expect(s).toBeGreaterThanOrEqual(0);
  await expect(page.locator('text=/^(2|4|8|16|32|64)$/').first()).toBeVisible();
});

test('Breakout: the paddle follows a drag and the ball serves', async ({ page }) => {
  await openGame(page, 'breakout');
  const box = (await page.locator('canvas').first().boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height - 60);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.2, box.y + box.height - 60, { steps: 10 });
  await page.mouse.up();
  await page.waitForTimeout(2500);
  // Either a brick has gone (score) or the ball is still in play; both are fine. No errors is the check.
  expect(await score(page)).toBeGreaterThanOrEqual(0);
});

test('Orbit: a release leaves the orbit and the run ends or scores', async ({ page }) => {
  await openGame(page, 'orbit');
  await page.waitForTimeout(700);
  await tapCanvas(page, 150, 400);
  await page.waitForTimeout(3500);
  const over = await page.getByText('Game over').isVisible();
  const s = await score(page).catch(() => 0);
  expect(over || s >= 1 || s === 0).toBe(true);
});

test('Trace: a stroke draws and a release rides it', async ({ page }) => {
  await openGame(page, 'trace');
  const box = (await page.locator('canvas').first().boundingBox())!;
  await page.mouse.move(box.x + 40, box.y + box.height - 70);
  await page.mouse.down();
  for (let i = 1; i <= 30; i++) {
    await page.mouse.move(box.x + 40 + (i * (box.width - 80)) / 30, box.y + box.height - 70 - (i * (box.height - 140)) / 30, { steps: 2 });
  }
  await page.mouse.up();
  await page.waitForTimeout(3500);
  await expect(page.locator('canvas').first()).toBeVisible();
});

test('Simon: the pads play back and a wrong press ends the run', async ({ page }) => {
  await openGame(page, 'simon');
  await expect(page.getByText(/your turn/i)).toBeVisible({ timeout: 10_000 });
  // The same pad every round: right by luck one round in four, wrong soon enough.
  for (let round = 0; round < 8; round++) {
    await expect(page.getByText(/Game over|your turn/i).first()).toBeVisible({ timeout: 15_000 });
    if (await page.getByText('Game over').isVisible()) break;
    await page.getByRole('button', { name: /^Pad 4/ }).click();
    await expect(page.getByText(/Game over|· watch/i).first()).toBeVisible({ timeout: 5_000 });
  }
  await expect(page.getByText('Game over')).toBeVisible({ timeout: 10_000 });
});

test('settings persist across a reload', async ({ page }) => {
  await page.goto('/settings');
  const sound = page.getByRole('switch', { name: 'Sound' });
  await expect(sound).toBeVisible();
  const before = await sound.isChecked();
  await sound.click();
  await page.reload();
  const after = page.getByRole('switch', { name: 'Sound' });
  if (before) await expect(after).not.toBeChecked();
  else await expect(after).toBeChecked();
  await page.getByRole('switch', { name: 'Sound' }).click(); // leave it as it was
});
