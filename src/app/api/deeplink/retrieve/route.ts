import { NextRequest, NextResponse } from 'next/server';
import {
  getDeferredDeeplinkByFingerprint,
  getDeferredDeeplinkByIPUA,
  getDeferredDeeplinkByIP,
  deleteDeferredDeeplink,
  DeviceFingerprint,
} from '@/lib/storage';

/**
 * POST /api/deeplink/retrieve
 * 앱에서 디퍼드 딥링크 조회
 *
 * Request body:
 *   - platform: 플랫폼 (ios, android)
 *   - bundleId: 앱 번들 ID
 *   - timezone: (optional) 타임존
 *   - screenResolution: (optional) 화면 해상도
 *   - locale: (optional) 로케일
 *
 * 매칭 방식: 복합 fingerprint (IP + UA + 추가 데이터)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { platform, bundleId, timezone, screenResolution, locale } = body;

    // 클라이언트 정보 수집
    const ipAddress = getClientIP(request);
    const userAgent = request.headers.get('user-agent') || '';
    const acceptLanguage = request.headers.get('accept-language') || locale || undefined;

    const fingerprint: DeviceFingerprint = {
      ipAddress,
      userAgent,
      acceptLanguage,
      timezone,
      screenResolution,
    };

    console.log('[Deferred Deeplink Retrieve]', {
      platform,
      bundleId,
      ip: ipAddress,
      ua: userAgent.substring(0, 50),
      lang: acceptLanguage,
      tz: timezone,
      screen: screenResolution,
    });

    // 1. 전체 fingerprint로 검색
    let data = getDeferredDeeplinkByFingerprint(fingerprint);

    // 2. 실패 시 IP + UA만으로 검색
    if (!data) {
      data = getDeferredDeeplinkByIPUA(ipAddress, userAgent);
    }

    // 3. 최종 fallback: IP만으로 검색
    if (!data) {
      data = getDeferredDeeplinkByIP(ipAddress);
    }

    if (!data) {
      console.log('[Deferred Deeplink Retrieve] Result: NOT FOUND');
      return NextResponse.json({
        success: false,
        message: 'No deferred deeplink found',
      });
    }

    // 조회 후 삭제 (1회용)
    deleteDeferredDeeplink(data.id);

    console.log('[Deferred Deeplink Retrieve] Result: SUCCESS', {
      path: data.path,
      params: data.params,
    });

    return NextResponse.json({
      success: true,
      path: data.path,
      params: data.params || {},
      createdAt: data.createdAt,
    });
  } catch (error) {
    console.error('Error retrieving deferred deeplink:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to retrieve deferred deeplink' },
      { status: 500 }
    );
  }
}

/**
 * 클라이언트 IP 주소 추출
 */
function getClientIP(request: NextRequest): string {
  // Vercel 배포 시
  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim();
  }

  // Cloudflare
  const cfConnectingIP = request.headers.get('cf-connecting-ip');
  if (cfConnectingIP) {
    return cfConnectingIP;
  }

  // 기본값
  const realIP = request.headers.get('x-real-ip');
  if (realIP) {
    return realIP;
  }

  return 'unknown';
}
