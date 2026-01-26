import { test, expect } from '@playwright/test';

test.describe('웹 랜딩 페이지', () => {
  test('데스크톱 접근 시 "모바일에서 접근" 메시지 표시', async ({ page }) => {
    const testInfo = test.info();
    test.skip(testInfo.project.name !== 'Desktop Chrome', '데스크톱 전용 테스트');

    await page.goto('/');

    // 모바일이 아니면 fallback 메시지 표시
    await expect(page.getByText('모바일 기기에서 접근해주세요')).toBeVisible({ timeout: 5000 });
  });

  test('앱이 설치되지 않은 경우 API 호출 확인 (모바일)', async ({ page }) => {
    const testInfo = test.info();
    test.skip(testInfo.project.name === 'Desktop Chrome', '모바일 전용 테스트');

    // API 요청 가로채기
    let apiCalled = false;
    let requestBody: Record<string, unknown> | null = null;

    await page.route('**/api/deferred', async (route) => {
      if (route.request().method() === 'POST') {
        apiCalled = true;
        requestBody = route.request().postDataJSON();
      }
      await route.continue();
    });

    await page.goto('/invite/test123', { waitUntil: 'domcontentloaded' });

    // API 호출 대기 (앱 실행 타임아웃 1초 + 네트워크 지연)
    await page.waitForTimeout(2500);

    expect(apiCalled).toBe(true);
    expect(requestBody).not.toBeNull();
    expect(requestBody?.path).toBe('/invite/test123');
  });

  test('fingerprint 데이터가 API 요청에 포함되어야 함', async ({ page }) => {
    const testInfo = test.info();
    test.skip(testInfo.project.name === 'Desktop Chrome', '모바일 전용 테스트');

    let requestBody: Record<string, unknown> | null = null;

    await page.route('**/api/deferred', async (route) => {
      if (route.request().method() === 'POST') {
        requestBody = route.request().postDataJSON();
      }
      await route.continue();
    });

    await page.goto('/channel/abc', { waitUntil: 'domcontentloaded' });
    // API 호출 대기 (앱 실행 타임아웃 1초 + 네트워크 지연)
    await page.waitForTimeout(2500);

    expect(requestBody).not.toBeNull();
    // timezone과 screenResolution이 포함되어야 함
    expect(requestBody?.timezone).toBeDefined();
    expect(requestBody?.screenResolution).toBeDefined();
  });

  test('쿼리 파라미터가 API 요청에 포함되어야 함', async ({ page }) => {
    const testInfo = test.info();
    test.skip(testInfo.project.name === 'Desktop Chrome', '모바일 전용 테스트');

    let requestBody: Record<string, unknown> | null = null;

    await page.route('**/api/deferred', async (route) => {
      if (route.request().method() === 'POST') {
        requestBody = route.request().postDataJSON();
      }
      await route.continue();
    });

    await page.goto('/invite/xyz?ref=campaign1&source=share', { waitUntil: 'domcontentloaded' });
    // API 호출 대기 (앱 실행 타임아웃 1초 + 네트워크 지연)
    await page.waitForTimeout(2500);

    expect(requestBody).not.toBeNull();
    expect(requestBody?.path).toBe('/invite/xyz');
    expect(requestBody?.params).toBeDefined();

    const params = requestBody?.params as Record<string, string>;
    expect(params?.ref).toBe('campaign1');
    expect(params?.source).toBe('share');
  });
});
