// Android Deferred Deeplink 연동 예시 코드
// Application 클래스 또는 MainActivity에 추가

package com.example.myapp

import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Bundle
import android.util.Log
import androidx.appcompat.app.AppCompatActivity
import kotlinx.coroutines.*
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL

// MARK: - Deferred Deeplink Response Model
data class DeferredDeeplinkResponse(
    val success: Boolean,
    val path: String?,
    val params: Map<String, String>?,
    val message: String?
)

// MARK: - Deferred Deeplink Manager
object DeferredDeeplinkManager {

    private const val TAG = "DeferredDeeplink"

    // ⚠️ 배포 후 실제 도메인으로 변경하세요
    private const val BASE_URL = "https://your-domain.vercel.app"

    private const val PREF_NAME = "deferred_deeplink_prefs"
    private const val KEY_HAS_CHECKED = "has_checked_deferred_deeplink"

    /**
     * 앱 첫 실행 시 호출하여 디퍼드 딥링크 확인
     */
    fun checkDeferredDeeplink(
        context: Context,
        onResult: (path: String?, params: Map<String, String>?) -> Unit
    ) {
        val prefs = context.getSharedPreferences(PREF_NAME, Context.MODE_PRIVATE)

        // 이미 처리했는지 확인
        if (prefs.getBoolean(KEY_HAS_CHECKED, false)) {
            onResult(null, null)
            return
        }

        // 첫 실행 플래그 설정
        prefs.edit().putBoolean(KEY_HAS_CHECKED, true).apply()

        // 백그라운드에서 API 호출
        CoroutineScope(Dispatchers.IO).launch {
            try {
                val response = fetchDeferredDeeplink()

                withContext(Dispatchers.Main) {
                    if (response.success && response.path != null) {
                        Log.d(TAG, "Deferred deeplink found: ${response.path}")
                        onResult(response.path, response.params)
                    } else {
                        Log.d(TAG, "No deferred deeplink found")
                        onResult(null, null)
                    }
                }
            } catch (e: Exception) {
                Log.e(TAG, "Failed to fetch deferred deeplink", e)
                withContext(Dispatchers.Main) {
                    onResult(null, null)
                }
            }
        }
    }

    private fun fetchDeferredDeeplink(): DeferredDeeplinkResponse {
        val url = URL("$BASE_URL/api/deferred")
        val connection = url.openConnection() as HttpURLConnection

        return try {
            connection.requestMethod = "GET"
            connection.connectTimeout = 10000
            connection.readTimeout = 10000

            val responseCode = connection.responseCode
            if (responseCode == HttpURLConnection.HTTP_OK) {
                val response = connection.inputStream.bufferedReader().use { it.readText() }
                parseResponse(response)
            } else {
                DeferredDeeplinkResponse(false, null, null, "HTTP error: $responseCode")
            }
        } finally {
            connection.disconnect()
        }
    }

    private fun parseResponse(json: String): DeferredDeeplinkResponse {
        val jsonObject = JSONObject(json)
        val success = jsonObject.optBoolean("success", false)
        val path = jsonObject.optString("path", null)
        val message = jsonObject.optString("message", null)

        val params = mutableMapOf<String, String>()
        jsonObject.optJSONObject("params")?.let { paramsJson ->
            paramsJson.keys().forEach { key ->
                params[key] = paramsJson.getString(key)
            }
        }

        return DeferredDeeplinkResponse(
            success = success,
            path = if (path.isNullOrEmpty()) null else path,
            params = if (params.isEmpty()) null else params,
            message = message
        )
    }

    /**
     * 디퍼드 딥링크 체크 상태 초기화 (테스트용)
     */
    fun resetDeferredDeeplinkCheck(context: Context) {
        context.getSharedPreferences(PREF_NAME, Context.MODE_PRIVATE)
            .edit()
            .remove(KEY_HAS_CHECKED)
            .apply()
    }
}

// MARK: - MainActivity 사용 예시
/*
class MainActivity : AppCompatActivity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        // Custom Scheme 또는 App Link로 앱이 열린 경우
        handleIntent(intent)

        // 디퍼드 딥링크 확인
        DeferredDeeplinkManager.checkDeferredDeeplink(this) { path, params ->
            if (path != null) {
                Log.d("MainActivity", "Deferred deeplink: $path, params: $params")
                handleDeeplink(path, params)
            }
        }
    }

    override fun onNewIntent(intent: Intent?) {
        super.onNewIntent(intent)
        intent?.let { handleIntent(it) }
    }

    private fun handleIntent(intent: Intent) {
        // App Link (https://your-domain.com/...)
        if (intent.action == Intent.ACTION_VIEW) {
            intent.data?.let { uri ->
                val path = uri.path ?: "/"
                val params = uri.queryParameters
                handleDeeplink(path, params)
            }
        }
    }

    private fun handleDeeplink(path: String, params: Map<String, String>?) {
        Log.d("MainActivity", "Handling deeplink: $path")

        when {
            path.startsWith("/product/") -> {
                val productId = path.removePrefix("/product/")
                // ProductActivity로 이동
                navigateToProduct(productId, params)
            }
            path == "/home" -> {
                // 홈 화면으로 이동
                navigateToHome()
            }
            else -> {
                Log.d("MainActivity", "Unknown deeplink path: $path")
            }
        }
    }

    private fun navigateToProduct(productId: String, params: Map<String, String>?) {
        // val intent = Intent(this, ProductActivity::class.java).apply {
        //     putExtra("productId", productId)
        //     params?.forEach { (key, value) -> putExtra(key, value) }
        // }
        // startActivity(intent)
    }

    private fun navigateToHome() {
        // 홈 화면 이동 로직
    }
}
*/

// MARK: - URI Extension (Query Parameters 파싱)
val Uri.queryParameters: Map<String, String>
    get() {
        val params = mutableMapOf<String, String>()
        queryParameterNames.forEach { name ->
            getQueryParameter(name)?.let { value ->
                params[name] = value
            }
        }
        return params
    }

// MARK: - Application 클래스 사용 예시 (전역 초기화)
/*
class MyApplication : Application() {

    override fun onCreate() {
        super.onCreate()

        // 앱 시작 시 디퍼드 딥링크 확인
        // 참고: Activity에서 처리하는 것이 더 권장됨 (UI 업데이트 필요 시)
    }
}
*/

// MARK: - Jetpack Compose 사용 예시
/*
@Composable
fun MainScreen() {
    val context = LocalContext.current
    var deferredPath by remember { mutableStateOf<String?>(null) }

    LaunchedEffect(Unit) {
        DeferredDeeplinkManager.checkDeferredDeeplink(context) { path, params ->
            if (path != null) {
                deferredPath = path
                // Navigation 처리
            }
        }
    }

    // UI 구현
}
*/

// MARK: - AndroidManifest.xml 설정 예시
/*
<activity
    android:name=".MainActivity"
    android:exported="true"
    android:launchMode="singleTask">

    <!-- Custom Scheme -->
    <intent-filter>
        <action android:name="android.intent.action.VIEW" />
        <category android:name="android.intent.category.DEFAULT" />
        <category android:name="android.intent.category.BROWSABLE" />
        <data android:scheme="myapp" />
    </intent-filter>

    <!-- App Links (Android 6.0+) -->
    <intent-filter android:autoVerify="true">
        <action android:name="android.intent.action.VIEW" />
        <category android:name="android.intent.category.DEFAULT" />
        <category android:name="android.intent.category.BROWSABLE" />
        <data
            android:scheme="https"
            android:host="your-domain.vercel.app"
            android:pathPrefix="/link" />
    </intent-filter>
</activity>
*/
