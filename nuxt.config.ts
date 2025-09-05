// nuxt.config.ts
// https://nuxt.com/docs/api/configuration/nuxt-configs
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },

  app: {
    head: {
      link: [
        {
          rel: 'stylesheet',
          href:
            'https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,400,0,0'
        },
        // 👇 Force l’inclusion explicite du manifest
        { rel: 'manifest', href: '/manifest.webmanifest' }
      ]
    }
  },

  modules: ['@pinia/nuxt', '@vueuse/nuxt', '@nuxt/eslint', '@vite-pwa/nuxt'],
  css: ['~/assets/styles/main.scss'],

  pwa: {
    registerType: 'autoUpdate',
    // 👇 Active le manifest + SW en DEV (localhost)
    devOptions: { enabled: true, type: 'module' },
    manifest: {
      name: 'Courir – Pour ma forme',
      short_name: 'Courir',
      start_url: '/home',
      display: 'standalone',
      background_color: '#ffffff',
      theme_color: '#111111',
      icons: [
        { src: '/logo-48-48.png', sizes: '48x48', type: 'image/png' },
        { src: '/logo-96-96.png', sizes: '96x96', type: 'image/png' },
        { src: '/logo-192-192.png', sizes: '192x192', type: 'image/png' }
      ]
    }
  },

  runtimeConfig: {
    public: {
      apiUrl: process.env.NUXT_PUBLIC_API_URL || 'http://localhost:1337/api'
    }
  }
})
