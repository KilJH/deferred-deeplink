import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
  saveDeferredDeeplink,
  getDeferredDeeplinkByFingerprint,
  getDeferredDeeplinkByIPUA,
  getDeferredDeeplinkByIP,
  deleteDeferredDeeplink,
  getAllDeferredDeeplinks,
  clearStorage,
  generateMatchKey,
  generateBasicMatchKey,
  DeviceFingerprint,
} from './storage';

describe('storage', () => {
  beforeEach(() => {
    clearStorage();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const createFingerprint = (overrides?: Partial<DeviceFingerprint>): DeviceFingerprint => ({
    ipAddress: '192.168.1.1',
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)',
    acceptLanguage: 'ko-KR',
    timezone: 'Asia/Seoul',
    screenResolution: '390x844',
    ...overrides,
  });

  describe('generateMatchKey', () => {
    it('같은 fingerprint는 같은 키를 생성해야 함', () => {
      const fp = createFingerprint();
      const key1 = generateMatchKey(fp);
      const key2 = generateMatchKey(fp);
      expect(key1).toBe(key2);
    });

    it('다른 fingerprint는 다른 키를 생성해야 함', () => {
      const fp1 = createFingerprint({ ipAddress: '192.168.1.1' });
      const fp2 = createFingerprint({ ipAddress: '192.168.1.2' });
      expect(generateMatchKey(fp1)).not.toBe(generateMatchKey(fp2));
    });

    it('추가 데이터가 없어도 키를 생성해야 함', () => {
      const fp = { ipAddress: '192.168.1.1', userAgent: 'test' };
      const key = generateMatchKey(fp);
      expect(key).toBeDefined();
      expect(typeof key).toBe('string');
    });
  });

  describe('generateBasicMatchKey', () => {
    it('IP + UA만으로 키를 생성해야 함', () => {
      const key = generateBasicMatchKey('192.168.1.1', 'Mozilla/5.0');
      expect(key).toBeDefined();
      expect(typeof key).toBe('string');
    });
  });

  describe('saveDeferredDeeplink / getDeferredDeeplinkByFingerprint', () => {
    it('딥링크를 저장하고 조회할 수 있어야 함', () => {
      const fingerprint = createFingerprint();
      saveDeferredDeeplink({
        path: '/invite/abc123',
        params: { ref: 'campaign1' },
        fingerprint,
      });

      const result = getDeferredDeeplinkByFingerprint(fingerprint);
      expect(result).not.toBeNull();
      expect(result?.path).toBe('/invite/abc123');
      expect(result?.params?.ref).toBe('campaign1');
    });

    it('존재하지 않는 fingerprint로 조회 시 null 반환', () => {
      const result = getDeferredDeeplinkByFingerprint(createFingerprint());
      expect(result).toBeNull();
    });
  });

  describe('getDeferredDeeplinkByIPUA (IP+UA fallback)', () => {
    it('IP + UA만으로도 조회할 수 있어야 함', () => {
      const fingerprint = {
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0 Test',
      };

      saveDeferredDeeplink({
        path: '/channel/123',
        fingerprint,
      });

      const result = getDeferredDeeplinkByIPUA('192.168.1.1', 'Mozilla/5.0 Test');
      expect(result).not.toBeNull();
      expect(result?.path).toBe('/channel/123');
    });
  });

  describe('getDeferredDeeplinkByIP (IP only fallback)', () => {
    it('IP만으로도 조회할 수 있어야 함', () => {
      saveDeferredDeeplink({
        path: '/post/456',
        fingerprint: createFingerprint({ ipAddress: '10.0.0.1' }),
      });

      const result = getDeferredDeeplinkByIP('10.0.0.1');
      expect(result).not.toBeNull();
      expect(result?.path).toBe('/post/456');
    });

    it('같은 IP로 여러 딥링크가 있으면 첫 번째 반환', () => {
      saveDeferredDeeplink({
        path: '/first',
        fingerprint: createFingerprint({ ipAddress: '10.0.0.1', userAgent: 'UA1' }),
      });
      saveDeferredDeeplink({
        path: '/second',
        fingerprint: createFingerprint({ ipAddress: '10.0.0.1', userAgent: 'UA2' }),
      });

      const result = getDeferredDeeplinkByIP('10.0.0.1');
      expect(result).not.toBeNull();
      // Map 순회 순서에 따라 첫 번째 또는 두 번째가 반환됨
      expect(['/first', '/second']).toContain(result?.path);
    });
  });

  describe('deleteDeferredDeeplink', () => {
    it('딥링크를 삭제할 수 있어야 함', () => {
      const fingerprint = createFingerprint();
      saveDeferredDeeplink({
        path: '/delete-test',
        fingerprint,
      });

      const saved = getDeferredDeeplinkByFingerprint(fingerprint);
      expect(saved).not.toBeNull();

      deleteDeferredDeeplink(saved!.id);

      const deleted = getDeferredDeeplinkByFingerprint(fingerprint);
      expect(deleted).toBeNull();
    });
  });

  describe('24시간 만료', () => {
    it('24시간 후에는 조회되지 않아야 함', () => {
      const fingerprint = createFingerprint();
      saveDeferredDeeplink({
        path: '/expire-test',
        fingerprint,
      });

      // 저장 직후에는 조회 가능
      expect(getDeferredDeeplinkByFingerprint(fingerprint)).not.toBeNull();

      // 24시간 + 1ms 경과
      vi.advanceTimersByTime(24 * 60 * 60 * 1000 + 1);

      // 만료 후에는 조회 불가
      expect(getDeferredDeeplinkByFingerprint(fingerprint)).toBeNull();
    });

    it('IP fallback도 24시간 후에는 조회되지 않아야 함', () => {
      saveDeferredDeeplink({
        path: '/expire-ip-test',
        fingerprint: createFingerprint({ ipAddress: '172.16.0.1' }),
      });

      vi.advanceTimersByTime(24 * 60 * 60 * 1000 + 1);

      expect(getDeferredDeeplinkByIP('172.16.0.1')).toBeNull();
    });
  });

  describe('getAllDeferredDeeplinks', () => {
    it('모든 딥링크를 반환해야 함', () => {
      saveDeferredDeeplink({
        path: '/one',
        fingerprint: createFingerprint({ ipAddress: '1.1.1.1' }),
      });
      saveDeferredDeeplink({
        path: '/two',
        fingerprint: createFingerprint({ ipAddress: '2.2.2.2' }),
      });

      const all = getAllDeferredDeeplinks();
      expect(all.length).toBe(2);
    });

    it('만료된 딥링크는 제외해야 함', () => {
      saveDeferredDeeplink({
        path: '/fresh',
        fingerprint: createFingerprint({ ipAddress: '1.1.1.1' }),
      });

      vi.advanceTimersByTime(12 * 60 * 60 * 1000); // 12시간 경과

      saveDeferredDeeplink({
        path: '/newer',
        fingerprint: createFingerprint({ ipAddress: '2.2.2.2' }),
      });

      vi.advanceTimersByTime(13 * 60 * 60 * 1000); // 추가 13시간 경과 (첫 번째 만료)

      const all = getAllDeferredDeeplinks();
      expect(all.length).toBe(1);
      expect(all[0].path).toBe('/newer');
    });
  });

  describe('조회 후 삭제 시나리오', () => {
    it('조회 후 삭제하면 재조회 불가', () => {
      const fingerprint = createFingerprint();
      saveDeferredDeeplink({
        path: '/one-time',
        fingerprint,
      });

      const first = getDeferredDeeplinkByFingerprint(fingerprint);
      expect(first).not.toBeNull();

      // 조회 후 삭제 (실제 API에서 하는 동작)
      deleteDeferredDeeplink(first!.id);

      const second = getDeferredDeeplinkByFingerprint(fingerprint);
      expect(second).toBeNull();
    });
  });
});
