<script setup>
// -----------------------------------------------------------------------------
// Écran de séance
// - Minuteur global (elapsedS) + stats live (distance, allure instantanée/moyenne)
// - Minuteur d’étape (calculé à partir des steps planifiés)
// - Persistance à l’arrêt : POST /runs puis avance RunnerProfile sur la prochaine séance
// - Demande de géolocalisation à la volée si besoin (useGeoReady)
// Dépendances : workout/progress/auth stores, utils/format, Strapi v5
// -----------------------------------------------------------------------------
import { ref, computed, watch, onMounted } from 'vue'
import { useWorkoutStore } from '~/stores/workout'
import { useProgressStore } from '~/stores/progress'
import { useAuthStore } from '~/stores/auth'
import { useAuthToken } from '~/composables/useApi'
import { useGeoReady } from '~/composables/useGeoReady'
import { fmtSeconds, fmtPace } from '~/utils/format'

definePageMeta({ middleware: 'secure' })

useHead({ title: 'Séance • Courir' })

const workout = useWorkoutStore()
const progress = useProgressStore()
const auth = useAuthStore()
const router = useRouter()
const { public: { apiUrl } } = useRuntimeConfig()
const { ensureGeoReady } = useGeoReady()

// Profil courant (saison/sem/seance)
const profile = computed(() => progress.profile)

// ---------- Chargement des steps de la séance courante ----------
const steps = ref([]) // [{ kind, label, seconds }, ...]
const totalPlannedS = computed(() =>
  steps.value.reduce((s, st) => s + (st.seconds || 0), 0)
)

async function loadCurrentSessionSteps() {
  if (!profile.value) return
  const { seasonOrder, weekNumber, sessionNumber } = profile.value

  // Note: on cible 1 séance par numéro + semaine + saison (Strapi v5)
  const res = await $fetch(`${apiUrl}/sessions`, {
    query: {
      'filters[number][$eq]': String(sessionNumber),
      'filters[week][number][$eq]': String(weekNumber),
      'filters[week][season][order][$eq]': String(seasonOrder),
      'populate[steps]': '*',
      'pagination[pageSize]': 1,
    }
  })
  const sess = res?.data?.[0]
  steps.value = Array.isArray(sess?.steps) ? sess.steps : []
}

// ---------- Minuteur d’étape (calculé depuis elapsedS et le plan) ----------
const currentStepIndex = computed(() => {
  let t = workout.elapsedS
  for (let i = 0; i < steps.value.length; i++) {
    const s = steps.value[i].seconds || 0
    if (t < s) return i
    t -= s
  }
  return steps.value.length ? steps.value.length - 1 : -1
})
const currentStep = computed(() => steps.value[currentStepIndex.value] || null)

const stepElapsedS = computed(() => {
  if (!steps.value.length) return 0
  let t = workout.elapsedS
  for (let i = 0; i < steps.value.length; i++) {
    const s = steps.value[i].seconds || 0
    if (t < s) return t
    t -= s
  }
  // Si on a dépassé, on renvoie la durée de la dernière étape
  return steps.value[steps.value.length - 1]?.seconds || 0
})
const stepRemainingS = computed(() =>
  Math.max(0, (currentStep.value?.seconds || 0) - stepElapsedS.value)
)
const stepProgressPct = computed(() => {
  const total = currentStep.value?.seconds || 0
  if (!total) return 0
  const pct = (stepElapsedS.value / total) * 100
  return Math.min(100, Math.max(0, Math.round(pct)))
})
function humanStepKind(kind) {
  // Mapping FR affichage
  switch (kind) {
    case 'warmup': return 'Échauffement'
    case 'run': return 'Course'
    case 'walk': return 'Marche'
    case 'cooldown': return 'Retour au calme'
    default: return kind
  }
}

// ---------- Allure instantanée lissée (20s) ----------
function haversine(a, b) {
  const R = 6371000
  const toRad = d => (d * Math.PI) / 180
  const dLat = toRad(b.lat - a.lat)
  const dLon = toRad(b.lon - a.lon)
  const lat1 = toRad(a.lat)
  const lat2 = toRad(b.lat)
  const h = Math.sin(dLat/2)**2 + Math.cos(lat1)*Math.cos(lat2)*Math.sin(dLon/2)**2
  return 2 * R * Math.asin(Math.sqrt(h))
}
const instPaceSecPerKm = computed(() => {
  // Moyenne glissante des 20 dernières secondes d’échantillons GPS
  const pts = workout.points || []
  if (pts.length < 2) return 0
  const now = pts[pts.length - 1].t
  const cutoff = now - 20_000
  let d = 0, dt = 0
  for (let i = pts.length - 1; i > 0; i--) {
    const p = pts[i], q = pts[i - 1]
    if (q.t < cutoff) break
    const dd = haversine(q, p)
    const dts = Math.max(0.5, (p.t - q.t) / 1000)
    d += dd; dt += dts
  }
  if (d <= 0 || dt <= 0) return 0
  const v = d / dt // m/s
  return v > 0 ? Math.round(1000 / v) : 0
})

// Auto-stop optionnel quand la durée planifiée est atteinte
watch(() => workout.elapsedS, (v) => {
  if (workout.isActive && !workout.isPaused && totalPlannedS.value > 0 && v >= totalPlannedS.value) {
    stop()
  }
})

// Chargement des dépendances au montage
onMounted(async () => {
  await progress.ensureProfile()
  await loadCurrentSessionSteps()
})

// Helpers d’affichage
function pace (p) { return fmtPace(p) }

// ---------- Actions (start/pause/resume/stop) ----------
async function start () {
  try {
    // Demande d’accès à la localisation si nécessaire
    const ok = await ensureGeoReady()
    if (!ok) {
      alert('Autorise la localisation pour démarrer la séance.')
      return
    }
    await workout.start()
  } catch (e) {
    console.error('start error', e)
    alert('Impossible de démarrer la séance (géolocalisation non disponible).')
  }
}
function pause () { try { workout.pause() } catch (e) { console.error(e) } }
async function resume () { try { await workout.resume() } catch (e) { console.error(e) } }

async function stop () {
  try {
    // Sécurité côté auth
    const jwt = useAuthToken().value
    if (!jwt) { alert('Session expirée : reconnecte-toi.'); return router.push('/login') }
    if (!auth.user?.id) { try { await auth.fetchMe?.() } catch {
      /* ignore: token invalid/expired */
    } }

    // Métadonnées pour la persistance Strapi
    const meta = {
      seasonOrder:   profile?.value?.seasonOrder   ?? 1,
      weekNumber:    profile?.value?.weekNumber    ?? 1,
      sessionNumber: profile?.value?.sessionNumber ?? 1,
      userId: auth.user?.id,
      jwt, apiUrl
    }

    // 1) Enregistrement du run (POST /runs)
    const saved = await workout.stopAndSave(meta)

    // 2) Reset local
    workout.reset()

    // 3) Avancer le profil vers la séance suivante
    await advanceToNextSession(jwt)

    // 4) Recharger le profil (met à jour l’UI)
    await progress.ensureProfile()

    // 5) Ouvrir le détail de la séance (si id ok), sinon /sessions
    const runId = saved?.documentId || saved?.id
    if (runId) router.push(`/runs/${runId}`)
    else router.push('/sessions')
  } catch (e) {
    console.error('stop error', e)
    alert('Erreur lors de l’enregistrement de la séance.')
  }
}

// Avance RunnerProfile vers la session suivante (avec wrap sur semaine suivante)
async function advanceToNextSession(jwt) {
  if (!profile.value) return
  const { seasonOrder, weekNumber, sessionNumber } = profile.value

  // Compter nb de séances dans la semaine courante
  const list = await $fetch(`${apiUrl}/sessions`, {
    query: {
      'filters[week][number][$eq]': String(weekNumber),
      'filters[week][season][order][$eq]': String(seasonOrder),
      'pagination[pageSize]': 1
    }
  })
  const totalInWeek = list?.meta?.pagination?.total || 1

  let nextWeek = weekNumber
  let nextSession = sessionNumber + 1
  if (nextSession > totalInWeek) {
    nextSession = 1
    nextWeek = weekNumber + 1
  }

  // Mise à jour Strapi sur le RunnerProfile
  const docId = profile.value.documentId
  if (!docId) return
  await $fetch(`${apiUrl}/runner-profiles/${encodeURIComponent(docId)}`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${jwt}` },
    body: { data: { weekNumber: nextWeek, sessionNumber: nextSession } }
  })
}
</script>

<template>
  <section class="run">
    <!-- Entête : position dans le plan -->
    <header class="meta">
      <h1>Séance</h1>
      <p v-if="profile">
        Saison <b>{{ profile.seasonOrder }}</b> ·
        Semaine <b>{{ profile.weekNumber }}</b> ·
        Séance <b>{{ profile.sessionNumber }}</b>
      </p>
    </header>

    <!-- Timers + stats live -->
    <div class="timers panel">
      <!-- Minuteur global -->
      <div class="big">{{ fmtSeconds(workout.elapsedS) }}</div>

      <!-- Stats -->
      <div class="rows">
        <div class="row">
          <div>Distance</div>
          <b>{{ (workout.distanceM/1000).toFixed(2) }} km</b>
        </div>

        <div class="row">
          <div>Allure inst.</div>
          <b v-if="instPaceSecPerKm">{{ pace(instPaceSecPerKm) }}/km</b>
          <b v-else>—</b>
        </div>

        <div class="row">
          <div>Allure moy.</div>
          <b v-if="workout.avgPaceSecPerKm">{{ fmtPace(workout.avgPaceSecPerKm) }}/km</b>
          <b v-else>—</b>
        </div>
      </div>

      <!-- Étape en cours + barre de progression -->
      <div v-if="currentStep" class="step">
        <div class="step-title">
          Étape : <b>{{ currentStep.label }}</b>
          <small>({{ humanStepKind(currentStep.kind) }})</small>
        </div>
        <div class="step-timer">
          {{ fmtSeconds(stepRemainingS) }} / {{ fmtSeconds(currentStep.seconds) }}
        </div>
        <div class="bar">
          <div class="bar-fill" :style="{ width: stepProgressPct + '%' }" />
        </div>
      </div>
    </div>

    <!-- Actions principales -->
    <div class="actions">
      <button v-if="!workout.isActive" class="btn primary" @click="start">Démarrer</button>
      <button v-else-if="workout.isPaused" class="btn" @click="resume">Reprendre</button>
      <button v-else class="btn" @click="pause">Pause</button>

      <button
        v-if="workout.isActive || workout.elapsedS>0"
        class="btn danger"
        @click="stop"
      >
        Terminer
      </button>
    </div>

    <p class="hint">
      ⚠️ Teste en extérieur pour des mesures fiables. L’écran reste allumé pendant la séance.
    </p>
  </section>
</template>

<style scoped>
/* Mise en page de l’écran de séance */
.run { padding: 12px; }
.meta h1 { margin: 0 0 6px; }
.meta p { margin: 0; color: #555; }

.panel { background:#fff; border:1px solid #eee; border-radius:12px; padding:12px; margin:12px 0; }
.timers .big { font-size: 56px; font-weight: 900; line-height: 1; margin-bottom: 8px; text-align:center; }
.rows { display:grid; gap:8px; }
.row { display:flex; justify-content:space-between; }

.step { margin-top: 10px; }
.step-title { display:flex; gap:8px; align-items:baseline; }
.step-timer { font-size: 24px; font-weight: 800; margin: 6px 0; }
.bar { width:100%; height:10px; background:#eee; border-radius:999px; overflow:hidden; }
.bar-fill { height:100%; background:#111; }

.actions { display: flex; gap: 10px; justify-content: center; margin-top: 16px; flex-wrap: wrap; }
.btn { padding: 10px 14px; border: 0; border-radius: 10px; background: #111; color: #fff; font-weight: 700; cursor: pointer; }
.btn.primary { background:#111; }
.btn.danger { background:#c62828; }
.hint { margin-top: 14px; font-size: 12px; color: #666; text-align: center; }
</style>
