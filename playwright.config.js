import { defineConfig } from "@playwright/test";

const executablePath =
  process.env.BRAVE_PATH ||
  (process.platform === "darwin"
    ? "/Applications/Brave Browser.app/Contents/MacOS/Brave Browser"
    : process.platform === "win32"
      ? "C:\\Program Files\\BraveSoftware\\Brave-Browser\\Application\\brave.exe"
      : "/usr/bin/brave-browser");

export default defineConfig({
  testDir: "./tests",
  fullyParallel: false,
  workers: 1,
  reporter: "list",
  use: {
    baseURL: "http://127.0.0.1:4173",
    browserName: "chromium",
    launchOptions: { executablePath },
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
  },
  webServer: {
    command: "npm run preview -- --port 4173 --strictPort",
    url: "http://127.0.0.1:4173",
    reuseExistingServer: false,
  },
});
