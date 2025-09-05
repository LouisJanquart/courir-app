export default defineNuxtPlugin(async () => {
  const auth = useAuthStore();
  const token = useAuthToken(); // cookie 'auth_token'
  if (token.value && !auth.token) {
    auth._setToken(token.value);
  }
  if (auth.token && !auth.user) {
    try {
      await auth.fetchMe();
    } catch {
      /* token expiré → ignoré */
    }
  }
});
