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
      includeAssets: ['favicon.ico', 'apple-touch-icon.png'],
      manifest: {
        name: 'Tindahan',
        short_name: 'Tindahan',
        description: 'Tindahan app to find local shops and products in your area',
        theme_color: '#ffffff',
        background_color: '#ffffff',
        display: 'standalone',
        start_url: '/',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: 'pwa-512x512.png', // Ensure this specific image has a safe margin padding for rounded shapes!
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable'
          }
        ],
        /* ADD THIS BLOCK TO FIX THE RICHER PWA INSTALL WARNINGS */
        screenshots: [
          {
            src: 'screenshot-desktop.png',
            sizes: '1280x720',
            type: 'image/png',
            form_factor: 'wide',
            label: 'Desktop App View'
          },
          {
            src: 'screenshot-mobile.png',
            sizes: '648x1334',
            type: 'image/png',
            form_factor: 'narrow', // leaving blank or setting 'narrow' targets mobile UI
            label: 'Mobile App View'
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
