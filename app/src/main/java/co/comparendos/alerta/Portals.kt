package co.comparendos.alerta

import android.content.Context
import org.json.JSONArray
import org.json.JSONObject
import java.net.CookieManager
import java.net.HttpURLConnection
import java.net.URL

data class Mapa(val id: String, val nombre: String, val plataforma: String, val modo: String, val front: String, val backend: String)

class CaptchaException : Exception("El portal pide captcha")

object Portals {
    // ponytail: solo los mapas empaquetados; descargar desde el repo cuando exista su URL pública.
    fun mapas(ctx: Context): List<Mapa> =
        ctx.assets.list("")!!.filter { it.endsWith(".json") }.sorted().map { f ->
            val o = JSONObject(ctx.assets.open(f).bufferedReader().readText())
            Mapa(o.getString("id"), o.getString("nombre"), o.getString("plataforma"), o.getString("modo"),
                o.getString("front"), o.getString("backend"))
        }

    /** Devuelve los registros (comparendos/multas) del portal para una cédula o placa. */
    fun consultar(m: Mapa, criterio: String, esPlaca: Boolean): List<JSONObject> {
        require(m.plataforma == "quipux") { "Plataforma no soportada: ${m.plataforma}" }
        val cookies = CookieManager()
        fun post(path: String, body: JSONObject, timeoutMs: Int): JSONObject {
            val c = URL(m.backend + path).openConnection() as HttpURLConnection
            c.requestMethod = "POST"
            c.connectTimeout = 30_000
            c.readTimeout = timeoutMs
            c.doOutput = true
            c.setRequestProperty("Content-Type", "application/json")
            c.setRequestProperty("href", m.front)
            cookies.cookieStore.cookies.joinToString("; ").takeIf { it.isNotEmpty() }?.let { c.setRequestProperty("Cookie", it) }
            c.outputStream.use { it.write(body.toString().toByteArray()) }
            if (c.responseCode != 200) throw Exception("HTTP ${c.responseCode}")
            c.headerFields["Set-Cookie"]?.forEach { h -> java.net.HttpCookie.parse(h).forEach { cookies.cookieStore.add(null, it) } }
            return JSONObject(c.inputStream.bufferedReader().readText())
        }

        // Sesión anónima pública del portal (la misma que abre su página web).
        val login = post("/avit/login/", JSONObject().put("usuario", "ANONIMO").put("password", "admin").put("consumidor", "web"), 30_000)
        if (login.optString("rcSiteKey") != "disable") throw CaptchaException()
        val r = post("/avit/home/findInfoHomePublic", JSONObject()
            .put("criterio", criterio).put("response", "").put("tipoConsulta", "0")
            .put("idTipoIdentificacion", if (esPlaca) "" else "2"), 60_000) // 2 = cédula de ciudadanía
        val dto = r.optJSONObject("consultaMultaOComparendoOutDTO") ?: throw Exception("Respuesta inesperada")
        return listOf("informacionComparendo", "informacionMulta", "informacionComparendoAdicional").flatMap { k ->
            val a = dto.optJSONArray(k) ?: JSONArray()
            (0 until a.length()).map { a.getJSONObject(it) }
        }
    }

    /** Identificador estable de un registro, para detectar novedades. */
    fun clave(portal: String, r: JSONObject): String {
        // ponytail: nombres de campo supuestos (aún no hemos visto un registro real); si ninguno existe se usa el JSON completo.
        val id = listOf("numeroComparendo", "nroComparendo", "comparendo", "numeroMulta", "nroMulta", "numero")
            .firstNotNullOfOrNull { k -> r.opt(k)?.toString()?.takeIf { it.isNotBlank() && it != "null" } }
        return "$portal:${id ?: r.toString()}"
    }
}
