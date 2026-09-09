import { existsSync } from "node:fs";
import { defineConfig, devices } from "@playwright/test";

const port = 3105;
const localBaseURL = `http://127.0.0.1:${port}`;
const baseURL = process.env.PLAYWRIGHT_BASE_URL || localBaseURL;
const usesExternalServer = Boolean(process.env.PLAYWRIGHT_BASE_URL);
const localChrome = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? [["line"], ["html", { open: "never" }]] : "line",
  timeout: usesExternalServer ? 180_000 : 45_000,
  expect: { timeout: 10_000 },
  use: {
    ...devices["Desktop Chrome"],
    baseURL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    launchOptions: existsSync(localChrome) ? { executablePath: localChrome } : undefined,
  },
  webServer: usesExternalServer ? undefined : {
    command: `mkdir -p .next-e2e/standalone/public .next-e2e/standalone/.next-e2e/static && cp -R public/. .next-e2e/standalone/public/ && cp -R .next-e2e/static/. .next-e2e/standalone/.next-e2e/static/ && PORT=${port} HOSTNAME=127.0.0.1 node .next-e2e/standalone/server.js`,
    url: `${localBaseURL}/api/health`,
    reuseExistingServer: false,
    timeout: 120_000,
    env: {
      ...process.env,
      NEXTAUTH_URL: baseURL,
      AUTH_TRUST_HOST: "true",
      DISABLE_OUTBOUND_EMAIL: "true",
    },
  },
});
