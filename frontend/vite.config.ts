import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  // Real-API dev: same-origin proxy so the HttpOnly session and CSRF cookies work without CORS.
  server: { proxy: { '/api': 'http://localhost:8080' } },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/apple-touch-icon.png'],
      manifest: {
        name: 'Life OS — Level up your life', short_name: 'Life OS',
        description: 'Gamified goals, habits and daily quests.',
        id: '/', start_url: '/', scope: '/', display: 'standalone',
        background_color: '#0b1019', theme_color: '#0b1019',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        navigateFallback: '/index.html',
        cleanupOutdatedCaches: true,
        runtimeCaching: []
      }
    })
  ]
});
