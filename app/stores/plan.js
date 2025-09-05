// app/stores/plan.js
// Store "plan" : charge la structure d’entraînement depuis Strapi (Saisons → Semaines → Séances → Steps)

import { defineStore } from "pinia";
import { useApi } from "~/composables/useApi";

export const usePlanStore = defineStore("plan", {
  state: () => ({
    seasons: [], // [{ order, weeks: [{ number, sessions: [{ number, steps: [...] }] }] }]
    pending: false, // état de chargement
    error: null, // string (jamais un objet Error)
    loadedAt: null, // timestamp du dernier chargement
  }),

  getters: {
    // Durée totale (en secondes) d'une séance (somme des steps)
    sessionTotal: () => (session) =>
      (session?.steps ?? []).reduce((t, s) => t + (s?.seconds || 0), 0),

    hasData: (s) => Array.isArray(s.seasons) && s.seasons.length > 0,
  },

  actions: {
    /**
     * Charge le plan depuis Strapi.
     * @param {{ force?: boolean }} opts - `force: true` pour ignorer le cache en mémoire
     */
    async load(opts = {}) {
      const { force = false } = opts;
      if (this.pending) return;
      if (this.hasData && !force) return;

      this.pending = true;
      this.error = null;
      try {
        const { api } = useApi();
        // Strapi v5 : populate imbriqué + tri des saisons par "order"
        // (Les semaines/sessions ne sont pas triées côté API → on re-trie côté client)
        const query =
          "populate[weeks][populate][sessions][populate][steps]=*&sort=order:asc&pagination[pageSize]=100";
        const res = await api(`/seasons?${query}`);
        const rows = Array.isArray(res?.data) ? res.data : [];

        // Normalisation + tri profond
        const seasons = rows
          .slice()
          .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
          .map((season) => ({
            ...season,
            weeks: (season.weeks ?? [])
              .slice()
              .sort((a, b) => (a.number ?? 0) - (b.number ?? 0))
              .map((week) => ({
                ...week,
                sessions: (week.sessions ?? [])
                  .slice()
                  .sort((a, b) => (a.number ?? 0) - (b.number ?? 0))
                  .map((sess) => ({
                    ...sess,
                    steps: (sess.steps ?? []).slice(),
                  })),
              })),
          }));

        this.seasons = seasons;
        this.loadedAt = Date.now();
      } catch (e) {
        this.error =
          e?.data?.error?.message || e?.message || "Erreur de chargement";
      } finally {
        this.pending = false;
      }
    },

    /** Réinitialise le cache en mémoire (utile après migration de données) */
    reset() {
      this.seasons = [];
      this.pending = false;
      this.error = null;
      this.loadedAt = null;
    },

    /** Raccourcis pratiques */
    getSeason(order) {
      return (
        this.seasons.find((s) => Number(s.order) === Number(order)) || null
      );
    },
    getWeek(order, number) {
      const s = this.getSeason(order);
      return s?.weeks?.find((w) => Number(w.number) === Number(number)) || null;
    },
    getSession(order, weekNumber, sessionNumber) {
      const w = this.getWeek(order, weekNumber);
      return (
        w?.sessions?.find((s) => Number(s.number) === Number(sessionNumber)) ||
        null
      );
    },
    /** Liste à plat de toutes les séances d’une saison (utile pour un rendu simple) */
    flatOfSeason(order) {
      const s = this.getSeason(order) || this.seasons[0];
      if (!s) return [];
      const out = [];
      for (const w of s.weeks ?? []) {
        for (const sess of w.sessions ?? []) {
          out.push({ weekNumber: w.number, session: sess });
        }
      }
      return out;
    },
  },
});
