// app/composables/useApi.js
// ============================================================================
// But du fichier
// ----------------------------------------------------------------------------
// 1) Centraliser la création d'un client HTTP ($fetch) pour l'API Strapi
// 2) Ajouter automatiquement le header Authorization: Bearer <JWT>
//    (sauf sur les routes d'authentification /auth/*)
// 3) Avoir un point unique pour configurer la baseURL (runtimeConfig.public.apiUrl)
// 4) Exposer un petit utilitaire pour normaliser les erreurs Strapi (parseStrapiError)
//
// Pourquoi faire ça ici plutôt que partout dans le code ?
// - Évite les oublis de header Authorization
// - Évite de dupliquer baseURL et la logique “pas de token sur /auth/*”
// - Facilite le débogage : tout passe par un seul endroit.
//
// Comment l’utiliser :
//   import { useApi } from '~/composables/useApi'
//   const { api } = useApi()
//   const res = await api('/runs') // => injecte automatiquement le JWT si présent
// ============================================================================

/* ----------------------------------------------------------------------------
 * 1) Cookie JWT partagé
 * ----------------------------------------------------------------------------
 * - On stocke le token dans un cookie "auth_token" pour que le SSR (côté serveur)
 *   et le navigateur (côté client) y aient accès de la même façon.
 * - IMPORTANT: `secure` doit être *désactivé* en dev (http://localhost), sinon
 *   le cookie n’est pas envoyé par le navigateur. En prod (HTTPS), on l’active.
 * - `httpOnly` n’est pas disponible ici car on utilise les cookies Nuxt côté
 *   client. (httpOnly = cookies non accessibles en JS, il faut alors les poser
 *   côté serveur via un endpoint.)
 */
export const useAuthToken = () =>
  useCookie("auth_token", {
    sameSite: "lax", // empêche certains envois inter-sites non voulus
    secure: !import.meta.dev, // true en prod (HTTPS), false en dev (HTTP)
    path: "/", // disponible sur tout le site
    maxAge: 60 * 60 * 24 * 7, // 7 jours
  });

/* ----------------------------------------------------------------------------
 * 2) Helper: extraire un "pathname" fiable
 * ----------------------------------------------------------------------------
 * $fetch peut recevoir soit une URL relative ('/runs'), soit une URL absolue,
 * soit un Request-like. On normalise pour pouvoir détecter proprement /auth/*.
 */
function resolvePathname(request, baseURL) {
  try {
    if (typeof request === "string") {
      return new URL(request, baseURL).pathname || "";
    }
    if (request && request.url) {
      return new URL(request.url).pathname || "";
    }
  } catch {
    // En cas d'URL invalide, on retombe plus bas sur les valeurs brutes
  }
  return typeof request === "string" ? request : request?.url || "";
}

/* ----------------------------------------------------------------------------
 * 3) Helper: normaliser une erreur Strapi v5
 * ----------------------------------------------------------------------------
 * Strapi renvoie souvent une structure du type:
 * { data: null, error: { status, name, message, details } }
 * Ce helper retourne toujours { status, name, message, raw } pour afficher
 * une erreur claire sans repartir à la chasse aux champs dans le catch().
 */
export function parseStrapiError(err) {
  const status = err?.data?.error?.status ?? err?.statusCode ?? err?.status;
  const name = err?.data?.error?.name ?? err?.name;
  const message =
    err?.data?.error?.message ?? err?.message ?? "Une erreur est survenue";
  return { status, name, message, raw: err };
}

/* ----------------------------------------------------------------------------
 * 4) Fabrique du client API
 * ----------------------------------------------------------------------------
 * - baseURL vient de nuxt.config.ts (runtimeConfig.public.apiUrl)
 * - on injecte Accept: application/json
 * - on ajoute Authorization: Bearer <token> automatiquement SAUF sur /auth/*
 * - retry: 0 -> on laisse l’app gérer les erreurs explicitement
 */
export const useApi = () => {
  const config = useRuntimeConfig(); // => { public: { apiUrl: '...' } }
  const token = useAuthToken(); // cookie réactif "auth_token"

  const api = $fetch.create({
    baseURL: config.public.apiUrl,
    retry: 0,

    // Hook déclenché *avant* chaque requête
    onRequest({ request, options }) {
      // 1) Toujours un header Accept propre
      options.headers = {
        accept: "application/json",
        ...(options.headers || {}),
      };

      // 2) Détecter si on tape une route /auth/*
      const pathname = resolvePathname(request, config.public.apiUrl);
      const isAuthRoute = pathname.startsWith("/auth/");

      // 3) Ajouter/retirer automatiquement le Bearer
      if (isAuthRoute) {
        // Ne JAMAIS envoyer le token sur les routes d’authentification
        // (certaines routes /auth/* échouent si un Authorization traîne)
        if (options.headers.Authorization) delete options.headers.Authorization;
      } else if (token.value) {
        options.headers.Authorization = `Bearer ${token.value}`;
      }
    },
  });

  return { api };
};

/* ----------------------------------------------------------------------------
 * Notes utiles
 * ----------------------------------------------------------------------------
 * - Si tu vois des 403 sur /users/me juste après le login :
 *     -> vérifie que le cookie n'est pas "secure: true" en dev
 *     -> vérifie les permissions du rôle "Authenticated" (plugins Users & Permissions)
 *
 * - Pour changer la baseURL, modifie nuxt.config.ts :
 *     runtimeConfig: { public: { apiUrl: 'https://ton-strapi/api' } }
 *
 * - Exemple d'utilisation avec gestion d'erreur :
 *     const { api } = useApi()
 *     try {
 *       const res = await api('/runs')
 *     } catch (e) {
 *       const { status, message } = parseStrapiError(e)
 *       console.error(status, message)
 *     }
 */
