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
      includeAssets: ['icon-192.png', 'icon-512.png', 'icon-180.svg'],
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
            src: 'icon-192.png',  // Point to PNG
            sizes: '192x192',     // Restore pixel size
            type: 'image/png',    // Change to image/png
            purpose: 'any'
          },
          {
            src: 'icon-512.png',  // Point to PNG
            sizes: '512x512',     // Restore pixel size
            type: 'image/png',    // Change to image/png
            purpose: 'maskable'
          },
          {
            src: 'icon-180.svg',  // Keep this fallback file for iOS apple-touch-icon links
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
