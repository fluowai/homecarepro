import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(() => {
  return {
    plugins: [
      react(),
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        injectRegister: 'auto',
        workbox: {
          runtimeCaching: [
            {
              urlPattern: ({ url }) => url.pathname.startsWith('/api/'),
              handler: 'NetworkFirst',
              options: {
                cacheName: 'api-cache',
                networkTimeoutSeconds: 10,
                expiration: { maxEntries: 50, maxAgeSeconds: 60 },
                cacheableResponse: { statuses: [0, 200] },
              },
            },
            {
              urlPattern: ({ request }) => request.destination === 'image',
              handler: 'CacheFirst',
              options: {
                cacheName: 'image-cache',
                expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 7 },
              },
            },
            {
              urlPattern: ({ url }) => url.pathname.startsWith('/assets/'),
              handler: 'CacheFirst',
              options: {
                cacheName: 'asset-cache',
                expiration: { maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 * 30 },
              },
            },
          ],
        },
        includeAssembleRegExp: ['manifest.webmanifest'],
        manifest: {
          short_name: 'HomeCare 360',
          name: 'HomeCare Pro 360 — Gestão Home Care',
          description: 'Plataforma de Home Care e Cooperativas',
          display: 'standalone',
          display_override: ['window-controls-overlay'],
          background_color: '#ffffff',
          theme_color: '#ffffff',
          start_url: '/',
          scope: '/',
          lang: 'pt-BR',
          orientation: 'portrait-primary-preference',
          category: ['health', 'medical', 'productivity'],
          icons: [
            {
              src: '/pwa-192x192.png',
              type: 'image/png',
              sizes: '192x192',
            },
            {
              src: '/pwa-512x512.png',
              type: 'image/png',
              sizes: '512x512',
            },
            {
              src: '/pwa-maskable-192x192.png',
              type: 'image/png',
              sizes: '192x192',
              purpose: 'maskable',
            },
            {
              src: '/pwa-maskable-512x512.png',
              type: 'image/png',
              sizes: '512x512',
              purpose: 'maskable',
            },
          ],
        },
        devOptions: {
          enabled: true,
          type: 'module',
        },
        srcDir: 'src',
        filename: 'sw.js',
      }),
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    build: {
      chunkSizeWarningLimit: 600,
      manifest: true,
    },
    server: {
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
    test: {
      globals: true,
      environment: 'jsdom',
      setupFiles: ['./src/test-setup.ts'],
      include: ['src/**/*.{test,spec}.{ts,tsx}', 'tests/**/*.{test,spec}.{ts,tsx}'],
    },
  };
});
