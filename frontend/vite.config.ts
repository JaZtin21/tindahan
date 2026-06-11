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
      injectRegister: 'auto', // Explicitly force the framework to register the worker at root
      scope: '/',             // Enforce absolute root scope
      base: '/',              // Enforce asset base root matching layout
      includeAssets: ['icon-192.svg', 'icon-512.svg', 'icon-180.svg'],
      manifest: {
        name: 'Tindahan',
        short_name: 'Tindahan',
        description: 'A local marketplace for finding shops and products in your area',
        theme_color: '#efb666',
        background_color: '#ffffff',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/',          // Must explicitly match the parent scope string above
        start_url: '/',      // Absolute fallback path matching the server endpoint
        icons: [
          {
            src: 'icon-192.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'any'
          },
          {
            src: 'icon-512.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'maskable'
          },
          {
            src: 'icon-180.svg',
            sizes: '180x180',
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
