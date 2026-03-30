import React, { Suspense, lazy, useEffect, useLayoutEffect, useRef, useState } from "react";
import { Capacitor } from "@capacitor/core";
import { StatusBar } from "@capacitor/status-bar";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import Quiz from "./pages/Quiz";
import { usePageTracking } from "./hooks/usePageTracking";
import SplashScreen from "./components/SplashScreen";
import { getApiBaseUrl } from "@/utils/baseUrl";
import { setGAUser } from "@/utils/gaClient";
import { trackEnteredGame } from "@/utils/analytics";

const queryClient = new QueryClient();
const BASE_URL = getApiBaseUrl();
const MobileLayout = lazy(() => import("@/components/layout/MobileLayout").then((module) => ({ default: module.MobileLayout })));
const SagaMap = lazy(() => import("./pages/SagaMap"));
const SagaLevel = lazy(() => import("./pages/SagaLevel"));
const Leaderboard = lazy(() => import("./pages/Leaderboard"));
const Categories = lazy(() => import("./pages/Categories"));
const Profile = lazy(() => import("./pages/Profile"));
const DeleteAccount = lazy(() => import("./pages/DeleteAccount"));
const Notifications = lazy(() => import("./pages/Notification"));
const Store = lazy(() => import("./pages/Store"));
const Menu = lazy(() => import("./pages/Menu"));
const Interests = lazy(() => import("./pages/Interests"));
const NotFound = lazy(() => import("./pages/NotFound"));
const About = lazy(() => import("./pages/About"));
const Claim = lazy(() => import("./components/dummy"));

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
        setGAUser(data.user._id);
        trackEnteredGame(data.user._id, "guest_login_api");

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
  const previousPathnameRef = useRef(location.pathname);

  const isSagaRoutePath = (pathname: string) =>
    pathname === "/" || pathname === "/saga-map" || pathname.startsWith("/saga-level/");
  const shouldAnimateSagaRouteTransition =
    previousPathnameRef.current !== location.pathname &&
    isSagaRoutePath(previousPathnameRef.current) &&
    isSagaRoutePath(location.pathname);

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

  useEffect(() => {
    previousPathnameRef.current = location.pathname;
  }, [location.pathname]);

  return (
    <Suspense fallback={<SplashScreen dataLoaded={false} />}>
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={location.key}
          initial={
            shouldAnimateSagaRouteTransition
              ? { opacity: 0, y: 24, scale: 0.985, filter: "blur(1.5px)" }
              : false
          }
          animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
          exit={
            shouldAnimateSagaRouteTransition
              ? { opacity: 0.32, y: -18, scale: 1.012, filter: "blur(2px)" }
              : { opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }
          }
          transition={
            shouldAnimateSagaRouteTransition
              ? { duration: 0.35, ease: [0.22, 1, 0.36, 1] }
              : { duration: 0.01 }
          }
        >
          <Routes location={location}>
            <Route path="/auth" element={<Navigate to="/" replace />} />
            <Route path="/reset-password" element={<Navigate to="/" replace />} />

            <Route path="/" element={<ProtectedRoute><MobileLayout /></ProtectedRoute>}>
              <Route index element={<SagaMap />} />
              <Route path="all-quizzes" element={<Categories />} />
              <Route path="saga-map" element={<SagaMap />} />
              <Route path="saga-level/:sagaNumber" element={<SagaLevel />} />
              <Route path="quiz/:categoryId?" element={<Quiz />} />
              <Route path="leaderboard" element={<Leaderboard />} />
              <Route path="profile" element={<Profile />} />
              <Route path="delete-account" element={<DeleteAccount />} />
              <Route path="interests" element={<Interests />} />
              <Route path="notifications" element={<Notifications />} />
              <Route path="store" element={<Store />} />
              <Route path="about-us" element={<About />} />
              <Route path="menu" element={<Menu />} />
              <Route path="claim" element={<Claim />} />
            </Route>

            <Route path="*" element={<NotFound />} />
          </Routes>
        </motion.div>
      </AnimatePresence>
    </Suspense>
  );
};

export default App;
