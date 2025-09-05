<!-- app/pages/home.vue -->
<template>
  <section v-if="ready && next">
    <h1>Prochaine séance</h1>
    <p>Saison {{p.seasonOrder}} · Semaine {{p.weekNumber}} · Séance {{p.sessionNumber}}</p>

    <ul class="steps">
      <li v-for="(st,i) in next.steps" :key="i">
        {{ labelMap[st.kind] || st.kind }} — {{ st.seconds }}s
      </li>
    </ul>

    <button class="start" @click="start">Démarrer la séance</button>
  </section>

  <p v-else-if="ready && !next">Pas de séance trouvée.</p>
  <p v-else>Chargement…</p>
</template>

<script setup>
import { usePlanStore } from '~/stores/plan'
import { useProgressStore } from '~/stores/progress'

const plan = usePlanStore()
const progress = useProgressStore()
const router = useRouter()

const ready = ref(false)
const p = computed(() => progress.profile || {})
const labelMap = { warmup: 'Échauffement', run: 'Course', walk: 'Marche', cooldown: 'Retour au calme' }

const next = computed(() => {
  if (!plan.seasons?.length || !progress.profile) return null
  const season = plan.seasons.find(s => s.order === p.value.seasonOrder) || plan.seasons[0]
  if (!season) return null
  const week = season.weeks?.find(w => w.number === p.value.weekNumber)
  const session = week?.sessions?.find(s => s.number === p.value.sessionNumber)
  return session || null
})

onMounted(async () => {
  await plan.load()
  await progress.ensureProfile()
  ready.value = true
})

function start() {
  router.push('/session')
}
</script>

<style scoped lang="scss">
h1 { margin: 12px 0; }
.steps { margin: 16px 0; padding-left: 16px; }
.start { display: inline-block; padding: 12px 16px; font-weight: 700; border: none; border-radius: 10px; background: #111; color: #fff; }
</style>
