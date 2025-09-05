// app/composables/useGeoReady.js
export function useGeoReady() {
  const geoStatus = useState("geo_status", () => "unknown"); // 'unknown' | 'granted' | 'denied' | 'unsupported'

  async function ensureGeoReady() {
    if (!import.meta.client) return false;
    if (!("geolocation" in navigator)) {
      geoStatus.value = "unsupported";
      return false;
    }
    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        () => {
          geoStatus.value = "granted";
          resolve(true);
        },
        (err) => {
          geoStatus.value = err?.code === 1 ? "denied" : "unknown";
          resolve(false);
        },
        { enableHighAccuracy: true, maximumAge: 0, timeout: 10000 }
      );
    });
  }

  return { geoStatus, ensureGeoReady };
}
