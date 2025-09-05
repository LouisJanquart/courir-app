<template>
  <div ref="el" class="map"></div>
</template>

<script setup>
import { ref, onMounted, watch, nextTick, onBeforeUnmount } from 'vue'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

const props = defineProps({
  // [{ lat, lon, t, acc }]
  track: { type: Array, default: () => [] }
})

const el = ref(null)
let map, poly, ro // ResizeObserver

function ensureMap() {
  if (map || !el.value) return
  map = L.map(el.value, { zoomControl: true })

  const tl = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    crossOrigin: true,
    attribution: '&copy; OpenStreetMap'
  })
  tl.on('tileerror', (e) => console.warn('Leaflet tile error:', e?.tile?.src || e))
  tl.on('load', () => setTimeout(() => map.invalidateSize(), 0))
  tl.addTo(map)

  map.whenReady(() => {
    map.invalidateSize()
    setTimeout(() => map.invalidateSize(), 100)
  })

  if ('ResizeObserver' in window) {
    ro = new ResizeObserver(() => { if (map) map.invalidateSize() })
    ro.observe(el.value)
  }
}

function draw() {
  if (!map) return
  if (poly) { poly.remove(); poly = null }

  const latlngs = (props.track || []).map(p => [p.lat, p.lon])

  if (latlngs.length >= 2) {
    poly = L.polyline(latlngs, { weight: 5, opacity: 0.9 }).addTo(map)
    map.fitBounds(poly.getBounds(), { padding: [20, 20] })

    const start = latlngs[0], end = latlngs[latlngs.length - 1]
    L.circleMarker(start, { radius: 6, color: '#2e7d32', fillOpacity: 1 }).addTo(map)
    L.circleMarker(end,   { radius: 6, color: '#c62828', fillOpacity: 1 }).addTo(map)
  } else if (latlngs.length === 1) {
    map.setView(latlngs[0], 16)
    L.circleMarker(latlngs[0], { radius: 6, color: '#2e7d32', fillOpacity: 1 }).addTo(map)
  } else {
    // Fallback sans trace
    map.setView([50.8503, 4.3517], 13)
  }

  map.invalidateSize()
  nextTick(() => map && map.invalidateSize())
}

onMounted(async () => {
  ensureMap()
  await nextTick()
  draw()
})

watch(() => props.track, () => {
  if (!map) ensureMap()
  draw()
}, { deep: true })

onBeforeUnmount(() => {
  if (ro && el.value) ro.unobserve(el.value)
  ro = null
  if (map) { map.remove(); map = null }
})
</script>

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
