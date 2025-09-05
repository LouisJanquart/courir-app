import { defineStore } from "pinia";
import { useAuthToken } from "~/composables/useApi";

export const useWorkoutStore = defineStore("workout", {
  state: () => ({
    isActive: false,
    isPaused: false,
    startedAt: null,
    finishedAt: null,
    elapsedS: 0,
    distanceM: 0,
    points: [], // { lat, lon, t(ms), acc }
    // internes
    _watchId: null,
    _tickId: null,
    _lastPoint: null,
    _wakeLock: null,
    _opts: {
      accMax: 25, // précision max (m) – filtre bruit
      minStepM: 3, // distance min entre points pour compter (m)
      vMin: 0.3, // vitesse min réaliste (m/s) ~1.1 km/h
      vMax: 7.0, // vitesse max réaliste (m/s) ~2:23 min/km
      windowS: 20, // fenêtre lissage allure instantanée (s)
    },
  }),

  getters: {
    avgPaceSecPerKm(state) {
      return state.distanceM > 0
        ? Math.round(state.elapsedS / (state.distanceM / 1000))
        : 0;
    },
    instPaceSecPerKm(state) {
      // Allure instantanée lissée sur windowS (s)
      if (state.points.length < 2) return 0;
      const now = state.points[state.points.length - 1].t;
      const cutoff = now - state._opts.windowS * 1000;
      let d = 0,
        dt = 0;
      for (let i = state.points.length - 1; i > 0; i--) {
        const p = state.points[i];
        const q = state.points[i - 1];
        if (q.t < cutoff) break;
        const dd = this._haversine(q, p);
        const dts = Math.max(0.5, (p.t - q.t) / 1000);
        d += dd;
        dt += dts;
      }
      if (d <= 0 || dt <= 0) return 0;
      const v = d / dt; // m/s
      const pace = v > 0 ? Math.round(1000 / v) : 0; // s/km
      return pace;
    },
  },

  actions: {
    _toRad(x) {
      return (x * Math.PI) / 180;
    },
    _haversine(a, b) {
      const R = 6371000;
      const dLat = this._toRad(b.lat - a.lat);
      const dLon = this._toRad(b.lon - a.lon);
      const lat1 = this._toRad(a.lat);
      const lat2 = this._toRad(b.lat);
      const h =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
      return 2 * R * Math.asin(Math.sqrt(h));
    },

    async _requestWakeLock() {
      try {
        this._wakeLock = await navigator.wakeLock?.request("screen");
      } catch {
        /* iOS peut refuser, pas bloquant */
      }
    },
    _releaseWakeLock() {
      try {
        this._wakeLock?.release?.();
      } catch {}
      this._wakeLock = null;
    },

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

    _startWatch() {
      if (!("geolocation" in navigator)) {
        throw new Error("Géolocalisation indisponible");
      }
      if (this._watchId != null)
        navigator.geolocation.clearWatch(this._watchId);
      this._watchId = navigator.geolocation.watchPosition(
        (pos) => {
          if (!this.isActive || this.isPaused) return;
          const { latitude: lat, longitude: lon, accuracy: acc } = pos.coords;
          const t = pos.timestamp || Date.now();

          // 1) filtre de précision
          if (acc != null && acc > this._opts.accMax) return;

          const pt = { lat, lon, acc: acc ?? null, t };
          const last = this._lastPoint;

          // Accepte le tout premier point
          if (!last) {
            this.points.push(pt);
            this._lastPoint = pt;
            return;
          }

          // 2) distance & vitesse
          const d = this._haversine(last, pt);
          const dt = Math.max(0.5, (pt.t - last.t) / 1000);
          const v = d / dt; // m/s

          // 3) filtres anti-jitter et anti-outliers
          if (d < this._opts.minStepM) return;
          if (v < this._opts.vMin || v > this._opts.vMax) return;

          this.distanceM += d;
          this.points.push(pt);
          this._lastPoint = pt;
        },
        (err) => {
          console.error("GPS error", err);
        },
        { enableHighAccuracy: true, maximumAge: 0, timeout: 15000 }
      );
    },

    async start() {
      this.reset();
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
      // ticker tourne mais n'incrémente pas quand isPaused = true
    },

    async resume() {
      if (!this.isActive || !this.isPaused) return;
      this.isPaused = false;
      await this._requestWakeLock();
      this._startWatch(); // redémarre le watch SANS reset
    },

    async stopAndSave(meta) {
      // meta: { seasonOrder, weekNumber, sessionNumber, jwt, apiUrl, userId }
      if (this._watchId) navigator.geolocation.clearWatch(this._watchId);
      this._watchId = null;
      this._stopTicker();
      this.finishedAt = new Date();
      this.isActive = false;
      this._releaseWakeLock();

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

      const url = `${meta.apiUrl}/runs`;
      const res = await $fetch(url, {
        method: "POST",
        headers: { Authorization: `Bearer ${meta.jwt}` },
        body: { data: payload },
      });
      return res?.data;
    },

    reset() {
      this.isActive = false;
      this.isPaused = false;
      this.startedAt = this.finishedAt = null;
      this.elapsedS = 0;
      this.distanceM = 0;
      this.points = [];
      this._lastPoint = null;
      if (this._watchId) navigator.geolocation.clearWatch(this._watchId);
      if (this._tickId) clearInterval(this._tickId);
      this._watchId = this._tickId = null;
      this._releaseWakeLock();
    },
  },
});
