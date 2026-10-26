import { defineConfig, devices } from "@playwright/test";

import { E2E_NAMESPACE, E2E_PORT } from "./e2e/support/emulator";
import { assertEmulatorTarget } from "./e2e/support/guard";

assertEmulatorTarget();

export default defineConfig({
  testDir: "./e2e",
  globalSetup: "./e2e/global-setup.ts",
  fullyParallel: false,
  timeout: 120_000,
  expect: { timeout: 15_000 },
  workers: 1,
  use: {
    baseURL: `http://localhost:${E2E_PORT}`,
    trace: "retain-on-failure",
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    {
      name: "mobile",
      use: { ...devices["Desktop Chrome"], viewport: { width: 360, height: 800 } },
    },
  ],
  webServer: {
    command: `npx next dev -p ${E2E_PORT}`,
    url: `http://localhost:${E2E_PORT}/login`,
    reuseExistingServer: false,
    timeout: 180_000,
    env: {
      NEXT_PUBLIC_USE_EMULATORS: "true",
      EMULATOR_NAMESPACE: E2E_NAMESPACE,
      NEXT_DIST_DIR: ".next-e2e",
    },
  },
});
