// app/composables/useSavedProfiles.js
// ============================================================================
// But : mémoriser côté client une petite liste de "profils récents" utilisés
// pour se connecter rapidement (pré-remplir / quick login).
//
// ⚠️ Sécurité : aujourd’hui, on conserve aussi le `token` (JWT) pour ton
// quickLogin actuel. C’est pratique mais moins sûr (localStorage).
// ➜ Plus tard, on pourra supprimer `token` ici et faire un autre mécanisme
// (magic link, refresh token serveur, etc.). Un TODO plus bas explique quoi changer.
// ============================================================================

export function useSavedProfiles() {
  // Versionne la clé pour pouvoir "reset" simple si le format change
  const STORAGE_KEY = "saved_profiles_v2";
  // On limite la taille de la liste (LRU-like)
  const MAX_PROFILES = 5;

  // ------------------------------------------------------------
  // State partagé Nuxt (SSR-safe) : accessible partout
  // ------------------------------------------------------------
  // - En SSR, `useState` initialise une fois et réutilise côté client.
  // - Ne JAMAIS toucher au localStorage côté serveur (guard import.meta.client).
  const profiles = useState("saved_profiles", () => []);

  // ------------------------------------------------------------
  // Hydratation côté client depuis localStorage
  // ------------------------------------------------------------
  if (import.meta.client && profiles.value.length === 0) {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      profiles.value = Array.isArray(parsed) ? parsed : [];
    } catch {
      profiles.value = [];
    }
  }

  // ------------------------------------------------------------
  // Persistance -> localStorage (côté client uniquement)
  // ------------------------------------------------------------
  watch(
    profiles,
    (val) => {
      if (!import.meta.client) return;
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(val ?? []));
      } catch {
        // silence: quota plein / private mode / etc.
      }
    },
    { deep: true }
  );

  // ------------------------------------------------------------
  // Normalisation / nettoyage : on garde UNIQUEMENT les champs attendus
  // ------------------------------------------------------------
  // Shape attendu :
  // {
  //   id: number|string,
  //   username: string,
  //   email: string,
  //   token?: string   // ⚠️ gardé pour compat quickLogin (voir TODO sécurité)
  // }
  function sanitize(p) {
    if (!p || typeof p !== "object") return null;

    const out = {
      id: p.id ?? null,
      username: p.username ?? "",
      email: p.email ?? "",
    };

    // ⚠️ TODO sécurité (optionnel) :
    // - Pour ne plus stocker le JWT, commente simplement la ligne ci-dessous
    //   et adapte quickLogin() pour ne plus dépendre de profile.token.
    if (p.token) out.token = p.token;

    // Valide les champs minimaux
    if (!out.id || (!out.username && !out.email)) return null;
    return out;
  }

  // ------------------------------------------------------------
  // API publique
  // ------------------------------------------------------------

  /**
   * Ajoute ou met à jour un profil, et le place en tête (LRU).
   * @param {object} p - voir sanitize() pour la shape
   */
  function upsert(p) {
    const item = sanitize(p);
    if (!item) return;

    // Retirer d’abord toute occurrence existante (par id)
    profiles.value = profiles.value.filter((x) => x.id !== item.id);

    // Ajouter en tête
    profiles.value.unshift(item);

    // Taille max
    if (profiles.value.length > MAX_PROFILES) {
      profiles.value.length = MAX_PROFILES;
    }
  }

  /**
   * Supprime un profil par id
   */
  function remove(id) {
    profiles.value = profiles.value.filter((x) => x.id !== id);
  }

  /**
   * Vide entièrement la liste
   */
  function clear() {
    profiles.value = [];
  }

  // Optionnel : retrouver rapidement un profil
  function findById(id) {
    return profiles.value.find((x) => x.id === id) || null;
  }

  return { profiles, upsert, remove, clear, findById };
}
