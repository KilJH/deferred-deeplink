import { NextRequest, NextResponse } from 'next/server';
import {
  getDeferredDeeplinkByIPUA,
  getDeferredDeeplinkByIP,
  deleteDeferredDeeplink,
} from '@/lib/storage';

/**
 * POST /api/deeplink/retrieve
 * 앱에서 디퍼드 딥링크 조회
 *
 * Request body:
 *   - deviceId: 앱 디바이스 ID (iOS IDFV, Android ID) - 사용 안 함
 *   - platform: 플랫폼 (ios, android)
 *   - bundleId: 앱 번들 ID
 *
 * 매칭 방식: IP + User-Agent (업계 표준)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { platform, bundleId } = body;

    // 클라이언트 정보 수집
    const ipAddress = getClientIP(request);
    const userAgent = request.headers.get('user-agent') || '';

    console.log('[Deferred Deeplink Retrieve]', {
      platform,
      bundleId,
      ipAddress,
      userAgent: userAgent.substring(0, 100),
    });

    // 1. IP + User-Agent로 검색
    let data = getDeferredDeeplinkByIPUA(ipAddress, userAgent);

    // 2. 실패 시 IP만으로 fallback 검색
    if (!data) {
      data = getDeferredDeeplinkByIP(ipAddress);
    }

    if (!data) {
      return NextResponse.json({
        success: false,
        message: 'No deferred deeplink found',
        debug: {
          ipAddress,
          userAgentPrefix: userAgent.substring(0, 50),
        },
      });
    }

    // 조회 후 삭제 (1회용)
    deleteDeferredDeeplink(data.id);

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
