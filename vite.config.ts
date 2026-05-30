import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

// GitHub Pages serves project sites under /<repo>/, så base må matche
// repo-navnet ved build. Lokalt brukes "/".
// Bygge-stempel (norsk tid) så brukeren kan se hvilken versjon enheten kjører.
// sv-SE gir ISO-lignende format «ÅÅÅÅ-MM-DD TT:MM»; Europe/Oslo håndterer
// sommertid automatisk.
const BUILD_ID = new Date().toLocaleString("sv-SE", {
  timeZone: "Europe/Oslo",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});

export default defineConfig(({ command }) => ({
  base: command === "build" ? "/stjernejakt/" : "/",
  define: {
    __APP_BUILD__: JSON.stringify(BUILD_ID),
  },
  plugins: [
    react(),
    // D1/D3/D4: installerbar PWA med offline-skall og auto-oppdatering.
    VitePWA({
      registerType: "autoUpdate",
      // Vi registrerer service workeren selv (src/lib/pwa.ts) for å få
      // oppdaterings-sjekk ved forgrunn + reload når ny versjon tar over.
      injectRegister: false,
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
