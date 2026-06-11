import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon-192.svg', 'icon-512.svg', 'icon-180.svg'],
      manifest: {
        name: 'Tindahan',
        short_name: 'Tindahan',
        description: 'A local marketplace for finding shops and products in your area',
        theme_color: '#efb666',
        background_color: '#ffffff',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/',
        start_url: '/',
        icons: [
          {
            src: 'icon-192.svg',
            sizes: 'any', // Change from '192x192' to 'any'
            type: 'image/svg+xml',
            purpose: 'any'
          },
          {
            src: 'icon-512.svg',
            sizes: 'any', // Change from '512x512' to 'any'
            type: 'image/svg+xml',
            purpose: 'maskable'
          },
          {
            src: 'icon-180.svg',
            sizes: '180x180', // Keep this as-is for Apple touch icon fallbacks
            type: 'image/svg+xml'
          }
        ]
      }
    })
  ],
  server: {
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin-allow-popups',
    },
    allowedHosts: true
  },
})
