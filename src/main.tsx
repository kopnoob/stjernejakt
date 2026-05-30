import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
// D2: self-hostede fonter (bundles lokalt, fungerer offline — ingen Google-kall).
import "@fontsource/fredoka/500.css";
import "@fontsource/fredoka/600.css";
import "@fontsource/fredoka/700.css";
import "@fontsource/inter/400.css";
import "@fontsource/inter/500.css";
import "@fontsource/inter/600.css";
import "./index.css";
import "./App.css";
import App from "./App.tsx";
import ErrorBoundary from "./components/ErrorBoundary.tsx";
import { registerPwa } from "./lib/pwa";
import { ensureLocalRecoveryCode } from "./lib/supabase";

// Lag gjenopprettingskoden lokalt før første render (vises én gang).
ensureLocalRecoveryCode();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);

// Robust oppdatering av den installerte appen (se lib/pwa.ts).
registerPwa();
