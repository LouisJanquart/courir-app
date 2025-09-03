<!-- pages/me.vue -->
<script setup>
import { useAuthStore } from '~/stores/auth'
const auth = useAuthStore()
await auth.me()
</script>

<template>
  <h1>Mon profil</h1>
  <pre>{{ auth.user }}</pre>
</template>
