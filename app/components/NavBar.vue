<script setup>
import { useAuthStore } from '~/stores/auth'
const auth = useAuthStore()
function logout() { auth.logout(); navigateTo('/login') }
</script>

<template>
  <nav class="nav">
    <NuxtLink to="/">Home</NuxtLink>
    <NuxtLink to="/plan">Plan</NuxtLink>

    <span class="spacer" />
    <template v-if="auth.user">
      Bonjour {{ auth.user.username }}
      <button @click="logout">Se déconnecter</button>
    </template>
    <template v-else>
      <NuxtLink to="/login">Se connecter</NuxtLink>
      ·
      <NuxtLink to="/register">Créer un compte</NuxtLink>
    </template>
  </nav>
</template>

<style scoped>
.nav{display:flex;gap:1rem;align-items:center;padding:.75rem 1rem;border-bottom:1px solid #eee}
.spacer{margin-left:auto}
</style>
