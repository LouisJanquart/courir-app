import { defineStore } from "pinia";

export const useWorkoutStore = defineStore("workout", {
  state: () => ({
    isActive: false,
    isPaused: false,
    startedAt: null,
    finishedAt: null,
    elapsedS: 0,
    distanceM: 0,
    points: [], // { lat, lon, t, acc }
    _watchId: null,
    _tickId: null,
    _lastPoint: null,
    _wakeLock: null,
  }),
  getters: {
    avgPaceSecPerKm(state) {
      return state.distanceM > 0
        ? Math.round(state.elapsedS / (state.distanceM / 1000))
        : 0;
    },
  },
  actions: {
    _haversine(a, b) {
      const R = 6371000;
      const toRad = (x) => (x * Math.PI) / 180;
      const dLat = toRad(b.lat - a.lat);
      const dLon = toRad(b.lon - a.lon);
      const lat1 = toRad(a.lat);
      const lat2 = toRad(b.lat);
      const h =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
      return 2 * R * Math.asin(Math.sqrt(h));
    },
    async _requestWakeLock() {
      try {
        this._wakeLock = await navigator.wakeLock?.request("screen");
      } catch {}
    },
    _releaseWakeLock() {
      try {
        this._wakeLock?.release();
        this._wakeLock = null;
      } catch {}
    },

    async start() {
      if (!navigator.geolocation) throw new Error("Geolocation non supportée");
      this.reset();
      this.isActive = true;
      this.startedAt = new Date();

      await this._requestWakeLock();

      this._tickId = setInterval(() => {
        if (!this.isPaused) this.elapsedS++;
      }, 1000);

      this._watchId = navigator.geolocation.watchPosition(
        (pos) => {
          if (this.isPaused) return;
          const { latitude: lat, longitude: lon, accuracy: acc } = pos.coords;
          const t = Date.now();
          // filtre précision pauvre
          if (acc != null && acc > 50) return;
          const pt = { lat, lon, acc, t };
          if (this._lastPoint) {
            const d = this._haversine(this._lastPoint, pt);
            // ignore micro-variations / jitter
            if (d < 0.5) return;
            this.distanceM += d;
          }
          this.points.push(pt);
          this._lastPoint = pt;
        },
        (err) => {
          console.error("GPS error", err);
        },
        { enableHighAccuracy: true, maximumAge: 0, timeout: 15000 }
      );
    },

    pause() {
      this.isPaused = true;
      if (this._watchId) navigator.geolocation.clearWatch(this._watchId);
      this._watchId = null;
    },
    async resume() {
      this.isPaused = false;
      await this.start(); /* redémarre un watchPosition */
    },

    async stopAndSave(meta) {
      // meta: { seasonOrder, weekNumber, sessionNumber, jwt, apiUrl, userId }
      if (this._watchId) navigator.geolocation.clearWatch(this._watchId);
      if (this._tickId) clearInterval(this._tickId);
      this._watchId = this._tickId = null;
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
        avgPaceSecPerKm: this.avgPaceSecPerKm,
        track: this.points,
      };

      // enregistre dans Strapi
      const url = `${meta.apiUrl}/runs`;
      const res = await $fetch(url, {
        method: "POST",
        headers: { Authorization: `Bearer ${meta.jwt}` },
        body: { data: payload },
      });
      return res?.data; // { id, documentId, ... }
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
