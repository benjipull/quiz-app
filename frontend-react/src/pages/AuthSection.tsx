// AuthSection.tsx

import React, { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Eye, EyeOff, Mail, Lock, User, Brain, Zap, ArrowRight, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import logo from "../assets/images/QuizicleLogo.png";
import ReactGA from "react-ga4";

const BASE_URL = "https://quiz-app-node-606998948537.europe-west4.run.app";

const AuthSection = () => {
    const navigate = useNavigate();
    const { toast } = useToast();
    const location = useLocation();

    const [isLogin, setIsLogin] = useState(true);
    const [isLoading, setIsLoading] = useState(false);
    const [showForgotPassword, setShowForgotPassword] = useState(false);
    const [showResetPassword, setShowResetPassword] = useState(false);

    // Login form states
    const [loginEmail, setLoginEmail] = useState("");
    const [loginPassword, setLoginPassword] = useState("");
    const [showLoginPassword, setShowLoginPassword] = useState(false);

    // Signup form states
    const [signupAlias, setSignupAlias] = useState("");
    const [signupEmail, setSignupEmail] = useState("");
    const [signupPassword, setSignupPassword] = useState("");
    const [showSignupPassword, setShowSignupPassword] = useState(false);

    // Reset password states
    const [resetEmail, setResetEmail] = useState("");
    const [resetCode, setResetCode] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [showNewPassword, setShowNewPassword] = useState(false);


    useEffect(() => {
        // If user already has a token, navigate home
        if (localStorage.getItem("token")) {
            navigate("/");
        }
    }, [navigate]);

    // ----------------------------------------------------------------
    // 🔑 CORE LOGIN FUNCTION (Corrected)
    // ----------------------------------------------------------------
    const handleLogin = async () => {
        if (!loginEmail || !loginPassword) {
            toast({
                title: "Validation Error",
                description: "Please enter both email and password.",
                variant: "destructive",
            });
            return;
        }

        setIsLoading(true);
        try {
            const response = await fetch(`${BASE_URL}/api/users/login`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                // 🎯 FIX: Explicitly send loginEmail and loginPassword.
                body: JSON.stringify({
                    email: loginEmail,
                    password: loginPassword // Ensure this state holds the value!
                }),
            });

            const data = await response.json();

            if (response.ok) {
                localStorage.setItem("token", data.token);
                localStorage.setItem("user", JSON.stringify(data.user));
                ReactGA.set({ userId: data.user._id });
                ReactGA.event("login", {
                    method: "user_login",
                    user_id: data.user._id,
                });

                toast({
                    title: "Success",
                    description: "Login successful! Welcome back.",
                });

                // Check for redirect location (e.g., if user was trying to access /profile)
                const from = location.state?.from?.pathname || "/";
                navigate(from);
            } else {
                throw new Error(data.message || "Invalid credentials or login failed.");
            }
        } catch (error) {
            console.error("Login Error:", error);
            toast({
                title: "Login Failed",
                description: (error as Error).message,
                variant: "destructive",
            });
        } finally {
            setIsLoading(false);
        }
    };
    // ----------------------------------------------------------------


    const handleSignup = async () => {
        if (!signupAlias || !signupEmail || !signupPassword) {
            toast({
                title: "Validation Error",
                description: "Please fill out all fields.",
                variant: "destructive",
            });
            return;
        }
        if (signupPassword.length < 6) {
            toast({
                title: "Validation Error",
                description: "Password must be at least 6 characters.",
                variant: "destructive",
            });
            return;
        }

        setIsLoading(true);
        try {
            const response = await fetch(`${BASE_URL}/api/users/register`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    alias: signupAlias,
                    email: signupEmail,
                    password: signupPassword,
                    userType: "Registered"
                }),
            });

            const data = await response.json();

            if (response.ok) {
                toast({
                    title: "Success",
                    description: "Registration successful! Please log in.",
                });
                setIsLogin(true); // Switch to login view
                setLoginEmail(signupEmail); // Pre-fill login email
            } else {
                throw new Error(data.message || "Registration failed.");
            }
        } catch (error) {
            console.error("Signup Error:", error);
            toast({
                title: "Registration Failed",
                description: (error as Error).message,
                variant: "destructive",
            });
        } finally {
            setIsLoading(false);
        }
    };

    const handleGuestLogin = async () => {
        setIsLoading(true);
        try {
            const response = await fetch(`${BASE_URL}/api/users/guest`, {
                method: "POST",
            });

            const data = await response.json();

            if (response.ok) {
                localStorage.setItem("token", data.token);
                localStorage.setItem("user", JSON.stringify(data.user));
                
                ReactGA.set({ userId: data.user._id });
                ReactGA.event("login", {
                    method: "guest_login",
                    user_id: data.user._id,
                });

                toast({
                    title: "Welcome Guest",
                    description: "Enjoy limited access. Complete your profile to register!",
                });
                navigate("/");
            } else {
                throw new Error(data.message || "Guest login failed.");
            }
        } catch (error) {
            console.error("Guest Login Error:", error);
            toast({
                title: "Guest Access Failed",
                description: (error as Error).message,
                variant: "destructive",
            });
        } finally {
            setIsLoading(false);
        }
    };

    const handleForgotPassword = async () => {
        if (!resetEmail) {
            toast({ title: "Validation Error", description: "Please enter your email.", variant: "destructive" });
            return;
        }
        setIsLoading(true);
        try {
            const response = await fetch(`${BASE_URL}/api/users/forgotPassword`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email: resetEmail }),
            });

            if (response.ok) {
                toast({
                    title: "Password Reset Initiated",
                    description: "A reset code has been sent to your email.",
                });
                setShowForgotPassword(false);
                setShowResetPassword(true); // Move to the code entry screen
            } else {
                const data = await response.json();
                throw new Error(data.message || "Failed to initiate password reset.");
            }
        } catch (error) {
            toast({ title: "Error", description: (error as Error).message, variant: "destructive" });
        } finally {
            setIsLoading(false);
        }
    };

    const handleResetPassword = async () => {
        if (!resetCode || !newPassword || newPassword.length < 6) {
            toast({
                title: "Validation Error",
                description: "Enter a valid code and a new password (min 6 chars).",
                variant: "destructive",
            });
            return;
        }
        setIsLoading(true);
        try {
            const response = await fetch(`${BASE_URL}/api/users/resetPassword`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    email: resetEmail,
                    resetCode,
                    newPassword,
                }),
            });

            if (response.ok) {
                toast({
                    title: "Success",
                    description: "Your password has been reset. Please log in.",
                });
                setShowResetPassword(false); // Hide reset screen
                setIsLogin(true); // Switch to login
                setLoginEmail(resetEmail); // Pre-fill login email
            } else {
                const data = await response.json();
                throw new Error(data.message || "Failed to reset password. Code may be invalid.");
            }
        } catch (error) {
            toast({ title: "Error", description: (error as Error).message, variant: "destructive" });
        } finally {
            setIsLoading(false);
        }
    };

    // Helper to call the correct handler
    const onSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (showResetPassword) {
            handleResetPassword();
        } else if (showForgotPassword) {
            handleForgotPassword();
        } else if (isLogin) {
            handleLogin(); // Calls the corrected function
        } else {
            handleSignup();
        }
    };

    const renderLoginForm = () => (
        <form className="space-y-4" onSubmit={onSubmit}>
            <div className="space-y-2">
                <Label htmlFor="loginEmail">Email</Label>
                <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                        id="loginEmail"
                        type="email"
                        value={loginEmail}
                        onChange={(e) => setLoginEmail(e.target.value)}
                        placeholder="your@email.com"
                        className="pl-10"
                        required
                        disabled={isLoading}
                    />
                </div>
            </div>

            <div className="space-y-2">
                <Label htmlFor="loginPassword">Password</Label>
                <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                        id="loginPassword"
                        type={showLoginPassword ? "text" : "password"}
                        value={loginPassword}
                        onChange={(e) => setLoginPassword(e.target.value)}
                        placeholder="••••••••"
                        className="pl-10 pr-10"
                        required
                        disabled={isLoading}
                    />
                    <button
                        type="button"
                        onClick={() => setShowLoginPassword(!showLoginPassword)}
                        className="absolute right-3 top-3 text-muted-foreground hover:text-foreground"
                        aria-label={showLoginPassword ? "Hide password" : "Show password"}
                    >
                        {showLoginPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                </div>
            </div>

            <Button
                type="submit"
                className="w-full mt-6"
                disabled={isLoading || !loginEmail || !loginPassword}
            >
                {isLoading ? "Signing In..." : "Sign In"}
            </Button>

            <div className="text-center">
                <button
                    type="button"
                    onClick={() => setShowForgotPassword(true)}
                    className="text-sm text-muted-foreground hover:text-primary transition-colors"
                    disabled={isLoading}
                >
                    Forgot Password?
                </button>
            </div>

            <div className="relative flex justify-center items-center py-4">
                <div className="absolute w-full border-t border-border/50"></div>
                <span className="relative bg-card/60 px-3 text-sm text-muted-foreground">OR</span>
            </div>

            <Button
                type="button"
                variant="outline"
                onClick={handleGuestLogin}
                className="w-full flex items-center gap-2"
                disabled={isLoading}
            >
                <User className="h-4 w-4" />
                Continue as Guest
            </Button>
        </form>
    );

    const renderSignupForm = () => (
        <form className="space-y-4" onSubmit={onSubmit}>
            {/* Alias */}
            <div className="space-y-2">
                <Label htmlFor="signupAlias">Username/Alias</Label>
                <div className="relative">
                    <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                        id="signupAlias"
                        type="text"
                        value={signupAlias}
                        onChange={(e) => setSignupAlias(e.target.value)}
                        placeholder="Your unique alias"
                        className="pl-10"
                        required
                        disabled={isLoading}
                    />
                </div>
            </div>

            {/* Email */}
            <div className="space-y-2">
                <Label htmlFor="signupEmail">Email</Label>
                <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                        id="signupEmail"
                        type="email"
                        value={signupEmail}
                        onChange={(e) => setSignupEmail(e.target.value)}
                        placeholder="your@email.com"
                        className="pl-10"
                        required
                        disabled={isLoading}
                    />
                </div>
            </div>

            {/* Password */}
            <div className="space-y-2">
                <Label htmlFor="signupPassword">Password</Label>
                <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                        id="signupPassword"
                        type={showSignupPassword ? "text" : "password"}
                        value={signupPassword}
                        onChange={(e) => setSignupPassword(e.target.value)}
                        placeholder="•••••••• (min 6 chars)"
                        className="pl-10 pr-10"
                        required
                        disabled={isLoading}
                    />
                    <button
                        type="button"
                        onClick={() => setShowSignupPassword(!showSignupPassword)}
                        className="absolute right-3 top-3 text-muted-foreground hover:text-foreground"
                        aria-label={showSignupPassword ? "Hide password" : "Show password"}
                    >
                        {showSignupPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                </div>
            </div>

            <Button
                type="submit"
                className="w-full mt-6 bg-green-600 hover:bg-green-700"
                disabled={isLoading || !signupAlias || !signupEmail || !signupPassword}
            >
                {isLoading ? "Signing Up..." : "Sign Up"}
            </Button>
        </form>
    );

    const renderForgotPasswordForm = () => (
        <form className="space-y-4" onSubmit={onSubmit}>
            <p className="text-sm text-muted-foreground text-center">
                Enter your email and we'll send you a code to reset your password.
            </p>
            <div className="space-y-2">
                <Label htmlFor="resetEmail">Email</Label>
                <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                        id="resetEmail"
                        type="email"
                        value={resetEmail}
                        onChange={(e) => setResetEmail(e.target.value)}
                        placeholder="your@email.com"
                        className="pl-10"
                        required
                        disabled={isLoading}
                    />
                </div>
            </div>

            <Button
                type="submit"
                className="w-full mt-6"
                disabled={isLoading || !resetEmail}
            >
                {isLoading ? "Sending Code..." : "Send Reset Code"}
            </Button>

            <div className="text-center pt-4 border-t border-border/50">
                <button
                    type="button"
                    onClick={() => setShowForgotPassword(false)}
                    className="text-sm text-primary hover:text-primary/80 font-medium transition-colors"
                >
                    Back to Sign In
                </button>
            </div>
        </form>
    );

    const renderResetPasswordForm = () => (
        <form className="space-y-4" onSubmit={onSubmit}>
            <p className="text-sm text-muted-foreground text-center">
                Enter the code sent to **{resetEmail}** and your new password.
            </p>
            <div className="space-y-2">
                <Label htmlFor="resetCode">Reset Code</Label>
                <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                        id="resetCode"
                        type="text"
                        value={resetCode}
                        onChange={(e) => setResetCode(e.target.value)}
                        placeholder="Enter 6-digit code"
                        className="pl-10"
                        required
                        disabled={isLoading}
                    />
                </div>
            </div>

            <div className="space-y-2">
                <Label htmlFor="newPassword">New Password</Label>
                <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                        id="newPassword"
                        type={showNewPassword ? "text" : "password"}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="New password (min 6 chars)"
                        className="pl-10 pr-10"
                        required
                        disabled={isLoading}
                    />
                    <button
                        type="button"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        className="absolute right-3 top-3 text-muted-foreground hover:text-foreground"
                        aria-label={showNewPassword ? "Hide password" : "Show password"}
                    >
                        {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                </div>
            </div>

            <Button
                type="submit"
                className="w-full mt-6"
                disabled={isLoading || !resetCode || !newPassword}
            >
                {isLoading ? "Resetting..." : "Reset Password"}
            </Button>

            <div className="text-center pt-4 border-t border-border/50">
                <button
                    type="button"
                    onClick={() => {
                        setShowResetPassword(false);
                        setShowForgotPassword(true);
                    }}
                    className="text-sm text-muted-foreground hover:text-primary transition-colors"
                >
                    Resend Code
                </button>
            </div>
        </form>
    );

    const renderAuthForm = () => {
        if (showResetPassword) return renderResetPasswordForm();
        if (showForgotPassword) return renderForgotPasswordForm();
        return isLogin ? renderLoginForm() : renderSignupForm();
    };


    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-900/90 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-md w-full space-y-8">
                <div className="text-center">
                    <img
                        className="mx-auto h-12 w-auto filter drop-shadow-lg"
                        src={logo}
                        alt="Quizicle Logo"
                    />
                    <h2 className="mt-6 text-3xl font-extrabold text-white">
                        {showResetPassword ? "Reset Password" : showForgotPassword ? "Forgot Password" : isLogin ? "Sign In to your Account" : "Create a New Account"}
                    </h2>
                    <p className="mt-2 text-sm text-gray-400">
                        {isLogin ? "Welcome back!" : "Start quizzing today!"}
                    </p>
                </div>

                <div className="flex justify-center">
                    <Card className="bg-card/60 backdrop-blur-sm border-border/50 shadow-xl">
                        <div className="p-8 space-y-6">
                            {renderAuthForm()}

                            {/* Switch Form - only show if not in reset password mode */}
                            {!showResetPassword && (
                                <div className="text-center pt-4 border-t border-border/50">
                                    <p className="text-muted-foreground">
                                        {isLogin && !showForgotPassword ? "Don't have an account? " : "Already have an account? "}
                                        {!showForgotPassword && (
                                            <button
                                                onClick={() => setIsLogin(!isLogin)}
                                                className="text-primary hover:text-primary/80 font-medium transition-colors"
                                            >
                                                {isLogin ? "Sign up here" : "Sign in here"}
                                            </button>
                                        )}
                                    </p>
                                </div>
                            )}
                        </div>
                    </Card>
                </div>
            </div>
        </div>
    );
};

export default AuthSection;