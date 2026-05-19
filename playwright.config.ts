import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  use: {
    baseURL: "http://localhost:41892",
    headless: true,
  },
  webServer: [
    {
      command: "pnpm --filter api dev",
      port: 41891,
      reuseExistingServer: true,
    },
    {
      command: "pnpm --filter web dev",
      port: 41892,
      reuseExistingServer: true,
    },
  ],
});
