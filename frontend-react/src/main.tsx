import React from "react";
import { createRoot } from "react-dom/client";
import { ThemeProvider } from "next-themes";
import { UserProvider } from "@/contexts/UserContext";
import App from "./App.tsx";
import "./index.css";
import "./App.css";
import { initGA } from "@/utils/gaClient";
import { trackEnteredGame } from "@/utils/analytics";

const storedUser = localStorage.getItem("user");
let userId: string | undefined;

if (storedUser) {
  try {
    const user = JSON.parse(storedUser);
    userId = user?._id;
    console.log("👤 Found stored user:", user.alias);
  } catch {
    console.warn("⚠️ Failed to parse user from localStorage");
  }
}

// Initialize GA only once, and set userId if available
initGA(userId);
trackEnteredGame(userId, "local_storage");

console.log("🚀 App starting...");

createRoot(document.getElementById("root")!).render(
  // Removed React.StrictMode to prevent double renders during development
  <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
    <UserProvider> 
      <App />
    </UserProvider>
  </ThemeProvider>
);
