<template>
  <article class="card" :class="status">
    <header class="head">
      <h3>{{ title }}</h3>
      <slot name="cta" />
    </header>

    <ul class="steps">
      <li v-for="(s, i) in steps" :key="i">
        <span class="kind">{{ kindLabel(s.kind) }}</span>
        <span class="dot">•</span>
        <span class="dur">{{ fmt(s.seconds) }}</span>
        <span v-if="s.pace" class="pace"> — {{ s.pace }}</span>
      </li>
    </ul>
  </article>
</template>

<script setup>
const props = defineProps({
  title: String,
  steps: { type: Array, default: () => [] },
  status: { type: String, default: 'upcoming' } // 'done' | 'current' | 'upcoming'
})

const kindMap = { warmup: 'Échauffement', run: 'Course', walk: 'Marche', cooldown: 'Retour au calme' }
const kindLabel = k => kindMap[k] || k

const fmt = (secs = 0) => {
  const m = Math.floor(secs / 60).toString().padStart(2, '0')
  const s = (secs % 60).toString().padStart(2, '0')
  return `${m}:${s}`
}
</script>

<style scoped lang="scss">
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
