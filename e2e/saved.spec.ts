import { expect, test } from './fixtures';

/**
 * A returning player. The web build is static HTML rendered with nothing saved; a browser that
 * has scores used to hand React a page that did not match it (hydration error #418), which the
 * other specs never saw because they start empty. The fixtures fail on any page or console error.
 */
test('a browser with saved scores opens the cabinet and the board cleanly', async ({ page }) => {
  await page.addInitScript(() => {
    const p = (n: number) => String(n).padStart(2, '0');
    const d = new Date();
    const today = `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
    localStorage.setItem('tilt.scores', JSON.stringify({ best: { stack: 42 }, recent: [{ game: 'stack', score: 42, at: Date.now() }] }));
    localStorage.setItem('tilt.daily', JSON.stringify({ [today]: 9 }));
  });

  await page.goto('/');
  await expect(page.getByText('★42')).toBeVisible();

  await page.goto('/scores');
  await expect(page.getByLabel('Stack: best 42, last run 42')).toBeVisible();
  await expect(page.getByLabel('1 of the last 28 daily towers played')).toBeVisible();
});
