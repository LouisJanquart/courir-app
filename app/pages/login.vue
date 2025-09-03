<script setup>
import { useAuthStore } from '~/stores/auth'
const auth = useAuthStore()
const form = reactive({ identifier: '', password: '' })
const msg = ref('')

async function onSubmit() {
  try {
    await auth.login(form)
    msg.value = ''
    await navigateTo('/plan') // redirige où tu veux
  } catch (e) {
    msg.value = auth.error || 'Login échoué'
  }
}
</script>

<template>
  <main>
    <h1>Connexion</h1>
    <form @submit.prevent="onSubmit">
      <label>Email</label>
      <input v-model="form.identifier" type="email" required />
      <label>Mot de passe</label>
      <input v-model="form.password" type="password" required />
      <button :disabled="auth.loading">{{ auth.loading ? 'Connexion…' : 'Se connecter' }}</button>
    </form>
    <p v-if="msg" style="color:red">{{ msg }}</p>
    <p>Pas de compte ? <NuxtLink to="/register">Créer un compte</NuxtLink></p>
  </main>
</template>
