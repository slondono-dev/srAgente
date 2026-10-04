plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}

// La app muestra la misma web de web/ (diseño aprobado) y los mapas de maps/, empaquetados.
val webAssets = layout.buildDirectory.dir("generated/webassets")
val copiarWeb by tasks.registering(Sync::class) {
    from("../web") { exclude("sw.js", "manifest.webmanifest") }
    from("../maps") { into("maps") }
    from("../data") { include("cifras.json"); into("data") }
    into(webAssets.map { it.dir("web") })
}

android {
    namespace = "co.comparendos.alerta"
    compileSdk = 36

    defaultConfig {
        applicationId = "co.comparendos.alerta"
        minSdk = 26
        targetSdk = 36
        versionCode = 2
        versionName = "0.2"
    }

    sourceSets["main"].assets.srcDir(webAssets)

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
    kotlinOptions { jvmTarget = "17" }
}

tasks.named("preBuild") { dependsOn(copiarWeb) }

dependencies {
    implementation("androidx.activity:activity-ktx:1.10.1")
    implementation("androidx.webkit:webkit:1.13.0")
    implementation("androidx.work:work-runtime-ktx:2.10.1")
}
