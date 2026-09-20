import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './e2e', workers: 2, timeout: 30000,
  use: {
    baseURL: 'http://127.0.0.1:3041', browserName: 'chromium',
    launchOptions: { executablePath: process.env.CHROME_PATH || undefined, args: ['--enable-unsafe-swiftshader'] }
  },
  webServer: {
    command: 'node server.mjs', wait: { stdout: /Caramelo → http:\/\/127\.0\.0\.1:3041/ },
    timeout: 10000, reuseExistingServer: false,
    env: { PORT: '3041', JEV_API_KEY: 'test-placeholder', OPENAI_API_KEY: 'test-placeholder' }
  }
});
