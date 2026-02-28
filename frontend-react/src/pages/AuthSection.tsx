import React, { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Eye, EyeOff, Mail, Lock, User, Brain, Zap, ArrowRight, Calendar, Sparkles, Trophy, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

import { setGAUser } from "@/utils/gaClient";
import { trackLogin, trackSignup } from "@/utils/analytics";

const BASE_URL = import.meta.env.VITE_BASE_URL;

const AuthSection = () => {
    const navigate = useNavigate();
    const { toast } = useToast();
    const location = useLocation();

    const [showAuthOptions, setShowAuthOptions] = useState(true);
    const [authMode, setAuthMode] = useState<'login' | 'signup' | null>(null);
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
    const [signupConfirmPassword, setSignupConfirmPassword] = useState("");
    const [showSignupPassword, setShowSignupPassword] = useState(false);
    const [signupAge, setSignupAge] = useState("");

    // Reset password states
    const [resetEmail, setResetEmail] = useState("");
    const [resetCode, setResetCode] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [showNewPassword, setShowNewPassword] = useState(false);

    useEffect(() => {
        if (localStorage.getItem("token")) {
            navigate("/");
        }
    }, [navigate]);

// AuthSection.tsx - Fixed login handlers with proper async storage

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
            body: JSON.stringify({
                email: loginEmail,
                password: loginPassword
            }),
        });

        const data = await response.json();

        if (response.ok) {
            // Store token and user SYNCHRONOUSLY
            localStorage.setItem("token", data.token);
            localStorage.setItem("user", JSON.stringify(data.user));
            
            // Set analytics
            setGAUser(data.user._id);
            trackLogin("user_login", data.user._id);
            
            // Give localStorage a moment to write (helps with some browsers)
            await new Promise(resolve => setTimeout(resolve, 50));
            
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

const handleSignup = async () => {
    if (!signupAlias || !signupEmail || !signupPassword || !signupConfirmPassword || !signupAge) {
        toast({
            title: "Validation Error",
            description: "Please fill out all fields.",
            variant: "destructive",
        });
        return;
    }

    const ageNum = parseInt(signupAge);
    if (isNaN(ageNum) || ageNum < 5) {
        toast({
            title: "Validation Error",
            description: "You must be at least 5 years old to sign up.",
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

    if (signupPassword !== signupConfirmPassword) {
        toast({
            title: "Validation Error",
            description: "Passwords do not match.",
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
                age: ageNum,
                userType: "Registered",
            }),
        });

        const data = await response.json();

        if (response.ok) {
            toast({
                title: "Success!",
                description: "Account created successfully. Please log in.",
            });
            
            setAuthMode('login');
            setShowAuthOptions(false);
            setLoginEmail(signupEmail);
            setLoginPassword("");
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
        const response = await fetch(`${BASE_URL}/api/users/guestLogin`, {
            method: "POST",
        });

        const data = await response.json();

        if (response.ok) {
            // Store token and user SYNCHRONOUSLY
            localStorage.setItem("token", data.token);
            localStorage.setItem("user", JSON.stringify(data.user));

            // Set analytics
            setGAUser(data.user._id);
            trackLogin("user_login", data.user._id);
            
            // Give localStorage a moment to write (helps with some browsers)
            await new Promise(resolve => setTimeout(resolve, 50));
            
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
                setShowResetPassword(true);
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
                setShowResetPassword(false);
                setAuthMode('login');
                setShowAuthOptions(false);
                setLoginEmail(resetEmail);
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

    const onSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (showResetPassword) {
            handleResetPassword();
        } else if (showForgotPassword) {
            handleForgotPassword();
        } else if (authMode === 'login') {
            handleLogin();
        } else if (authMode === 'signup') {
            handleSignup();
        }
    };

    const renderWelcomeOptions = () => (
        <div className="space-y-4">
            {/* Hero Section */}
            <div className="text-center space-y-3 mb-8">
                <div className="flex justify-center gap-2 mb-4">
                    <Badge className="bg-purple-500/20 text-purple-300 border-purple-500/50 px-3 py-1">
                        <Brain className="w-3 h-3 mr-1" />
                        AI-Powered
                    </Badge>
                    <Badge className="bg-blue-500/20 text-blue-300 border-blue-500/50 px-3 py-1">
                        <Zap className="w-3 h-3 mr-1" />
                        Fun Learning
                    </Badge>
                </div>
                <p className="text-sm text-gray-400">Test your knowledge and compete with friends</p>
            </div>

            {/* Primary CTA - Guest Login */}
            <Button
                type="button"
                onClick={handleGuestLogin}
                variant="default"
                className="w-full h-14 text-lg font-semibold text-white"
                disabled={isLoading}
            >
                <div className="flex items-center justify-center gap-3">
                    <User className="h-5 w-5" />
                    <span>Continue as Guest</span>
                    <ArrowRight className="h-5 w-5 animate-pulse" />
                </div>
            </Button>

            <p className="text-center text-xs text-gray-500">No registration required • Start playing instantly</p>

            <div className="relative flex justify-center items-center py-4">
                <div className="absolute w-full border-t border-gray-700"></div>
                <span className="relative bg-gray-900 px-4 text-sm text-gray-400 font-medium">or create an account for more features</span>
            </div>

            {/* Secondary CTA - Sign Up */}
            <Button
            variant="blue"
                type="button"
                onClick={() => {
                    setShowAuthOptions(false);
                    setAuthMode('signup');
                }}
                className="w-full h-12 font-semibold"
            >
                <div className="flex items-center justify-center gap-2">
                    <Trophy className="h-5 w-5" />
                    <span>Sign Up for Free</span>
                </div>
            </Button>

            {/* Tertiary Option - Sign In */}
            <div className="text-center pt-6 border-t border-gray-800">
                <p className="text-sm text-gray-400 mb-2">Already have an account?</p>
                <button
                    onClick={() => {
                        setShowAuthOptions(false);
                        setAuthMode('login');
                    }}
                    className="text-purple-400 hover:text-purple-300 font-medium transition-colors underline-offset-4 hover:underline"
                >
                    Sign In
                </button>
            </div>
        </div>
    );

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
                className="w-full mt-6 h-12 bg-green-600 hover:bg-green-700 font-semibold"
                disabled={isLoading || !loginEmail || !loginPassword}
            >
                {isLoading ? "Signing In..." : "Sign In"}
            </Button>

            <div className="text-center">
                <button
                    type="button"
                    onClick={() => setShowForgotPassword(true)}
                    className="text-sm text-purple-400 hover:text-purple-300 transition-colors font-medium underline-offset-4 hover:underline"
                    disabled={isLoading}
                >
                    Forgot Password?
                </button>
            </div>

            <div className="text-center pt-4 border-t border-border/50">
                <p className="text-sm text-muted-foreground">
                    Don't have an account?{" "}
                    <button
                        type="button"
                        onClick={() => {
                            setAuthMode('signup');
                        }}
                        className="text-primary hover:text-primary/80 font-medium transition-colors"
                    >
                        Sign up here
                    </button>
                </p>
                <button
                    type="button"
                    onClick={() => {
                        setShowAuthOptions(true);
                        setAuthMode(null);
                    }}
                    className="text-sm text-gray-400 hover:text-gray-300 transition-colors mt-2"
                >
                    ← Back to options
                </button>
            </div>
        </form>
    );

    const renderSignupForm = () => (
        <form className="space-y-4" onSubmit={onSubmit}>
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

            <div className="space-y-2">
                <Label htmlFor="signupConfirmPassword">Confirm Password</Label>
                <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                        id="signupConfirmPassword"
                        type={showSignupPassword ? "text" : "password"}
                        value={signupConfirmPassword}
                        onChange={(e) => setSignupConfirmPassword(e.target.value)}
                        placeholder="Confirm your password"
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

            <div className="space-y-2">
                <Label htmlFor="signupAge" className="text-foreground font-medium">Age</Label>
                <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                    <Input
                        id="signupAge"
                        name="signupAge"
                        type="number"
                        placeholder="Enter your age (Min 5)"
                        value={signupAge}
                        onChange={(e) => setSignupAge(e.target.value)}
                        className="pl-10 h-12 bg-background/50 border-border/50 focus:border-primary transition-colors"
                        min="5"
                        max="120"
                        required
                        disabled={isLoading}
                    />
                </div>
            </div>

            <Button
                type="submit"
                className="w-full mt-6 h-12 bg-green-600 hover:bg-green-700 font-semibold"
                disabled={isLoading || !signupAlias || !signupEmail || !signupPassword || !signupConfirmPassword || !signupAge}
            >
                {isLoading ? "Signing Up..." : "Sign Up"}
            </Button>

            <div className="text-center pt-4 border-t border-border/50">
                <p className="text-sm text-muted-foreground">
                    Already have an account?{" "}
                    <button
                        type="button"
                        onClick={() => {
                            setAuthMode('login');
                        }}
                        className="text-primary hover:text-primary/80 font-medium transition-colors"
                    >
                        Sign in here
                    </button>
                </p>
                <button
                    type="button"
                    onClick={() => {
                        setShowAuthOptions(true);
                        setAuthMode(null);
                    }}
                    className="text-sm text-gray-400 hover:text-gray-300 transition-colors mt-2"
                >
                    ← Back to options
                </button>
            </div>
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
                className="w-full mt-6 bg-green-600 hover:bg-green-700"
                disabled={isLoading || !resetEmail}
            >
                {isLoading ? "Sending Code..." : "Send Reset Code"}
            </Button>

            <div className="text-center pt-4 border-t border-border/50">
                <button
                    type="button"
                    onClick={() => {
                        setShowForgotPassword(false);
                        setAuthMode('login');
                    }}
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
                Enter the code sent to <span className="font-semibold">{resetEmail}</span> and your new password.
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
                className="w-full mt-6 bg-green-600 hover:bg-green-700"
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
        if (showAuthOptions) return renderWelcomeOptions();
        if (authMode === 'login') return renderLoginForm();
        if (authMode === 'signup') return renderSignupForm();
        return renderWelcomeOptions();
    };

    const getTitle = () => {
        if (showResetPassword) return "Reset Password";
        if (showForgotPassword) return "Forgot Password";
        if (authMode === 'login') return "Welcome Back";
        if (authMode === 'signup') return "Create Account";
        return "Welcome to Quizicle";
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-purple-900/20 to-blue-900/20 py-8 px-4 sm:py-12 sm:px-6 lg:px-8 relative overflow-hidden">
            {/* Animated Background Elements */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl animate-pulse"></div>
                <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
                <div className="absolute top-1/2 left-1/2 w-80 h-80 bg-green-500/5 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }}></div>
            </div>

            {/* Floating Icons Animation - Continuation */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <Brain className="absolute top-20 left-10 text-purple-500/20 w-8 h-8 animate-bounce" style={{ animationDuration: '3s' }} />
                <Sparkles className="absolute top-40 right-20 text-blue-500/20 w-6 h-6 animate-bounce" style={{ animationDuration: '4s', animationDelay: '1s' }} />
                <Trophy className="absolute bottom-32 left-20 text-yellow-500/20 w-7 h-7 animate-bounce" style={{ animationDuration: '3.5s', animationDelay: '2s' }} />
                <Target className="absolute bottom-20 right-16 text-green-500/20 w-6 h-6 animate-bounce" style={{ animationDuration: '4.5s' }} />
                <Zap className="absolute top-1/3 right-1/4 text-purple-500/20 w-5 h-5 animate-bounce" style={{ animationDuration: '3.8s', animationDelay: '0.5s' }} />
            </div>

            <div className="max-w-md w-full space-y-6 sm:space-y-8 relative z-10">
                <div className="text-center">
                    <div className="relative inline-block">
                        <div className="absolute inset-0 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full blur-xl opacity-50 animate-pulse"></div>
                        <img
                            className="relative mx-auto h-12 sm:h-16 w-auto filter drop-shadow-2xl"
                            src="/logo1.jpg"
                            alt="Quizicle Logo"
                        />
                    </div>
                    <h2 className="mt-6 sm:mt-8 text-3xl sm:text-4xl font-extrabold text-white bg-clip-text text-transparent bg-gradient-to-r from-white via-blue-100 to-purple-100">
                        {getTitle()}
                    </h2>
                </div>

                <Card className="bg-gray-800/40 backdrop-blur-xl border-gray-700/50 shadow-2xl w-full relative overflow-hidden">
                    {/* Card glow effect */}
                    <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 via-transparent to-blue-500/5 pointer-events-none"></div>

                    <div className="p-6 sm:p-8 md:p-10 space-y-6 relative z-10">
                        {renderAuthForm()}
                    </div>
                </Card>
            </div>
        </div>
    );
};

export default AuthSection;
