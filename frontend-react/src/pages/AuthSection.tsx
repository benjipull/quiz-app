// AuthSection.tsx

import React, { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Eye, EyeOff, Mail, Lock, User, Brain, Zap, ArrowRight, Calendar } from "lucide-react"; // Calendar icon kept for consistency of removal of DOB and replacement with AGE
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import logo from "../assets/images/QuizicleLogo.png";

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
    const [signupConfirmPassword, setSignupConfirmPassword] = useState("");
    const [signupAge, setSignupAge] = useState(""); // Changed from DOB to Age
    const [showSignupPassword, setShowSignupPassword] = useState(false);
    const [showSignupConfirmPassword, setShowSignupConfirmPassword] = useState(false); // Corrected state name here

    // Forgot/Reset password states
    const [forgotPasswordEmail, setForgotPasswordEmail] = useState("");
    const [resetPasswordToken, setResetPasswordToken] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmNewPassword, setConfirmNewPassword] = useState("");
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmNewPassword, setShowConfirmNewPassword] = useState(false);


    useEffect(() => {
        // Check if there's a reset token in the URL
        const queryParams = new URLSearchParams(location.search);
        const token = queryParams.get("token");
        if (token) {
            setResetPasswordToken(token);
            setShowResetPassword(true);
            setIsLogin(false); // Hide login/signup
            setShowForgotPassword(false); // Hide forgot password
        }
    }, [location]);

    const handleLogin = async () => {
        if (!loginEmail || !loginPassword) {
            toast({
                title: "Missing fields",
                description: "Please enter both email and password.",
                variant: "destructive",
            });
            return;
        }

        setIsLoading(true);

        try {
            const response = await fetch(`${BASE_URL}/api/users/login`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email: loginEmail, password: loginPassword }),
            });

            const data = await response.json();

            if (response.ok) {
                // ✅ Store token + user
                localStorage.setItem("token", data.token);
                localStorage.setItem("user", JSON.stringify(data.user));

                toast({
                    title: "Login successful!",
                    description: "Welcome back to Quizicle!",
                });

                // ✅ Optional: set a timestamp to detect expired tokens later
                localStorage.setItem("tokenIssuedAt", Date.now().toString());

                navigate("/");
            } else {
                // 🔹 Clear any previous bad tokens if login fails
                localStorage.removeItem("token");
                localStorage.removeItem("user");

                toast({
                    title: "Login failed",
                    description: data.message || "Invalid credentials. Please try again.",
                    variant: "destructive",
                });
            }
        } catch (error) {
            console.error("Login error:", error);
            toast({
                title: "Network error",
                description: "Could not connect to the server. Please try again.",
                variant: "destructive",
            });
        } finally {
            setIsLoading(false);
        }
    };


    const handleSignup = async () => {
        if (!signupAlias || !signupEmail || !signupPassword || !signupAge || !signupConfirmPassword) {
            toast({
                title: "Missing fields",
                description: "All fields are required.",
                variant: "destructive",
            });
            return;
        }

        if (signupPassword !== signupConfirmPassword) {
            toast({
                title: "Password mismatch",
                description: "Passwords do not match. Please try again.",
                variant: "destructive",
            });
            return;
        }

        // Removed password strength check as requested (signupPassword.length < 6)

        setIsLoading(true);
        try {
            const response = await fetch(`${BASE_URL}/api/users/register`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    alias: signupAlias,
                    email: signupEmail,
                    password: signupPassword,
                    age: parseInt(signupAge, 10), // Ensure age is sent as a number
                }),
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.message);

            toast({
                title: "Account created!",
                description: "Welcome to Quizicle! Please log in.",
            });
            setIsLogin(true);
            setLoginEmail(signupEmail);
            setLoginPassword("");
        } catch (error) {
            console.error("Signup error:", error);
            toast({
                title: "Registration failed",
                description: error.message || "Something went wrong. Please try again.",
                variant: "destructive",
            });
        } finally {
            setIsLoading(false);
        }
    };

    // NEW: Handler for Guest Login
    const handleGuestLogin = async () => {
        setIsLoading(true);
        try {
            // POST /api/users/guestLogin - Empty body
            const response = await fetch(`${BASE_URL}/api/users/guestLogin`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
            });
            const data = await response.json();
            if (response.ok) {
                // The backend should return the token and a user object which includes playerType: 'Guest'
                localStorage.setItem("token", data.token);
                localStorage.setItem("user", JSON.stringify(data.user));

                toast({
                    title: "Welcome, Guest!",
                    description: "You are logged in as a guest. Register to save your progress!",
                });
                navigate("/");
            } else {
                toast({
                    title: "Guest Login Failed",
                    description: data.message || "Something went wrong during guest login.",
                    variant: "destructive",
                });
            }
        } catch (error) {
            console.error("Guest login error:", error);
            toast({
                title: "Network error",
                description: "Could not connect to the server. Please try again.",
                variant: "destructive",
            });
        } finally {
            setIsLoading(false);
        }
    };

    const handleForgotPasswordRequest = async () => {
        if (!forgotPasswordEmail) {
            toast({
                title: "Missing email",
                description: "Please enter your email to reset your password.",
                variant: "destructive",
            });
            return;
        }

        setIsLoading(true);
        try {
            const response = await fetch(`${BASE_URL}/api/resetPassword`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email: forgotPasswordEmail }),
            });
            const data = await response.json();

            if (response.ok) {
                toast({
                    title: "Password Reset Link Sent",
                    description: data.message || "If your email exists, a password reset link has been sent to your inbox.",
                });
                setShowForgotPassword(false); // Go back to login form
                setLoginEmail(forgotPasswordEmail); // Pre-fill login email
            } else {
                toast({
                    title: "Failed to Send Link",
                    description: data.error || "Something went wrong. Please try again.",
                    variant: "destructive",
                });
            }
        } catch (error) {
            console.error("Forgot password error:", error);
            toast({
                title: "Network error",
                description: "Could not connect to the server. Please try again.",
                variant: "destructive",
            });
        } finally {
            setIsLoading(false);
        }
    };

    const handleResetPassword = async () => {
        if (!newPassword || !confirmNewPassword) {
            toast({
                title: "Missing fields",
                description: "Please enter and confirm your new password.",
                variant: "destructive",
            });
            return;
        }

        if (newPassword !== confirmNewPassword) {
            toast({
                title: "Password mismatch",
                description: "New passwords do not match. Please try again.",
                variant: "destructive",
            });
            return;
        }

        setIsLoading(true);
        try {
            const response = await fetch(`${BASE_URL}/api/updatePassword`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ token: resetPasswordToken, password: newPassword }),
            });
            const data = await response.json();

            if (response.ok) {
                toast({
                    title: "Password Updated!",
                    description: data.message,
                });
                navigate("/"); // Redirect to home or login page after successful reset
                setShowResetPassword(false);
                setIsLogin(true);
            } else {
                toast({
                    title: "Password Reset Failed",
                    description: data.error || "Invalid or expired token. Please try again.",
                    variant: "destructive",
                });
            }
        } catch (error) {
            console.error("Reset password error:", error);
            toast({
                title: "Network error",
                description: "Could not connect to the server. Please try again.",
                variant: "destructive",
            });
        } finally {
            setIsLoading(false);
        }
    };

    const renderAuthForm = () => {
        if (showResetPassword) {
            return (
                <form onSubmit={(e) => { e.preventDefault(); handleResetPassword(); }} className="space-y-6">
                    <h3 className="text-xl font-bold text-foreground text-center">Reset Your Password</h3>
                    <div className="space-y-2">
                        <Label htmlFor="newPassword" className="text-foreground font-medium">New Password</Label>
                        <div className="relative">
                            <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                            <Input
                                id="newPassword"
                                name="newPassword"
                                type={showNewPassword ? "text" : "password"}
                                placeholder="Enter your new password"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                className="pl-10 pr-10 h-12 bg-background/50 border-border/50 focus:border-primary transition-colors"
                                required
                            />
                            <button
                                type="button"
                                onClick={() => setShowNewPassword(!showNewPassword)}
                                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                            >
                                {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="confirmNewPassword" className="text-foreground font-medium">Confirm New Password</Label>
                        <div className="relative">
                            <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                            <Input
                                id="confirmNewPassword"
                                name="confirmNewPassword"
                                type={showConfirmNewPassword ? "text" : "password"}
                                placeholder="Confirm your new password"
                                value={confirmNewPassword}
                                onChange={(e) => setConfirmNewPassword(e.target.value)}
                                className="pl-10 pr-10 h-12 bg-background/50 border-border/50 focus:border-primary transition-colors"
                                required
                            />
                            <button
                                type="button"
                                onClick={() => setShowConfirmNewPassword(!showConfirmNewPassword)}
                                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                            >
                                {showConfirmNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                        </div>
                    </div>

                    <Button
                        type="submit"
                        className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] shadow-lg"
                        disabled={isLoading}
                    >
                        {isLoading ? (
                            <div className="flex items-center space-x-2">
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                                <span>Resetting Password...</span>
                            </div>
                        ) : (
                            <>
                                <Lock className="w-4 h-4 mr-2" />
                                Reset Password
                                <ArrowRight className="w-4 h-4 ml-2" />
                            </>
                        )}
                    </Button>
                </form>
            );
        } else if (showForgotPassword) {
            return (
                <form onSubmit={(e) => { e.preventDefault(); handleForgotPasswordRequest(); }} className="space-y-6">
                    <h3 className="text-xl font-bold text-foreground text-center">Forgot Your Password?</h3>
                    <p className="text-sm text-muted-foreground text-center">
                        Enter your email address below and we'll send you a link to reset your password.
                    </p>
                    <div className="space-y-2">
                        <Label htmlFor="forgotPasswordEmail" className="text-foreground font-medium">Email</Label>
                        <div className="relative">
                            <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                            <Input
                                id="forgotPasswordEmail"
                                name="forgotPasswordEmail"
                                type="email"
                                placeholder="Enter your email"
                                value={forgotPasswordEmail}
                                onChange={(e) => setForgotPasswordEmail(e.target.value)}
                                className="pl-10 h-12 bg-background/50 border-border/50 focus:border-primary transition-colors"
                                required
                            />
                        </div>
                    </div>

                    <Button
                        type="submit"
                        className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] shadow-lg"
                        disabled={isLoading}
                    >
                        {isLoading ? (
                            <div className="flex items-center space-x-2">
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                                <span>Sending Link...</span>
                            </div>
                        ) : (
                            <>
                                <Mail className="w-4 h-4 mr-2" />
                                Send Reset Link
                                <ArrowRight className="w-4 h-4 ml-2" />
                            </>
                        )}
                    </Button>
                    <div className="text-center pt-4 border-t border-border/50">
                        <button
                            type="button"
                            onClick={() => setShowForgotPassword(false)}
                            className="text-primary hover:text-primary/80 font-medium transition-colors"
                        >
                            Back to Login
                        </button>
                    </div>
                </form>
            );
        } else if (isLogin) {
            return (
                // Login Form
                <form onSubmit={(e) => { e.preventDefault(); handleLogin(); }} className="space-y-6">
                    <div className="space-y-2">
                        <Label htmlFor="loginEmail" className="text-foreground font-medium">Email</Label>
                        <div className="relative">
                            <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                            <Input
                                id="loginEmail"
                                name="loginEmail"
                                type="email"
                                placeholder="Enter your email"
                                value={loginEmail}
                                onChange={(e) => setLoginEmail(e.target.value)}
                                className="pl-10 h-12 bg-background/50 border-border/50 focus:border-primary transition-colors"
                                required
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="loginPassword" className="text-foreground font-medium">Password</Label>
                        <div className="relative">
                            <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                            <Input
                                id="loginPassword"
                                name="loginPassword"
                                type={showLoginPassword ? "text" : "password"}
                                placeholder="Enter your password"
                                value={loginPassword}
                                onChange={(e) => setLoginPassword(e.target.value)}
                                className="pl-10 pr-10 h-12 bg-background/50 border-border/50 focus:border-primary transition-colors"
                                required
                            />
                            <button
                                type="button"
                                onClick={() => setShowLoginPassword(!showLoginPassword)}
                                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                            >
                                {showLoginPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                        </div>
                        <button
                            type="button"
                            onClick={() => setShowForgotPassword(true)}
                            className="text-sm text-primary hover:text-primary/80 font-medium transition-colors float-right"
                        >
                            Forgot Password?
                        </button>
                    </div>

                    {/* Sign in button - GREEN */}
                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full h-12 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] shadow-lg"
                    >
                        {isLoading ? (
                            <div className="flex items-center justify-center space-x-2">
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                                <span>Logging in...</span>
                            </div>
                        ) : (
                            <div className="flex items-center justify-center">
                                <Zap className="w-4 h-4 mr-2" />
                                Login & Start Learning
                                <ArrowRight className="w-4 h-4 ml-2" />
                            </div>
                        )}
                    </button>

                    {/* Guest Login - BLUE */}
                    <button
                        type="button"
                        onClick={handleGuestLogin}
                        disabled={isLoading}
                        className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] shadow-lg"
                    >
                        {isLoading ? (
                            <div className="flex items-center justify-center space-x-2">
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                                <span>Logging in as Guest...</span>
                            </div>
                        ) : (
                            <div className="flex items-center justify-center">
                                <User className="w-4 h-4 mr-2" />
                                Login as Guest
                                <ArrowRight className="w-4 h-4 ml-2" />
                            </div>
                        )}
                    </button>

                </form>
            );
        } else {
            return (
                // Sign Up Form
                <form onSubmit={(e) => { e.preventDefault(); handleSignup(); }} className="space-y-6">
                    <div className="space-y-2">
                        <Label htmlFor="signupAlias" className="text-foreground font-medium">Alias</Label> {/* Changed to Alias */}
                        <div className="relative">
                            <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                            <Input
                                id="signupAlias"
                                name="signupAlias"
                                type="text"
                                placeholder="Choose a display name"
                                value={signupAlias}
                                onChange={(e) => setSignupAlias(e.target.value)}
                                className="pl-10 h-12 bg-background/50 border-border/50 focus:border-primary transition-colors"
                                required
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="signupEmail" className="text-foreground font-medium">Email</Label>
                        <div className="relative">
                            <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                            <Input
                                id="signupEmail"
                                name="signupEmail"
                                type="email"
                                placeholder="Enter your email"
                                value={signupEmail}
                                onChange={(e) => setSignupEmail(e.target.value)}
                                className="pl-10 h-12 bg-background/50 border-border/50 focus:border-primary transition-colors"
                                required
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="signupAge" className="text-foreground font-medium">Age</Label> {/* Changed from Date of Birth to Age */}
                        <div className="relative">
                            <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                            <Input
                                id="signupAge"
                                name="signupAge"
                                type="number" // Changed type to number
                                placeholder="Enter your age"
                                value={signupAge}
                                onChange={(e) => setSignupAge(e.target.value)}
                                className="pl-10 h-12 bg-background/50 border-border/50 focus:border-primary transition-colors"
                                min="1" // Minimum age
                                max="120" // Reasonable maximum age
                                required
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="signupPassword" className="text-foreground font-medium">Password</Label>
                        <div className="relative">
                            <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                            <Input
                                id="signupPassword"
                                name="signupPassword"
                                type={showSignupPassword ? "text" : "password"}
                                placeholder="Create a password"
                                value={signupPassword}
                                onChange={(e) => setSignupPassword(e.target.value)}
                                className="pl-10 pr-10 h-12 bg-background/50 border-border/50 focus:border-primary transition-colors"
                                required
                            />
                            <button
                                type="button"
                                onClick={() => setShowSignupPassword(!showSignupPassword)}
                                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                            >
                                {showSignupPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Password must be at least 6 characters long
                        </p>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="signupConfirmPassword" className="text-foreground font-medium">Confirm Password</Label>
                        <div className="relative">
                            <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                            <Input
                                id="signupConfirmPassword"
                                name="signupConfirmPassword"
                                type={showSignupConfirmPassword ? "text" : "password"} // Corrected state name here
                                placeholder="Confirm your password"
                                value={signupConfirmPassword}
                                onChange={(e) => setSignupConfirmPassword(e.target.value)}
                                className="pl-10 pr-10 h-12 bg-background/50 border-border/50 focus:border-primary transition-colors"
                                required
                            />
                            <button
                                type="button"
                                onClick={() => setShowSignupConfirmPassword(!showSignupConfirmPassword)} // Corrected state name here
                                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                            >
                                {showSignupConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                        </div>
                    </div>
                    <Button
                        type="submit"
                        className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] shadow-lg"
                        disabled={isLoading}
                    >
                        {isLoading ? (
                            <div className="flex items-center space-x-2">
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                                <span>Creating account...</span>
                            </div>
                        ) : (
                            <>
                                <Brain className="w-4 h-4 mr-2" />
                                Create Account & Start
                                <ArrowRight className="w-4 h-4 ml-2" />
                            </>
                        )}
                    </Button>

                    {/* NEW: Login as Guest Divider */}
                    <div className="flex items-center space-x-2 my-4">
                        <hr className="flex-grow border-t border-border/50" />
                        <span className="text-muted-foreground text-sm">OR</span>
                        <hr className="flex-grow border-t border-border/50" />
                    </div>

                    {/* NEW: Login as Guest Button */}

                </form>
            );
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-background to-quiz-background">
            {/* Hero Background */}
            <div className="absolute inset-0 overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-accent/5 to-secondary/5" />
                <div className="absolute top-20 left-10 w-72 h-72 bg-primary/10 rounded-full blur-3xl animate-float" />
                <div className="absolute bottom-20 right-10 w-96 h-96 bg-accent/10 rounded-full blur-3xl animate-float" style={{ animationDelay: '2s' }} />
            </div>

            <div className="relative container mx-auto px-4 py-12">
                <div className="max-w-md mx-auto space-y-8">
                    {/* Header */}
                    <div className="text-center space-y-6">
                        <div className="flex items-center justify-center space-x-2">
                            {/* Replaced the image import with a placeholder URL */}
                            <img
                                src={logo}
                                alt="Quizicle Logo"
                                className="h-8 w-auto object-contain"
                            />
                        </div>

                        <div className="space-y-2">
                            <Badge className="bg-primary/20 text-primary border border-primary/30 px-4 py-2">
                                🧠 Challenge Your Mind
                            </Badge>
                            <h2 className="text-2xl font-bold text-foreground">
                                {showResetPassword ? "Reset Your Password" : (isLogin ? "Welcome Back!" : "Join the Challenge")}
                            </h2>
                            <p className="text-muted-foreground">
                                {showResetPassword ? "Set a new password for your account" : (isLogin ? "Sign in to continue your learning journey" : "Create your account and start mastering quizzes")}
                            </p>
                        </div>
                    </div>

                    {/* Auth Form */}
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