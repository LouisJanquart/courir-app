<template>
  <div class="page">
    <main class="main"><slot /></main>
    <TabBar v-if="showTabs" />
  </div>
</template>

<script setup>
import TabBar from '~/components/TabBar.vue'
const route = useRoute()
const hideOn = new Set(['/session', '/login', '/register'])
const showTabs = computed(() => !hideOn.has(route.path))
</script>

<style scoped lang="scss">
:root { --tabbar-h: 64px; }
.page { min-height: 100vh; display: flex; flex-direction: column; }
.main {
  flex: 1;
  /* Laisse la place à la tabbar quand elle est visible */
  padding-bottom: calc(var(--tabbar-h) + env(safe-area-inset-bottom));
}
</style>
