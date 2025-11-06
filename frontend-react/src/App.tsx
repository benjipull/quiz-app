import React from "react"; 
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom"; // Import Navigate for redirection
import { MobileLayout } from "@/components/layout/MobileLayout";
import Home from "./pages/Home";
// ... (other page imports)
import Quiz from "./pages/Quiz";
import AuthSection from "./pages/AuthSection";
// ... (other page imports)
// 💡 NEW: Import the page tracking hook
import { usePageTracking } from "./hooks/usePageTracking"; 
import Leaderboard from "./pages/Leaderboard";
import Categories from "./pages/Categories";
import Profile from "./pages/Profile";
import Notifications from "./pages/Notification";
import Store from "./pages/Store";
import Menu from "./pages/Menu";
import NotFound from "./pages/NotFound";

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
                {/* 💡 NEW: Call the hook here to start page view tracking */}
                <AppContent /> 
            </BrowserRouter>
        </TooltipProvider>
    </QueryClientProvider>
);

// Extract content to a new component to correctly use the hook
const AppContent = () => {
    usePageTracking(); 

    return (
        <Routes>
            {/* Public route for authentication */}
            <Route path="/auth" element={<AuthSection />} />

            {/* 💡 NEW: Add route for password reset link from email to ensure AuthSection loads */}
            <Route path="/reset-password" element={<AuthSection />} />

            {/* Protected routes wrapped by ProtectedRoute */}
            <Route path="/" element={<ProtectedRoute><MobileLayout /></ProtectedRoute>}>
                <Route index element={<Home />} />
                <Route path="categories" element={<Categories />} />
                <Route path="quiz/:categoryId?" element={<Quiz />} />
                <Route path="leaderboard" element={<Leaderboard />} />
                <Route path="profile" element={<Profile />} />
                <Route path="notifications" element={<Notifications />} />
                <Route path="store" element={<Store />} />
                <Route path="menu" element={<Menu />} />
            </Route>

            {/* Catch-all route for any undefined paths */}
            <Route path="*" element={<NotFound />} />
        </Routes>
    );
}

export default App;