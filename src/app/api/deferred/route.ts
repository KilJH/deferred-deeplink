import { NextRequest, NextResponse } from 'next/server';
import {
  saveDeferredDeeplink,
  getDeferredDeeplinkByFingerprint,
  getDeferredDeeplinkByIPUA,
  deleteDeferredDeeplink,
  getDeferredDeeplinkByIP,
  getAllDeferredDeeplinks,
  DeviceFingerprint,
} from '@/lib/storage';

/**
 * POST /api/deferred
 * 딥링크 정보 저장 (웹 랜딩 페이지에서 호출)
 * 복합 fingerprint 기반으로 저장 (IP + UA + 추가 데이터)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { path, params, timezone, screenResolution } = body;

    if (!path) {
      return NextResponse.json(
        { error: 'path is required' },
        { status: 400 }
      );
    }

    // 클라이언트 정보 수집
    const fingerprint: DeviceFingerprint = {
      ipAddress: getClientIP(request),
      userAgent: request.headers.get('user-agent') || '',
      acceptLanguage: request.headers.get('accept-language') || undefined,
      timezone: timezone || undefined,
      screenResolution: screenResolution || undefined,
    };

    saveDeferredDeeplink({
      path,
      params,
      fingerprint,
    });

    console.log('[Deferred Deeplink Saved]', {
      path,
      ip: fingerprint.ipAddress,
      ua: fingerprint.userAgent.substring(0, 50),
      lang: fingerprint.acceptLanguage,
      tz: fingerprint.timezone,
      screen: fingerprint.screenResolution,
    });

    return NextResponse.json({
      success: true,
      message: 'Deferred deeplink saved',
    });
  } catch (error) {
    console.error('Error saving deferred deeplink:', error);
    return NextResponse.json(
      { error: 'Failed to save deferred deeplink' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/deferred
 * 딥링크 정보 조회 (디버그용)
 * Query params:
 *   - debug: true면 모든 저장된 딥링크 반환
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const debug = searchParams.get('debug') === 'true';

    // 디버그 모드: 모든 딥링크 반환
    if (debug) {
      const allLinks = getAllDeferredDeeplinks();
      return NextResponse.json({
        success: true,
        count: allLinks.length,
        links: allLinks,
      });
    }

    const ipAddress = getClientIP(request);
    const userAgent = request.headers.get('user-agent') || '';
    const acceptLanguage = request.headers.get('accept-language') || undefined;

    // 1. 기본 fingerprint로 검색 (추가 데이터 없이)
    let data = getDeferredDeeplinkByFingerprint({
      ipAddress,
      userAgent,
      acceptLanguage,
    });

    // 2. 실패 시 IP + UA만으로 검색
    if (!data) {
      data = getDeferredDeeplinkByIPUA(ipAddress, userAgent);
    }

    // 3. 최종 fallback: IP만으로 검색
    if (!data) {
      data = getDeferredDeeplinkByIP(ipAddress);
    }

    if (!data) {
      return NextResponse.json({
        success: false,
        message: 'No deferred deeplink found',
        clientInfo: {
          ipAddress,
        },
      });
    }

    // 조회 후 삭제 (1회용)
    deleteDeferredDeeplink(data.id);

    return NextResponse.json({
      success: true,
      path: data.path,
      params: data.params,
      createdAt: data.createdAt,
    });
  } catch (error) {
    console.error('Error getting deferred deeplink:', error);
    return NextResponse.json(
      { error: 'Failed to get deferred deeplink' },
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
