import React, { useLayoutEffect } from "react"; // 💡 Import useLayoutEffect
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom"; // 💡 Import useLocation
import { MobileLayout } from "@/components/layout/MobileLayout";
import Home from "./pages/Home";
// ... (other page imports)
import Quiz from "./pages/Quiz";
import AuthSection from "./pages/AuthSection";
// ... (other page imports)
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

const queryClient = new QueryClient();

// ProtectedRoute component to guard routes
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
    const userToken = localStorage.getItem("token");
    if (!userToken) {
        // Redirect to the login page if not authenticated
        return <Navigate to="/auth" replace />;
    }
    return children;
};

const App = () => (
    <QueryClientProvider client={queryClient}>
        <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
                {/* 💡 Call the hook here to start page view tracking and include scroll to top logic */}
                <AppContent /> 
            </BrowserRouter>
        </TooltipProvider>
    </QueryClientProvider>
);

// Extract content to a new component to correctly use the hook and location
const AppContent = () => {
    usePageTracking();
    const location = useLocation(); // 💡 Get the current location object

    // 💡 NEW: Scroll to the top of the page on route change
    useLayoutEffect(() => {
        // window.scrollTo(0, 0) scrolls the window to the top left corner (x=0, y=0)
        window.scrollTo(0, 0); 
    }, [location.pathname]); // Re-run effect whenever the pathname changes

    return (
        <Routes>
            {/* Public route for authentication */}
            <Route path="/auth" element={<AuthSection />} />

            {/* 💡 NEW: Add route for password reset link from email to ensure AuthSection loads */}
            <Route path="/reset-password" element={<AuthSection />} />

            {/* Protected routes wrapped by ProtectedRoute */}
            <Route path="/" element={<ProtectedRoute><MobileLayout /></ProtectedRoute>}>
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
}

export default App;