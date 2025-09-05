// app/plugins/auth-init.client.js
// Restaure l'état d'auth côté client au démarrage :
// - remonte le JWT du cookie "auth_token" vers le store si besoin
// - recharge l'utilisateur (/users/me) en tâche de fond
// - si le token est invalide/expiré, on nettoie proprement

import { useAuthStore } from "~/stores/auth";
import { useAuthToken } from "~/composables/useApi";

export default defineNuxtPlugin(() => {
  const auth = useAuthStore();
  const cookie = useAuthToken(); // -> useCookie('auth_token', ...)

  // 1) Synchronisation cookie -> store (et cas inverse si cookie absent)
  if (cookie.value && !auth.token) {
    auth._setToken(cookie.value);
  } else if (!cookie.value && auth.token) {
    // Edge case : store conservé en mémoire mais cookie supprimé
    auth._setToken(null);
  }

  // 2) Hydratation non bloquante de l'utilisateur
  // Ne PAS 'await' ici pour ne pas retarder le rendu côté client.
  if (auth.token && !auth.user) {
    auth.fetchMe?.().catch(() => {
      // Token invalide/expiré → on nettoie silencieusement
      auth._setToken(null);
      auth.user = null;
    });
  }
});
