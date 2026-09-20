import { AccessibilityProvider } from "./context/AccessibilityContext";
import { AccessibilityPanel } from "./components/AccessibilityPanel";
import { stopSpeech } from "./services/pageSpeech";
import { startPwa } from "./lib/pwa";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "react-router";
import { router } from "./router";
import { AuthProvider } from "./context/AuthContext";
import { CookieConsentProvider } from "./context/CookieConsentContext";
import { IconSprite } from "./ui/Icon";
import "./styles/base.css";
import "./styles/a11y-preferences.css";

startPwa();
// Cancel even pending voice loading on navigation and account transitions.
let speechLocation = router.state.location.key;
router.subscribe(state => {
  if (state.location.key !== speechLocation) { stopSpeech(); speechLocation = state.location.key; }
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AccessibilityProvider>
    <CookieConsentProvider
      onPolicyNavigate={() => {
        void router.navigate("/mentions-legales#cookies");
      }}
    >
      <AuthProvider>
        <IconSprite />
        <RouterProvider router={router} />
        <AccessibilityPanel />
      </AuthProvider>
    </CookieConsentProvider>
    </AccessibilityProvider>
  </StrictMode>,
);
