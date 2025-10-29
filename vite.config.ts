// vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath, URL } from "node:url";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig(({ mode }) => {
  // If you run the build with:
  //   GITHUB_PAGES=true vite build
  // ...then assets will use /family-tree/ as the base path,
  // which is required when served from https://<user>.github.io/family-tree/
  //
  // Otherwise (dev, normal build) we stick to "./"
  // which is great for offline/local file:// and generic hosting.
  const isGitHubPages = process.env.GITHUB_PAGES === "true";

  return {
    base: isGitHubPages ? "/family-tree/" : "./",

    plugins: [
      react(),

      VitePWA({
        registerType: "autoUpdate",
        includeAssets: [
          "favicon.ico",
          "icons/icon-192.png",
          "icons/icon-512.png",
          "apple-touch-icon.png",
        ],
        manifest: {
          name: "Family Tree",
          short_name: "Family Tree",
          description:
            "Offline-first genealogy app for managing individuals, relationships, and places.",
          // Use relative start_url/scope so it works both under / and /family-tree/
          start_url: ".",
          scope: ".",
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
          cleanupOutdatedCaches: true,
          navigateFallback: "index.html",
          maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
        },
      }),
    ],

    resolve: {
      alias: {
        "@core": fileURLToPath(new URL("./src/core", import.meta.url)),
        "@": fileURLToPath(new URL("./src", import.meta.url)),
      },
    },

    build: {
      outDir: "dist",
      chunkSizeWarningLimit: 1500,
    },
  };
});