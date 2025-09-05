// app/composables/useGeoReady.js
// ============================================================================
// Objectif : centraliser la gestion des permissions de géolocalisation
// ----------------------------------------------------------------------------
// - `geoStatus` : 'unknown' | 'granted' | 'denied' | 'unsupported'
// - `ensureGeoReady()` : tente d'obtenir l'autorisation (déclenche la popup iOS)
// - `checkPermission()` : lit l'état via Permissions API si dispo (granted/denied/prompt)
// - `supported` : computed bool, géoloc dispo ?
// - `describeStatus()` : petit texte lisible pour l’UI
//
// Notes iOS (PWA/Safari) :
// - La popup n’apparaît que quand on appelle réellement `getCurrentPosition` / `watchPosition`.
// - Il n’y a pas d’“Autoriser toujours” en web/PWA. C’est “Lorsque l’app est active” / “Une fois” / “Ne pas autoriser”.
// - Les autorisations sont mémorisées par domaine (la “réinstallation” de la PWA ne suffit pas forcément à réinitialiser).
// ============================================================================

export function useGeoReady() {
  // État partagé Nuxt : persiste entre composables/pages, SSR-safe
  const geoStatus = useState("geo_status", () => "unknown"); // 'unknown' | 'granted' | 'denied' | 'unsupported'
  const supported = computed(
    () => import.meta.client && "geolocation" in navigator
  );

  /**
   * Vérifie l’état de permission via la Permissions API (si dispo).
   * - Retourne 'granted' | 'denied' | 'prompt' (ou 'unknown' si non supporté)
   * - Met à jour geoStatus ('granted'/'denied' ou 'unknown')
   */
  async function checkPermission() {
    if (!import.meta.client || !supported.value) {
      geoStatus.value = "unsupported";
      return "unsupported";
    }
    // Tous les navigateurs n’implémentent pas la Permissions API
    if (navigator.permissions?.query) {
      try {
        const status = await navigator.permissions.query({
          name: "geolocation",
        });
        if (status.state === "granted") geoStatus.value = "granted";
        else if (status.state === "denied") geoStatus.value = "denied";
        else geoStatus.value = "unknown"; // 'prompt'
        return status.state;
      } catch {
        // Pas grave, on retombera sur 'unknown'
      }
    }
    // Sans Permissions API, on ne peut pas savoir sans tenter une vraie demande
    return geoStatus.value;
  }

  /**
   * Demande l’autorisation et une position *une fois*.
   * - Déclenche la popup iOS/Android si nécessaire.
   * - Retourne true si autorisé, false sinon.
   *
   * @param {PositionOptions} opts options passées à getCurrentPosition
   */
  async function ensureGeoReady(opts) {
    if (!import.meta.client || !supported.value) {
      geoStatus.value = "unsupported";
      return false;
    }

    // Si déjà accordé (via un appel précédent / Permissions API), inutile d’insister
    if (geoStatus.value === "granted") return true;

    // Tente de lire l’état sans popup, quand c’est possible
    const state = await checkPermission();
    if (state === "granted") return true;
    // state === 'denied' => on tentera quand même un appel (selon navigateur, peut échouer direct)

    // Appel "réel" qui déclenche la popup iOS si l’état est 'prompt'
    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        () => {
          geoStatus.value = "granted";
          resolve(true);
        },
        (err) => {
          // code 1 : PERMISSION_DENIED, 2 : POSITION_UNAVAILABLE, 3 : TIMEOUT
          geoStatus.value = err && err.code === 1 ? "denied" : "unknown";
          resolve(false);
        },
        {
          enableHighAccuracy: true,
          maximumAge: 0,
          timeout: 10000,
          ...(opts || {}),
        }
      );
    });
  }

  /**
   * Petit helper UX : message lisible pour l’utilisateur
   */
  function describeStatus() {
    switch (geoStatus.value) {
      case "unsupported":
        return "La géolocalisation n’est pas disponible sur cet appareil/navigateur.";
      case "denied":
        return "Accès à la localisation refusé. Autorise-la dans les réglages du navigateur.";
      case "granted":
        return "Localisation autorisée.";
      default:
        return "Localisation non encore autorisée.";
    }
  }

  return {
    geoStatus,
    supported,
    ensureGeoReady,
    checkPermission,
    describeStatus,
  };
}
