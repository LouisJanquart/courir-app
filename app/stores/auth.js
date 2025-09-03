import { defineStore } from "pinia";

export const useAuthStore = defineStore("auth", {
  state: () => ({ user: null, loading: false, error: null }),

  actions: {
    async login({ identifier, password }) {
      this.loading = true;
      this.error = null;
      try {
        const {
          public: { apiUrl },
        } = useRuntimeConfig();
        const res = await $fetch("/auth/local", {
          baseURL: apiUrl,
          method: "POST",
          body: { identifier, password },
        });
        const token = useAuthToken();
        token.value = res.jwt;
        this.user = res.user;
        return res.user;
      } catch (e) {
        this.error = e?.data?.error?.message || e.message;
        throw e;
      } finally {
        this.loading = false;
      }
    },

    async register({ username, email, password }) {
      this.loading = true;
      this.error = null;
      try {
        const {
          public: { apiUrl },
        } = useRuntimeConfig();
        const res = await $fetch("/auth/local/register", {
          baseURL: apiUrl,
          method: "POST",
          body: { username, email, password },
        });
        const token = useAuthToken();
        token.value = res.jwt;
        this.user = res.user;
        return res.user;
      } catch (e) {
        this.error = e?.data?.error?.message || e.message;
        throw e;
      } finally {
        this.loading = false;
      }
    },

    async me() {
      try {
        const { api } = useApi();
        this.user = await api("/users/me");
        return this.user;
      } catch {
        this.user = null;
      }
    },

    logout() {
      const token = useAuthToken();
      token.value = null;
      this.user = null;
    },
  },
});
