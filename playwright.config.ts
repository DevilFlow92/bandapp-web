import { defineConfig, devices } from "@playwright/test"

export const BASE_URL = process.env.E2E_BASE_URL ?? "http://localhost:5173"
export const API_URL = process.env.E2E_API_URL ?? "http://localhost:8000/api/v1/"

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  reporter: "list",
  use: {
    baseURL: BASE_URL,
    trace: "retain-on-failure",
  },
  webServer: {
    command: "npm run dev",
    url: BASE_URL,
    reuseExistingServer: true,
    timeout: 30_000,
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
})
