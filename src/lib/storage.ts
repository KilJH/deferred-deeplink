import { APP_CONFIG } from '@/constants';

export interface DeferredDeeplink {
  fingerprint: string;
  path: string;
  params?: Record<string, string>;
  createdAt: number;
  ipAddress?: string;
  userAgent?: string;
}

// 인메모리 저장소 (서버 재시작 시 초기화됨)
const storage = new Map<string, DeferredDeeplink>();

export function saveDeferredDeeplink(data: DeferredDeeplink): void {
  // 기존에 같은 fingerprint가 있으면 덮어쓰기
  storage.set(data.fingerprint, {
    ...data,
    createdAt: Date.now(),
  });

  // 만료된 데이터 정리
  cleanupExpiredLinks();
}

export function getDeferredDeeplink(fingerprint: string): DeferredDeeplink | null {
  const data = storage.get(fingerprint);

  if (!data) {
    return null;
  }

  // 만료 체크
  if (Date.now() - data.createdAt > APP_CONFIG.deeplinkExpiry) {
    storage.delete(fingerprint);
    return null;
  }

  return data;
}

export function deleteDeferredDeeplink(fingerprint: string): void {
  storage.delete(fingerprint);
}

// IP 기반으로 딥링크 찾기 (fingerprint 매칭 실패 시 fallback)
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
