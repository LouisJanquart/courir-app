<template>
  <nav class="bar" role="navigation" aria-label="Navigation principale">
    <NuxtLink to="/home" class="tab">
      <span class="material-symbols-outlined icon" aria-hidden="true">home</span>
      <span class="lbl">Accueil</span>
    </NuxtLink>

    <NuxtLink to="/sessions" class="tab">
      <span class="material-symbols-outlined icon" aria-hidden="true">calendar_month</span>
      <span class="lbl">Séances</span>
    </NuxtLink>

    <NuxtLink to="/profile" class="tab">
      <span class="material-symbols-outlined icon" aria-hidden="true">person</span>
      <span class="lbl">Profil</span>
    </NuxtLink>
  </nav>
</template>

<script setup>
// rien à faire ici
</script>

<style scoped lang="scss">
:root { --tabbar-h: 64px; }

.bar {
  position: fixed;
  left: 0; right: 0; bottom: 0;
  height: var(--tabbar-h);
  padding-bottom: env(safe-area-inset-bottom);
  display: grid; grid-template-columns: repeat(3, 1fr);
  align-items: end;
  background: rgba(255,255,255,0.92);
  backdrop-filter: blur(8px);
  border-top: 1px solid #eee;
  z-index: 1000;

  /* iOS: éviter le flash bleu + sélection involontaire */
  -webkit-tap-highlight-color: transparent;
  user-select: none;
}

@media (prefers-color-scheme: dark) {
  .bar {
    background: rgba(16,16,16,0.8);
    border-top-color: #222;
  }
}

.tab {
  height: calc(var(--tabbar-h) - env(safe-area-inset-bottom));
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  gap: 4px; text-decoration: none; color: #444;
  transition: transform .12s ease, color .12s ease;
  outline: none;
}
.tab:active { transform: translateY(1px); }

/* Focus clavier bien visible */
.tab:focus-visible {
  outline: 2px solid #111;
  outline-offset: -2px;
  border-radius: 10px;
}

@media (prefers-color-scheme: dark) {
  .tab { color: #ddd; }
  .tab:focus-visible { outline-color: #fff; }
}

.icon {
  font-size: 24px; line-height: 1;
  /* Material Symbols variables */
  font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24;
}
.lbl { font-size: 12px; }

/* Actif (NuxtLink ajoute aria-current="page" automatiquement) */
.tab[aria-current="page"] {
  color: #111;
}
.tab[aria-current="page"] .icon {
  font-variation-settings: 'FILL' 1, 'wght' 600, 'GRAD' 0, 'opsz' 24;
}

@media (prefers-color-scheme: dark) {
  .tab[aria-current="page"] { color: #fff; }
}
</style>
