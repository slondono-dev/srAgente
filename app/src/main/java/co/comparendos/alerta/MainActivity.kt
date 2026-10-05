package co.comparendos.alerta

import android.Manifest
import android.annotation.SuppressLint
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.graphics.Color
import android.view.WindowInsets
import android.widget.FrameLayout
import android.speech.tts.TextToSpeech
import android.webkit.JavascriptInterface
import android.webkit.WebResourceRequest
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.activity.ComponentActivity
import androidx.activity.addCallback
import androidx.webkit.WebViewAssetLoader
import org.json.JSONArray
import org.json.JSONObject
import java.util.Locale
import kotlin.concurrent.thread

/** Muestra la web empaquetada (mismo diseño que la PWA); las consultas las hace el teléfono, sin las reglas CORS del navegador. */
class MainActivity : ComponentActivity() {
    private lateinit var web: WebView
    private val main = Handler(Looper.getMainLooper())
    private var voz: TextToSpeech? = null

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        CheckWorker.programar(this)

        val loader = WebViewAssetLoader.Builder().addPathHandler("/assets/", WebViewAssetLoader.AssetsPathHandler(this)).build()
        web = WebView(this)
        web.settings.javaScriptEnabled = true
        web.settings.domStorageEnabled = true
        web.addJavascriptInterface(Puente(), "Android")
        web.webViewClient = object : WebViewClient() {
            override fun shouldInterceptRequest(v: WebView, r: WebResourceRequest) = loader.shouldInterceptRequest(r.url)
            // Todo lo que no sea la app (portales, SIMIT) se abre en el navegador del teléfono.
            override fun shouldOverrideUrlLoading(v: WebView, r: WebResourceRequest): Boolean {
                if (r.url.host == WebViewAssetLoader.DEFAULT_DOMAIN) return false
                startActivity(Intent(Intent.ACTION_VIEW, r.url))
                return true
            }
        }
        // Android 15+ dibuja bajo las barras del sistema: el marco deja ese espacio con el azul de la cabecera.
        val marco = FrameLayout(this).apply { setBackgroundColor(Color.parseColor("#0a2b5e")); addView(web) }
        if (Build.VERSION.SDK_INT >= 30) marco.setOnApplyWindowInsetsListener { v, insets ->
            val b = insets.getInsets(WindowInsets.Type.systemBars() or WindowInsets.Type.ime())
            v.setPadding(b.left, b.top, b.right, b.bottom)
            WindowInsets.CONSUMED
        }
        setContentView(marco)
        onBackPressedDispatcher.addCallback(this) { if (web.canGoBack()) web.goBack() else finish() }
        if (savedInstanceState == null) web.loadUrl("https://${WebViewAssetLoader.DEFAULT_DOMAIN}/assets/web/index.html")
        else web.restoreState(savedInstanceState)
    }

    override fun onSaveInstanceState(out: Bundle) { super.onSaveInstanceState(out); web.saveState(out) }

    override fun onDestroy() { voz?.shutdown(); super.onDestroy() }

    inner class Puente {
        /** Consulta un portal en segundo plano y responde llamando a `window.__respuesta(id, json)`. */
        @JavascriptInterface
        fun consultar(llamada: String, portal: String, criterio: String, esPlaca: Boolean) {
            thread {
                val res = JSONObject()
                try {
                    val m = Portals.mapas(this@MainActivity).first { it.id == portal }
                    val regs = Portals.consultar(m, criterio, esPlaca)
                    marcarVistos(m.id, regs)
                    res.put("regs", JSONArray(regs))
                } catch (_: CaptchaException) {
                    res.put("error", "captcha")
                } catch (e: Exception) {
                    res.put("error", e.message ?: e.javaClass.simpleName)
                }
                main.post { web.evaluateJavascript("window.__respuesta(${JSONObject.quote(llamada)}, $res)", null) }
            }
        }

        /** Lee el texto en voz alta; si ya está hablando, se calla. */
        @JavascriptInterface
        fun hablar(texto: String) = main.post {
            val v = voz
            if (v == null) {
                voz = TextToSpeech(this@MainActivity) { ok ->
                    if (ok == TextToSpeech.SUCCESS) voz?.run { language = Locale("es", "CO"); setSpeechRate(.9f); speak(texto, TextToSpeech.QUEUE_FLUSH, null, "t") }
                }
            } else if (v.isSpeaking) v.stop()
            else v.speak(texto, TextToSpeech.QUEUE_FLUSH, null, "t")
        }

        /** ¿Ya se revisa este criterio cada día? */
        @JavascriptInterface
        fun vigilando(criterio: String): Boolean = criterios(this@MainActivity).any { it.first == criterio }

        /** Activa o quita la revisión diaria con aviso para una placa o cédula. */
        @JavascriptInterface
        fun vigilar(criterio: String, esPlaca: Boolean, activo: Boolean) {
            guardarCriterio(this@MainActivity, criterio, esPlaca, activo)
            if (activo && Build.VERSION.SDK_INT >= 33) main.post { requestPermissions(arrayOf(Manifest.permission.POST_NOTIFICATIONS), 0) }
        }

        private fun marcarVistos(portal: String, regs: List<JSONObject>) {
            val p = prefs(this@MainActivity)
            val vistos = p.getStringSet("vistos", emptySet())!!.toMutableSet()
            regs.forEach { vistos += Portals.clave(portal, it) }
            p.edit().putStringSet("vistos", vistos).apply()
        }
    }
}
