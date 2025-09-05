<!-- app/pages/runs/index.vue -->
<script setup>
// Historique des séances (runs) de l'utilisateur connecté.
// - Récupère /users/me si besoin, puis liste ses runs filtrés par userId
// - Trie décroissant sur startedAt
// - Lien vers le détail /runs/[id] (documentId prioritaire)
// - Gère SSR et permissions Strapi (403)

import { computed } from 'vue'
import { useApi } from '~/composables/useApi'
import { useAuthStore } from '~/stores/auth'

definePageMeta({ middleware: 'secure' })

useHead({ title: 'Historique • Courir' })

const auth = useAuthStore()
const { api } = useApi()

const { data, pending, error, refresh, status } = await useAsyncData(
  'runs:list',
  async () => {
    // S'assure d'avoir un utilisateur (utile en SSR / refresh)
    if (!auth.user && auth.token) {
      try { await auth.fetchMe?.() } catch {
        /* ignore: token invalid/expired */
      }
    }
    const uid = auth.user?.id
    if (!uid) {
      // Non connecté → on renvoie un tableau vide
      return []
    }

    const res = await api('/runs', {
      query: {
        'filters[userId][$eq]': String(uid),
        'sort': 'startedAt:desc',
        'pagination[pageSize]': 200
      }
    })
    const arr = Array.isArray(res?.data) ? res.data : (Array.isArray(res) ? res : [])
    return arr
  },
  { server: true }
)

const runs = computed(() => data.value || [])

// Helpers d’affichage
function fmtDuration (s = 0) {
  const m = Math.floor(s / 60)
  const sec = s % 60
  return `${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`
}
function fmtPace (p) {
  if (!p || p <= 0) return '—'
  const m = Math.floor(p / 60), s = p % 60
  return `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`
}
function runLinkId (r) {
  return r?.documentId || r?.id
}
</script>

<template>
  <section class="wrap">
    <h1>Historique</h1>

    <!-- Loading -->
    <p v-if="pending" class="muted">Chargement…</p>

    <!-- Erreur -->
    <div v-else-if="error" class="err">
      <p>Erreur : {{ error?.message || String(error) }}</p>
      <p v-if="status === 'error'">
        <small>
          Si c’est un <b>403 Forbidden</b>, vérifie dans Strapi les permissions du rôle
          <b>Authenticated</b> pour <b>Run → find / findOne</b>.
        </small>
      </p>
      <button class="btn ghost" @click="refresh">Réessayer</button>
    </div>

    <!-- Vide -->
    <p v-else-if="!runs.length" class="muted">Aucune séance enregistrée pour le moment.</p>

    <!-- Liste -->
    <ul v-else class="list" role="list">
      <li v-for="r in runs" :key="r.id || r.documentId" class="item">
        <NuxtLink class="row" :to="`/runs/${runLinkId(r)}`">
          <div class="left">
            <div class="title">
              Saison {{ r.seasonOrder }} · S{{ r.weekNumber }} · Séance {{ r.sessionNumber }}
            </div>
            <div class="sub">
              {{ new Date(r.startedAt).toLocaleString() }}
            </div>
          </div>

          <div class="stats">
            <div class="stat">
              <div class="lab">Durée</div>
              <div class="val">{{ fmtDuration(r.durationSeconds || 0) }}</div>
            </div>
            <div class="stat">
              <div class="lab">Distance</div>
              <div class="val">{{ (r.distanceMeters/1000).toFixed(2) }} km</div>
            </div>
            <div class="stat">
              <div class="lab">Allure</div>
              <div class="val">{{ fmtPace(r.avgPaceSecPerKm) }}/km</div>
            </div>
          </div>
        </NuxtLink>
      </li>
    </ul>
  </section>
</template>

<style scoped lang="scss">
.wrap { padding: 12px; }
h1 { margin: 8px 0 12px; }

.muted { color: #666; }
.err { color: #b00020; }

.list { list-style: none; padding: 0; margin: 0; display: grid; gap: 10px; }
.item { border: 1px solid #eee; border-radius: 12px; background: #fff; }
.row {
  display: flex; justify-content: space-between; gap: 14px;
  padding: 12px; text-decoration: none; color: inherit;
}
.left { min-width: 0; }
.title { font-weight: 800; }
.sub { color: #666; font-size: 13px; }

.stats { display: flex; gap: 12px; align-items: center; }
.stat { text-align: right; }
.lab { color:#666; font-size: 12px; }
.val { font-weight: 800; }
.btn { padding: 8px 12px; border-radius: 10px; border: 1px solid #111; background:#fff; }
.btn.ghost { color:#111; }
</style>
