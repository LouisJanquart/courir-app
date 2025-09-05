<script setup>
// Carte Leaflet pour afficher le tracé d'un run.
// - Affiche un polyline si >= 2 points ; sinon centre sur le point unique ; sinon fallback Bruxelles
// - Marqueurs début/fin (circleMarker)
// - S'adapte aux redimensionnements (ResizeObserver + window resize)
// - Filtre points invalides et doublons consécutifs
//
// IMPORTANT : composant .client => jamais exécuté côté serveur.

import { ref, onMounted, watch, nextTick, onBeforeUnmount } from 'vue'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

const props = defineProps({
  // Track : [{ lat, lon|lng, t, acc }]
  track: { type: Array, default: () => [] }
})

const el = ref(null)
let map = null
let poly = null
let ro = null   // ResizeObserver
let onWinResize = null

/** Prépare/instancie la carte si besoin */
function ensureMap () {
  if (map || !el.value) return

  map = L.map(el.value, { zoomControl: true })

  // Tu peux switcher vers d'autres tuiles si besoin (Carto, Stamen, etc.)
  const tl = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    crossOrigin: true,
    attribution: '&copy; OpenStreetMap'
  })
  tl.on('tileerror', (e) => console.warn('Leaflet tile error:', e?.tile?.src || e))
  tl.on('load', () => setTimeout(() => map && map.invalidateSize(), 0))
  tl.addTo(map)

  map.whenReady(() => {
    map.invalidateSize()
    setTimeout(() => map && map.invalidateSize(), 80)
  })

  // ResizeObserver pour recalculer le layout quand le conteneur change
  if ('ResizeObserver' in window) {
    ro = new ResizeObserver(() => { if (map) map.invalidateSize() })
    ro.observe(el.value)
  }
  // Filet de sécurité : resize fenêtre (PWA iOS/webview)
  onWinResize = () => { if (map) map.invalidateSize() }
  window.addEventListener('resize', onWinResize, { passive: true })
}

/** Nettoie l’ancienne polyline et dessine la nouvelle, fit bounds, marqueurs start/end */
function draw () {
  if (!map) return

  if (poly) { poly.remove(); poly = null }

  // Normalise / filtre la trace : (lat, lon|lng) valides + suppression doublons consécutifs
  const raw = Array.isArray(props.track) ? props.track : []
  const latlngs = []
  let prev = null
  for (const p of raw) {
    const lat = Number(p?.lat)
    const lon = p?.lon != null ? Number(p.lon) : Number(p?.lng)
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) continue

    // évite les doublons consécutifs (même lat/lon)
    if (prev && prev[0] === lat && prev[1] === lon) continue
    const ll = [lat, lon]
    latlngs.push(ll)
    prev = ll
  }

  if (latlngs.length >= 2) {
    poly = L.polyline(latlngs, { weight: 5, opacity: 0.9 }).addTo(map)
    map.fitBounds(poly.getBounds(), { padding: [20, 20] })

    const start = latlngs[0]
    const end = latlngs[latlngs.length - 1]
    L.circleMarker(start, { radius: 6, color: '#2e7d32', fillOpacity: 1 }).addTo(map)
    L.circleMarker(end,   { radius: 6, color: '#c62828', fillOpacity: 1 }).addTo(map)
  } else if (latlngs.length === 1) {
    map.setView(latlngs[0], 16)
    L.circleMarker(latlngs[0], { radius: 6, color: '#2e7d32', fillOpacity: 1 }).addTo(map)
  } else {
    // Fallback sans trace
    map.setView([50.8503, 4.3517], 13) // Bruxelles par défaut
  }

  // Plusieurs invalidations espacées : utile dans des onglets/accordéons/tabs
  map.invalidateSize()
  setTimeout(() => map && map.invalidateSize(), 60)
  nextTick(() => map && map.invalidateSize())
}

onMounted(async () => {
  ensureMap()
  await nextTick()
  draw()
})

// Redessine si la prop track change (deep au cas où l’array est mutée)
watch(() => props.track, () => {
  if (!map) ensureMap()
  draw()
}, { deep: true })

onBeforeUnmount(() => {
  if (ro && el.value) ro.unobserve(el.value)
  ro = null
  if (onWinResize) {
    window.removeEventListener('resize', onWinResize)
    onWinResize = null
  }
  if (map) { map.remove(); map = null }
})
</script>

<template>
  <div ref="el" class="map" />
</template>

<style scoped>
.map {
  width: 100%;
  height: 340px;
  min-height: 300px;
  border-radius: 12px;
  overflow: hidden;
  background: #e9ecef;
}
</style>
