export type DeviceType = 'ios' | 'android' | 'unknown';

/**
 * User-Agent를 분석하여 디바이스 타입 반환
 */
export function getDeviceType(userAgent: string): DeviceType {
  const ua = userAgent.toLowerCase();

  // iOS 감지 (iPhone, iPad, iPod)
  if (/iphone|ipad|ipod/.test(ua)) {
    return 'ios';
  }

  // Android 감지
  if (/android/.test(ua)) {
    return 'android';
  }

  return 'unknown';
}

/**
 * 클라이언트에서 디바이스 타입 감지
 */
export function getClientDeviceType(): DeviceType {
  if (typeof window === 'undefined') {
    return 'unknown';
  }

  return getDeviceType(navigator.userAgent);
}

/**
 * iOS App Store URL 생성
 */
export function getAppStoreUrl(appId: string): string {
  return `https://apps.apple.com/app/id${appId}`;
}

/**
 * Google Play Store URL 생성
 */
export function getPlayStoreUrl(packageName: string): string {
  return `https://play.google.com/store/apps/details?id=${packageName}`;
}

/**
 * 커스텀 스킴 딥링크 URL 생성
 */
export function buildDeeplinkUrl(scheme: string, path: string, params?: Record<string, string>): string {
  let url = `${scheme}://${path.startsWith('/') ? path.slice(1) : path}`;

  if (params && Object.keys(params).length > 0) {
    const queryString = new URLSearchParams(params).toString();
    url += `?${queryString}`;
  }

  return url;
}
