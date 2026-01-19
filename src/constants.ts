export const APP_CONFIG = {
  // iOS 설정
  iosAppId: '123456789',                    // App Store ID (수정 필요)
  iosScheme: 'myapp',                       // 커스텀 스킴 (수정 필요)

  // Android 설정
  androidPackageName: 'com.example.myapp',  // 패키지명 (수정 필요)
  androidScheme: 'myapp',                   // 커스텀 스킴 (수정 필요)

  // 딥링크 만료 시간 (ms)
  deeplinkExpiry: 24 * 60 * 60 * 1000,      // 24시간

  // 앱 실행 시도 후 스토어로 이동하기까지 대기 시간 (ms)
  appLaunchTimeout: 2000,                   // 2초
};
