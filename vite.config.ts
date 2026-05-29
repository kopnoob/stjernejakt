import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// GitHub Pages serves project sites under /<repo>/, så base må matche
// repo-navnet ved build. Lokalt brukes "/".
export default defineConfig(({ command }) => ({
  plugins: [react()],
  base: command === "build" ? "/stjernejakt/" : "/",
}));
