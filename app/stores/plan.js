import { defineStore } from "pinia";

export const usePlanStore = defineStore("plan", {
  state: () => ({
    seasons: [],
    pending: false,
    // stocker une string (ou null) – pas d'objet Error
    error: null,
  }),

  actions: {
    async load() {
      if (this.seasons.length) return;
      this.pending = true;
      this.error = null;
      try {
        const { api } = useApi();
        const query =
          "populate[weeks][populate][sessions][populate][steps]=*&sort=order:asc";
        const res = await api(`/seasons?${query}`);
        // Strapi v5: les données sont dans res.data
        this.seasons = res.data || [];
      } catch (e) {
        // 🚫 ne pas garder l'objet e – garder un message simple
        this.error =
          e?.data?.error?.message || e?.message || "Erreur de chargement";
      } finally {
        this.pending = false;
      }
    },
  },

  getters: {
    sessionTotal: () => (session) =>
      (session?.steps || []).reduce((t, s) => t + (s?.seconds || 0), 0),
  },
});
