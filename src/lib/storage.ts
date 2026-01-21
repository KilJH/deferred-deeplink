import { APP_CONFIG } from '@/constants';

export interface DeferredDeeplink {
  id: string;  // IP + UA 해시
  path: string;
  params?: Record<string, string>;
  createdAt: number;
  ipAddress: string;
  userAgent: string;
}

// 인메모리 저장소 (서버 재시작 시 초기화됨)
const storage = new Map<string, DeferredDeeplink>();

/**
 * IP + User-Agent 조합으로 고유 ID 생성
 */
export function generateMatchKey(ipAddress: string, userAgent: string): string {
  // 간단한 해시 (프로덕션에서는 더 강력한 해시 사용 권장)
  const str = `${ipAddress}|${userAgent}`;
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36);
}

export function saveDeferredDeeplink(data: Omit<DeferredDeeplink, 'id' | 'createdAt'>): void {
  const id = generateMatchKey(data.ipAddress, data.userAgent);

  storage.set(id, {
    ...data,
    id,
    createdAt: Date.now(),
  });

  // 만료된 데이터 정리
  cleanupExpiredLinks();
}

/**
 * IP + User-Agent로 딥링크 조회
 */
export function getDeferredDeeplinkByIPUA(ipAddress: string, userAgent: string): DeferredDeeplink | null {
  const id = generateMatchKey(ipAddress, userAgent);
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
 * IP만으로 딥링크 조회 (fallback)
 */
export function getDeferredDeeplinkByIP(ipAddress: string): DeferredDeeplink | null {
  for (const [, data] of storage) {
    if (data.ipAddress === ipAddress) {
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
