import { copyFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// GitHub Pages serves a project site from a subpath
// (https://<user>.github.io/<repo>/), so every absolute URL the app emits has
// to be prefixed. Set BASE_PATH at build time; it defaults to '/' for local dev
// and for hosts that serve from the root, such as Firebase Hosting.
const base = process.env.BASE_PATH ?? '/'

/** GitHub Pages has no rewrite rules, so a deep link like /exp-tracker/add
 *  would 404. Serving the same SPA shell as 404.html lets the client router
 *  take over — the status code is 404 but the app boots and reads the URL. */
const spaFallback = () => ({
  name: 'github-pages-spa-fallback',
  closeBundle() {
    const dir = resolve('dist')
    copyFileSync(resolve(dir, 'index.html'), resolve(dir, '404.html'))
  },
})

export default defineConfig({
  base,
  build: {
    rollupOptions: {
      output: {
        // Firebase and Recharts change far less often than app code, so give
        // them their own long-cached chunks instead of one 1.3 MB bundle.
        manualChunks: {
          firebase: ['firebase/app', 'firebase/auth', 'firebase/firestore'],
          charts: ['recharts'],
        },
      },
    },
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'prompt',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png'],
      manifest: {
        name: 'Expense Tracker',
        short_name: 'Expenses',
        description: 'Track spending, set budgets, and export to Excel — works offline.',
        theme_color: '#2a78d6',
        background_color: '#f9f9f7',
        display: 'standalone',
        orientation: 'portrait',
        scope: base,
        start_url: base,
        icons: [
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: 'pwa-maskable-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
        // Long-press the installed icon to jump straight to the form. The
        // in-app "open add on launch" preference covers a plain tap.
        shortcuts: [
          {
            name: 'Add entry',
            short_name: 'Add',
            description: 'Log an expense or income',
            url: `${base}add`,
            icons: [{ src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' }],
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        // Firestore/Auth traffic must never be served from the SW cache —
        // Firestore has its own IndexedDB offline layer.
        navigateFallbackDenylist: [/^\/__/],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com\/.*/i,
            handler: 'CacheFirst',
            options: { cacheName: 'google-fonts', expiration: { maxEntries: 20 } },
          },
        ],
      },
      devOptions: { enabled: false },
    }),
    spaFallback(),
  ],
})
