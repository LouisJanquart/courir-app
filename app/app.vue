<script setup>
// Shell racine de l'app.
// - Rien à gérer ici : le layout global et les pages sont injectés via <NuxtLayout> et <NuxtPage>.
// - Le <NuxtLoadingIndicator> affiche une barre de chargement lors des navigations.
</script>

<template>
  <!-- Barre de chargement globale (navigations / data fetching) -->
  <NuxtLoadingIndicator color="#111" :height="3" />

  <!-- Layout courant (par défaut: layouts/default.vue) + page active -->
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
</template>

<style>
/* Pas de styles globaux ici : utilise plutôt assets/styles/main.scss déjà importé via nuxt.config.ts */
</style>
