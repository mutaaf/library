import { defineConfig, devices } from '@playwright/test';

const PORT = Number(process.env.E2E_PORT) || 4392;

export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 45_000,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: { baseURL: `http://127.0.0.1:${PORT}` },
  // WebKit is the engine the iPhone Duo runs; Chromium covers everything else.
  projects: [
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
  webServer: {
    command: `npm run build && node scripts/serve.mjs --port ${PORT}`,
    url: `http://127.0.0.1:${PORT}/library/`,
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
