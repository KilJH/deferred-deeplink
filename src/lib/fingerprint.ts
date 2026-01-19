/**
 * 클라이언트 측 fingerprint 생성
 * 테스트용으로 간단한 정보만 수집
 * 실제 프로덕션에서는 FingerprintJS 등의 라이브러리 사용 권장
 */
export async function generateFingerprint(): Promise<string> {
  if (typeof window === 'undefined') {
    return '';
  }

  const components: string[] = [];

  // 화면 정보
  components.push(`${screen.width}x${screen.height}`);
  components.push(`${screen.colorDepth}`);

  // 타임존
  components.push(Intl.DateTimeFormat().resolvedOptions().timeZone);

  // 언어
  components.push(navigator.language);

  // 플랫폼
  components.push(navigator.platform);

  // User-Agent (브라우저/OS 정보 포함)
  components.push(navigator.userAgent);

  // Canvas fingerprint (간단 버전)
  try {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.textBaseline = 'top';
      ctx.font = '14px Arial';
      ctx.fillText('fingerprint', 2, 2);
      components.push(canvas.toDataURL().slice(-50));
    }
  } catch {
    // Canvas 접근 실패 시 무시
  }

  // 해시 생성
  const fingerprint = await hashString(components.join('|'));
  return fingerprint;
}

/**
 * 문자열을 SHA-256 해시로 변환
 */
async function hashString(str: string): Promise<string> {
  if (typeof window === 'undefined' || !window.crypto?.subtle) {
    // 서버 사이드 또는 crypto 미지원 시 간단한 해시
    return simpleHash(str);
  }

  const encoder = new TextEncoder();
  const data = encoder.encode(str);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * 간단한 해시 함수 (폴백용)
 */
function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16);
}

/**
 * 서버 측에서 IP 기반 식별자 생성
 * 테스트용으로 IP + User-Agent 조합 사용
 */
export function generateServerFingerprint(ipAddress: string, userAgent: string): string {
  const components = [ipAddress, userAgent];
  return simpleHash(components.join('|'));
}
