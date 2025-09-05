// app/stores/auth.js
// ============================================================================
// Store Pinia d'authentification (Nuxt 3/4 + Strapi v5)
// ----------------------------------------------------------------------------
// Rôle :
// - Centraliser l’état d’auth (token, user, loading, error)
// - Fournir login / register / logout / fetchMe / init
// - Persister le token dans un cookie (via useAuthToken) pour SSR + client
// - Sauvegarder un "profil récent" côté client pour l’UX du login
//
// Notes :
// - /auth/* (login/register) NE doit PAS recevoir d’Authorization (géré par useApi)
// - /users/me DOIT être autorisé côté Strapi pour le rôle "Authenticated"
// - La redirection est faite ici via navigateTo (await pour éviter les "double nav")
//
// Sécurité :
// - Actuellement on conserve le "token" dans les profils récents (comme ton code).
//   ➜ TODO (optionnel) : ne plus stocker de token dans saved profiles, et faire un
//   "tap-to-login" autrement (ex: magic link / refresh token serveur).
// ============================================================================

import { defineStore } from "pinia";
import { useApi, useAuthToken, parseStrapiError } from "~/composables/useApi";
import { useSavedProfiles } from "~/composables/useSavedProfiles";

export const useAuthStore = defineStore("auth", {
  state: () => ({
    // Le cookie est la source de vérité pour le JWT
    token: useAuthToken().value || null,
    // Objet utilisateur (résultat de /users/me ou res.user après login/register)
    user: null,
    // Pour l’UI (désactiver boutons, spinners, etc.)
    loading: false,
    // Message d’erreur lisible par l’utilisateur
    error: null,
  }),

  getters: {
    // Connecté si on a un JWT (même si user n’est pas encore fetch)
    isLoggedIn: (s) => !!s.token,
  },

  actions: {
    // ------------------------------------------------------------------------
    // Helpers internes (pas exportés)
    // ------------------------------------------------------------------------

    /** Écrit le token dans le cookie + synchronise le state */
    _setToken(jwt) {
      const cookie = useAuthToken();
      cookie.value = jwt || null;
      this.token = jwt || null;
    },

    /** Réinitialise complètement l’état d’auth */
    _clear() {
      this._setToken(null);
      this.user = null;
      this.error = null;
    },

    // ------------------------------------------------------------------------
    // API publiques
    // ------------------------------------------------------------------------

    /**
     * Récupère l’utilisateur courant via /users/me
     * - Nécessite que le rôle "Authenticated" ait la permission "me"
     * - En cas de 401/403 : on efface le token (expiré/invalide)
     */
    async fetchMe() {
      if (!this.token) {
        this.user = null;
        return null;
      }
      const { api } = useApi();
      try {
        const me = await api("/users/me"); // Authorization auto via useApi
        this.user = me;
        return me;
      } catch (e) {
        const { status } = parseStrapiError(e);
        if (status === 401 || status === 403) this._clear();
        throw e;
      }
    },

    /**
     * Inscription Strapi (email/password + username)
     * Strapi répond { jwt, user }
     */
    async register({ username, email, password }) {
      this.loading = true;
      this.error = null;
      try {
        const { api } = useApi();
        const res = await api("/auth/local/register", {
          method: "POST",
          body: { username, email, password },
        });

        // On garde la réponse telle quelle
        this._setToken(res.jwt);
        this.user = res.user;

        // (Optionnel) compléter via /users/me si tu as des champs supplémentaires
        try {
          await this.fetchMe();
        } catch {
          /* ignore: token invalid/expired */
        }

        // UX : sauvegarder le profil récent (⚠️ avec token pour conserver ton "quickLogin")
        if (import.meta.client) {
          useSavedProfiles().upsert({
            id: res.user.id,
            username: res.user.username,
            email: res.user.email,
            token: res.jwt, // TODO futur : retirer le token pour plus de sécurité
          });
        }

        await navigateTo("/home");
      } catch (e) {
        const { status, message } = parseStrapiError(e);
        // Messages “humains”
        if (status === 400) this.error = "Données invalides.";
        else if (status === 403) this.error = "Inscription refusée.";
        else this.error = message || "Inscription impossible.";
        throw e;
      } finally {
        this.loading = false;
      }
    },

    /**
     * Connexion e-mail/username + password
     * Payload Strapi : { identifier, password }
     */
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

        // (Optionnel) compléter via /users/me
        try {
          await this.fetchMe();
        } catch {
          /* ignore: token invalid/expired */
        }

        // UX : mémoriser le profil (⚠️ avec token pour compat rétro "quickLogin")
        if (import.meta.client) {
          useSavedProfiles().upsert({
            id: res.user.id,
            username: res.user.username,
            email: res.user.email,
            token: res.jwt, // TODO futur : retirer le token pour plus de sécurité
          });
        }

        await navigateTo("/home");
      } catch (e) {
        const { status, message } = parseStrapiError(e);
        if (status === 403)
          this.error = "Connexion refusée (compte bloqué ou login désactivé).";
        else if (status === 400) this.error = "Identifiants invalides.";
        else this.error = message || "Impossible de se connecter.";
        throw e;
      } finally {
        this.loading = false;
      }
    },

    /**
     * Connexion 1-clic depuis la liste des profils récents
     * - On remet le token depuis le profil (si présent), sinon on redirige vers /login
     * - Le middleware + fetchMe consolideront l’état
     */
    async quickLogin(profile) {
      // Si pas de token mémorisé, on refuse le quickLogin
      if (!profile?.token) {
        this._clear();
        return navigateTo("/login");
      }

      this._setToken(profile.token);
      // On met un user minimal immédiat (pour l’UI), /users/me affinera ensuite
      this.user = {
        id: profile.id,
        username: profile.username,
        email: profile.email,
      };

      await navigateTo("/home");
    },

    /** Déconnexion simple : on efface JWT + user et on renvoie sur /login */
    logout() {
      this._clear();
      return navigateTo("/login");
    },

    /**
     * À appeler au boot de l’app (plugin d’init)
     * - Si on a un token mais pas de user, tente /users/me
     * - Si token invalide, _clear() est déjà géré dans fetchMe()
     */
    async init() {
      if (!this.token) return;
      if (!this.user) {
        try {
          await this.fetchMe();
        } catch {
          /* ignore: token invalid/expired */
        }
      }
    },
  },
});
