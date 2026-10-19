import { defineConfig, devices } from '@playwright/test';

// The built game, served by `vite preview` under the same base path Pages serves it from.
const BASE_URL = `http://localhost:4173${process.env.LYL_BASE ?? '/'}`;

export default defineConfig({
  testDir: 'apps/game/e2e',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  // No retries: a flaky check that quietly passes on the second try hides bugs (Engine-Builder's rule).
  retries: 0,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: BASE_URL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'pnpm --filter @lyl/game preview',
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
