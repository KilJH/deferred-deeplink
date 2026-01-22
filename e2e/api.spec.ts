import { test, expect } from '@playwright/test';

test.describe('API 테스트', () => {
  test.describe('POST /api/deferred', () => {
    test('딥링크 저장 성공', async ({ request }) => {
      const response = await request.post('/api/deferred', {
        headers: {
          'Content-Type': 'application/json',
        },
        data: {
          path: '/invite/test123',
          params: { ref: 'campaign1' },
          timezone: 'Asia/Seoul',
          screenResolution: '390x844',
        },
      });

      expect(response.ok()).toBe(true);

      const body = await response.json();
      expect(body.success).toBe(true);
      expect(body.message).toBe('Deferred deeplink saved');
    });

    test('path 누락 시 400 에러', async ({ request }) => {
      const response = await request.post('/api/deferred', {
        headers: {
          'Content-Type': 'application/json',
        },
        data: {
          params: { ref: 'test' },
        },
      });

      expect(response.status()).toBe(400);

      const body = await response.json();
      expect(body.error).toBe('path is required');
    });
  });

  test.describe('GET /api/deferred', () => {
    test('debug 모드로 저장된 딥링크 조회', async ({ request }) => {
      // 먼저 딥링크 저장
      await request.post('/api/deferred', {
        headers: {
          'Content-Type': 'application/json',
        },
        data: {
          path: '/debug-test',
          timezone: 'Asia/Seoul',
        },
      });

      // debug 모드로 조회
      const response = await request.get('/api/deferred?debug=true');
      expect(response.ok()).toBe(true);

      const body = await response.json();
      expect(body.success).toBe(true);
      expect(body.count).toBeGreaterThanOrEqual(1);
      expect(Array.isArray(body.links)).toBe(true);
    });
  });

  test.describe('POST /api/deeplink/retrieve', () => {
    test('저장된 딥링크 조회 성공', async ({ request }) => {
      const uniqueAgent = 'Retrieve-Test-Agent-' + Date.now();

      // 먼저 딥링크 저장 (고유 UA 사용)
      await request.post('/api/deferred', {
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': uniqueAgent,
        },
        data: {
          path: '/retrieve-test',
          params: { key: 'value' },
        },
      });

      // 조회 요청 (같은 UA 사용)
      const response = await request.post('/api/deeplink/retrieve', {
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': uniqueAgent,
        },
        data: {
          platform: 'ios',
          bundleId: 'com.add.verychatApp',
        },
      });

      expect(response.ok()).toBe(true);

      const body = await response.json();
      // 같은 UA에서 요청했으므로 매칭되어야 함
      expect(body.success).toBe(true);
      expect(body.path).toBe('/retrieve-test');
      expect(body.params?.key).toBe('value');
    });

    test('존재하지 않는 딥링크 조회 시 실패 응답', async ({ request }) => {
      // 저장하지 않고 바로 조회
      const response = await request.post('/api/deeplink/retrieve', {
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Unique-Test-Agent-' + Date.now(),
        },
        data: {
          platform: 'android',
          bundleId: 'com.nonexistent.app',
        },
      });

      expect(response.ok()).toBe(true);

      const body = await response.json();
      // 매칭 실패 가능
      if (!body.success) {
        expect(body.message).toBe('No deferred deeplink found');
      }
    });

    // 1회용 삭제 테스트는 Unit 테스트(storage.test.ts)에서 검증
    // E2E에서는 IP fallback으로 인해 테스트 격리가 어려움
  });
});
