import { defineConfig } from 'playwright/test';

const port = Number(process.env.TEST_PORT || 3210);
export default defineConfig({
  testDir: './tests',
  workers: 1,
  use: {
    baseURL: 'http://127.0.0.1:' + port,
    trace: 'retain-on-failure',
    launchOptions: process.env.PLAYWRIGHT_CHROME ? { executablePath: process.env.PLAYWRIGHT_CHROME } : {}
  },
  webServer: {
    command: 'npm run dev -- --hostname 127.0.0.1 --port ' + port,
    url: 'http://127.0.0.1:' + port,
    env: { CLIPSPILL_ENGINE_TEST: '1', MOCK_YOUTUBE_API: 'true' },
    timeout: 60_000,
    stdout: 'pipe',
    reuseExistingServer: false
  }
});
