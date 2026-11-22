import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig(({ command }) => ({
  // GitHub Pages serves the site at https://bbetzler.github.io/royal-game-ur/
  base: command === 'build' ? '/royal-game-ur/' : '/',
  plugins: [
    vue(),
    VitePWA({
      // A new version installs in the background and is used on the next start.
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon-180x180.png'],
      manifest: {
        name: 'Royal Game of Ur',
        short_name: 'Ur',
        description: 'The ancient Mesopotamian race game, played against the computer.',
        lang: 'en',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#1f1915',
        theme_color: '#1f1915',
        icons: [
          { src: 'pwa-64x64.png', sizes: '64x64', type: 'image/png' },
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: 'maskable-icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,jpg}'],
        // icon.png is only the source for the generated icons.
        globIgnores: ['icon.png'],
      },
    }),
  ],
  server: { host: true },
}))
