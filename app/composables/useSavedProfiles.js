// app/composables/useSavedProfiles.js
export function useSavedProfiles() {
  const STORAGE_KEY = "saved_profiles_v1";

  // State partagé Nuxt (évite undefined en SSR)
  const profiles = useState("saved_profiles", () => []);

  // Hydrate depuis localStorage côté client
  if (import.meta.client && profiles.value.length === 0) {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      profiles.value = raw ? JSON.parse(raw) : [];
    } catch {
      profiles.value = [];
    }
  }

  // Persistance
  watch(
    profiles,
    (val) => {
      if (import.meta.client) {
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(val ?? []));
        } catch {}
      }
    },
    { deep: true }
  );

  function upsert(p) {
    const i = profiles.value.findIndex((x) => x.id === p.id);
    if (i !== -1) profiles.value[i] = { ...profiles.value[i], ...p };
    else profiles.value.unshift(p);
  }

  function remove(id) {
    profiles.value = profiles.value.filter((x) => x.id !== id);
  }

  function clear() {
    profiles.value = [];
  }

  return { profiles, upsert, remove, clear };
}
