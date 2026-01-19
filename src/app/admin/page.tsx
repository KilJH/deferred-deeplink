'use client';

import { useState, useEffect } from 'react';
import { APP_CONFIG } from '@/constants';

interface DeferredLink {
  fingerprint: string;
  path: string;
  params?: Record<string, string>;
  createdAt: number;
  ipAddress?: string;
  userAgent?: string;
}

export default function AdminTestPage() {
  const [path, setPath] = useState('/invite/abc123');
  const [params, setParams] = useState('{"ref": "test"}');
  const [generatedLink, setGeneratedLink] = useState('');
  const [storedLinks, setStoredLinks] = useState<DeferredLink[]>([]);
  const [baseUrl, setBaseUrl] = useState('');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setBaseUrl(window.location.origin);
    }
  }, []);

  const generateLink = () => {
    try {
      const paramsObj = params.trim() ? JSON.parse(params) : undefined;

      // URL 경로 기반 딥링크 생성
      // 예: /invite/abc123?ref=test
      let link = `${baseUrl}${path}`;
      if (paramsObj && Object.keys(paramsObj).length > 0) {
        const queryString = new URLSearchParams(paramsObj).toString();
        link += `?${queryString}`;
      }

      setGeneratedLink(link);
    } catch (e) {
      alert('파라미터 JSON 형식이 올바르지 않습니다.');
      console.error(e);
    }
  };

  const fetchStoredLinks = async () => {
    try {
      const response = await fetch('/api/deferred?debug=true');
      const data = await response.json();
      setStoredLinks(data.links || []);
    } catch (e) {
      console.error('Failed to fetch stored links:', e);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert('복사되었습니다!');
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Deferred Deeplink 테스트
        </h1>
        <p className="text-gray-600 mb-8">
          딥링크를 생성하고 테스트해보세요. 모바일에서 링크를 클릭하면 앱 설치 여부에 따라 동작합니다.
        </p>

        {/* 설정값 표시 */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">현재 설정</h2>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-500">iOS App ID:</span>
              <span className="ml-2 font-mono">{APP_CONFIG.iosAppId}</span>
            </div>
            <div>
              <span className="text-gray-500">iOS Scheme:</span>
              <span className="ml-2 font-mono">{APP_CONFIG.iosScheme}://</span>
            </div>
            <div>
              <span className="text-gray-500">Android Package:</span>
              <span className="ml-2 font-mono">{APP_CONFIG.androidPackageName}</span>
            </div>
            <div>
              <span className="text-gray-500">Android Scheme:</span>
              <span className="ml-2 font-mono">{APP_CONFIG.androidScheme}://</span>
            </div>
          </div>
          <p className="mt-4 text-xs text-gray-400">
            설정 변경: src/constants.ts 파일 수정
          </p>
        </div>

        {/* 딥링크 생성 */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">딥링크 생성</h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                딥링크 경로 (path)
              </label>
              <input
                type="text"
                value={path}
                onChange={(e) => setPath(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="/invite/abc123"
              />
              <p className="mt-1 text-xs text-gray-500">
                예: /invite/abc123, /channel/xyz, /product/123
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                쿼리 파라미터 (JSON, 선택사항)
              </label>
              <textarea
                value={params}
                onChange={(e) => setParams(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                rows={3}
                placeholder='{"key": "value"}'
              />
            </div>

            <button
              onClick={generateLink}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition font-medium"
            >
              링크 생성
            </button>
          </div>

          {generatedLink && (
            <div className="mt-4 p-4 bg-gray-50 rounded-md">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">생성된 링크:</span>
                <button
                  onClick={() => copyToClipboard(generatedLink)}
                  className="text-sm text-blue-600 hover:text-blue-800"
                >
                  복사
                </button>
              </div>
              <a
                href={generatedLink}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline break-all text-sm font-mono"
              >
                {generatedLink}
              </a>
              <p className="mt-2 text-xs text-gray-500">
                이 링크를 모바일 기기에서 열어보세요.
              </p>
              <div className="mt-2 p-2 bg-blue-50 rounded text-xs text-blue-700">
                앱 딥링크: {APP_CONFIG.iosScheme}:/{path}{params.trim() && JSON.parse(params) && Object.keys(JSON.parse(params)).length > 0 ? '?' + new URLSearchParams(JSON.parse(params)).toString() : ''}
              </div>
            </div>
          )}
        </div>

        {/* 저장된 딥링크 확인 */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">저장된 딥링크</h2>
            <button
              onClick={fetchStoredLinks}
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              새로고침
            </button>
          </div>

          {storedLinks.length === 0 ? (
            <p className="text-gray-500 text-sm">저장된 딥링크가 없습니다.</p>
          ) : (
            <div className="space-y-3">
              {storedLinks.map((link, index) => (
                <div key={index} className="p-3 bg-gray-50 rounded-md text-sm">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="text-gray-500">Fingerprint:</span>
                      <span className="ml-1 font-mono text-xs">{link.fingerprint.slice(0, 16)}...</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Path:</span>
                      <span className="ml-1 font-mono">{link.path}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">IP:</span>
                      <span className="ml-1 font-mono">{link.ipAddress}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">생성 시간:</span>
                      <span className="ml-1">{new Date(link.createdAt).toLocaleString()}</span>
                    </div>
                  </div>
                  {link.params && (
                    <div className="mt-2">
                      <span className="text-gray-500">Params:</span>
                      <span className="ml-1 font-mono text-xs">{JSON.stringify(link.params)}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* API 엔드포인트 정보 */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">API 엔드포인트</h2>

          <div className="space-y-4 text-sm">
            <div className="p-3 bg-gray-50 rounded-md">
              <div className="font-medium text-gray-900 mb-1">POST /api/deferred</div>
              <p className="text-gray-600 mb-2">딥링크 저장 (웹에서 호출)</p>
              <pre className="bg-gray-800 text-green-400 p-2 rounded text-xs overflow-x-auto">
{`{
  "fingerprint": "optional-client-fingerprint",
  "path": "/invite/abc123",
  "params": {"ref": "test"}
}`}
              </pre>
            </div>

            <div className="p-3 bg-gray-50 rounded-md">
              <div className="font-medium text-gray-900 mb-1">GET /api/deferred</div>
              <p className="text-gray-600 mb-2">딥링크 조회 (앱에서 호출)</p>
              <pre className="bg-gray-800 text-green-400 p-2 rounded text-xs overflow-x-auto">
{`GET /api/deferred?fingerprint=xxx

Response:
{
  "success": true,
  "path": "/invite/abc123",
  "params": {"ref": "test"}
}`}
              </pre>
            </div>
          </div>
        </div>

        {/* URL 매핑 정보 */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">URL 매핑</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 pr-4 text-gray-600">웹 URL</th>
                  <th className="text-left py-2 text-gray-600">앱 딥링크</th>
                </tr>
              </thead>
              <tbody className="font-mono text-xs">
                <tr className="border-b">
                  <td className="py-2 pr-4">/</td>
                  <td className="py-2">{APP_CONFIG.iosScheme}://</td>
                </tr>
                <tr className="border-b">
                  <td className="py-2 pr-4">/invite/abc123</td>
                  <td className="py-2">{APP_CONFIG.iosScheme}://invite/abc123</td>
                </tr>
                <tr className="border-b">
                  <td className="py-2 pr-4">/channel/xyz</td>
                  <td className="py-2">{APP_CONFIG.iosScheme}://channel/xyz</td>
                </tr>
                <tr>
                  <td className="py-2 pr-4">/product/123?ref=test</td>
                  <td className="py-2">{APP_CONFIG.iosScheme}://product/123?ref=test</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* 테스트 가이드 */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-yellow-800 mb-4">테스트 가이드</h2>
          <ol className="list-decimal list-inside space-y-2 text-sm text-yellow-700">
            <li>src/constants.ts에서 앱 설정을 수정하세요</li>
            <li>npm run dev로 로컬 서버를 실행하세요</li>
            <li>ngrok 또는 Vercel로 외부 접근 가능하게 만드세요</li>
            <li>위에서 딥링크를 생성하세요</li>
            <li>생성된 링크를 모바일 기기에서 열어보세요</li>
            <li>앱이 설치되어 있으면 앱이 실행됩니다</li>
            <li>앱이 없으면 스토어로 이동합니다</li>
            <li>앱 설치 후 첫 실행 시 API를 호출하여 딥링크를 확인하세요</li>
          </ol>
        </div>
      </div>
    </div>
  );
}
