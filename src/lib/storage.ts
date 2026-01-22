import { APP_CONFIG } from '@/constants';

export interface DeviceFingerprint {
  ipAddress: string;
  userAgent: string;
  acceptLanguage?: string;
  timezone?: string;
  screenResolution?: string;
}

export interface DeferredDeeplink {
  id: string;  // 복합 해시 (IP + UA + 추가 데이터)
  path: string;
  params?: Record<string, string>;
  createdAt: number;
  fingerprint: DeviceFingerprint;
}

// 인메모리 저장소 (서버 재시작 시 초기화됨)
const storage = new Map<string, DeferredDeeplink>();

/**
 * 복합 식별 키 생성 (IP + UA + 추가 데이터)
 */
export function generateMatchKey(fingerprint: DeviceFingerprint): string {
  // 기본: IP + UA
  let str = `${fingerprint.ipAddress}|${fingerprint.userAgent}`;

  // 추가 데이터가 있으면 포함 (정확도 향상)
  if (fingerprint.acceptLanguage) {
    str += `|${fingerprint.acceptLanguage}`;
  }
  if (fingerprint.timezone) {
    str += `|${fingerprint.timezone}`;
  }
  if (fingerprint.screenResolution) {
    str += `|${fingerprint.screenResolution}`;
  }

  // 간단한 해시 (프로덕션에서는 더 강력한 해시 사용 권장)
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36);
}

/**
 * IP + UA만으로 키 생성 (fallback용)
 */
export function generateBasicMatchKey(ipAddress: string, userAgent: string): string {
  const str = `${ipAddress}|${userAgent}`;
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36);
}

export function saveDeferredDeeplink(data: {
  path: string;
  params?: Record<string, string>;
  fingerprint: DeviceFingerprint;
}): void {
  const id = generateMatchKey(data.fingerprint);

  storage.set(id, {
    path: data.path,
    params: data.params,
    fingerprint: data.fingerprint,
    id,
    createdAt: Date.now(),
  });

  // 만료된 데이터 정리
  cleanupExpiredLinks();
}

/**
 * fingerprint로 딥링크 조회 (추가 데이터 포함)
 */
export function getDeferredDeeplinkByFingerprint(fingerprint: DeviceFingerprint): DeferredDeeplink | null {
  const id = generateMatchKey(fingerprint);
  const data = storage.get(id);

  if (!data) {
    return null;
  }

  // 만료 체크
  if (Date.now() - data.createdAt > APP_CONFIG.deeplinkExpiry) {
    storage.delete(id);
    return null;
  }

  return data;
}

/**
 * IP + User-Agent만으로 딥링크 조회 (fallback)
 */
export function getDeferredDeeplinkByIPUA(ipAddress: string, userAgent: string): DeferredDeeplink | null {
  const id = generateBasicMatchKey(ipAddress, userAgent);
  const data = storage.get(id);

  if (!data) {
    return null;
  }

  // 만료 체크
  if (Date.now() - data.createdAt > APP_CONFIG.deeplinkExpiry) {
    storage.delete(id);
    return null;
  }

  return data;
}

/**
 * IP만으로 딥링크 조회 (최종 fallback)
 */
export function getDeferredDeeplinkByIP(ipAddress: string): DeferredDeeplink | null {
  for (const [, data] of storage) {
    if (data.fingerprint.ipAddress === ipAddress) {
      // 만료 체크
      if (Date.now() - data.createdAt > APP_CONFIG.deeplinkExpiry) {
        continue;
      }
      return data;
    }
  }
  return null;
}

export function deleteDeferredDeeplink(id: string): void {
  storage.delete(id);
}

function cleanupExpiredLinks(): void {
  const now = Date.now();
  for (const [key, data] of storage) {
    if (now - data.createdAt > APP_CONFIG.deeplinkExpiry) {
      storage.delete(key);
    }
  }
}

// 디버깅용: 모든 저장된 딥링크 조회
export function getAllDeferredDeeplinks(): DeferredDeeplink[] {
  cleanupExpiredLinks();
  return Array.from(storage.values());
}

// 테스트용: 저장소 초기화
export function clearStorage(): void {
  storage.clear();
}
