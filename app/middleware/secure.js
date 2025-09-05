// app/middleware/secure.ts
// SSR-safe guard: only checks the auth cookie.
// Runs on both server & client, no store/localStorage access.
export default defineNuxtRouteMiddleware(() => {
  const token = useCookie("auth_token").value;
  if (!token) {
    return navigateTo("/login");
  }
});
