// app/middleware/auth.global.js
export default defineNuxtRouteMiddleware(async (to) => {
  const auth = useAuthStore();

  // Pages publiques
  const publicPages = ["/login", "/register"];
  if (publicPages.includes(to.path)) {
    if (auth.isLoggedIn) return navigateTo("/home");
    return;
  }

  // Pages protégées
  if (!auth.isLoggedIn) return navigateTo("/login");

  // Restauration au 1er passage (refresh)
  if (!auth.user) {
    try {
      await auth.fetchMe();
    } catch {
      auth.logout();
      return navigateTo("/login");
    }
  }
});
