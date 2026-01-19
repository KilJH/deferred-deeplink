import { NextRequest, NextResponse } from 'next/server';
import {
  saveDeferredDeeplink,
  getDeferredDeeplink,
  deleteDeferredDeeplink,
  getDeferredDeeplinkByIP,
  getAllDeferredDeeplinks,
} from '@/lib/storage';
import { generateServerFingerprint } from '@/lib/fingerprint';

/**
 * POST /api/deferred
 * 딥링크 정보 저장 (웹 랜딩 페이지에서 호출)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { fingerprint, path, params } = body;

    if (!path) {
      return NextResponse.json(
        { error: 'path is required' },
        { status: 400 }
      );
    }

    // 클라이언트 정보 수집
    const ipAddress = getClientIP(request);
    const userAgent = request.headers.get('user-agent') || '';

    // 클라이언트 fingerprint가 없으면 서버에서 생성
    const finalFingerprint = fingerprint || generateServerFingerprint(ipAddress, userAgent);

    saveDeferredDeeplink({
      fingerprint: finalFingerprint,
      path,
      params,
      createdAt: Date.now(),
      ipAddress,
      userAgent,
    });

    return NextResponse.json({
      success: true,
      fingerprint: finalFingerprint,
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
 * 딥링크 정보 조회 (앱에서 호출)
 * Query params:
 *   - fingerprint: 클라이언트 fingerprint (선택)
 *   - debug: true면 모든 저장된 딥링크 반환
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const fingerprint = searchParams.get('fingerprint');
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

    let data = null;

    // 1. fingerprint로 먼저 검색
    if (fingerprint) {
      data = getDeferredDeeplink(fingerprint);
    }

    // 2. fingerprint 매칭 실패 시 서버 생성 fingerprint로 검색
    if (!data) {
      const serverFingerprint = generateServerFingerprint(ipAddress, userAgent);
      data = getDeferredDeeplink(serverFingerprint);
    }

    // 3. 여전히 실패 시 IP로 fallback 검색
    if (!data) {
      data = getDeferredDeeplinkByIP(ipAddress);
    }

    if (!data) {
      return NextResponse.json({
        success: false,
        message: 'No deferred deeplink found',
        clientInfo: {
          fingerprint,
          ipAddress,
        },
      });
    }

    // 조회 후 삭제 (1회용)
    deleteDeferredDeeplink(data.fingerprint);

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
