// app/plugins/auth-init.server.js
// Restaure l'état d'auth **côté serveur** au premier rendu :
// - synchronise le JWT du cookie "auth_token" vers le store
// - tente de charger l'utilisateur via /users/me (await pour SSR)
// - en cas d'échec (token expiré/invalide), on nettoie le store

import { useAuthStore } from "~/stores/auth";
import { useAuthToken } from "~/composables/useApi";

export default defineNuxtPlugin(async () => {
  const auth = useAuthStore();
  const cookie = useAuthToken(); // -> useCookie('auth_token', ...)

  // 1) Sync cookie <-> store
  if (cookie.value && !auth.token) {
    auth._setToken(cookie.value);
  } else if (!cookie.value && auth.token) {
    // store contenait un token alors que le cookie a disparu
    auth._setToken(null);
  }

  // 2) Hydratation SSR de l'utilisateur (attendue côté serveur)
  if (auth.token && !auth.user) {
    try {
      await auth.fetchMe?.();
    } catch {
      // Token expiré / invalide → on nettoie silencieusement
      auth._setToken(null);
      auth.user = null;
    }
  }
});
