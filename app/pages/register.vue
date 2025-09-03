<script setup>
import { useAuthStore } from '~/stores/auth'
const auth = useAuthStore()
const form = reactive({ username: '', email: '', password: '' })
const msg = ref('')

async function onSubmit() {
  try {
    await auth.register(form)
    msg.value = ''
    await navigateTo('/plan')
  } catch (e) {
    msg.value = auth.error || 'Inscription échouée'
  }
}
</script>

<template>
  <main>
    <h1>Créer un compte</h1>
    <form @submit.prevent="onSubmit">
      <label>Nom d’utilisateur</label>
      <input v-model="form.username" required />
      <label>Email</label>
      <input v-model="form.email" type="email" required />
      <label>Mot de passe</label>
      <input v-model="form.password" type="password" required />
      <button :disabled="auth.loading">{{ auth.loading ? 'Création…' : 'Créer un compte' }}</button>
    </form>
    <p v-if="msg" style="color:red">{{ msg }}</p>
    <p>Déjà inscrit ? <NuxtLink to="/login">Se connecter</NuxtLink></p>
  </main>
</template>
