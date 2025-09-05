// app/middleware/auth.global.js
// -----------------------------------------------------------------------------
// Global: tout est protégé sauf les pages marquées { public: true }.
// Si JWT absent → /login. Si /users/me échoue → purge + /login.
// -----------------------------------------------------------------------------

import { useAuthStore } from "~/stores/auth";
import { useAuthToken } from "~/composables/useApi";

export default defineNuxtRouteMiddleware("auth-global", async (to) => {
  const auth = useAuthStore();
  const tokenCookie = useAuthToken();
  const hasToken = !!tokenCookie.value;
  const isPublic = to.meta?.public === true;

  // Pages publiques : login / register (ou toute page avec { public: true })
  if (isPublic) {
    if (auth.isLoggedIn && (to.path === "/login" || to.path === "/register")) {
      return navigateTo("/home", { replace: true });
    }
    return;
  }

  // Pages protégées
  if (!hasToken) {
    auth._clear?.();
    return navigateTo("/login", { replace: true });
  }

  // JWT présent mais pas d'utilisateur hydraté → tenter /users/me
  if (!auth.user) {
    try {
      await auth.fetchMe();
    } catch {
      auth._clear?.();
      return navigateTo("/login", { replace: true });
    }
  }
});
