import React from "react";
import { createRoot } from "react-dom/client";
import { ThemeProvider } from "next-themes";
import App from "./App.tsx";
import "./index.css";
import "./App.css";
import { initGA, setGAUser } from "@/utils/gaClient";

const storedUser = localStorage.getItem("user");
let userId: string | undefined;

if (storedUser) {
  try {
    const user = JSON.parse(storedUser);
    userId = user?._id;
  } catch {
    console.warn("⚠️ Failed to parse user from localStorage");
  }
}

// Initialize GA only once, and set userId if available
initGA(userId);

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
      <App />
    </ThemeProvider>
  </React.StrictMode>
);
