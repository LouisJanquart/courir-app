export const useAuthToken = () =>
  useCookie("auth_token", { maxAge: 60 * 60 * 24 * 7 }); // 7 jours

export const useApi = () => {
  const config = useRuntimeConfig();
  const token = useAuthToken();
  const api = $fetch.create({
    baseURL: config.public.apiUrl,
    onRequest({ request, options }) {
      const url = typeof request === "string" ? request : request.url || "";
      const isAuthRoute = url.includes("/auth/");
      // N'ajoute le Bearer QUE si ce n'est pas une route /auth/*
      if (token.value && !isAuthRoute) {
        options.headers = {
          ...(options.headers || {}),
          Authorization: `Bearer ${token.value}`,
        };
      }
      // (optionnel) assure un Accept JSON
      options.headers = {
        accept: "application/json",
        ...(options.headers || {}),
      };
    },
  });
  return { api };
};
