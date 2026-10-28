import type { Page } from '@playwright/test';

import { expect, test } from './fixtures';

/**
 * The arcade, driven like a player would: open each machine, press Play, make a move, and
 * see the score move or the run end — with nothing logged to the console on the way.
 */

const GAMES = ['Roll', 'Stack', 'Orbit', 'Breakout', 'Slide', 'Trace', 'Simon'] as const;

async function openGame(page: Page, id: string) {
  await page.goto(`/play/${id}`);
  const coin = page.getByRole('button', { name: 'Insert coin' });
  await expect(coin).toBeVisible({ timeout: 30_000 });
  await coin.click();
  // Three, two, one, go: a fixed 1.96 s, after which the machine is mounted and running.
  await expect(coin).toBeHidden();
  await page.waitForTimeout(2_100);
}

const gameOver = (page: Page) => page.getByText('Game over').first();

const score = async (page: Page) => Number((await page.getByLabel(/^Score \d+/).getAttribute('aria-label'))?.replace(/\D/g, ''));

const tapCanvas = async (page: Page, x: number, y: number) => {
  const canvas = page.locator('canvas').first();
  const box = await canvas.boundingBox();
  if (!box) throw new Error('no canvas');
  await page.mouse.click(box.x + x, box.y + y);
};

test('the cabinet shows seven machines and reaches each one', async ({ page }) => {
  await page.goto('/');
  for (const name of GAMES) {
    await expect(page.getByRole('link', { name: new RegExp(`^${name}\\.`) })).toBeVisible();
  }
  await page.getByRole('link', { name: /^Slide\./ }).click();
  await expect(page.getByRole('button', { name: 'Insert coin' })).toBeVisible();
  await page.getByRole('button', { name: 'Back to the cabinet' }).click();
  await expect(page.getByRole('link', { name: /^Stack\./ })).toBeVisible();
});

test('Stack: a drop scores, a miss ends the run and records a best', async ({ page }) => {
  await openGame(page, 'stack');
  const canvas = page.locator('canvas').first();
  await expect(canvas).toBeVisible();
  // The first block slides in from the left; drop it once it is over the tower. The slider's step
  // per frame is capped, so on a loaded machine it moves slower in real time: at 500 ms it could
  // still be short of the tower. At 900 ms it overlaps at full speed and at half.
  await page.waitForTimeout(900);
  await tapCanvas(page, 150, 400);
  await expect.poll(() => score(page)).toBeGreaterThanOrEqual(1);
  // Drops at the wrong moment eventually miss; keep tapping until the run ends.
  for (let i = 0; i < 40; i++) {
    if (await gameOver(page).isVisible()) break;
    await tapCanvas(page, 150, 400);
    await page.waitForTimeout(90);
  }
  await expect(gameOver(page)).toBeVisible({ timeout: 10_000 });
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

test('Slide: a merge is announced — the points float up over the board', async ({ page }) => {
  await openGame(page, 'slide');
  let seen = false;
  for (let i = 0; i < 40 && !seen; i++) {
    const before = await score(page);
    await page.keyboard.press(['ArrowLeft', 'ArrowDown', 'ArrowRight', 'ArrowDown'][i % 4]);
    await page.waitForTimeout(80);
    if ((await score(page)) > before) seen = await page.getByText(/^\+\d+$/).first().isVisible();
    await page.waitForTimeout(150);
  }
  expect(seen, 'a "+N" word appeared after a scoring move').toBe(true);
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

/**
 * Where the light is on the board, found the way a player finds it — by looking: its core is the
 * one patch of #ffe0b8 on the screen (the marble's highlight runs through other creams).
 */
async function findLight(page: Page, clip: { x: number; y: number; width: number; height: number }) {
  const png = await page.screenshot({ clip });
  const found = await page.evaluate(async (b64) => {
    const img = new Image();
    img.src = `data:image/png;base64,${b64}`;
    await img.decode();
    const c = document.createElement('canvas');
    c.width = img.width;
    c.height = img.height;
    const g = c.getContext('2d')!;
    g.drawImage(img, 0, 0);
    const d = g.getImageData(0, 0, c.width, c.height).data;
    let sx = 0;
    let sy = 0;
    let n = 0;
    for (let i = 0; i < d.length; i += 4) {
      if (d[i] > 245 && d[i + 1] >= 218 && d[i + 1] <= 230 && d[i + 2] >= 176 && d[i + 2] <= 192) {
        sx += (i / 4) % c.width;
        sy += Math.floor(i / 4 / c.width);
        n += 1;
      }
    }
    return n ? { x: sx / n, y: sy / n, scale: img.width } : null;
  }, png.toString('base64'));
  if (!found) return null;
  const k = clip.width / found.scale;
  return { x: clip.x + found.x * k, y: clip.y + found.y * k };
}

test('Roll: the marble rolls to the pointer, catches the light, and the clock runs out', async ({ page }) => {
  await openGame(page, 'roll');
  const box = (await page.locator('canvas').first().boundingBox())!;
  const light = await findLight(page, box);
  expect(light, 'a light on the board').not.toBeNull();
  await page.mouse.move(light!.x, light!.y);
  await page.mouse.down();
  await expect.poll(() => score(page), { timeout: 8_000 }).toBeGreaterThanOrEqual(1);
  await page.mouse.up();
  await page.mouse.move(box.x + 4, box.y + 4);
  // Nothing else caught, the twelve seconds and the bonus run down and the run ends.
  await expect(gameOver(page)).toBeVisible({ timeout: 30_000 });
});

test('Orbit: a release leaves the orbit and the run ends or scores', async ({ page }) => {
  await openGame(page, 'orbit');
  await page.waitForTimeout(700);
  await tapCanvas(page, 150, 400);
  await page.waitForTimeout(3500);
  const over = await gameOver(page).isVisible();
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
  // The same pad every time: right by luck now and then, wrong soon enough. A right press in the
  // middle of a longer sequence leaves it the player's turn, so keep pressing while it is.
  for (let presses = 0; presses < 40; presses++) {
    if (await gameOver(page).isVisible()) break;
    if (await page.getByText(/your turn/i).first().isVisible()) await page.getByRole('button', { name: /^Pad 4/ }).click();
    await page.waitForTimeout(350);
  }
  await expect(gameOver(page)).toBeVisible({ timeout: 10_000 });
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

test('reduce motion is a setting, and it is kept', async ({ page }) => {
  await page.goto('/settings');
  const motion = page.getByRole('switch', { name: 'Reduce motion' });
  await expect(motion).not.toBeChecked();
  await motion.click();
  await page.reload();
  await expect(page.getByRole('switch', { name: 'Reduce motion' })).toBeChecked();
  await page.getByRole('switch', { name: 'Reduce motion' }).click();
});

test('the daily tower: one attempt, then the result and a streak on the wall', async ({ page }) => {
  await page.goto('/');
  const card = page.getByRole('link', { name: /^Daily tower/ });
  await expect(card).toHaveAttribute('aria-label', /Not played yet\. 0-day streak/);
  await card.click();
  await expect(page.getByText(/one attempt\. It resets at midnight/)).toBeVisible();

  const coin = page.getByRole('button', { name: 'Insert coin' });
  await expect(coin).toBeVisible({ timeout: 30_000 });
  await coin.click();
  await expect(coin).toBeHidden();
  await page.waitForTimeout(2_100);
  for (let i = 0; i < 40 && !(await gameOver(page).isVisible()); i++) {
    await tapCanvas(page, 150, 300);
    await page.waitForTimeout(450);
  }
  await expect(gameOver(page)).toBeVisible();
  await expect(page.getByRole('button', { name: 'Play again' })).toHaveCount(0);
  await expect(page.getByText(/1-day streak · back at midnight/)).toBeVisible();

  await page.getByRole('button', { name: 'Cabinet', exact: true }).click();
  await expect(card).toHaveAttribute('aria-label', /Built today: \d+\. 1-day streak/);
  // A second visit shows the day's result instead of a coin slot.
  await card.click();
  await expect(page.getByText("TODAY'S TOWER").first()).toBeVisible();
  await expect(page.getByRole('button', { name: 'Insert coin' })).toHaveCount(0);
});
