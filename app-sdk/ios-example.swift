// iOS Deferred Deeplink 연동 예시 코드
// AppDelegate.swift 또는 SceneDelegate.swift에 추가

import UIKit

// MARK: - Deferred Deeplink Response Model
struct DeferredDeeplinkResponse: Codable {
    let success: Bool
    let path: String?
    let params: [String: String]?
    let message: String?
}

// MARK: - Deferred Deeplink Manager
class DeferredDeeplinkManager {

    static let shared = DeferredDeeplinkManager()

    // ⚠️ 배포 후 실제 도메인으로 변경하세요
    private let baseURL = "https://your-domain.vercel.app"

    private init() {}

    /// 앱 첫 실행 시 호출하여 디퍼드 딥링크 확인
    /// - Parameter completion: 딥링크 경로와 파라미터를 반환
    func checkDeferredDeeplink(completion: @escaping (String?, [String: String]?) -> Void) {
        // 이미 처리했는지 확인 (앱 재실행 시 중복 처리 방지)
        let hasChecked = UserDefaults.standard.bool(forKey: "hasCheckedDeferredDeeplink")
        if hasChecked {
            completion(nil, nil)
            return
        }

        // 첫 실행 플래그 설정
        UserDefaults.standard.set(true, forKey: "hasCheckedDeferredDeeplink")

        // API 호출
        guard let url = URL(string: "\(baseURL)/api/deferred") else {
            completion(nil, nil)
            return
        }

        var request = URLRequest(url: url)
        request.httpMethod = "GET"
        request.timeoutInterval = 10

        URLSession.shared.dataTask(with: request) { data, response, error in
            guard error == nil,
                  let data = data,
                  let result = try? JSONDecoder().decode(DeferredDeeplinkResponse.self, from: data),
                  result.success,
                  let path = result.path else {
                DispatchQueue.main.async {
                    completion(nil, nil)
                }
                return
            }

            DispatchQueue.main.async {
                completion(path, result.params)
            }
        }.resume()
    }

    /// 디퍼드 딥링크 체크 상태 초기화 (테스트용)
    func resetDeferredDeeplinkCheck() {
        UserDefaults.standard.removeObject(forKey: "hasCheckedDeferredDeeplink")
    }
}

// MARK: - AppDelegate 사용 예시
/*
class AppDelegate: UIResponder, UIApplicationDelegate {

    func application(_ application: UIApplication,
                     didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {

        // 디퍼드 딥링크 확인
        DeferredDeeplinkManager.shared.checkDeferredDeeplink { path, params in
            guard let path = path else { return }

            print("Deferred deeplink found: \(path)")
            print("Params: \(params ?? [:])")

            // 딥링크 처리
            self.handleDeeplink(path: path, params: params)
        }

        return true
    }

    private func handleDeeplink(path: String, params: [String: String]?) {
        // 경로에 따른 화면 이동 로직 구현
        // 예: /product/123 -> ProductViewController로 이동

        switch path {
        case let p where p.hasPrefix("/product/"):
            let productId = String(p.dropFirst("/product/".count))
            // ProductViewController로 이동
            print("Navigate to product: \(productId)")

        case "/home":
            // 홈 화면으로 이동
            print("Navigate to home")

        default:
            print("Unknown deeplink path: \(path)")
        }
    }
}
*/

// MARK: - SceneDelegate 사용 예시 (iOS 13+)
/*
class SceneDelegate: UIResponder, UIWindowSceneDelegate {

    var window: UIWindow?

    func scene(_ scene: UIScene,
               willConnectTo session: UISceneSession,
               options connectionOptions: UIScene.ConnectionOptions) {

        // 디퍼드 딥링크 확인
        DeferredDeeplinkManager.shared.checkDeferredDeeplink { path, params in
            guard let path = path else { return }

            print("Deferred deeplink found: \(path)")
            self.handleDeeplink(path: path, params: params)
        }
    }

    // Universal Link로 앱이 열렸을 때
    func scene(_ scene: UIScene, continue userActivity: NSUserActivity) {
        guard userActivity.activityType == NSUserActivityTypeBrowsingWeb,
              let url = userActivity.webpageURL else {
            return
        }

        // Universal Link 처리
        handleUniversalLink(url: url)
    }

    // Custom Scheme으로 앱이 열렸을 때
    func scene(_ scene: UIScene, openURLContexts URLContexts: Set<UIOpenURLContext>) {
        guard let url = URLContexts.first?.url else { return }

        // Custom Scheme 처리
        handleCustomScheme(url: url)
    }

    private func handleDeeplink(path: String, params: [String: String]?) {
        // 딥링크 처리 로직
    }

    private func handleUniversalLink(url: URL) {
        // Universal Link 처리 로직
        let path = url.path
        let params = url.queryParameters
        handleDeeplink(path: path, params: params)
    }

    private func handleCustomScheme(url: URL) {
        // Custom Scheme 처리 로직
        // myapp://product/123?id=abc
        let path = "/\(url.host ?? "")\(url.path)"
        let params = url.queryParameters
        handleDeeplink(path: path, params: params)
    }
}
*/

// MARK: - URL Extension (Query Parameters 파싱)
extension URL {
    var queryParameters: [String: String]? {
        guard let components = URLComponents(url: self, resolvingAgainstBaseURL: true),
              let queryItems = components.queryItems else {
            return nil
        }

        var params: [String: String] = [:]
        for item in queryItems {
            params[item.name] = item.value
        }
        return params.isEmpty ? nil : params
    }
}

// MARK: - SwiftUI 사용 예시
/*
import SwiftUI

@main
struct MyApp: App {
    @UIApplicationDelegateAdaptor(AppDelegate.self) var appDelegate

    var body: some Scene {
        WindowGroup {
            ContentView()
                .onAppear {
                    DeferredDeeplinkManager.shared.checkDeferredDeeplink { path, params in
                        guard let path = path else { return }
                        // 딥링크 처리
                        NotificationCenter.default.post(
                            name: .deferredDeeplinkReceived,
                            object: nil,
                            userInfo: ["path": path, "params": params as Any]
                        )
                    }
                }
        }
    }
}

extension Notification.Name {
    static let deferredDeeplinkReceived = Notification.Name("deferredDeeplinkReceived")
}
*/
