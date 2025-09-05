// app/stores/progress.js
// ============================================================================
// Store "progress" : gère le RunnerProfile de l'utilisateur courant
// ----------------------------------------------------------------------------
// Objectif : s'assurer qu'un RunnerProfile existe pour le user connecté,
//            le charger et l'exposer à l'UI, puis permettre de le mettre à jour.
//
// Modèle côté Strapi (collection "runner-profiles") :
//   - userId         (number)  ← on a choisi un champ numérique simple (pas la relation)
//   - seasonOrder    (number)
//   - weekNumber     (number)
//   - sessionNumber  (number)
//
// Endpoints Strapi v5 utilisés :
//   GET    /runner-profiles?filters[userId][$eq]=<uid>&pagination[pageSize]=1
//   POST   /runner-profiles   { data: {...} }
//   PUT    /runner-profiles/:idOrDocId { data: {...} }
//
// NB: Strapi v5 renvoie { data: {...}, meta: {...} } → on "unwrap" systématiquement.
// ============================================================================

import { defineStore } from "pinia";
import { useAuthStore } from "~/stores/auth";
import { useApi, useAuthToken, parseStrapiError } from "~/composables/useApi";

export const useProgressStore = defineStore("progress", {
  state: () => ({
    profile: null, // { documentId, id?, userId, seasonOrder, weekNumber, sessionNumber, ... }
    loading: false, // état de chargement (empêche les doubles clics / appels en parallèle)
    error: null, // message lisible pour l’UI (ex: "Forbidden", etc.)
  }),

  getters: {
    hasProfile: (s) => !!s.profile,
    currentSeason: (s) => s.profile?.seasonOrder ?? null,
    currentWeek: (s) => s.profile?.weekNumber ?? null,
    currentSession: (s) => s.profile?.sessionNumber ?? null,
  },

  actions: {
    // ------------------------------------------------------------------------
    // Helpers internes
    // ------------------------------------------------------------------------

    /** Strapi v5 → renvoie res.data si présent, sinon res */
    _unwrap(res) {
      return res && typeof res === "object" && "data" in res ? res.data : res;
    },

    /** Récupère l'ID pour PUT : documentId prioritaire, sinon id numérique */
    _docId(entity) {
      return entity?.documentId || entity?.id;
    },

    /** Affecte localement le profil + remet l'erreur à zéro */
    _setProfile(p) {
      this.profile = p || null;
      this.error = null;
    },

    // ------------------------------------------------------------------------
    // API publiques
    // ------------------------------------------------------------------------

    /**
     * Charge (ou crée) le RunnerProfile du user connecté.
     * - S’il n’y a PAS de token / user → retourne simplement null (pas d’exception).
     * - Crée un profil par défaut (1/1/1) si aucun profil n’existe encore.
     * - Corrige userId s’il est incohérent (migration d’anciens jeux de données).
     * - Met à jour this.profile et retourne le profil.
     */
    async ensureProfile() {
      // Si déjà en cours, renvoyer l’état actuel pour éviter les doublons
      if (this.loading) return this.profile;
      this.loading = true;
      this.error = null;

      try {
        // 0) Vérifier l'auth (via cookie JWT)
        const jwt = useAuthToken().value;
        if (!jwt) {
          // pas connecté → on ne fait rien
          return null;
        }

        // 1) S’assurer d’avoir un user (id) depuis le store d’auth
        const auth = useAuthStore();
        if (!auth.user?.id) {
          try {
            await auth.fetchMe?.();
          } catch {
            /* ignore */
          }
        }
        const uid = auth.user?.id;
        if (!uid) {
          // on ne jette pas → l’UI peut réessayer plus tard
          this.error = "User non chargé";
          return null;
        }

        // 2) Requêtes via le client centralisé (Authorization géré par useApi)
        const { api } = useApi();

        // 2.a) Chercher un profil existant pour ce user
        const found = await api("/runner-profiles", {
          query: {
            "filters[userId][$eq]": String(uid),
            "pagination[pageSize]": 1,
          },
        });
        let profile = this._unwrap(found)?.[0] || null;

        // 2.b) Sinon créer un profil par défaut
        if (!profile) {
          const created = await api("/runner-profiles", {
            method: "POST",
            body: {
              data: {
                userId: uid,
                seasonOrder: 1,
                weekNumber: 1,
                sessionNumber: 1,
              },
            },
          });
          profile = this._unwrap(created);
        }

        // 2.c) Corriger userId si besoin (cohérence)
        if (profile && Number(profile.userId) !== Number(uid)) {
          const idOrDoc = this._docId(profile);
          const updated = await api(`/runner-profiles/${idOrDoc}`, {
            method: "PUT",
            body: { data: { userId: uid } },
          });
          profile = this._unwrap(updated);
        }

        this._setProfile(profile);
        return profile;
      } catch (e) {
        const { message } = parseStrapiError(e);
        this.error = message;
        console.error("ensureProfile error", e);
        return null;
      } finally {
        this.loading = false;
      }
    },

    /**
     * Met à jour la "position" courante dans le plan (saison/semaine/séance).
     * - Met à jour en base ET localement.
     * - Retourne le profil à jour ou null en cas d’échec non bloquant.
     */
    async setCurrent({ seasonOrder, weekNumber, sessionNumber }) {
      if (!this.profile) return null;
      // Id Strapi (documentId prioritaire)
      const idOrDoc = this._docId(this.profile);
      if (!idOrDoc) return null;

      const { api } = useApi();
      try {
        const updated = await api(`/runner-profiles/${idOrDoc}`, {
          method: "PUT",
          body: { data: { seasonOrder, weekNumber, sessionNumber } },
        });
        const p = this._unwrap(updated);
        this._setProfile(p);
        return p;
      } catch (e) {
        const { message } = parseStrapiError(e);
        this.error = message;
        console.error("setCurrent error", e);
        return null;
      }
    },

    /**
     * Avance à la prochaine séance selon le nombre total de sessions dans la semaine.
     * - `totalInWeek` : nombre de Sessions pour la semaine en cours (ex: 3)
     * - Si on dépasse, on passe à la semaine suivante et on remet session=1
     *
     * Exemple d'usage (depuis la page séance, après avoir sauvegardé un run) :
     *   await progress.advanceToNextSession(totalInWeek)
     */
    async advanceToNextSession(totalInWeek = 1) {
      if (!this.profile) return null;

      const cur = {
        seasonOrder: Number(this.profile.seasonOrder || 1),
        weekNumber: Number(this.profile.weekNumber || 1),
        sessionNumber: Number(this.profile.sessionNumber || 1),
      };

      let nextWeek = cur.weekNumber;
      let nextSession = cur.sessionNumber + 1;

      if (nextSession > Number(totalInWeek || 1)) {
        nextSession = 1;
        nextWeek = cur.weekNumber + 1;
      }

      return await this.setCurrent({
        seasonOrder: cur.seasonOrder,
        weekNumber: nextWeek,
        sessionNumber: nextSession,
      });
    },
  },
});
