<!-- app/pages/plan.vue -->
<template>
  <section v-if="ready">
    <h1>Plan</h1>
    <div v-for="(sess,i) in sessions" :key="i" class="row" :class="{ done: i < doneIndex }">
      <div class="left">Séance {{sess.number}}</div>
      <div class="right">
        <button v-if="i === doneIndex" @click="goPlay">Démarrer</button>
      </div>
    </div>
  </section>
  <p v-else>Chargement…</p>
</template>

<script setup>
import { usePlanStore } from '~/stores/plan'
import { useProgressStore } from '~/stores/progress'
const plan = usePlanStore()
const progress = useProgressStore()
const router = useRouter()

const ready = ref(false)
const sessions = ref([])
const doneIndex = ref(0)

onMounted(async () => {
  await plan.load()
  await progress.ensureProfile()

  const p = progress.profile
  const season = plan.seasons.find(s => s.order === p.seasonOrder)
  const week = season?.weeks?.find(w => w.number === p.weekNumber)
  sessions.value = week?.sessions || []

  // index de la séance courante (0-based)
  doneIndex.value = Math.max(0, (p.sessionNumber || 1) - 1)
  ready.value = true
})

function goPlay() { router.push('/session') }
</script>

<style scoped>
.row { display:flex; justify-content:space-between; padding:10px 0; border-bottom:1px solid #eee; }
.done { opacity: .4; }
</style>
