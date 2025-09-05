<!-- app/pages/index.vue -->
<script setup>
// Redirige immédiatement vers /home, côté serveur ET côté client.
// - En SSR: on "await" navigateTo pour ne pas rendre la page /.
// - En client: on remplace l'historique pour éviter un retour arrière vers /.

const target = '/home'

if (import.meta.server) {
  await navigateTo(target, { replace: true })
} else {
  navigateTo(target, { replace: true })
}
</script>

<template>
  <!-- Fallback ultra bref si jamais le client met un instant à rediriger -->
  <p>Redirection…</p>
</template>
