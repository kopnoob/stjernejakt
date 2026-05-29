import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

// GitHub Pages serves project sites under /<repo>/, så base må matche
// repo-navnet ved build. Lokalt brukes "/".
export default defineConfig(({ command }) => ({
  base: command === "build" ? "/stjernejakt/" : "/",
  plugins: [
    react(),
    // D1/D3/D4: installerbar PWA med offline-skall og auto-oppdatering.
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.svg", "apple-touch-icon.png"],
      manifest: {
        name: "Stjernejakt",
        short_name: "Stjernejakt",
        description: "Hold styr på stjernene i Stjernejakt – enkelt på mobilen.",
        lang: "nb",
        theme_color: "#1f6b43",
        background_color: "#f4efe4",
        display: "standalone",
        orientation: "portrait",
        start_url: ".",
        scope: ".",
        icons: [
          { src: "icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "icon-512.png", sizes: "512x512", type: "image/png" },
          {
            src: "icon-maskable-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
      workbox: {
        // Precache hele skallet (inkl. self-hostede fonter) for full offline-bruk.
        globPatterns: ["**/*.{js,css,html,svg,png,woff2}"],
        cleanupOutdatedCaches: true,
      },
    }),
  ],
}));
