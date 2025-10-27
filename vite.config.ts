// vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath, URL } from "node:url";

export default defineConfig({
  plugins: [react()],
  base: "./", // keep relative asset paths for Electron
  resolve: {
    alias: {
      // Allows imports like import { Individual } from "@core"
      "@core": fileURLToPath(new URL("./src/core", import.meta.url)),
      // (optional but very handy) import ... from "@/hooks/..."
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  build: {
    outDir: "dist",
  },
});