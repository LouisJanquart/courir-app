// app/utils/format.js
// -----------------------------------------------------------------------------
// Petites fonctions de formatage réutilisables (durée, allure, distance, date).
// - Zéro dépendance, SSR-safe
// - Entrées tolérantes (valeurs non finies → fallback lisible)
// -----------------------------------------------------------------------------

/** Pad à 2 chiffres (ex: 5 → "05") */
function pad2(n) {
  return String(Math.max(0, n | 0)).padStart(2, "0");
}

/**
 * Formatte une durée en secondes vers "MM:SS".
 * Ex: 125 -> "02:05"
 * @param {number} secs - secondes
 * @returns {string} "MM:SS"
 */
export function fmtSeconds(secs = 0) {
  if (!Number.isFinite(secs) || secs <= 0) return "00:00";
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  return `${pad2(m)}:${pad2(s)}`;
}

/**
 * Formatte une allure (secondes par km) vers "MM:SS".
 * Ex: 357 -> "05:57"
 * Valeurs nulles / non valides -> "—"
 * @param {number} secPerKm
 * @returns {string}
 */
export function fmtPace(secPerKm = 0) {
  if (!Number.isFinite(secPerKm) || secPerKm <= 0) return "—";
  const m = Math.floor(secPerKm / 60);
  const s = Math.floor(secPerKm % 60);
  return `${pad2(m)}:${pad2(s)}`;
}

/**
 * Formatte une distance en mètres vers "X.XX km".
 * Ex: 4200 -> "4.20 km"
 * @param {number} meters
 * @param {number} digits - nombre de décimales
 * @returns {string}
 */
export function fmtKm(meters = 0, digits = 2) {
  if (!Number.isFinite(meters) || meters <= 0) return "0.00 km";
  const km = meters / 1000;
  return `${km.toFixed(digits)} km`;
}

/**
 * Formatte une date ISO (ou Date) en string lisible locale.
 * @param {string|Date|null|undefined} input
 * @param {Intl.DateTimeFormatOptions} [opts]
 * @returns {string}
 */
export function fmtDateTime(input, opts) {
  if (!input) return "—";
  try {
    const d = input instanceof Date ? input : new Date(input);
    if (isNaN(d.getTime())) return "—";
    // Options raisonnables par défaut (date + heure courte)
    const def = { dateStyle: "medium", timeStyle: "short" };
    return d.toLocaleString(undefined, { ...def, ...(opts || {}) });
  } catch {
    return "—";
  }
}
