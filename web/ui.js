// Letra grande, lectura en voz alta y service worker, compartidos por todas las páginas.
const SPEAKER = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M11 5 6 9H3v6h3l5 4z"/><path d="M15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13"/></svg>';

function setBig(on) {
  document.documentElement.classList.toggle("big", on);
  document.querySelectorAll("[data-big]").forEach(b => b.setAttribute("aria-pressed", on));
  try { localStorage.setItem("big", on ? "1" : ""); } catch {}
}
try { if (localStorage.getItem("big")) document.documentElement.classList.add("big"); } catch {}

document.querySelectorAll("[data-big]").forEach(b => {
  b.setAttribute("aria-pressed", document.documentElement.classList.contains("big"));
  b.onclick = () => setBig(!document.documentElement.classList.contains("big"));
});
document.querySelectorAll("[data-talk]").forEach(b => { b.innerHTML = SPEAKER + "Escuchar"; });

// Lee en orden una lista de [elemento, texto]; resalta cada elemento mientras lo lee.
function speak(parts) {
  if (window.Android) { window.Android.hablar(parts.map(p => p[1]).join(". ")); return; }  // voz del teléfono
  const sy = window.speechSynthesis;
  if (!sy) return;
  if (sy.speaking) { sy.cancel(); document.querySelectorAll(".speaking").forEach(x => x.classList.remove("speaking")); return; }
  parts.forEach(([el, t]) => {
    const u = new SpeechSynthesisUtterance(t);
    u.lang = "es-CO"; u.rate = .9;
    u.onstart = () => {
      document.querySelectorAll(".speaking").forEach(x => x.classList.remove("speaking"));
      if (el) { el.classList.add("speaking"); el.scrollIntoView({ block: "center", behavior: "smooth" }); }
    };
    u.onend = () => el && el.classList.remove("speaking");
    sy.speak(u);
  });
}

if (window.Android) document.documentElement.classList.add("android");
else if ("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js");
