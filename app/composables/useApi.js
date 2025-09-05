// app/composables/useApi.js

// Cookie JWT partagé entre store & API
export const useAuthToken = () =>
  useCookie("auth_token", {
    sameSite: "lax",
    secure: true,
    maxAge: 60 * 60 * 24 * 7, // 7 jours
  });

export const useApi = () => {
  const {
    public: { apiUrl },
  } = useRuntimeConfig();
  const token = useAuthToken();

  const api = $fetch.create({
    baseURL: apiUrl,
    retry: 0,
    onRequest({ request, options }) {
      // Headers propres
      const h = new Headers(options.headers || {});
      h.set("accept", "application/json");
      options.headers = h;

      // Déterminer le pathname (qu'on passe une URL absolue ou relative)
      let path = "";
      if (typeof request === "string") {
        try {
          path = new URL(request, apiUrl).pathname;
        } catch {
          path = request;
        }
      } else if (request && "url" in request) {
        try {
          path = new URL(request.url).pathname;
        } catch {
          path = request.url || "";
        }
      }

      // Ajouter le Bearer sauf pour /auth/*
      if (!path.startsWith("/auth/") && token.value) {
        h.set("authorization", `Bearer ${token.value}`);
      }
    },
  });

  return { api };
};
