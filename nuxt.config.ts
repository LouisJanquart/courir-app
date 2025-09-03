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
        }
      ]
    }
  },
  modules: ['@pinia/nuxt', '@vueuse/nuxt', '@nuxt/eslint', '@vite-pwa/nuxt'],
  css: ['~/assets/styles/main.scss'],
  pwa: {
    registerType: 'autoUpdate',
    manifest: {
      name: 'Courir – Pour ma forme',
      short_name: 'Courir',
      start_url: '/',
      display: 'standalone',
      background_color: '#ffffff',
      theme_color: '#111111',
      icons: []
    }
  },
  runtimeConfig: {
    public: {
      apiUrl: process.env.NUXT_PUBLIC_API_URL || 'http://localhost:1337/api'
    }
  }
})