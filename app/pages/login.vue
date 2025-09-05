<template>
  <section class="wrap">
    <h1>Connexion</h1>

    <!-- Profils enregistrés -->
    <div v-if="recentProfiles.length" class="saved">
      <h2>Profils enregistrés</h2>
      <ul class="cards">
        <li v-for="p in recentProfiles" :key="p.id" class="card">
          <div class="left">
            <div class="avatar">{{ initials(p) }}</div>
            <div class="meta">
              <div class="name">{{ p.username || 'Utilisateur' }}</div>
              <div class="email">{{ p.email }}</div>
            </div>
          </div>
          <div class="actions">
            <button class="btn" @click="onQuickLogin(p)">Se connecter</button>
            <button class="icon danger" title="Supprimer" @click="remove(p.id)">✕</button>
          </div>
        </li>
      </ul>
    </div>

    <!-- Formulaire -->
    <form class="form" @submit.prevent="onSubmit">
      <input
        v-model="form.identifier"
        placeholder="Email ou nom d'utilisateur"
        autocomplete="username"
      />
      <input
        v-model="form.password"
        type="password"
        placeholder="Mot de passe"
        autocomplete="current-password"
        ref="pwdRef"
      />

      <button class="btn primary" :disabled="submitting">
        {{ submitting ? 'Connexion…' : 'Se connecter' }}
      </button>

      <p v-if="error" class="err">{{ error }}</p>
    </form>

    <p class="hint">
      Pas de compte ?
      <NuxtLink to="/register">Créer un compte</NuxtLink>
    </p>
  </section>
</template>

<script setup>
definePageMeta({ public: true })

import { useAuthStore } from '~/stores/auth'
import { useSavedProfiles } from '~/composables/useSavedProfiles'

const auth = useAuthStore()

// Profils mémorisés (toujours un tableau grâce au composable)
const { profiles, remove } = useSavedProfiles()
const recentProfiles = computed(() => profiles.value ?? [])

// Form state
const form = reactive({ identifier: '', password: '' })
const submitting = ref(false)
const error = computed(() => auth.error)
const pwdRef = ref(null)

// Helpers
function initials(p) {
  const s = (p.username || p.email || '?').trim()
  const m = s.match(/\b\w/g) || []
  return (m[0] || '?').toUpperCase()
}

// Soumission classique
async function onSubmit() {
  if (!form.identifier || !form.password) return
  submitting.value = true
  try {
    await auth.login({ identifier: form.identifier, password: form.password })
  } finally {
    submitting.value = false
  }
}

// 1-clic : si le profil a un token on délègue au store, sinon on préremplit et on focus MDP
function onQuickLogin(p) {
  if (p.token) {
    auth.quickLogin(p) // place le token + redirige /home ; middleware restaurera /users/me
  } else {
    form.identifier = p.email || p.username || ''
    nextTick(() => pwdRef.value?.focus())
  }
}
</script>

<style scoped lang="scss">
.wrap { padding: 16px; max-width: 520px; margin: 0 auto; }
h1 { margin: 0 0 12px; }

.saved h2 { margin: 8px 0; font-size: 16px; color: #444; }
.cards { list-style: none; padding: 0; margin: 0 0 16px; display: grid; gap: 10px; }
.card {
  display: flex; align-items: center; justify-content: space-between;
  border: 1px solid #eee; border-radius: 12px; padding: 10px; background: #fff;
}
.left { display: flex; gap: 10px; align-items: center; }
.avatar { width: 36px; height: 36px; border-radius: 50%; background: #111; color: #fff; display:flex; align-items:center; justify-content:center; font-weight:800; }
.meta .name { font-weight: 700; }
.meta .email { color: #666; font-size: 13px; }

.actions { display: flex; gap: 8px; align-items: center; }
.btn {
  padding: 8px 12px; border-radius: 10px; border: 1px solid #111; background: #111; color:#fff; cursor: pointer; font-weight:700;
}
.btn.primary { background: #111; border-color:#111; }
.icon { border: 1px solid #ddd; background: #fff; border-radius: 8px; padding: 6px 8px; cursor: pointer; }
.icon.danger { color: #b00020; border-color: #f2c6cc; }

.form { display: grid; gap: 8px; }
.form input { padding: 10px 12px; border: 1px solid #ddd; border-radius: 10px; }
.err { color: #b00020; margin-top: 6px; }
.hint { margin-top: 12px; font-size: 14px; }
</style>
