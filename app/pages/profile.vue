<!-- app/pages/profile.vue -->
<template>
  <section class="wrap">
    <h1>Mon profil</h1>

    <div v-if="!auth.user" class="card">
      <p>Vous n’êtes pas connecté(e).</p>
      <NuxtLink to="/login" class="btn">Se connecter</NuxtLink>
    </div>

    <div v-else class="card">
      <div class="head">
        <span class="material-symbols-outlined avatar">person</span>
        <div>
          <div class="username">{{ auth.user.username }}</div>
          <div class="email">{{ auth.user.email }}</div>
        </div>
      </div>

      <div class="grid">
        <div class="stat">
          <div class="label">Saison</div>
          <div class="value">{{ profile?.seasonOrder ?? '—' }}</div>
        </div>
        <div class="stat">
          <div class="label">Semaine</div>
          <div class="value">{{ profile?.weekNumber ?? '—' }}</div>
        </div>
        <div class="stat">
          <div class="label">Séance</div>
          <div class="value">{{ profile?.sessionNumber ?? '—' }}</div>
        </div>
      </div>

      <div class="actions">
        <NuxtLink to="/sessions" class="btn ghost">Voir les séances</NuxtLink>
        <button class="btn danger" @click="onLogout">Se déconnecter</button>
      </div>
    </div>
  </section>
</template>

<script setup>
import { useAuthStore } from '~/stores/auth'
import { useProgressStore } from '~/stores/progress'

const auth = useAuthStore()
const progress = useProgressStore()

const profile = computed(() => progress.profile)

onMounted(async () => {
  const token = useAuthToken().value
  if (token && !auth.user) {
    auth._setToken(token)
    try { await auth.fetchMe?.() } catch {}
  }
  await progress.ensureProfile()
})


function onLogout () {
  if (confirm('Se déconnecter ?')) {
    auth.logout() // nettoie le cookie auth_token + navigateTo('/login')
  }
}
</script>

<style scoped lang="scss">
.wrap { padding: 12px; }
h1 { margin: 0 0 12px; }

.card {
  background: #fff; border: 1px solid #eee; border-radius: 14px;
  padding: 14px; box-shadow: 0 1px 4px rgba(0,0,0,.04);
}

.head { display: flex; gap: 12px; align-items: center; margin-bottom: 12px; }
.avatar { font-size: 40px; }
.username { font-weight: 700; }
.email { color: #666; font-size: 14px; }

.grid { display: grid; grid-template-columns: repeat(3,1fr); gap: 10px; margin: 10px 0 14px; }
.stat { background: #fafafa; border: 1px solid #eee; border-radius: 10px; padding: 10px; text-align: center; }
.label { font-size: 12px; color: #666; }
.value { font-weight: 800; font-size: 18px; }

.actions { display: flex; gap: 10px; flex-wrap: wrap; }

.btn {
  display: inline-flex; align-items: center; justify-content: center;
  padding: 10px 14px; border-radius: 10px; border: 1px solid #111;
  background: #111; color: #fff; font-weight: 700; text-decoration: none; cursor: pointer;
}
.btn.ghost { background: #fff; color: #111; }
.btn.danger { background: #c62828; border-color: #c62828; }
</style>
