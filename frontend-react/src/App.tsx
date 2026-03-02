import React, { useEffect, useLayoutEffect, useState } from "react";
import { Capacitor } from "@capacitor/core";
import { StatusBar } from "@capacitor/status-bar";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { MobileLayout } from "@/components/layout/MobileLayout";
import Home from "./pages/Home";
import Quiz from "./pages/Quiz";
import { usePageTracking } from "./hooks/usePageTracking";
import Leaderboard from "./pages/Leaderboard";
import Categories from "./pages/Categories";
import Profile from "./pages/Profile";
import Notifications from "./pages/Notification";
import Store from "./pages/Store";
import Menu from "./pages/Menu";
import Interests from "./pages/Interests";
import NotFound from "./pages/NotFound";
import About from "./pages/About";
import Claim from "./components/dummy";
import SplashScreen from "./components/SplashScreen";

const queryClient = new QueryClient();
const BASE_URL = import.meta.env.VITE_BASE_URL || window.location.origin;

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [guestLoginFailed, setGuestLoginFailed] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const ensureSession = async () => {
      const existingToken = localStorage.getItem("token");
      if (existingToken) {
        if (isMounted) {
          setIsCheckingAuth(false);
        }
        return;
      }

      try {
        const response = await fetch(`${BASE_URL}/api/users/guestLogin`, {
          method: "POST",
        });

        const data = await response.json();
        if (!response.ok || !data?.token || !data?.user) {
          throw new Error("Guest login failed");
        }

        localStorage.setItem("token", data.token);
        localStorage.setItem("user", JSON.stringify(data.user));

        if (isMounted) {
          setIsCheckingAuth(false);
        }
      } catch (error) {
        console.error("Auto guest login failed:", error);
        if (isMounted) {
          setGuestLoginFailed(true);
          setIsCheckingAuth(false);
        }
      }
    };

    ensureSession();

    return () => {
      isMounted = false;
    };
  }, []);

  if (isCheckingAuth) {
    return <SplashScreen dataLoaded={false} />;
  }

  if (guestLoginFailed) {
    return <div className="min-h-screen grid place-items-center text-sm text-destructive">Unable to start guest session. Please refresh.</div>;
  }

  return children;
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

  useEffect(() => {
    if (Capacitor.getPlatform() !== "android") {
      return;
    }

    void StatusBar.hide().catch((error) => {
      console.error("Failed to hide Android status bar:", error);
    });
  }, []);

  useLayoutEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  return (
    <Routes>
      <Route path="/auth" element={<Navigate to="/" replace />} />
      <Route path="/reset-password" element={<Navigate to="/" replace />} />

      <Route path="/" element={<ProtectedRoute><MobileLayout /></ProtectedRoute>}>
        <Route index element={<Home />} />
        <Route path="all-quizzes" element={<Categories />} />
        <Route path="quiz/:categoryId?" element={<Quiz />} />
        <Route path="leaderboard" element={<Leaderboard />} />
        <Route path="profile" element={<Profile />} />
        <Route path="interests" element={<Interests />} />
        <Route path="notifications" element={<Notifications />} />
        <Route path="store" element={<Store />} />
        <Route path="about-us" element={<About />} />
        <Route path="menu" element={<Menu />} />
        <Route path="claim" element={<Claim />} />
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

export default App;
