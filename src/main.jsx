import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import { AuthProvider, useAuth } from "./auth/AuthContext";
import { LoginPage } from "./auth/LoginPage";
import { ErrorBoundary } from "./components/ui/ErrorBoundary";
import "./index.css";          // Tailwind (base + utilities)
import "./styles/venus.css";   // Venus design system layer — must load AFTER Tailwind

/* Only a successful login reaches <App/>; the session is restored from localStorage on reload. */
function AuthGate() {
  const { isAuthed } = useAuth();
  return isAuthed ? <App /> : <LoginPage />;
}

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <ErrorBoundary>
      <BrowserRouter>
        <AuthProvider>
          <AuthGate />
        </AuthProvider>
      </BrowserRouter>
    </ErrorBoundary>
  </StrictMode>
);
