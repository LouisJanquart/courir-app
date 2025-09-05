<script setup>
// app/pages/sessions.vue
// -----------------------------------------------------------------------------
// Liste des séances d’une saison (cartes scrollables, séance courante centrée)
//
// Fonctionnalités :
//  - Charge le plan (seasons → weeks → sessions → steps) via usePlanStore.load()
//  - S’assure d’avoir un RunnerProfile via useProgressStore.ensureProfile()
//  - Calcule une liste plate de sessions de la saison courante
//  - Récupère les runs de l’utilisateur connecté pour afficher un lien "Détail"
//  - Met en avant la "séance courante" (current) et centre l’affichage dessus
//
// Améliorations (vs ta version) :
//  - watch sur seasonOrder / userId → recharge automatique des runs
//  - watch sur flat → recadrage visuel dès que la liste est prête
//  - petit indicateur runsLoading (facultatif)
// -----------------------------------------------------------------------------

import { ref, computed, reactive, nextTick, onMounted, watch } from 'vue'
import { useRouter } from '#app'
import SessionCard from '~/components/SessionCard.vue'
import { usePlanStore } from '~/stores/plan'
import { useProgressStore } from '~/stores/progress'
import { useAuthStore } from '~/stores/auth'
import { useAuthToken } from '~/composables/useApi'

definePageMeta({ middleware: 'secure' })

useHead({ title: 'Toutes les séances • Courir' })

const router = useRouter()
const plan = usePlanStore()
const progress = useProgressStore()
const auth = useAuthStore()

const { public: { apiUrl } } = useRuntimeConfig()

// RunnerProfile (position de l’utilisateur dans le plan)
const profile = computed(() => progress.profile || null)

// Références des cartes (pour scrollIntoView)
const cardRefs = reactive([])

// Map des runs : clé = "season-week-session" → valeur = run
const runMap = ref(new Map())
const runsLoading = ref(false)
const runsError = ref(null)

// Raccourcis lisibles
const seasonOrder = computed(() => profile.value?.seasonOrder ?? null)
const currentWeek  = computed(() => profile.value?.weekNumber ?? null)
const currentSess  = computed(() => profile.value?.sessionNumber ?? null)
const userId       = computed(() => auth.user?.id ?? null)

// -----------------------------------------------------------------------------
// Construction de la liste plate des sessions de la saison affichée
// -> [{ weekNumber, session: { number, steps, ... } }]
// -----------------------------------------------------------------------------
const flat = computed(() => {
  if (!Array.isArray(plan.seasons) || plan.seasons.length === 0) return []

  // Sélectionne la saison courante (sinon fallback 1ère saison)
  const season =
    plan.seasons.find(s => s.order === seasonOrder.value) || plan.seasons[0]
  if (!season) return []

  const rows = []
  const weeks = Array.isArray(season.weeks)
    ? season.weeks.slice().sort((a,b) => a.number - b.number)
    : []

  for (const w of weeks) {
    const sessions = Array.isArray(w.sessions)
      ? w.sessions.slice().sort((a,b) => a.number - b.number)
      : []
    for (const s of sessions) {
      rows.push({ weekNumber: w.number, session: s })
    }
  }
  return rows
})

// -----------------------------------------------------------------------------
// Statut d’une entrée (impacte l’apparence via <SessionCard :status>)
// -----------------------------------------------------------------------------
function statusOf (item) {
  const cw = currentWeek.value
  const cs = currentSess.value
  if (cw == null || cs == null) return 'upcoming'
  if (item.weekNumber < cw) return 'done'
  if (item.weekNumber > cw) return 'upcoming'
  if (item.session.number < cs) return 'done'
  if (item.session.number > cs) return 'upcoming'
  return 'current'
}

// Index de la séance courante (pour centrer la liste)
const indexOfCurrent = computed(() => {
  const i = flat.value.findIndex(it => statusOf(it) === 'current')
  return i >= 0 ? i : 0
})

// Clé unique pour un run (doit être identique côté stockage en base)
const runKey = (o) => `${seasonOrder.value}-${o.weekNumber}-${o.session.number}`

// Récupération du run (si existant) pour une entrée
function getRun (item) {
  return runMap.value.get(runKey(item))
}

// Navigation vers l’écran de séance
function start () {
  router.push('/session')
}

// -----------------------------------------------------------------------------
// Chargement des runs de l’utilisateur connecté, filtrés par saison courante
// → Remplit runMap pour afficher "Détail" sur les séances déjà réalisées.
// -----------------------------------------------------------------------------
async function loadRuns () {
  runMap.value = new Map()
  runsError.value = null

  const jwt = useAuthToken().value
  const uid = userId.value
  const sOrder = seasonOrder.value

  // Si pas connecté / pas de saison courante → rien à charger
  if (!jwt || !uid || !sOrder) return

  runsLoading.value = true
  try {
    const res = await $fetch(`${apiUrl}/runs`, {
      headers: { Authorization: `Bearer ${jwt}` },
      query: {
        'filters[userId][$eq]': String(uid),
        'filters[seasonOrder][$eq]': String(sOrder),
        'pagination[pageSize]': 200
      }
    })
    const arr = Array.isArray(res?.data) ? res.data : (Array.isArray(res) ? res : [])
    runMap.value = new Map(
      arr.map(r => [`${r.seasonOrder}-${r.weekNumber}-${r.sessionNumber}`, r])
    )
  } catch (e) {
    // 403 → vérifier les permissions Run (Authenticated: find, findOne)
    runsError.value = e?.data?.error?.message || e.message || 'Erreur chargement runs'
    console.error('loadRuns error', e)
  } finally {
    runsLoading.value = false
  }
}

// Centrage visuel de la carte "séance courante"
async function scrollToCurrentCard () {
  await nextTick()
  const idx = indexOfCurrent.value
  const el = cardRefs[idx]?.$el || cardRefs[idx] // support si ref pointe le root component
  if (el?.scrollIntoView) {
    el.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }
}

// -----------------------------------------------------------------------------
// Cycle de vie : charge plan + profile ; restaure /users/me si token présent
// -----------------------------------------------------------------------------
onMounted(async () => {
  await plan.load()
  await progress.ensureProfile()

  // petit confort : si token existe mais user pas hydraté, on tente /users/me
  if (!auth.user && useAuthToken().value) {
    try { await auth.fetchMe?.() } catch { /* silencieux */ }
  }

  await loadRuns()
  scrollToCurrentCard()
})

// Recharger les runs dès que saison courante / utilisateur changent
watch([seasonOrder, userId], async () => {
  await loadRuns()
})

// Recentrer si la liste de sessions évolue (ex. plan rechargé)
watch(flat, () => {
  scrollToCurrentCard()
})
</script>

<template>
  <section class="wrap">
    <h1>
      Toutes les séances
      <small v-if="profile"> (Saison {{ profile.seasonOrder }})</small>
    </h1>

    <!-- État vide / plan non chargé -->
    <div v-if="!flat.length" class="empty">
      Aucune séance disponible pour cette saison.
    </div>

    <div v-else class="list">
      <SessionCard
        v-for="(it, i) in flat"
        :key="`w${it.weekNumber}-s${it.session.number}`"
        :ref="el => cardRefs[i] = el"
        :title="`Semaine ${it.weekNumber} — Séance ${it.session.number}`"
        :steps="it.session.steps"
        :status="statusOf(it)"
      >
        <template #cta>
          <!-- S’il existe un run pour cette séance → lien détail -->
          <NuxtLink
            v-if="getRun(it)"
            class="link"
            :to="`/runs/${getRun(it).documentId || getRun(it).id}`"
          >
            Détail
          </NuxtLink>

          <!-- Sinon, si c’est la séance courante → bouton démarrer -->
          <button
            v-else-if="statusOf(it) === 'current'"
            class="start"
            @click="start()"
          >
            Démarrer
          </button>
        </template>
      </SessionCard>
    </div>

    <!-- État runs -->
    <p v-if="runsLoading" class="muted small">Chargement des séances effectuées…</p>

    <!-- Erreur de chargement des runs (permissions Strapi manquantes, etc.) -->
    <p v-if="runsError" class="err">
      {{ runsError }}
      <br>
      <small>Vérifie les permissions du rôle <b>Authenticated</b> : Run → find / findOne.</small>
    </p>
  </section>
</template>

<style scoped lang="scss">
.wrap { padding: 12px; }
h1 { font-size: 20px; margin: 8px 0 12px; }
h1 small { color:#666; font-weight: 400; font-size: 14px; }

.empty {
  padding: 16px;
  border: 1px dashed #ddd;
  border-radius: 12px;
  color: #666;
  background: #fafafa;
}

.list {
  display: grid;
  gap: 12px;
  height: calc(100vh - 140px); /* permet de scroller la colonne en gardant le header visible */
  overflow-y: auto;
  scroll-behavior: smooth;
  scroll-padding: 50vh; /* centre l’élément ciblé verticalement */
}

.start {
  border: 0;
  background: #111;
  color: #fff;
  padding: 8px 12px;
  border-radius: 10px;
  font-weight: 700;
  cursor: pointer;
}
.link {
  display: inline-block;
  padding: 8px 10px;
  border: 1px solid #ddd;
  border-radius: 10px;
  text-decoration: none;
  color: #333;
}

.muted { color:#666; }
.small { font-size: 13px; }
.err { color: #b00020; margin-top: 10px; }
</style>
