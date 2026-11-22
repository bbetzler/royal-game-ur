import { defineConfig, minimal2023Preset } from '@vite-pwa/assets-generator/config'

// Generates the PNG app icons in public/ from public/icon.svg: `npm run icons`.
export default defineConfig({
  preset: {
    ...minimal2023Preset,
    // The icon is a full-bleed green square, so fill padding with the same green.
    maskable: { ...minimal2023Preset.maskable, padding: 0.1, resizeOptions: { background: '#4caf50' } },
    apple: { ...minimal2023Preset.apple, padding: 0.1, resizeOptions: { background: '#4caf50' } },
  },
  images: ['public/icon.svg'],
})
