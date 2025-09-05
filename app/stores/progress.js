// app/stores/progress.js
import { defineStore } from "pinia";
import { useAuthStore } from "~/stores/auth";
import { useAuthToken } from "~/composables/useApi";

export const useProgressStore = defineStore("progress", {
  state: () => ({
    profile: null,
    loading: false,
    error: null,
  }),

  actions: {
    /**
     * Charge (ou crée) le Runner Profile pour l'utilisateur connecté.
     * Ne jette plus d'erreur : retourne null si non connecté / user absent.
     */
    async ensureProfile() {
      if (this.loading) return this.profile;
      this.loading = true;
      this.error = null;

      try {
        const jwt = useAuthToken().value;
        if (!jwt) {
          // pas connecté → on ne fait rien
          return null;
        }

        const auth = useAuthStore();

        // s'assurer d'avoir auth.user
        if (!auth.user?.id) {
          try {
            await auth.fetchMe?.();
          } catch {
            /* ignore */
          }
        }
        const uid = auth.user?.id;
        if (!uid) {
          // utilisateur pas encore dispo : on ne jette plus, on sort proprement
          this.error = "User non chargé";
          return null;
        }

        const {
          public: { apiUrl },
        } = useRuntimeConfig();

        // 1) chercher un profil existant par userId
        const found = await $fetch(`${apiUrl}/runner-profiles`, {
          headers: { Authorization: `Bearer ${jwt}` },
          query: {
            "filters[userId][$eq]": String(uid),
            "pagination[pageSize]": 1,
          },
        });

        let profile = found?.data?.[0] || found?.[0] || null;

        // 2) sinon créer un profil par défaut
        if (!profile) {
          const created = await $fetch(`${apiUrl}/runner-profiles`, {
            method: "POST",
            headers: { Authorization: `Bearer ${jwt}` },
            body: {
              data: {
                userId: uid,
                seasonOrder: 1,
                weekNumber: 1,
                sessionNumber: 1,
              },
            },
          });
          profile = created?.data || created;
        }

        // 3) corriger userId si besoin
        if (profile && Number(profile.userId) !== Number(uid)) {
          const id = profile.documentId || profile.id;
          const updated = await $fetch(`${apiUrl}/runner-profiles/${id}`, {
            method: "PUT",
            headers: { Authorization: `Bearer ${jwt}` },
            body: { data: { userId: uid } },
          });
          profile = updated?.data || updated;
        }

        this.profile = profile;
        return profile;
      } catch (e) {
        this.error = e?.data?.error?.message || e.message;
        console.error("ensureProfile error", e);
        return null;
      } finally {
        this.loading = false;
      }
    },
  },
});
