import { defineConfig, devices } from '@playwright/test';

const PORT = 4180;

/**
 * The web build, driven like a phone. WebGL runs in software here so the Skia canvases paint
 * without a GPU — slower, and exactly what a CI runner has.
 */
export default defineConfig({
  testDir: 'e2e',
  outputDir: 'qa-output/results',
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: [['list'], ['html', { outputFolder: 'qa-output/report', open: 'never' }]],
  timeout: 60_000,

  use: {
    baseURL: process.env.QA_BASE_URL ?? `http://localhost:${PORT}`,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    launchOptions: { args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] },
  },

  webServer: process.env.QA_BASE_URL
    ? undefined
    : {
        command: `npm run build:web && npx serve dist -l ${PORT} -s`,
        url: `http://localhost:${PORT}`,
        reuseExistingServer: false,
        timeout: 240_000,
      },

  projects: [
    { name: 'phone', use: { ...devices['Pixel 7'], channel: 'chrome', hasTouch: true } },
    { name: 'desktop', use: { ...devices['Desktop Chrome'], channel: 'chrome' } },
  ],
});
