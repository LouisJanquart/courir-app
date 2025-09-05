// app/constants/steps.js
// -----------------------------------------------------------------------------
// Libellés centralisés pour les types d’étapes d’une séance.
// - Évite de dupliquer des maps { code -> label } un peu partout
// - Facilite la traduction/évolution dans un seul fichier
// -----------------------------------------------------------------------------

export const STEP_LABELS = {
  warmup: "Échauffement",
  run: "Course",
  walk: "Marche",
  cooldown: "Retour au calme",
};

/**
 * Retourne un libellé humain pour un type d’étape.
 * @param {string} k - code d’étape ('warmup' | 'run' | 'walk' | 'cooldown' | autre)
 * @returns {string}
 */
export function kindLabel(k) {
  return STEP_LABELS[k] ?? (k || "Étape");
}
