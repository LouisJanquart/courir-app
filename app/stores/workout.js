// app/stores/workout.js
// ============================================================================
// Store Pinia "workout" : enregistre une séance en temps réel via géolocalisation
// ----------------------------------------------------------------------------
// Responsabilités :
// - Suivre l’état de la séance (active, paused, start/end times)
// - Compter le temps écoulé, la distance et stocker les points GPS (lat, lon, t, acc)
// - Filtrer le bruit GPS (précision, micro-déplacements, outliers vitesse)
// - Calculer l’allure instantanée lissée et l’allure moyenne
// - Sauvegarder la séance dans Strapi (collection "runs")
//
// Remarques :
// - Toutes les APIs "browser" sont gardées côté client (guards import.meta.client)
// - On utilise useApi() pour injecter automatiquement Authorization: Bearer <JWT>
// - Le payload enregistré reste identique à ton format actuel
// ============================================================================

import { defineStore } from "pinia";
import { useApi } from "~/composables/useApi";

export const useWorkoutStore = defineStore("workout", {
  state: () => ({
    // État utilisateur
    isActive: false,
    isPaused: false,

    // Horodatage de la séance
    startedAt: null, // Date
    finishedAt: null, // Date

    // Métriques live
    elapsedS: 0, // secondes écoulées (hors pause)
    distanceM: 0, // mètres cumulés (post-filtre)
    points: [], // [{ lat, lon, t(ms), acc(m) }]

    // Internes runtime
    _watchId: null, // id renvoyé par geolocation.watchPosition
    _tickId: null, // id d’interval pour le timer
    _lastPoint: null, // dernier point retenu (post-filtre)
    _wakeLock: null, // Screen Wake Lock (si supporté)

    // Paramètres de filtrage et lissage
    _opts: {
      accMax: 25, // précision max acceptable (m) → rejette bruits GPS
      minStepM: 3, // distance min (m) entre deux points pour compter
      vMin: 0.3, // vitesse min réaliste (m/s) (~1.1 km/h)
      vMax: 7.0, // vitesse max réaliste (m/s) (~2:23 min/km)
      windowS: 20, // fenêtre de lissage pour allure instantanée (s)
    },
  }),

  getters: {
    /** Allure moyenne (sec/km) sur toute la séance */
    avgPaceSecPerKm(state) {
      return state.distanceM > 0
        ? Math.round(state.elapsedS / (state.distanceM / 1000))
        : 0;
    },

    /**
     * Allure instantanée lissée :
     * - On cumule distance/temps sur la fenêtre des N dernières secondes
     * - On protège contre dt très petits / bruit
     */
    instPaceSecPerKm(state) {
      if (state.points.length < 2) return 0;

      const now = state.points[state.points.length - 1].t;
      const cutoff = now - state._opts.windowS * 1000;

      let d = 0;
      let dt = 0;

      for (let i = state.points.length - 1; i > 0; i--) {
        const p = state.points[i];
        const q = state.points[i - 1];
        if (q.t < cutoff) break;

        const dd = this._haversine(q, p);
        const dts = Math.max(0.5, (p.t - q.t) / 1000); // ≥ 0.5s pour limiter les ratios énormes
        d += dd;
        dt += dts;
      }

      if (d <= 0 || dt <= 0) return 0;
      const v = d / dt; // m/s
      return v > 0 ? Math.round(1000 / v) : 0; // s/km
    },
  },

  actions: {
    // ------------------------------------------------------------------------
    // Outils math
    // ------------------------------------------------------------------------
    _toRad(x) {
      return (x * Math.PI) / 180;
    },
    _haversine(a, b) {
      const R = 6371000; // m
      const dLat = this._toRad(b.lat - a.lat);
      const dLon = this._toRad(b.lon - a.lon);
      const lat1 = this._toRad(a.lat);
      const lat2 = this._toRad(b.lat);
      const h =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
      return 2 * R * Math.asin(Math.sqrt(h));
    },

    // ------------------------------------------------------------------------
    // Énergie / écran
    // ------------------------------------------------------------------------
    async _requestWakeLock() {
      try {
        if (!import.meta.client) return;
        this._wakeLock = await navigator.wakeLock?.request("screen");
      } catch {
        // iOS peut refuser ; pas bloquant
      }
    },
    _releaseWakeLock() {
      try {
        this._wakeLock?.release?.();
      } catch {
        /* wake lock not available/denied — non-blocking */
      }
      this._wakeLock = null;
    },

    // ------------------------------------------------------------------------
    // Timer
    // ------------------------------------------------------------------------
    _startTicker() {
      if (this._tickId) clearInterval(this._tickId);
      this._tickId = setInterval(() => {
        if (this.isActive && !this.isPaused) this.elapsedS++;
      }, 1000);
    },
    _stopTicker() {
      if (this._tickId) clearInterval(this._tickId);
      this._tickId = null;
    },

    // ------------------------------------------------------------------------
    // GPS
    // ------------------------------------------------------------------------
    _startWatch() {
      if (!import.meta.client) throw new Error("Environnement non navigateur");
      if (!("geolocation" in navigator))
        throw new Error("Géolocalisation indisponible");

      if (this._watchId != null) {
        navigator.geolocation.clearWatch(this._watchId);
      }

      this._watchId = navigator.geolocation.watchPosition(
        (pos) => {
          if (!this.isActive || this.isPaused) return;

          const { latitude: lat, longitude: lon, accuracy: acc } = pos.coords;
          const t = pos.timestamp || Date.now();

          // 1) Filtre précision
          if (acc != null && acc > this._opts.accMax) return;

          const pt = { lat, lon, acc: acc ?? null, t };
          const last = this._lastPoint;

          // Premier point accepté sans calcul
          if (!last) {
            this.points.push(pt);
            this._lastPoint = pt;
            return;
          }

          // 2) Distance / vitesse
          const d = this._haversine(last, pt);
          const dt = Math.max(0.5, (pt.t - last.t) / 1000); // ≥ 0.5s
          const v = d / dt; // m/s

          // 3) Filtres anti-jitter / outliers
          if (d < this._opts.minStepM) return;
          if (v < this._opts.vMin || v > this._opts.vMax) return;

          this.distanceM += d;
          this.points.push(pt);
          this._lastPoint = pt;
        },
        (err) => {
          console.error("GPS error", err);
          // On ne jette pas : l’UI peut afficher un message si besoin
        },
        { enableHighAccuracy: true, maximumAge: 0, timeout: 15000 }
      );
    },

    // ------------------------------------------------------------------------
    // Cycle de séance
    // ------------------------------------------------------------------------
    async start() {
      // La page d’appel peut avoir déjà vérifié la permission via useGeoReady()
      // Ici, on garde un minimum de guardrails.
      if (!import.meta.client || !("geolocation" in navigator)) {
        throw new Error("Géolocalisation non supportée");
      }

      this.reset(); // remise à zéro propre
      this.isActive = true;
      this.startedAt = new Date();

      await this._requestWakeLock();
      this._startTicker();
      this._startWatch();
    },

    pause() {
      if (!this.isActive || this.isPaused) return;
      this.isPaused = true;
      if (this._watchId != null) {
        navigator.geolocation.clearWatch(this._watchId);
        this._watchId = null;
      }
      // Le ticker continue mais n’incrémente pas elapsedS tant que isPaused = true
    },

    async resume() {
      if (!this.isActive || !this.isPaused) return;
      this.isPaused = false;
      await this._requestWakeLock();
      this._startWatch(); // redémarre le watch sans reset
    },

    /**
     * Enregistre la séance dans Strapi.
     * @param {object} meta - { seasonOrder, weekNumber, sessionNumber, userId, [jwt], [apiUrl] }
     * - Compat : si meta.jwt/apiUrl sont fournis, on les ignore (useApi gère tout)
     * - Retour : l’entité "run" créée { id, documentId, ... }
     */
    async stopAndSave(meta) {
      // Arrêt propre des mécanismes temps réel
      if (this._watchId) navigator.geolocation.clearWatch(this._watchId);
      this._watchId = null;
      this._stopTicker();
      this.finishedAt = new Date();
      this.isActive = false;
      this._releaseWakeLock();

      // Construire le payload conforme à ton modèle Strapi
      const payload = {
        userId: meta.userId,
        seasonOrder: meta.seasonOrder,
        weekNumber: meta.weekNumber,
        sessionNumber: meta.sessionNumber,
        startedAt: this.startedAt?.toISOString(),
        finishedAt: this.finishedAt?.toISOString(),
        durationSeconds: this.elapsedS,
        distanceMeters: Math.round(this.distanceM),
        avgPaceSecPerKm: this.avgPaceSecPerKm || 0,
        track: this.points,
      };

      // Envoi via client centralisé (Authorization auto)
      const { api } = useApi();
      const res = await api("/runs", {
        method: "POST",
        body: { data: payload },
      });

      // Strapi v5 => { data: {...}, meta: {} }
      return res && typeof res === "object" && "data" in res ? res.data : res;
    },

    /** Remise à zéro de tout l’état (et nettoyage des watchers/timers/wakelock) */
    reset() {
      this.isActive = false;
      this.isPaused = false;
      this.startedAt = null;
      this.finishedAt = null;
      this.elapsedS = 0;
      this.distanceM = 0;
      this.points = [];
      this._lastPoint = null;

      if (this._watchId) navigator.geolocation.clearWatch(this._watchId);
      if (this._tickId) clearInterval(this._tickId);
      this._watchId = null;
      this._tickId = null;

      this._releaseWakeLock();
    },

    // ------------------------------------------------------------------------
    // Utilitaires pratiques
    // ------------------------------------------------------------------------

    /** Permet d’ajuster dynamiquement les filtres (ex: accMax ou minStepM) */
    setOptions(opts = {}) {
      this._opts = { ...this._opts, ...opts };
    },

    /** Snapshot simple pour debugger ou log (sans méthodes ni refs) */
    snapshot() {
      return {
        isActive: this.isActive,
        isPaused: this.isPaused,
        startedAt: this.startedAt,
        finishedAt: this.finishedAt,
        elapsedS: this.elapsedS,
        distanceM: Math.round(this.distanceM),
        avgPaceSecPerKm: this.avgPaceSecPerKm,
        instPaceSecPerKm: this.instPaceSecPerKm,
        points: this.points.length,
      };
    },
  },
});
