import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "react-router";
import { router } from "./router";
import { AuthProvider } from "./context/AuthContext";
import { CookieConsentProvider } from "./context/CookieConsentContext";
import { IconSprite } from "./ui/Icon";
import "./styles/base.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <CookieConsentProvider
      onPolicyNavigate={() => {
        void router.navigate("/mentions-legales#cookies");
      }}
    >
      <AuthProvider>
        <IconSprite />
        <RouterProvider router={router} />
      </AuthProvider>
    </CookieConsentProvider>
  </StrictMode>,
);
