// app/stores/auth.js
import { defineStore } from "pinia";
import { useApi, useAuthToken } from "~/composables/useApi";
import { useSavedProfiles } from "~/composables/useSavedProfiles";

export const useAuthStore = defineStore("auth", {
  state: () => ({
    token: useAuthToken().value, // lu une seule fois au démarrage
    user: null,
    loading: false,
    error: null,
  }),

  getters: {
    isLoggedIn: (s) => !!s.token,
  },

  actions: {
    // internes
    _setToken(jwt) {
      const cookie = useAuthToken();
      cookie.value = jwt || null;
      this.token = jwt || null;
    },
    _clear() {
      this._setToken(null);
      this.user = null;
      this.error = null;
    },

    // Restaure l'utilisateur depuis le backend (utilisé au rafraîchissement)
    async fetchMe() {
      if (!this.token || this.user) return;
      const { api } = useApi();
      // on force le bearer par sécurité (au cas où)
      const me = await api("/users/me", {
        headers: { Authorization: `Bearer ${this.token}` },
      });
      this.user = me;
    },

    // --- Auth de base (SIMPLE) ---

    // Strapi renvoie déjà { jwt, user } → pas besoin d'appeler /users/me ici.
    async register({ username, email, password }) {
      this.loading = true;
      this.error = null;
      try {
        const { api } = useApi();
        const res = await api("/auth/local/register", {
          method: "POST",
          body: { username, email, password },
        });
        this._setToken(res.jwt);
        this.user = res.user;

        // Sauvegarde "profil récent" pour l'écran de login
        if (import.meta.client) {
          useSavedProfiles().upsert({
            id: res.user.id,
            username: res.user.username,
            email: res.user.email,
            token: res.jwt,
          });
        }

        navigateTo("/home");
      } catch (e) {
        this.error = e?.data?.error?.message || "Inscription impossible.";
        throw e;
      } finally {
        this.loading = false;
      }
    },

    async login({ identifier, password }) {
      this.loading = true;
      this.error = null;
      try {
        const { api } = useApi();
        const res = await api("/auth/local", {
          method: "POST",
          body: { identifier, password },
        });
        this._setToken(res.jwt);
        this.user = res.user;

        if (import.meta.client) {
          useSavedProfiles().upsert({
            id: res.user.id,
            username: res.user.username,
            email: res.user.email,
            token: res.jwt,
          });
        }

        navigateTo("/home");
      } catch (e) {
        const code = e?.data?.error?.status;
        if (code === 403)
          this.error = "Connexion refusée (compte bloqué ou login désactivé).";
        else if (code === 400) this.error = "Identifiants invalides.";
        else
          this.error = e?.data?.error?.message || "Impossible de se connecter.";
        throw e;
      } finally {
        this.loading = false;
      }
    },

    // Connexion 1-clic depuis "profils récents"
    quickLogin(profile) {
      // On place le token + un user minimal ; le middleware validera via /users/me
      this._setToken(profile.token || null);
      this.user = profile.token
        ? { id: profile.id, username: profile.username, email: profile.email }
        : null;

      navigateTo("/home");
    },

    logout() {
      this._clear();
      navigateTo("/login");
    },
  },
});
