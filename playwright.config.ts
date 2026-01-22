import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:3001',
    trace: 'on-first-retry',
  },
  projects: [
    // API 테스트 (디바이스 에뮬레이션 불필요)
    {
      name: 'API',
      testMatch: '**/api.spec.ts',
    },
    // 모바일 웹 테스트 (Chromium 기반)
    {
      name: 'Mobile iOS',
      testIgnore: '**/api.spec.ts',
      use: {
        ...devices['iPhone 14'],
        // Chromium으로 iOS UA 에뮬레이션
        browserName: 'chromium',
      },
    },
    {
      name: 'Mobile Android',
      testIgnore: '**/api.spec.ts',
      use: { ...devices['Pixel 7'] },
    },
    // 데스크톱 테스트
    {
      name: 'Desktop Chrome',
      testIgnore: '**/api.spec.ts',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'npm run dev -- --port 3001',
    url: 'http://localhost:3001',
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
});
