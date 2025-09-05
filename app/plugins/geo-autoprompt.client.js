// app/plugins/geo-autoprompt.client.js
// Demande "douce" de la géolocalisation au 1er chargement de la PWA.
// - Ne s’exécute qu’au CLIENT.
// - Une seule fois par session (onglet) grâce à sessionStorage.
// - N’affiche rien si l’utilisateur a déjà décidé (granted/denied).
//
// Objectif : augmenter les chances que l’utilisateur voie le prompt iOS/Android
// avant sa 1ère séance, sans bloquer l’UI.

export default defineNuxtPlugin(() => {
  if (!import.meta.client) return;

  const KEY = "geo_autoprompt_v1";
  if (sessionStorage.getItem(KEY)) return;
  sessionStorage.setItem(KEY, "1");

  // Petite latence pour laisser l’UI se rendre correctement.
  setTimeout(async () => {
    try {
      const { useGeoReady } = await import("~/composables/useGeoReady");
      const { geoStatus, ensureGeoReady } = useGeoReady();

      // Si déjà décidé (granted/denied/unsupported), on ne dérange pas.
      if (geoStatus.value !== "unknown") return;

      // Tente une demande non bloquante ; si l’utilisateur refuse, on reste silencieux.
      await ensureGeoReady();
    } catch {
      /* no-op */
    }
  }, 800);
});
