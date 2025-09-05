// app/plugins/saved-profiles.client.js
import { useAuthStore } from "~/stores/auth";
import { useSavedProfiles } from "~/composables/useSavedProfiles";

export default defineNuxtPlugin(() => {
  const auth = useAuthStore();
  const { upsert } = useSavedProfiles();

  watch(
    () => ({ token: auth.token, user: auth.user }),
    (val) => {
      if (val?.token && val?.user?.id) {
        upsert({
          id: val.user.id,
          username: val.user.username,
          email: val.user.email,
          token: val.token,
        });
      }
    },
    { immediate: true, deep: true }
  );
});
