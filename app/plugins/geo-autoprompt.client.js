export default defineNuxtPlugin(async () => {
  if (!import.meta.client) return;

  // On ne déclenche qu'une seule fois (premier lancement)
  const KEY = "geo_auto_prompted_v1";
  if (localStorage.getItem(KEY)) return;

  try {
    const { useGeoReady } = await import("~/composables/useGeoReady.js");
    const { ensureGeoReady } = useGeoReady();
    await ensureGeoReady(); // ➜ déclenche la popup iOS/Android
  } catch (e) {
    console.warn("geo autoprompt failed", e);
  } finally {
    localStorage.setItem(KEY, "1");
  }
});
