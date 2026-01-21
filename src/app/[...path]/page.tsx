'use client';

import { useEffect, useState, useCallback, useRef, Suspense } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { APP_CONFIG } from '@/constants';
import {
  getClientDeviceType,
  getAppStoreUrl,
  getPlayStoreUrl,
  buildDeeplinkUrl,
  DeviceType,
} from '@/lib/device';

function DeeplinkPageContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<'loading' | 'redirecting' | 'fallback' | 'done'>('loading');
  const [deviceType, setDeviceType] = useState<DeviceType>('unknown');
  const [message, setMessage] = useState('딥링크 처리 중...');
  const hasAttempted = useRef(false);

  // URL 경로를 딥링크 경로로 변환
  // params.path는 배열 형태: ['invite', 'abc123'] -> '/invite/abc123'
  const pathSegments = params.path as string[];
  const deeplinkPath = '/' + pathSegments.join('/');

  // 쿼리 파라미터를 객체로 변환
  const queryParams: Record<string, string> = {};
  searchParams.forEach((value, key) => {
    queryParams[key] = value;
  });
  const hasQueryParams = Object.keys(queryParams).length > 0;

  const saveDeeplink = useCallback(async () => {
    try {
      const response = await fetch('/api/deferred', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          path: deeplinkPath,
          params: hasQueryParams ? queryParams : undefined,
        }),
      });
      const data = await response.json();
      console.log('Deferred deeplink saved:', data);
      return data.success;
    } catch (error) {
      console.error('Failed to save deferred deeplink:', error);
      return false;
    }
  }, [deeplinkPath, queryParams, hasQueryParams]);

  const redirectToStore = useCallback((device: DeviceType) => {
    if (device === 'ios') {
      window.location.href = getAppStoreUrl(APP_CONFIG.iosAppId);
    } else if (device === 'android') {
      window.location.href = getPlayStoreUrl(APP_CONFIG.androidPackageName);
    } else {
      setMessage('지원하지 않는 기기입니다.');
    }
  }, []);

  const tryOpenApp = useCallback((device: DeviceType) => {
    const scheme = device === 'ios' ? APP_CONFIG.iosScheme : APP_CONFIG.androidScheme;
    const deeplinkUrl = buildDeeplinkUrl(scheme, deeplinkPath, hasQueryParams ? queryParams : undefined);

    console.log('Attempting to open app with:', deeplinkUrl);
    setMessage('앱 실행 시도 중...');
    setStatus('redirecting');

    // 앱이 열리면 페이지가 hidden됨 - 이를 감지
    let appOpened = false;
    const onVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        appOpened = true;
      }
    };
    document.addEventListener('visibilitychange', onVisibilityChange);

    // <a> 태그로 앱 열기 시도
    const link = document.createElement('a');
    link.href = deeplinkUrl;
    link.click();

    // 앱이 실행되지 않으면 스토어로 이동
    setTimeout(() => {
      document.removeEventListener('visibilitychange', onVisibilityChange);

      if (!appOpened && document.visibilityState !== 'hidden') {
        setStatus('fallback');
        setMessage('앱이 설치되어 있지 않습니다. 스토어로 이동합니다...');
        redirectToStore(device);
      }
    }, APP_CONFIG.appLaunchTimeout);
  }, [deeplinkPath, queryParams, hasQueryParams, redirectToStore]);

  useEffect(() => {
    // 이미 시도했으면 무시 (React strict mode 대응)
    if (hasAttempted.current) return;
    hasAttempted.current = true;

    const init = async () => {
      const device = getClientDeviceType();
      setDeviceType(device);

      if (device === 'unknown') {
        setMessage('모바일 기기에서 접근해주세요.');
        setStatus('fallback');
        return;
      }

      setMessage('딥링크 정보 저장 중...');
      await saveDeeplink();

      tryOpenApp(device);
    };

    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 표시용 딥링크 URL
  const displayDeeplinkUrl = `${APP_CONFIG.iosScheme}:/${deeplinkPath}${hasQueryParams ? '?' + new URLSearchParams(queryParams).toString() : ''}`;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-blue-500 to-blue-700 text-white p-4">
      <div className="text-center max-w-md">
        <div className="mb-8">
          <div className="w-20 h-20 bg-white rounded-2xl mx-auto mb-4 flex items-center justify-center">
            <span className="text-4xl">📱</span>
          </div>
          <h1 className="text-2xl font-bold mb-2">앱으로 이동 중</h1>
          <p className="text-blue-100">{message}</p>
        </div>

        {status === 'loading' && (
          <div className="animate-spin w-8 h-8 border-4 border-white border-t-transparent rounded-full mx-auto" />
        )}

        {status === 'redirecting' && (
          <div className="space-y-4">
            <div className="animate-pulse w-8 h-8 bg-white rounded-full mx-auto" />
            <p className="text-sm text-blue-200">앱이 실행되지 않으면 잠시 후 스토어로 이동합니다.</p>
          </div>
        )}

        {status === 'fallback' && deviceType !== 'unknown' && (
          <button
            onClick={() => redirectToStore(deviceType)}
            className="bg-white text-blue-600 px-6 py-3 rounded-lg font-semibold hover:bg-blue-50 transition"
          >
            {deviceType === 'ios' ? 'App Store에서 다운로드' : 'Play Store에서 다운로드'}
          </button>
        )}

        <div className="mt-8 text-xs text-blue-200 space-y-1">
          <p>디바이스: {deviceType}</p>
          <p>딥링크: {displayDeeplinkUrl}</p>
        </div>
      </div>
    </div>
  );
}

export default function DeeplinkPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-blue-500 to-blue-700">
        <div className="animate-spin w-8 h-8 border-4 border-white border-t-transparent rounded-full" />
      </div>
    }>
      <DeeplinkPageContent />
    </Suspense>
  );
}
