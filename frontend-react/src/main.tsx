import React from "react";
import { createRoot } from "react-dom/client";
import { ThemeProvider } from "next-themes";
import App from "./App.tsx";
import "./index.css";
import "./App.css";
import ReactGA from "react-ga4";

// ✅ Initialize Google Analytics (replace with your real Measurement ID)
ReactGA.initialize("G-Q9EHZF08FX");

// Send first pageview when app loads
ReactGA.send({ hitType: "pageview", page: window.location.pathname + window.location.search });

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
      <App />
    </ThemeProvider>
  </React.StrictMode>
);
