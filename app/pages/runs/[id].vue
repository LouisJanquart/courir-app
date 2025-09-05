<script setup>
// -----------------------------------------------------------------------------
// Détail d’une séance terminée (Run)
// - Récupère un run par ID numérique ou documentId (Strapi v5)
// - Affiche les stats et le tracé GPS (Leaflet, composant client-only)
// - Utilise utils/format pour des rendus homogènes
// -----------------------------------------------------------------------------
import RunMap from '~/components/RunMap.client.vue'
import { useApi } from '~/composables/useApi'
import { fmtSeconds, fmtPace, fmtKm, fmtDateTime } from '~/utils/format'

definePageMeta({ middleware: 'secure' })

useHead({ title: 'Détail séance • Courir' })

const route = useRoute()
const { api } = useApi()

// useAsyncData : SSR + prise en compte du cookie auth_token via useApi()
const { data, pending, error, refresh, status } = await useAsyncData(
  () => `run:${route.params.id}`,
  async () => {
    const raw = String(route.params.id || '')
    // 1) ID numérique
    if (/^\d+$/.test(raw)) {
      const res = await api(`/runs/${raw}`)
      return res?.data || res
    }
    // 2) documentId (UUID-like)
    const res = await api('/runs', {
      query: { 'filters[documentId][$eq]': raw, 'pagination[pageSize]': 1 }
    })
    return (res?.data && res.data[0]) || null
  },
  { server: true }
)

const run = computed(() => data.value || null)
</script>

<template>
  <section class="wrap">
    <h1>Détail de la séance</h1>

    <!-- Loading -->
    <div v-if="pending">Chargement…</div>

    <!-- Erreur (permissions find/findOne côté Strapi ?) -->
    <div v-else-if="error" class="err">
      <p>Erreur: {{ error.message || error }}</p>
      <p v-if="status === 403">
        ➜ Vérifie que tu es connecté et que le rôle <b>Authenticated</b> a les
        permissions <b>Run → find / findOne</b> dans Strapi.
      </p>
      <button @click="refresh">Réessayer</button>
    </div>

    <!-- Contenu -->
    <div v-else-if="run">
      <p class="meta">
        Saison <b>{{ run.seasonOrder }}</b> ·
        Semaine <b>{{ run.weekNumber }}</b> ·
        Séance <b>{{ run.sessionNumber }}</b>
      </p>

      <ul class="stats">
        <li><b>Départ</b> : {{ fmtDateTime(run.startedAt) }}</li>
        <li><b>Arrivée</b> : {{ fmtDateTime(run.finishedAt) }}</li>
        <li><b>Durée (mvt)</b> : {{ fmtSeconds(run.durationSeconds) }}</li>
        <li><b>Distance</b> : {{ fmtKm(run.distanceMeters) }}</li>
        <li>
          <b>Allure moy.</b> :
          <template v-if="run.avgPaceSecPerKm && run.avgPaceSecPerKm > 0">
            {{ fmtPace(run.avgPaceSecPerKm) }}/km
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

<style scoped>
/* Layout et carte d’infos du détail */
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
