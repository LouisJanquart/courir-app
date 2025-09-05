<script setup>
// -----------------------------------------------------------------------------
// Page d’accueil ("hub")
// - Affiche la prochaine séance (déduite du RunnerProfile)
// - Montre la liste des steps avec durée formatée
// - CTA "Démarrer la séance" -> /session
// Dépendances :
//   • useProgressStore.ensureProfile() → garantit que le RunnerProfile existe
//   • usePlanStore.load() → charge seasons/weeks/sessions(+steps)
//   • utils/format → fmtSeconds pour un affichage homogène
// -----------------------------------------------------------------------------
import { computed, ref, onMounted } from 'vue'
import { useRouter } from '#app'
import { usePlanStore } from '~/stores/plan'
import { useProgressStore } from '~/stores/progress'
import { fmtSeconds } from '~/utils/format'

definePageMeta({ middleware: 'secure' })

useHead({ title: 'Accueil • Courir' })

const router = useRouter()
const plan = usePlanStore()
const progress = useProgressStore()

// Aliases lisibles sur le RunnerProfile
const profile     = computed(() => progress.profile || null)
const seasonOrder = computed(() => profile.value?.seasonOrder ?? null)
const weekNumber  = computed(() => profile.value?.weekNumber  ?? null)
const sessionNum  = computed(() => profile.value?.sessionNumber ?? null)

// Libellés FR pour les types d’étapes
const labelMap = { warmup: 'Échauffement', run: 'Course', walk: 'Marche', cooldown: 'Retour au calme' }
const kindLabel = (k) => labelMap[k] || (k || 'Étape')

// Prochaine séance basée sur le profil (saison/sem/seance)
const nextSession = computed(() => {
  if (!seasonOrder.value || !weekNumber.value || !sessionNum.value) return null
  return plan.getSession(seasonOrder.value, weekNumber.value, sessionNum.value)
})

// Durée planifiée de la séance (somme des steps)
const plannedSeconds = computed(() => plan.sessionTotal(nextSession.value))

// Séquence de chargement
const ready = ref(false)
onMounted(async () => {
  await progress.ensureProfile() // crée/charge RunnerProfile
  await plan.load()              // charge le plan complet (avec steps)
  ready.value = true
})

// Navigation vers l’écran de séance
function start () { router.push('/session') }
</script>

<template>
  <section class="wrap">
    <!-- État "chargement" -->
    <div v-if="!ready || plan.pending" class="box muted">Chargement…</div>

    <!-- Erreur sur le plan (API/permissions) -->
    <div v-else-if="plan.error" class="box err">
      Erreur : {{ plan.error }}
      <div class="tips">
        <small>
          Vérifie l’API Strapi (<code>/seasons</code> + <code>populate</code>) et les permissions.
        </small>
      </div>
    </div>

    <!-- Pas de séance (profil / plan incomplet) -->
    <div v-else-if="!nextSession" class="box muted">
      Pas de séance trouvée pour cette saison.
      <div class="links">
        <NuxtLink class="link" to="/sessions">Voir toutes les séances</NuxtLink>
        <NuxtLink class="link" to="/profile">Mon profil</NuxtLink>
      </div>
    </div>

    <!-- Contenu principal -->
    <div v-else class="card">
      <header class="head">
        <h1 class="title">Prochaine séance</h1>
        <div class="meta">
          Saison <b>{{ seasonOrder }}</b> ·
          Semaine <b>{{ weekNumber }}</b> ·
          Séance <b>{{ sessionNum }}</b>
        </div>
      </header>

      <!-- Steps -->
      <ul v-if="nextSession?.steps?.length" class="steps" role="list">
        <li v-for="(st, i) in nextSession.steps" :key="i" class="step">
          <span class="kind">{{ kindLabel(st.kind) }}</span>
          <span class="dot" aria-hidden="true">•</span>
          <span class="dur">{{ fmtSeconds(st.seconds || 0) }}</span>
          <span v-if="st.pace" class="pace"> — {{ st.pace }}</span>
        </li>
      </ul>
      <p v-else class="muted small">Aucune étape définie.</p>

      <!-- Pied de carte : info + actions -->
      <footer class="foot">
        <div class="info">
          <small>Durée planifiée : <b>{{ fmtSeconds(plannedSeconds || 0) }}</b></small>
        </div>
        <div class="actions">
          <button class="btn primary" @click="start">Démarrer la séance</button>
          <NuxtLink class="btn ghost" to="/sessions">Toutes les séances</NuxtLink>
          <NuxtLink class="btn ghost" to="/profile">Profil</NuxtLink>
        </div>
      </footer>
    </div>
  </section>
</template>

<style scoped lang="scss">
/* Layout et micro-UI de la page d’accueil */
.wrap { padding: 12px; }

.box { border: 1px solid #eee; border-radius: 12px; padding: 12px; background: #fff; }
.box.muted { color: #555; }
.box.err { color: #b00020; }
.tips { margin-top: 8px; color: #666; }
.tips code { background: #f6f7fb; padding: 0 4px; border-radius: 4px; }

.card { border: 1px solid #eee; border-radius: 16px; background: #fff; padding: 14px; box-shadow: 0 2px 12px rgba(0,0,0,.06); }
.head { display: grid; gap: 6px; margin-bottom: 8px; }
.title { margin: 0; font-size: 20px; font-weight: 800; }
.meta { color: #666; }

.steps { list-style: none; padding: 0; margin: 8px 0 10px; display: grid; gap: 6px; }
.step { display: flex; align-items: baseline; gap: 6px; flex-wrap: wrap; }
.kind { font-weight: 700; }
.dot { opacity: .5; }
.dur, .pace { color: #555; }

.foot { display: flex; align-items: center; justify-content: space-between; gap: 10px; flex-wrap: wrap; margin-top: 10px; }
.info small { color: #444; }

.btn { padding: 10px 14px; border-radius: 10px; font-weight: 700; cursor: pointer; border: 1px solid #111; background: #111; color: #fff; text-decoration: none; }
.btn.ghost { background: #fff; color: #111; }

.actions { display: flex; gap: 8px; flex-wrap: wrap; }

.small { font-size: 13px; }
.muted { color: #666; }
</style>
