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
      <p class="meta">
        Saison <b>{{ run.seasonOrder }}</b> ·
        Semaine <b>{{ run.weekNumber }}</b> ·
        Séance <b>{{ run.sessionNumber }}</b>
      </p>

      <ul class="stats">
        <li><b>Départ</b> : {{ new Date(run.startedAt).toLocaleString() }}</li>
        <li><b>Arrivée</b> : {{ new Date(run.finishedAt).toLocaleString() }}</li>
        <li><b>Durée (mvt)</b> : {{ fmt(run.durationSeconds) }}</li>
        <li><b>Distance</b> : {{ (run.distanceMeters/1000).toFixed(2) }} km</li>
        <li><b>Allure moy.</b> :
          <template v-if="run.avgPaceSecPerKm && run.avgPaceSecPerKm > 0">
            {{ pace(run.avgPaceSecPerKm) }}/km
          </template>
          <template v-else>—</template>
        </li>
        <li><b>Points GPS</b> : {{ (run.track && run.track.length) || 0 }}</li>
      </ul>

      <ClientOnly>
        <RunMap :track="run.track || []" />
      </ClientOnly>

      <NuxtLink class="back" to="/sessions">← Retour aux séances</NuxtLink>
    </div>
  </section>
</template>

<script setup>
import RunMap from '~/components/RunMap.client.vue'
import { useApi } from '~/composables/useApi'

const route = useRoute()
const { api } = useApi()

const { data, pending, error, refresh, status } = await useAsyncData(
  () => `run:${route.params.id}`,
  async () => {
    const raw = String(route.params.id || '')
    if (/^\d+$/.test(raw)) {
      const res = await api(`/runs/${raw}`)
      return res?.data || res
    } else {
      const res = await api('/runs', {
        query: { 'filters[documentId][$eq]': raw, 'pagination[pageSize]': 1 }
      })
      return (res?.data && res.data[0]) || null
    }
  },
  { server: true }
)

const run = computed(() => data.value || null)

function fmt (s = 0) {
  const m = Math.floor(s / 60), sec = s % 60
  return `${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`
}
function pace (p = 0) {
  const m = Math.floor(p / 60), s = p % 60
  return `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`
}
</script>

<style scoped>
.wrap { padding: 12px; }
.meta { color:#555; margin-top: -6px; }
.err { color:#b00020; }
.stats {
  line-height: 1.8;
  background:#fff; border:1px solid #eee; border-radius:12px; padding:12px; margin:12px 0;
  display:grid; gap:6px; grid-template-columns: repeat(2, minmax(0,1fr));
}
.back { display:inline-block; margin-top: 12px; text-decoration:none; }
</style>
