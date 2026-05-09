import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  use: {
    baseURL: 'http://localhost:3002',
    headless: true,
  },
  webServer: [
    {
      command: 'pnpm --filter api dev',
      port: 3001,
      reuseExistingServer: true,
    },
    {
      command: 'pnpm --filter web dev',
      port: 3002,
      reuseExistingServer: true,
    },
  ],
});
