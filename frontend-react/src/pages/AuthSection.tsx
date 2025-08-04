import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Eye, EyeOff, Mail, Lock, User, Calendar, ArrowRight, Brain, Zap } from "lucide-react";
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

    const [isLogin, setIsLogin] = useState(true);
    const [isLoading, setIsLoading] = useState(false);

    // Login form states
    const [loginEmail, setLoginEmail] = useState("");
    const [loginPassword, setLoginPassword] = useState("");
    const [showLoginPassword, setShowLoginPassword] = useState(false);

    // Signup form states
    const [signupAlias, setSignupAlias] = useState("");
    const [signupEmail, setSignupEmail] = useState("");
    const [signupPassword, setSignupPassword] = useState("");
    const [signupConfirmPassword, setSignupConfirmPassword] = useState("");
    const [signupAge, setSignupAge] = useState("");
    const [showSignupPassword, setShowSignupPassword] = useState(false);
    const [showSignupConfirmPassword, setShowSignupConfirmPassword] = useState(false);

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
                localStorage.setItem("token", data.token);
                localStorage.setItem("user", JSON.stringify(data.user));
                toast({
                    title: "Login successful!",
                    description: "Welcome back to Quizicle!",
                });
                navigate("/");
            } else {
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

        if (signupPassword.length < 6) {
            toast({
                title: "Weak password",
                description: "Password must be at least 6 characters long.",
                variant: "destructive",
            });
            return;
        }

        setIsLoading(true);
        try {
            const response = await fetch(`${BASE_URL}/api/users/register`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    alias: signupAlias,
                    email: signupEmail,
                    password: signupPassword,
                    age: signupAge,
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

    const calculateAge = (dateOfBirth) => {
        if (!dateOfBirth) return null;
        const today = new Date();
        const birthDate = new Date(dateOfBirth);
        let age = today.getFullYear() - birthDate.getFullYear();
        const monthDiff = today.getMonth() - birthDate.getMonth();
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
            age--;
        }
        return age;
    };

    const displayedAge = calculateAge(signupAge);

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
                        {/* Replaced the Brain icon with the imported logo */}
                        <div className="flex items-center justify-center space-x-2">
                            <img src={logo} alt="Quizicle Logo"   className="h-8 w-auto object-contain" />
                        </div>

                        <div className="space-y-2">
                            <Badge className="bg-primary/20 text-primary border border-primary/30 px-4 py-2">
                                🧠 Challenge Your Mind
                            </Badge>
                            <h2 className="text-2xl font-bold text-foreground">
                                {isLogin ? "Welcome Back!" : "Join the Challenge"}
                            </h2>
                            <p className="text-muted-foreground">
                                {isLogin ? "Sign in to continue your learning journey" : "Create your account and start mastering quizzes"}
                            </p>
                        </div>
                    </div>

                    {/* Auth Form */}
                    <Card className="bg-card/60 backdrop-blur-sm border-border/50 shadow-xl">
                        <div className="p-8 space-y-6">
                            {isLogin ? (
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
                                    </div>

                                    <Button
                                        type="submit"
                                        className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] shadow-lg"
                                        disabled={isLoading}
                                    >
                                        {isLoading ? (
                                            <div className="flex items-center space-x-2">
                                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                                                <span>Logging in...</span>
                                            </div>
                                        ) : (
                                            <>
                                                <Zap className="w-4 h-4 mr-2" />
                                                Login & Start Learning
                                                <ArrowRight className="w-4 h-4 ml-2" />
                                            </>
                                        )}
                                    </Button>
                                </form>
                            ) : (
                                // Sign Up Form
                                <form onSubmit={(e) => { e.preventDefault(); handleSignup(); }} className="space-y-6">
                                    <div className="space-y-2">
                                        <Label htmlFor="signupAlias" className="text-foreground font-medium">Full Name</Label>
                                        <div className="relative">
                                            <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                                            <Input
                                                id="signupAlias"
                                                name="signupAlias"
                                                type="text"
                                                placeholder="Enter your full name"
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
                                        <Label htmlFor="signupAge" className="text-foreground font-medium">Date of Birth</Label>
                                        <div className="relative">
                                            <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                                            <Input
                                                id="signupAge"
                                                name="signupAge"
                                                type="date"
                                                value={signupAge}
                                                onChange={(e) => setSignupAge(e.target.value)}
                                                className="pl-10 h-12 bg-background/50 border-border/50 focus:border-primary transition-colors"
                                                required
                                            />
                                        </div>
                                        {displayedAge && (
                                            <p className="text-sm text-primary font-medium">Age: {displayedAge} years old</p>
                                        )}
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
                                                type={showSignupConfirmPassword ? "text" : "password"}
                                                placeholder="Confirm your password"
                                                value={signupConfirmPassword}
                                                onChange={(e) => setSignupConfirmPassword(e.target.value)}
                                                className="pl-10 pr-10 h-12 bg-background/50 border-border/50 focus:border-primary transition-colors"
                                                required
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowSignupConfirmPassword(!showSignupConfirmPassword)}
                                                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                                            >
                                                {showSignupConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                            </button>
                                        </div>
                                    </div>

                                    <div className="flex items-start space-x-3">
                                        <input
                                            type="checkbox"
                                            className="rounded border-border/50 mt-1 text-primary focus:ring-primary"
                                            required
                                        />
                                        <span className="text-sm text-muted-foreground">
                                            I agree to the{" "}
                                            <Link to="/terms" className="text-primary hover:text-primary/80 font-medium transition-colors">
                                                Terms of Service
                                            </Link>{" "}
                                            and{" "}
                                            <Link to="/privacy" className="text-primary hover:text-primary/80 font-medium transition-colors">
                                                Privacy Policy
                                            </Link>
                                        </span>
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
                                </form>
                            )}

                            {/* Switch Form */}
                            <div className="text-center pt-4 border-t border-border/50">
                                <p className="text-muted-foreground">
                                    {isLogin ? "Don't have an account? " : "Already have an account? "}
                                    <button
                                        onClick={() => setIsLogin(!isLogin)}
                                        className="text-primary hover:text-primary/80 font-medium transition-colors"
                                    >
                                        {isLogin ? "Sign up here" : "Sign in here"}
                                    </button>
                                </p>
                            </div>

                            {/* Guest Mode */}
                            <div className="pt-4 border-t border-border/50">
                                <Link to="/guest">
                                    <Button
                                        variant="outline"
                                        className="w-full h-12 border-border/50 hover:bg-card/50 transition-all duration-300 hover:scale-[1.02]"
                                    >
                                        Continue as Guest
                                    </Button>
                                </Link>
                                <p className="text-xs text-muted-foreground text-center mt-2">
                                    Limited features available in guest mode
                                </p>
                            </div>
                        </div>
                    </Card>

                    {/* Features */}
                    <div className="grid grid-cols-3 gap-3">
                        <Card className="p-3 text-center bg-card/30 border-border/30">
                            <Brain className="w-6 h-6 mx-auto mb-2 text-primary" />
                            <p className="text-xs text-muted-foreground">Smart Quizzes</p>
                        </Card>
                        <Card className="p-3 text-center bg-card/30 border-border/30">
                            <Zap className="w-6 h-6 mx-auto mb-2 text-accent" />
                            <p className="text-xs text-muted-foreground">Instant Results</p>
                        </Card>
                        <Card className="p-3 text-center bg-card/30 border-border/30">
                            <ArrowRight className="w-6 h-6 mx-auto mb-2 text-secondary" />
                            <p className="text-xs text-muted-foreground">Progress Tracking</p>
                        </Card>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AuthSection;