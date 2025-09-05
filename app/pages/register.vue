<script setup>
import { useAuthStore } from '~/stores/auth'

definePageMeta({ public: true })

const auth = useAuthStore()

const form = reactive({
  username: '',
  email: '',
  password: ''
})
const showPwd = ref(false)
const msg = ref('')

const canSubmit = computed(() =>
  !auth.loading &&
  form.username.trim().length >= 2 &&
  /\S+@\S+\.\S+/.test(form.email) &&
  form.password.length >= 6
)

async function onSubmit () {
  msg.value = ''
  try {
    // Le store gère la redirection vers /home en cas de succès
    await auth.register({ ...form })
  } catch {
    msg.value = auth.error || 'Inscription échouée'
  }
}

useHead({ title: 'Créer un compte • Courir' })
</script>

<template>
  <main class="auth">
    <h1>Créer un compte</h1>

    <form class="card" novalidate @submit.prevent="onSubmit">
      <label for="username">Nom d’utilisateur</label>
      <input
        id="username"
        v-model="form.username"
        name="username"
        type="text"
        autocomplete="username"
        required
        minlength="2"
        autofocus
      >

      <label for="email">Email</label>
      <input
        id="email"
        v-model="form.email"
        name="email"
        type="email"
        autocomplete="email"
        required
      >

      <label for="password">Mot de passe</label>
      <div class="pwd">
        <input
          id="password"
          v-model="form.password"
          :type="showPwd ? 'text' : 'password'"
          name="new-password"
          autocomplete="new-password"
          required
          minlength="6"
        >
        <button
          class="ghost"
          type="button"
          aria-label="Afficher/masquer le mot de passe"
          @click="showPwd = !showPwd"
        >
          {{ showPwd ? 'Masquer' : 'Afficher' }}
        </button>
      </div>

      <button class="primary" :disabled="!canSubmit">
        {{ auth.loading ? 'Création…' : 'Créer un compte' }}
      </button>

      <p v-if="msg" class="err">{{ msg }}</p>
    </form>

    <p class="alt">
      Déjà inscrit ? <NuxtLink to="/login">Se connecter</NuxtLink>
    </p>
  </main>
</template>

<style scoped>
.auth { padding: 16px; max-width: 520px; margin: 0 auto; }
h1 { margin: 0 0 12px; }

.card {
  background: #fff;
  border: 1px solid #eee;
  border-radius: 12px;
  padding: 14px;
  display: grid;
  gap: 10px;
}

label { font-size: 14px; color: #444; }
input {
  width: 100%;
  padding: 10px 12px;
  border-radius: 10px;
  border: 1px solid #ddd;
  outline: none;
}
input:focus { border-color: #111; }

.pwd { display: grid; grid-template-columns: 1fr auto; gap: 8px; align-items: center; }
button.primary {
  padding: 10px 14px;
  border: 0;
  border-radius: 10px;
  background: #111;
  color: #fff;
  font-weight: 700;
  cursor: pointer;
}
button.primary:disabled { opacity: 0.6; cursor: not-allowed; }
button.ghost {
  background: transparent;
  border: 1px solid #ddd;
  color: #111;
  border-radius: 10px;
  padding: 8px 10px;
  cursor: pointer;
}

.err { color: #b00020; margin: 6px 0 0; }
.alt { margin-top: 10px; }
</style>
