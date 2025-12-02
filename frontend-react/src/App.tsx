import React, { useLayoutEffect, useState, useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { MobileLayout } from "@/components/layout/MobileLayout";
import Home from "./pages/Home";
import Quiz from "./pages/Quiz";
import AuthSection from "./pages/AuthSection";
import { usePageTracking } from "./hooks/usePageTracking";
import Leaderboard from "./pages/Leaderboard";
import Categories from "./pages/Categories";
import Profile from "./pages/Profile";
import Notifications from "./pages/Notification";
import Store from "./pages/Store";
import Menu from "./pages/Menu";
import NotFound from "./pages/NotFound";
import About from "./pages/About";
import Claim from "./components/dummy";
import SplashScreen from "./components/SplashScreen";
import { apiClient } from "@/utils/apiClient";

const queryClient = new QueryClient();
const BASE_URL = import.meta.env.VITE_BASE_URL;

// Global preloaded data cache
export const appCache = {
  userProfile: null as any,
  categories: null as any[],
  userStats: null as any,
  notifications: null as any[],
  firstQuestion: null as any,
  leaderboard: null as any,
  store: null as any,
  isPreloaded: false,
};

// Preload all app data
const preloadAppData = async (userToken: string) => {
  if (appCache.isPreloaded) {
    console.log("✅ App data already preloaded");
    return;
  }

  console.log("🚀 Starting app preload...");

  const preloadPromises = [];

  // 1. User Profile
  preloadPromises.push(
    apiClient(`${BASE_URL}/api/getUserDetails`, { method: "GET" })
      .then(async (response) => {
        if (response && response.ok) {
          const data = await response.json();
          appCache.userProfile = data;
          console.log("✅ User profile preloaded");
        }
      })
      .catch((err) => console.error("❌ Failed to preload user profile:", err))
  );

  // 2. Categories
  preloadPromises.push(
    apiClient(`${BASE_URL}/api/categories`, { method: "GET" })
      .then(async (response) => {
        if (response && response.ok) {
          const data = await response.json();
          appCache.categories = data;
          console.log("✅ Categories preloaded");
        }
      })
      .catch((err) => console.error("❌ Failed to preload categories:", err))
  );

  // 3. User Stats
  preloadPromises.push(
    apiClient(`${BASE_URL}/api/user/stats`, { method: "GET" })
      .then(async (response) => {
        if (response && response.ok) {
          const data = await response.json();
          appCache.userStats = data;
          console.log("✅ User stats preloaded");
        }
      })
      .catch((err) => console.error("❌ Failed to preload user stats:", err))
  );

  // 4. Notifications
  preloadPromises.push(
    apiClient(`${BASE_URL}/api/notifications`, { method: "GET" })
      .then(async (response) => {
        if (response && response.ok) {
          const data = await response.json();
          appCache.notifications = data;
          console.log("✅ Notifications preloaded");
        }
      })
      .catch((err) => console.error("❌ Failed to preload notifications:", err))
  );

  // 5. First Quiz Category to Play
  preloadPromises.push(
    apiClient(`${BASE_URL}/api/getGetegoryToPlay`, { method: "GET" })
      .then(async (response) => {
        if (response && response.ok) {
          const data = await response.json();
          appCache.firstQuestion = data;
          console.log("✅ First quiz category preloaded");
        }
      })
      .catch((err) => console.error("❌ Failed to preload first quiz:", err))
  );

  // 6. Leaderboard
  preloadPromises.push(
    apiClient(`${BASE_URL}/api/leaderboard`, { method: "GET" })
      .then(async (response) => {
        if (response && response.ok) {
          const data = await response.json();
          appCache.leaderboard = data;
          console.log("✅ Leaderboard preloaded");
        }
      })
      .catch((err) => console.error("❌ Failed to preload leaderboard:", err))
  );

  // 7. Store Items
  preloadPromises.push(
    apiClient(`${BASE_URL}/api/store/items`, { method: "GET" })
      .then(async (response) => {
        if (response && response.ok) {
          const data = await response.json();
          appCache.store = data;
          console.log("✅ Store items preloaded");
        }
      })
      .catch((err) => console.error("❌ Failed to preload store:", err))
  );

  // Wait for all preload operations to complete
  await Promise.allSettled(preloadPromises);
  
  appCache.isPreloaded = true;
  console.log("✅ All app data preloaded successfully!");
};

// ProtectedRoute component with preloading
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const userToken = localStorage.getItem("token");
  const [isPreloading, setIsPreloading] = useState(!appCache.isPreloaded);

  useEffect(() => {
    const initPreload = async () => {
      if (!userToken) return;
      
      if (!appCache.isPreloaded) {
        await preloadAppData(userToken);
      }
      
      setIsPreloading(false);
    };

    initPreload();
  }, [userToken]);

  if (!userToken) {
    return <Navigate to="/auth" replace />;
  }

  // Show splash screen while preloading
  if (isPreloading) {
    return <SplashScreen dataLoaded={false} />;
  }

  return <>{children}</>;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AppContent />
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

const AppContent = () => {
  usePageTracking();
  const location = useLocation();

  useLayoutEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  return (
    <Routes>
      {/* Public route for authentication */}
      <Route path="/auth" element={<AuthSection />} />
      <Route path="/reset-password" element={<AuthSection />} />

      {/* Protected routes wrapped by ProtectedRoute with preloading */}
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <MobileLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Home />} />
        <Route path="all-quizzes" element={<Categories />} />
        <Route path="quiz/:categoryId?" element={<Quiz />} />
        <Route path="leaderboard" element={<Leaderboard />} />
        <Route path="profile" element={<Profile />} />
        <Route path="notifications" element={<Notifications />} />
        <Route path="store" element={<Store />} />
        <Route path="about-us" element={<About />} />
        <Route path="menu" element={<Menu />} />
        <Route path="claim" element={<Claim />} />
      </Route>

      {/* Catch-all route for any undefined paths */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

export default App;