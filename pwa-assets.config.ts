import { defineConfig, minimal2023Preset } from '@vite-pwa/assets-generator/config'

// Generates the PNG app icons in public/ from public/icon.png (the rosette tile
// cropped from artwork/Board Game png.png): `npm run icons`.
export default defineConfig({
  preset: {
    ...minimal2023Preset,
    // Pad the maskable and Apple icons with the app's dark background colour.
    maskable: { ...minimal2023Preset.maskable, padding: 0.1, resizeOptions: { background: '#1f1915' } },
    apple: { ...minimal2023Preset.apple, padding: 0.1, resizeOptions: { background: '#1f1915' } },
  },
  images: ['public/icon.png'],
})
