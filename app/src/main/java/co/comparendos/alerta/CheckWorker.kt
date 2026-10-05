package co.comparendos.alerta

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.content.SharedPreferences
import android.app.Notification
import androidx.work.*
import org.json.JSONObject
import java.text.SimpleDateFormat
import java.util.*
import java.util.concurrent.TimeUnit

fun prefs(ctx: Context): SharedPreferences = ctx.getSharedPreferences("datos", Context.MODE_PRIVATE)

/** Placas (true) y cédulas (false) que se revisan cada día. */
fun criterios(ctx: Context): List<Pair<String, Boolean>> {
    val p = prefs(ctx)
    val cedulas = p.getString("cedula", "")!!.split(",").map { it.trim() }.filter { it.isNotEmpty() }
    val placas = p.getString("placas", "")!!.split(",").map { it.trim().uppercase() }.filter { it.isNotEmpty() }
    return cedulas.map { it to false } + placas.map { it to true }
}

fun guardarCriterio(ctx: Context, criterio: String, esPlaca: Boolean, activo: Boolean) {
    val clave = if (esPlaca) "placas" else "cedula"
    val p = prefs(ctx)
    val lista = p.getString(clave, "")!!.split(",").map { it.trim() }.filter { it.isNotEmpty() && it != criterio }
    p.edit().putString(clave, (if (activo) lista + criterio else lista).joinToString(",")).apply()
}

/** Estado de la última consulta de un portal, guardado en el teléfono. */
data class Estado(val fecha: String, val ok: Boolean, val mensaje: String)

fun estado(ctx: Context, id: String): Estado? = prefs(ctx).getString("estado_$id", null)?.let {
    val o = JSONObject(it); Estado(o.getString("fecha"), o.getBoolean("ok"), o.getString("mensaje"))
}

class CheckWorker(ctx: Context, params: WorkerParameters) : CoroutineWorker(ctx, params) {
    override suspend fun doWork(): Result {
        revisar(applicationContext)
        return Result.success()
    }

    companion object {
        fun programar(ctx: Context) {
            val req = PeriodicWorkRequestBuilder<CheckWorker>(1, TimeUnit.DAYS)
                .setConstraints(Constraints(requiredNetworkType = NetworkType.CONNECTED))
                .build()
            WorkManager.getInstance(ctx).enqueueUniquePeriodicWork("revision", ExistingPeriodicWorkPolicy.KEEP, req)
        }

        fun revisarAhora(ctx: Context) =
            WorkManager.getInstance(ctx).enqueue(OneTimeWorkRequestBuilder<CheckWorker>().build())

        fun revisar(ctx: Context) {
            val p = prefs(ctx)
            val criterios = criterios(ctx)
            if (criterios.isEmpty()) return

            val vistos = p.getStringSet("vistos", emptySet())!!.toMutableSet()
            val nuevos = mutableListOf<String>()
            val fecha = SimpleDateFormat("yyyy-MM-dd HH:mm", Locale.US).format(Date())

            for (m in Portals.mapas(ctx).filter { it.plataforma == "quipux" }) {
                val e = if (m.modo == "asistido") Estado(fecha, false, "Requiere consulta manual (captcha)") else try {
                    var total = 0
                    for ((c, esPlaca) in criterios) {
                        val regs = Portals.consultar(m, c, esPlaca)
                        total += regs.size
                        regs.map { Portals.clave(m.id, it) }.filter { vistos.add(it) }.forEach { _ -> nuevos += m.nombre }
                        Thread.sleep(2_000) // consultas moderadas
                    }
                    Estado(fecha, true, if (total == 0) "Sin comparendos" else "$total registro(s)")
                } catch (_: CaptchaException) {
                    Estado(fecha, false, "El portal activó captcha: consulta manual")
                } catch (ex: Exception) {
                    Estado(fecha, false, "Error: ${ex.message ?: ex.javaClass.simpleName}")
                }
                p.edit().putString("estado_${m.id}", JSONObject().put("fecha", e.fecha).put("ok", e.ok).put("mensaje", e.mensaje).toString()).apply()
            }
            p.edit().putStringSet("vistos", vistos).apply()
            if (nuevos.isNotEmpty()) notificar(ctx, nuevos.groupingBy { it }.eachCount())
        }

        private fun notificar(ctx: Context, porPortal: Map<String, Int>) {
            val nm = ctx.getSystemService(NotificationManager::class.java)
            nm.createNotificationChannel(NotificationChannel("nuevos", "Comparendos nuevos", NotificationManager.IMPORTANCE_HIGH))
            val abrir = PendingIntent.getActivity(ctx, 0, Intent(ctx, MainActivity::class.java), PendingIntent.FLAG_IMMUTABLE)
            val texto = porPortal.entries.joinToString("\n") { "${it.key}: ${it.value} nuevo(s)" }
            nm.notify(1, Notification.Builder(ctx, "nuevos")
                .setSmallIcon(android.R.drawable.ic_dialog_alert)
                .setContentTitle("Nuevo comparendo detectado")
                .setContentText(texto)
                .setStyle(Notification.BigTextStyle().bigText(texto))
                .setContentIntent(abrir)
                .setAutoCancel(true)
                .build())
        }
    }
}
