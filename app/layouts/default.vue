<script setup>
// Layout par défaut (appliqué à toutes les pages sauf si un autre layout est choisi).
// - Affiche un conteneur principal (<main>) et une TabBar persistante
// - Cache la TabBar sur certaines routes (séance en cours + écrans d'auth)
//
// Si tu veux cacher la TabBar sur d'autres pages (ex: détails d’un run),
// ajoute simplement le chemin dans HIDE_TABS_ON.

import TabBar from '~/components/TabBar.vue'
const route = useRoute()

const HIDE_TABS_ON = new Set(['/session', '/login', '/register'])
const showTabs = computed(() => !HIDE_TABS_ON.has(route.path))
</script>

<template>
  <!-- role="application" améliore la navigation pour certaines techno d’assistance -->
  <div class="page" :class="{ 'with-tabs': showTabs }" role="application">
    <!-- Zone de contenu principale de la page -->
    <main class="main" role="main">
      <slot />
    </main>

    <!-- Tab bar persistante (masquée sur certaines routes) -->
    <TabBar v-if="showTabs" />
  </div>
</template>

<style scoped lang="scss">
:root { --tabbar-h: 64px; }

.page {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

/* Par défaut (pas de TabBar) : juste le safe-area iOS */
.main {
  flex: 1;
  padding-bottom: env(safe-area-inset-bottom);
}

/* Quand la TabBar est visible, on réserve l’espace nécessaire */
.page.with-tabs .main {
  padding-bottom: calc(var(--tabbar-h) + env(safe-area-inset-bottom));
}
</style>
