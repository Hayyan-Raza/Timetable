
import { createRoot } from "react-dom/client";
import { GoogleOAuthProvider } from "@react-oauth/google";
import App from "./App.tsx";
import "./index.css";
import { ThemeProvider } from "./context/ThemeContext";

createRoot(document.getElementById("root")!).render(
  <GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID || "623238923107-b53ofabpksiubpm2ian484em9cjb8eqt.apps.googleusercontent.com"}>
    <ThemeProvider>
      <App />
    </ThemeProvider>
  </GoogleOAuthProvider>
);
