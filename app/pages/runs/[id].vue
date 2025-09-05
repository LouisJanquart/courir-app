<template>
  <section class="wrap">
    <h1>Détail de la séance</h1>

    <div v-if="pending">Chargement…</div>

    <div v-else-if="error" class="err">
      <p>Erreur: {{ error.message || error }}</p>
      <p v-if="status === 403">
        ➜ Vérifie que tu es connecté et que le rôle <b>Authenticated</b> a les
        permissions <b>Run → find / findOne</b> dans Strapi.
      </p>
      <button @click="refresh">Réessayer</button>
    </div>

    <div v-else-if="run">
      <p>
        Saison <b>{{ run.seasonOrder }}</b> ·
        Semaine <b>{{ run.weekNumber }}</b> ·
        Séance <b>{{ run.sessionNumber }}</b>
      </p>

      <ul class="stats">
        <li><b>Départ</b> : {{ new Date(run.startedAt).toLocaleString() }}</li>
        <li><b>Arrivée</b> : {{ new Date(run.finishedAt).toLocaleString() }}</li>
        <li><b>Durée (mvt)</b> : {{ fmt(run.durationSeconds) }}</li>
        <li><b>Distance</b> : {{ (run.distanceMeters/1000).toFixed(2) }} km</li>
        <li><b>Allure moy.</b> : {{ pace(run.avgPaceSecPerKm) }}/km</li>
      </ul>

      <NuxtLink class="back" to="/sessions">← Retour aux séances</NuxtLink>
    </div>
  </section>
</template>

<script setup>
import { useApi } from '~/composables/useApi'

const route = useRoute()
const { api } = useApi()

// Important: on passe par useApi() pour coller automatiquement Authorization: Bearer <auth_token>
const { data, pending, error, refresh, status } = await useAsyncData(
  () => `run:${route.params.id}`,
  async () => {
    const res = await api(`/runs/${route.params.id}`)
    // Strapi v5 renvoie { data: {...}, meta: {} }
    return res?.data || res
  },
  { server: true } // ok si ton cookie s'appelle bien auth_token
)

const run = computed(() => data.value || null)

function fmt (s = 0) {
  const m = Math.floor(s / 60)
  const sec = s % 60
  return `${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`
}

function pace (p) {
  if (!p) return '—'
  const m = Math.floor(p / 60)
  const s = p % 60
  return `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`
}
</script>

<style scoped>
.wrap { padding: 12px; }
.err { color:#b00020; }
.stats { line-height: 1.8; }
.back { display:inline-block; margin-top: 12px; }
</style>
