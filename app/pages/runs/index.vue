<template>
  <section class="wrap">
    <h1>Historique</h1>
    <ul class="list">
      <li v-for="it in runs" :key="it.documentId">
        <NuxtLink :to="`/runs/${it.documentId}`">
          S{{it.seasonOrder}} • W{{it.weekNumber}} • S{{it.sessionNumber}}
          — {{ (it.distanceMeters/1000).toFixed(2) }} km — {{ pace(it.avgPaceSecPerKm) }}/km
        </NuxtLink>
      </li>
    </ul>
  </section>
</template>

<script setup>
import { useAuthStore } from '~/stores/auth'
const auth = useAuthStore()
const { public: { apiUrl } } = useRuntimeConfig()

const { data } = await useFetch(`${apiUrl}/runs`, {
  headers: auth.jwt ? { Authorization: `Bearer ${auth.jwt}` } : {},
  query: {
    'filters[userId][$eq]': auth.user?.id,
    'pagination[pageSize]': 100,
    'sort': 'createdAt:desc'
  }
})
const runs = computed(() => data.value?.data ?? [])
function pace (p) { if (!p) return '—'; const m = String(Math.floor(p/60)).padStart(2,'0'); const s = String(p%60).padStart(2,'0'); return `${m}:${s}` }
</script>

<style scoped>
.wrap { padding: 12px }
.list { display: grid; gap: 10px; }
a { display: block; padding: 10px 12px; border-radius: 10px; background: #fff; border: 1px solid #eee; }
</style>
