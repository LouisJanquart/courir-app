<template>
  <nav class="bar" role="navigation" aria-label="Navigation principale">
    <NuxtLink to="/home" class="tab" aria-label="Accueil">
      <span class="material-symbols-outlined icon">home</span>
      <span class="lbl">Accueil</span>
    </NuxtLink>

    <NuxtLink to="/sessions" class="tab" aria-label="Séances">
      <span class="material-symbols-outlined icon">calendar_month</span>
      <span class="lbl">Séances</span>
    </NuxtLink>

    <NuxtLink to="/profile" class="tab" aria-label="Profil">
      <span class="material-symbols-outlined icon">person</span>
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
}

.tab {
  height: calc(var(--tabbar-h) - env(safe-area-inset-bottom));
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  gap: 4px; text-decoration: none; color: #444;
  transition: transform .12s ease;
}
.tab:active { transform: translateY(1px); }

.icon {
  font-size: 24px; line-height: 1;
  /* Material Symbols variables */
  font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24;
}
.lbl { font-size: 12px; }

.tab.router-link-active,
.tab.router-link-exact-active {
  color: #111;
}
.tab.router-link-active .icon,
.tab.router-link-exact-active .icon {
  font-variation-settings: 'FILL' 1, 'wght' 600, 'GRAD' 0, 'opsz' 24;
}
</style>
