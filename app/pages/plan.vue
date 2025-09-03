<script setup>
import { usePlanStore } from '~/stores/plan'

function formatMinSec(total) {
  const m = Math.floor(total / 60)
  const s = total % 60
  return `${m} min ${String(s).padStart(2, '0')} s`
}

const plan = usePlanStore()

// charge une seule fois (même si on revient sur la page)
await plan.load()
</script>

<template>
  <section>
    <h1>Plan</h1>
    <p v-if="plan.pending">Chargement…</p>
    <p v-else-if="plan.error">Erreur : {{ plan.error }}</p>

    <div v-else>
      <div v-for="season in plan.seasons" :key="season.id" class="season">
        <h2>{{ season.title }}</h2>

        <div v-for="week in season.weeks" :key="week.id" class="week">
          <h3>Semaine {{ week.number }}</h3>
          <ul>
            <li v-for="session in week.sessions" :key="session.id">
              Séance {{ session.number }}
              — {{ formatMinSec(plan.sessionTotal(session)) }}
              ({{ session.steps?.length ?? 0 }} étapes)
            </li>
          </ul>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.season { margin-bottom: 1rem; }
.week { margin: .5rem 0 1rem; }
</style>
