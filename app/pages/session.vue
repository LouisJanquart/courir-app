<template>
  <section class="run">
    <header class="meta">
      <h1>Séance</h1>
      <p v-if="profile">
        Saison <b>{{ profile.seasonOrder }}</b> ·
        Semaine <b>{{ profile.weekNumber }}</b> ·
        Séance <b>{{ profile.sessionNumber }}</b>
      </p>
    </header>

    <div class="timers">
      <div class="big">{{ fmt(workout.elapsedS) }}</div>
      <div class="row">
        <div>Distance: <b>{{ (workout.distanceM/1000).toFixed(2) }} km</b></div>
        <div>
          Allure:
          <b v-if="workout.avgPaceSecPerKm">{{ pace(workout.avgPaceSecPerKm) }}/km</b>
          <b v-else>—</b>
        </div>
      </div>
    </div>

    <div class="actions">
      <button v-if="!workout.isActive" @click="start">Démarrer</button>
      <button v-else-if="workout.isPaused" @click="resume">Reprendre</button>
      <button v-else @click="pause">Pause</button>

      <button v-if="workout.isActive || workout.elapsedS>0" class="danger" @click="stop">
        Terminer
      </button>
    </div>

    <p class="hint">
      ⚠️ La géolocalisation nécessite HTTPS (ou localhost). Si la distance ne bouge pas,
      autorise l'accès à la localisation dans le navigateur.
    </p>
  </section>
</template>

<script setup>
import { useWorkoutStore } from '~/stores/workout'
import { useProgressStore } from '~/stores/progress'
import { useAuthStore } from '~/stores/auth'
import { useAuthToken } from '~/composables/useApi'

const workout = useWorkoutStore()
const progress = useProgressStore()
const auth = useAuthStore()
const router = useRouter()
const { public: { apiUrl } } = useRuntimeConfig()

const profile = computed(() => progress.profile)

onMounted(async () => {
  // S'assure que le RunnerProfile existe/est chargé
  await progress.ensureProfile()
  // (facultatif) si tu veux rafraîchir l'utilisateur:
  if (!auth.user && auth.token) {
    try { await auth.fetchMe?.() } catch {}
  }
})

function fmt (s = 0) {
  const m = String(Math.floor(s / 60)).padStart(2, '0')
  const ss = String(s % 60).padStart(2, '0')
  return `${m}:${ss}`
}

function pace (p) {
  if (!p) return '—'
  const m = String(Math.floor(p / 60)).padStart(2, '0')
  const s = String(p % 60).padStart(2, '0')
  return `${m}:${s}`
}

async function start () {
  try {
    await workout.start()
  } catch (e) {
    console.error('start error', e)
    alert('Impossible de démarrer la séance (géolocalisation non disponible).')
  }
}
function pause () {
  try { workout.pause() } catch (e) { console.error(e) }
}
async function resume () {
  try { await workout.resume() } catch (e) { console.error(e) }
}

async function stop () {
  try {
    const jwt = useAuthToken().value // <- ton cookie "auth_token"
    if (!jwt) {
      alert('Session expirée : reconnecte-toi.')
      return router.push('/login')
    }
    if (!auth.user?.id) {
      // Par prudence, tente de récupérer /users/me si non présent
      try { await auth.fetchMe?.() } catch {}
    }

    const meta = {
      // RunnerProfile positionne la séance courante
      seasonOrder: profile?.value?.seasonOrder ?? 1,
      weekNumber: profile?.value?.weekNumber ?? 1,
      sessionNumber: profile?.value?.sessionNumber ?? 1,
      // IMPORTANT : tu m'as dit avoir gardé userId côté Strapi
      userId: auth.user?.id,
      jwt,
      apiUrl
    }

    const saved = await workout.stopAndSave(meta)
    // saved est normalement { id, documentId, ... }
    const runId = saved?.documentId || saved?.id
    if (runId) {
      router.push(`/runs/${runId}`)
    } else {
      alert('Séance enregistrée, mais impossible d’ouvrir le détail.')
    }
  } catch (e) {
    console.error('stop error', e)
    alert('Erreur lors de l’enregistrement de la séance.')
  }
}
</script>

<style scoped>
.run { padding: 12px; }
.meta h1 { margin: 0 0 6px; }
.meta p { margin: 0; color: #555; }
.timers { text-align: center; margin: 16px 0; }
.big { font-size: 56px; font-weight: 900; line-height: 1; margin-bottom: 8px; }
.row { display: flex; justify-content: center; gap: 18px; font-size: 14px; }
.actions { display: flex; gap: 10px; justify-content: center; margin-top: 24px; flex-wrap: wrap; }
button { padding: 10px 14px; border: 0; border-radius: 10px; background: #111; color: #fff; font-weight: 700; cursor: pointer; }
button.danger { background: #c62828; }
.hint { margin-top: 14px; font-size: 12px; color: #666; text-align: center; }
</style>
