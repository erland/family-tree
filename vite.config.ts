// vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath, URL } from "node:url";
// ⬇️ added: vite-plugin-pwa provides manifest + service worker + precaching
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  // We still keep base: "./" so that the built app works from a relative path,
  // including file:// (nice for a packaged/offline PWA bundle). If you later
  // deploy behind a real web server at a fixed origin, you can switch this to "/".
  base: "./",

  plugins: [
    react(),

    // ⬇️ PWA plugin: generates manifest.webmanifest and a service worker
    VitePWA({
      registerType: "autoUpdate", // SW updates itself when a new build is deployed
      includeAssets: [
        "favicon.ico",
        "icons/icon-192.png",
        "icons/icon-512.png",
        "apple-touch-icon.png"
      ],
      manifest: {
        name: "Family Tree",
        short_name: "Family Tree",
        description:
          "Offline-first genealogy app for managing individuals, relationships, and places.",
        start_url: "./",
        scope: "./",
        display: "standalone",
        background_color: "#ffffff",
        theme_color: "#1976d2",
        icons: [
          {
            src: "icons/icon-192.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "any maskable",
          },
          {
            src: "icons/icon-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any maskable",
          },
        ],
      },
      workbox: {
        // Precaches build assets so the app shell loads offline.
        // Also makes navigation fall back to index.html so routing works offline.
        cleanupOutdatedCaches: true,
        navigateFallback: "index.html",

        // Allow large app bundles to be precached for offline.
        // Default is 2 MiB. We'll raise to 5 MiB.
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
      },
    }),
  ],

  resolve: {
    alias: {
      // Allows imports like: import { Individual } from "@core"
      "@core": fileURLToPath(new URL("./src/core", import.meta.url)),
      // Convenience alias: import ... from "@/hooks/..." etc.
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },

  build: {
    outDir: "dist",

    // Optional: silence the >500kb warning (not required, just nicer DX)
    chunkSizeWarningLimit: 1500,
  },
});