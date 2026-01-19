'use client';

import { useEffect, useState, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { APP_CONFIG } from '@/constants';
import { generateFingerprint } from '@/lib/fingerprint';
import {
  getClientDeviceType,
  getAppStoreUrl,
  getPlayStoreUrl,
  buildDeeplinkUrl,
  DeviceType,
} from '@/lib/device';

function LinkPageContent() {
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<'loading' | 'redirecting' | 'fallback'>('loading');
  const [deviceType, setDeviceType] = useState<DeviceType>('unknown');
  const [message, setMessage] = useState('딥링크 처리 중...');

  const path = searchParams.get('path') || '/';
  const paramsStr = searchParams.get('params');
  const params = paramsStr ? JSON.parse(paramsStr) : undefined;

  const saveDeeplink = useCallback(async (fingerprint: string) => {
    try {
      const response = await fetch('/api/deferred', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fingerprint, path, params }),
      });
      const data = await response.json();
      console.log('Deferred deeplink saved:', data);
      return data.success;
    } catch (error) {
      console.error('Failed to save deferred deeplink:', error);
      return false;
    }
  }, [path, params]);

  const tryOpenApp = useCallback((device: DeviceType) => {
    const scheme = device === 'ios' ? APP_CONFIG.iosScheme : APP_CONFIG.androidScheme;
    const deeplinkUrl = buildDeeplinkUrl(scheme, path, params);

    console.log('Attempting to open app with:', deeplinkUrl);
    setMessage('앱 실행 시도 중...');
    setStatus('redirecting');

    // 앱 실행 시도
    const startTime = Date.now();

    // hidden iframe으로 커스텀 스킴 시도 (일부 브라우저에서 더 잘 작동)
    const iframe = document.createElement('iframe');
    iframe.style.display = 'none';
    iframe.src = deeplinkUrl;
    document.body.appendChild(iframe);

    // 동시에 location도 변경 시도
    setTimeout(() => {
      window.location.href = deeplinkUrl;
    }, 100);

    // 앱이 실행되지 않으면 스토어로 이동
    setTimeout(() => {
      const elapsed = Date.now() - startTime;

      // 페이지가 아직 활성화되어 있고 시간이 충분히 지났으면 앱이 설치 안 된 것
      if (document.visibilityState !== 'hidden' && elapsed >= APP_CONFIG.appLaunchTimeout - 500) {
        setStatus('fallback');
        setMessage('앱이 설치되어 있지 않습니다. 스토어로 이동합니다...');

        setTimeout(() => {
          redirectToStore(device);
        }, 1000);
      }

      // iframe 정리
      document.body.removeChild(iframe);
    }, APP_CONFIG.appLaunchTimeout);
  }, [path, params]);

  const redirectToStore = (device: DeviceType) => {
    if (device === 'ios') {
      window.location.href = getAppStoreUrl(APP_CONFIG.iosAppId);
    } else if (device === 'android') {
      window.location.href = getPlayStoreUrl(APP_CONFIG.androidPackageName);
    } else {
      setMessage('지원하지 않는 기기입니다.');
    }
  };

  useEffect(() => {
    const init = async () => {
      // 디바이스 타입 감지
      const device = getClientDeviceType();
      setDeviceType(device);

      if (device === 'unknown') {
        setMessage('모바일 기기에서 접근해주세요.');
        setStatus('fallback');
        return;
      }

      // Fingerprint 생성 및 딥링크 저장
      setMessage('딥링크 정보 저장 중...');
      const fingerprint = await generateFingerprint();
      await saveDeeplink(fingerprint);

      // 앱 실행 시도
      tryOpenApp(device);
    };

    init();
  }, [saveDeeplink, tryOpenApp]);

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
          <p>딥링크 경로: {path}</p>
          {params && <p>파라미터: {JSON.stringify(params)}</p>}
        </div>
      </div>
    </div>
  );
}

export default function LinkPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-blue-500 to-blue-700">
        <div className="animate-spin w-8 h-8 border-4 border-white border-t-transparent rounded-full" />
      </div>
    }>
      <LinkPageContent />
    </Suspense>
  );
}
