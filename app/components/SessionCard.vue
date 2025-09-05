<script setup>
// -----------------------------------------------------------------------------
// Carte compacte d’une séance (utilisée dans /sessions)
// - Affiche le titre, la liste des étapes et une zone CTA (slot "cta")
// - Styles visuels pour états: done / current / upcoming
// - Durée des steps formatée via utils/format
// -----------------------------------------------------------------------------
import { fmtSeconds } from '~/utils/format'

const { title, steps, status } = defineProps({
  title: { type: String, default: '' },
  steps: { type: Array, default: () => [] },
  status: { type: String, default: 'upcoming' } // 'done' | 'current' | 'upcoming'
})

// Libellés FR
const kindMap = { warmup: 'Échauffement', run: 'Course', walk: 'Marche', cooldown: 'Retour au calme' }
const kindLabel = k => kindMap[k] || k
</script>

<template>
  <article class="card" :class="status">
    <header class="head">
      <h3>{{ title }}</h3>
      <!-- Slot "cta" pour injecter 'Détail' ou 'Démarrer' depuis /sessions -->
      <slot name="cta" />
    </header>

    <!-- Liste des steps -->
    <ul class="steps">
      <li v-for="(s, i) in steps" :key="i">
        <span class="kind">{{ kindLabel(s.kind) }}</span>
        <span class="dot">•</span>
        <span class="dur">{{ fmtSeconds(s.seconds) }}</span>
        <span v-if="s.pace" class="pace"> — {{ s.pace }}</span>
      </li>
    </ul>
  </article>
</template>

<style scoped lang="scss">
/* Carte de séance compacte */
.card { border:1px solid #eee; border-radius:16px; background:#fff; padding:12px 14px; box-shadow:0 2px 12px rgba(0,0,0,.06); }
.card.current { border-color:#111; box-shadow:0 6px 24px rgba(0,0,0,.1); }
.card.done { opacity:.45; }

.head { display:flex; justify-content:space-between; align-items:center; margin-bottom:8px; }
h3 { margin:0; font-size:16px; font-weight:800; }

.steps { list-style:none; padding:0; margin:0; display:grid; gap:6px; }
.kind { font-weight:600; }
.dot { margin:0 6px; opacity:.5; }
.dur, .pace { color:#555; }
</style>
