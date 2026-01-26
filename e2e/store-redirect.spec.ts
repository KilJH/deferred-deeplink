import { test, expect } from '@playwright/test';

test.describe('스토어 리다이렉트', () => {
  test('iOS에서 App Store URL로 리다이렉트 시도', async ({ page }) => {
    const testInfo = test.info();
    test.skip(testInfo.project.name !== 'Mobile iOS', 'iOS Safari 전용 테스트');

    // 리다이렉트 URL 캡처
    let redirectUrl = '';
    page.on('request', (request) => {
      const url = request.url();
      if (url.includes('apps.apple.com')) {
        redirectUrl = url;
      }
    });

    // 딥링크 실행 시도 차단 (앱이 없으므로)
    await page.route('verychat://**', async (route) => {
      await route.abort();
    });

    await page.goto('/invite/test', { waitUntil: 'domcontentloaded' });

    // 1초 타임아웃 후 스토어로 이동 시도
    await page.waitForTimeout(2000);

    // location.href 변경 확인
    const currentUrl = page.url();

    // 앱이 없으므로 스토어 URL로 리다이렉트되거나 페이지에 스토어 버튼이 표시됨
    const hasStoreButton = await page.getByText('App Store에서 다운로드').isVisible().catch(() => false);
    const isStoreRedirect = currentUrl.includes('apps.apple.com') || redirectUrl.includes('apps.apple.com');

    expect(hasStoreButton || isStoreRedirect).toBe(true);
  });

  test('Android에서 Play Store URL로 리다이렉트 시도', async ({ page }) => {
    const testInfo = test.info();
    test.skip(testInfo.project.name !== 'Mobile Android', 'Android Chrome 전용 테스트');

    // 스토어 리다이렉트 URL 캡처
    let storeRedirect = false;
    page.on('request', (request) => {
      if (request.url().includes('play.google.com')) {
        storeRedirect = true;
      }
    });

    await page.goto('/invite/test', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);

    // Play Store 버튼 또는 리다이렉트 확인
    const hasStoreButton = await page.getByText('Play Store에서 다운로드').isVisible().catch(() => false);
    const currentUrl = page.url();
    const isStoreUrl = currentUrl.includes('play.google.com');

    expect(hasStoreButton || storeRedirect || isStoreUrl).toBe(true);
  });

  test('디바이스 타입이 올바르게 표시되어야 함 (iOS)', async ({ page }) => {
    const testInfo = test.info();
    test.skip(testInfo.project.name !== 'Mobile iOS', 'iOS Safari 전용 테스트');

    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(500);

    await expect(page.getByText('디바이스: ios')).toBeVisible();
  });

  test('디바이스 타입이 올바르게 표시되어야 함 (Android)', async ({ page }) => {
    const testInfo = test.info();
    test.skip(testInfo.project.name !== 'Mobile Android', 'Android Chrome 전용 테스트');

    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(500);

    await expect(page.getByText('디바이스: android')).toBeVisible();
  });

  test('딥링크 URL이 올바르게 표시되어야 함', async ({ page }) => {
    const testInfo = test.info();
    test.skip(testInfo.project.name === 'Desktop Chrome', '모바일 전용 테스트');

    await page.goto('/channel/123', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(500);

    // 딥링크 URL 확인
    await expect(page.getByText(/verychat:.*channel.*123/)).toBeVisible();
  });
});
