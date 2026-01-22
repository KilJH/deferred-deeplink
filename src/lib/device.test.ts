import { describe, it, expect } from 'vitest';
import {
  getDeviceType,
  getAppStoreUrl,
  getPlayStoreUrl,
  buildDeeplinkUrl,
} from './device';

describe('device', () => {
  describe('getDeviceType', () => {
    it('iPhone User-Agent를 iOS로 감지해야 함', () => {
      const ua = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15';
      expect(getDeviceType(ua)).toBe('ios');
    });

    it('iPad User-Agent를 iOS로 감지해야 함', () => {
      const ua = 'Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15';
      expect(getDeviceType(ua)).toBe('ios');
    });

    it('iPod User-Agent를 iOS로 감지해야 함', () => {
      const ua = 'Mozilla/5.0 (iPod touch; CPU iPhone OS 15_0 like Mac OS X)';
      expect(getDeviceType(ua)).toBe('ios');
    });

    it('Android User-Agent를 Android로 감지해야 함', () => {
      const ua = 'Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36';
      expect(getDeviceType(ua)).toBe('android');
    });

    it('Samsung Galaxy User-Agent를 Android로 감지해야 함', () => {
      const ua = 'Mozilla/5.0 (Linux; Android 13; SM-S918B) AppleWebKit/537.36';
      expect(getDeviceType(ua)).toBe('android');
    });

    it('Desktop Chrome User-Agent를 unknown으로 감지해야 함', () => {
      const ua = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36';
      expect(getDeviceType(ua)).toBe('unknown');
    });

    it('Desktop Windows User-Agent를 unknown으로 감지해야 함', () => {
      const ua = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';
      expect(getDeviceType(ua)).toBe('unknown');
    });

    it('빈 User-Agent를 unknown으로 감지해야 함', () => {
      expect(getDeviceType('')).toBe('unknown');
    });

    it('대소문자 구분 없이 감지해야 함', () => {
      expect(getDeviceType('IPHONE')).toBe('ios');
      expect(getDeviceType('ANDROID')).toBe('android');
    });
  });

  describe('getAppStoreUrl', () => {
    it('올바른 App Store URL을 생성해야 함', () => {
      const url = getAppStoreUrl('6478488892');
      expect(url).toBe('https://apps.apple.com/app/id6478488892');
    });
  });

  describe('getPlayStoreUrl', () => {
    it('올바른 Play Store URL을 생성해야 함', () => {
      const url = getPlayStoreUrl('com.add.verychat_app');
      expect(url).toBe('https://play.google.com/store/apps/details?id=com.add.verychat_app');
    });
  });

  describe('buildDeeplinkUrl', () => {
    it('기본 딥링크 URL을 생성해야 함', () => {
      const url = buildDeeplinkUrl('verychat', '/invite/abc123');
      expect(url).toBe('verychat://invite/abc123');
    });

    it('슬래시로 시작하지 않는 경로도 처리해야 함', () => {
      const url = buildDeeplinkUrl('verychat', 'channel/123');
      expect(url).toBe('verychat://channel/123');
    });

    it('쿼리 파라미터를 포함해야 함', () => {
      const url = buildDeeplinkUrl('verychat', '/invite/abc', { ref: 'campaign1' });
      expect(url).toBe('verychat://invite/abc?ref=campaign1');
    });

    it('여러 쿼리 파라미터를 포함해야 함', () => {
      const url = buildDeeplinkUrl('verychat', '/post/123', {
        ref: 'share',
        source: 'web',
      });
      expect(url).toContain('verychat://post/123?');
      expect(url).toContain('ref=share');
      expect(url).toContain('source=web');
    });

    it('빈 params 객체는 쿼리 스트링을 추가하지 않아야 함', () => {
      const url = buildDeeplinkUrl('verychat', '/home', {});
      expect(url).toBe('verychat://home');
    });

    it('루트 경로를 처리해야 함', () => {
      const url = buildDeeplinkUrl('verychat', '/');
      expect(url).toBe('verychat://');
    });
  });
});
