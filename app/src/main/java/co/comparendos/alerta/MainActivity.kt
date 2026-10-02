package co.comparendos.alerta

import android.Manifest
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.work.WorkInfo
import androidx.work.WorkManager

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        if (Build.VERSION.SDK_INT >= 33) requestPermissions(arrayOf(Manifest.permission.POST_NOTIFICATIONS), 0)
        CheckWorker.programar(this)
        setContent { MaterialTheme { Pantalla() } }
    }

    @Composable
    fun Pantalla() {
        val p = prefs(this)
        var cedula by remember { mutableStateOf(p.getString("cedula", "")!!) }
        var placas by remember { mutableStateOf(p.getString("placas", "")!!) }
        val trabajos by WorkManager.getInstance(this).getWorkInfosLiveData(androidx.work.WorkQuery.fromStates(WorkInfo.State.RUNNING))
            .observeAsStateCompat()
        val revisando = trabajos.isNotEmpty()
        // Recalcula los estados cuando termina una revisión.
        val mapas = remember(revisando) { Portals.mapas(this).map { it to estado(this, it.id) } }

        Scaffold { pad ->
            LazyColumn(Modifier.padding(pad).padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                item {
                    Text("Alerta Comparendos", style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.Bold)
                    Text("App comunitaria, NO oficial. No es del gobierno ni da asesoría jurídica. " +
                        "Consulta directamente los portales de cada secretaría; tus datos solo se guardan en este teléfono.",
                        style = MaterialTheme.typography.bodySmall)
                }
                item {
                    OutlinedTextField(cedula, { cedula = it.filter(Char::isDigit) }, label = { Text("Cédula") }, modifier = Modifier.fillMaxWidth())
                    OutlinedTextField(placas, { placas = it.uppercase() }, label = { Text("Placas (separadas por coma)") }, modifier = Modifier.fillMaxWidth())
                    Button(enabled = !revisando, modifier = Modifier.fillMaxWidth().padding(top = 8.dp), onClick = {
                        p.edit().putString("cedula", cedula).putString("placas", placas).apply()
                        CheckWorker.revisarAhora(this@MainActivity)
                    }) { Text(if (revisando) "Consultando…" else "Guardar y consultar ahora") }
                    Text("Se consulta automáticamente una vez al día.", style = MaterialTheme.typography.bodySmall)
                }
                items(mapas) { (m, e) ->
                    Card(Modifier.fillMaxWidth()) {
                        Column(Modifier.padding(12.dp)) {
                            Text(m.nombre, fontWeight = FontWeight.Bold)
                            Text(e?.let { "${it.fecha} · ${it.mensaje}" } ?: "Sin consultar todavía",
                                color = if (e?.ok == false) MaterialTheme.colorScheme.error else MaterialTheme.colorScheme.onSurface)
                            Text("Fuente: ${Uri.parse(m.front).host}", style = MaterialTheme.typography.bodySmall)
                            TextButton(onClick = { startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(m.front))) }) { Text("Abrir portal") }
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun <T> androidx.lifecycle.LiveData<List<T>>.observeAsStateCompat(): State<List<T>> {
    val s = remember { mutableStateOf(value ?: emptyList()) }
    DisposableEffect(this) {
        val o = androidx.lifecycle.Observer<List<T>> { s.value = it }
        observeForever(o)
        onDispose { removeObserver(o) }
    }
    return s
}
