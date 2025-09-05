<template>
  <section class="wrap">
    <h1>Toutes les séances (Saison {{ profile?.seasonOrder ?? '—' }})</h1>

    <div class="list">
      <SessionCard
        v-for="(it, i) in flat"
        :key="`w${it.weekNumber}-s${it.session.number}`"
        :ref="el => cardRefs[i] = el"
        :title="`Semaine ${it.weekNumber} — Séance ${it.session.number}`"
        :steps="it.session.steps"
        :status="statusOf(it)"
      >
        <template #cta>
          <NuxtLink
            v-if="getRun(it)"
            class="link"
            :to="`/runs/${getRun(it).documentId || getRun(it).id}`"
          >
            Détail
          </NuxtLink>
          <button v-else-if="statusOf(it) === 'current'" class="start" @click="start()">
            Démarrer
          </button>
        </template>
      </SessionCard>
    </div>
  </section>
</template>

<script setup>
import SessionCard from '~/components/SessionCard.vue'
import { usePlanStore } from '~/stores/plan'
import { useProgressStore } from '~/stores/progress'
import { useAuthStore } from '~/stores/auth'
import { useAuthToken } from '~/composables/useApi'

const plan = usePlanStore()
const progress = useProgressStore()
const auth = useAuthStore()
const router = useRouter()
const { public: { apiUrl } } = useRuntimeConfig()

const profile = computed(() => progress.profile || {})
const flat = ref([])            // [{ weekNumber, session }]
const cardRefs = reactive([])
const runMap = ref(new Map())

onMounted(async () => {
  await plan.load()
  await progress.ensureProfile()
  if (!auth.user && useAuthToken().value) { try { await auth.fetchMe() } catch {} }

  buildFlat()
  await loadRuns()

  nextTick(() => {
    const idx = indexOfCurrent()
    const el = cardRefs[idx]?.$el || cardRefs[idx]
    if (el?.scrollIntoView) el.scrollIntoView({ behavior: 'smooth', block: 'center' })
  })
})

function buildFlat () {
  const season = plan.seasons.find(s => s.order === profile.value.seasonOrder) || plan.seasons[0]
  const rows = []
  for (const w of (season?.weeks || []).slice().sort((a,b)=>a.number-b.number)) {
    for (const s of (w.sessions || []).slice().sort((a,b)=>a.number-b.number)) {
      rows.push({ weekNumber: w.number, session: s })
    }
  }
  flat.value = rows
}

function statusOf (item) {
  const curW = profile.value.weekNumber
  const curS = profile.value.sessionNumber
  if (item.weekNumber < curW) return 'done'
  if (item.weekNumber > curW) return 'upcoming'
  if (item.session.number < curS) return 'done'
  if (item.session.number > curS) return 'upcoming'
  return 'current'
}

function indexOfCurrent () {
  const i = flat.value.findIndex(it => statusOf(it) === 'current')
  return i >= 0 ? i : 0
}

function start () { router.push('/session') }

/** charge les runs de l'utilisateur connecté (userId) */
async function loadRuns () {
  const jwt = useAuthToken().value
  const uid = auth.user?.id
  if (!jwt || !uid) { runMap.value = new Map(); return }

  const query = {
    'filters[userId][$eq]': String(uid),
    'filters[seasonOrder][$eq]': String(profile.value.seasonOrder),
    'pagination[pageSize]': 200
  }

  const res = await $fetch(`${apiUrl}/runs`, {
    headers: { Authorization: `Bearer ${jwt}` },
    query
  })
  const arr = Array.isArray(res?.data) ? res.data : (Array.isArray(res) ? res : [])
  runMap.value = new Map(arr.map(r => [`${r.seasonOrder}-${r.weekNumber}-${r.sessionNumber}`, r]))
}

function getRun (item) {
  return runMap.value.get(`${profile.value.seasonOrder}-${item.weekNumber}-${item.session.number}`)
}
</script>

<style scoped lang="scss">
.wrap { padding: 12px; }
h1 { font-size: 20px; margin: 8px 0 12px; }
.list {
  display: grid; gap: 12px;
  height: calc(100vh - 140px);
  overflow-y: auto; scroll-behavior: smooth; scroll-padding: 50vh;
}
.start {
  border: 0; background: #111; color:#fff; padding:8px 12px; border-radius:10px; font-weight:700;
}
.link {
  display:inline-block; padding:8px 10px; border:1px solid #ddd; border-radius:10px; text-decoration:none; color:#333;
}
</style>
