import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Eye, EyeOff, Mail, Lock, User, Calendar, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast"; // Assuming this hook is available

const AuthSection = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [isLogin, setIsLogin] = useState(true); // Start with login form visible
  const [isLoading, setIsLoading] = useState(false);

  // Login form states
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [showLoginPassword, setShowLoginPassword] = useState(false);

  // Signup form states
  const [signupAlias, setSignupAlias] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [signupConfirmPassword, setSignupConfirmPassword] = useState(""); // Added for consistency with Register design
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
      const response = await fetch("https://quiz-app-node-606998948537.europe-west4.run.app/api/users/login", {
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
          description: "Welcome back to QuizMaster!",
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
      const response = await fetch("https://quiz-app-node-606998948537.europe-west4.run.app/api/users/register", {
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
        description: "Welcome to QuizMaster! Please log in.",
      });
      setIsLogin(true); // Switch to login form after successful registration
      setLoginEmail(signupEmail); // Pre-fill email for convenience
      setLoginPassword(""); // Clear password field
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

  const displayedAge = calculateAge(signupAge); // Use signupAge for age calculation

  return (
    <div className="min-h-screen bg-gradient-bg">
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-md mx-auto">
          <div className="quiz-card">
            <div className="text-center space-y-4 mb-8">
              <div className="w-16 h-16 bg-gradient-primary rounded-2xl flex items-center justify-center mx-auto">
                <div className="text-2xl font-bold text-primary-foreground">Q</div>
              </div>
              <div>
                <h1 className="text-3xl font-bold gradient-text">
                  {isLogin ? "Welcome Back!" : "Join QuizMaster"}
                </h1>
                <p className="text-muted-foreground mt-2">
                  {isLogin ? "Sign in to your account" : "Create your account and start learning"}
                </p>
              </div>
            </div>

            {isLogin ? (
              // Login Form
              <form onSubmit={(e) => { e.preventDefault(); handleLogin(); }} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="loginEmail" className="text-foreground">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                    <Input
                      id="loginEmail"
                      name="loginEmail"
                      type="email"
                      placeholder="Enter your email"
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      className="pl-10 input-modern"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="loginPassword" className="text-foreground">Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                    <Input
                      id="loginPassword"
                      name="loginPassword"
                      type={showLoginPassword ? "text" : "password"}
                      placeholder="Enter your password"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      className="pl-10 pr-10 input-modern"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowLoginPassword(!showLoginPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showLoginPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full btn-primary"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    "Logging in..."
                  ) : (
                    <>
                      Login
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </>
                  )}
                </Button>
              </form>
            ) : (
              // Sign Up Form
              <form onSubmit={(e) => { e.preventDefault(); handleSignup(); }} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="signupAlias" className="text-foreground">Full Name</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                    <Input
                      id="signupAlias"
                      name="signupAlias"
                      type="text"
                      placeholder="Enter your full name"
                      value={signupAlias}
                      onChange={(e) => setSignupAlias(e.target.value)}
                      className="pl-10 input-modern"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="signupEmail" className="text-foreground">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                    <Input
                      id="signupEmail"
                      name="signupEmail"
                      type="email"
                      placeholder="Enter your email"
                      value={signupEmail}
                      onChange={(e) => setSignupEmail(e.target.value)}
                      className="pl-10 input-modern"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="signupAge" className="text-foreground">Date of Birth</Label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                    <Input
                      id="signupAge"
                      name="signupAge"
                      type="date"
                      value={signupAge}
                      onChange={(e) => setSignupAge(e.target.value)}
                      className="pl-10 input-modern"
                      required
                    />
                  </div>
                  {displayedAge && (
                    <p className="text-sm text-muted-foreground">Age: {displayedAge} years old</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="signupPassword" className="text-foreground">Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                    <Input
                      id="signupPassword"
                      name="signupPassword"
                      type={showSignupPassword ? "text" : "password"}
                      placeholder="Create a password"
                      value={signupPassword}
                      onChange={(e) => setSignupPassword(e.target.value)}
                      className="pl-10 pr-10 input-modern"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowSignupPassword(!showSignupPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showSignupPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Password must be at least 6 characters long
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="signupConfirmPassword" className="text-foreground">Confirm Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                    <Input
                      id="signupConfirmPassword"
                      name="signupConfirmPassword"
                      type={showSignupConfirmPassword ? "text" : "password"}
                      placeholder="Confirm your password"
                      value={signupConfirmPassword}
                      onChange={(e) => setSignupConfirmPassword(e.target.value)}
                      className="pl-10 pr-10 input-modern"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowSignupConfirmPassword(!showSignupConfirmPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showSignupConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="flex items-start space-x-2">
                  <input type="checkbox" className="rounded border-border mt-1" required />
                  <span className="text-sm text-muted-foreground">
                    I agree to the{" "}
                    <Link to="/terms" className="text-primary hover:text-primary-glow">
                      Terms of Service
                    </Link>{" "}
                    and{" "}
                    <Link to="/privacy" className="text-primary hover:text-primary-glow">
                      Privacy Policy
                    </Link>
                  </span>
                </div>

                <Button
                  type="submit"
                  className="w-full btn-primary"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    "Creating account..."
                  ) : (
                    <>
                      Create Account
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </>
                  )}
                </Button>
              </form>
            )}

            <div className="mt-8 text-center">
              <p className="text-muted-foreground">
                {isLogin ? "Don't have an account? " : "Already have an account? "}
                <span
                  onClick={() => setIsLogin(!isLogin)}
                  className="text-primary hover:text-primary-glow font-medium transition-colors cursor-pointer"
                >
                  {isLogin ? "Sign up here" : "Sign in here"}
                </span>
              </p>
            </div>

            {/* Guest Mode */}
            <div className="mt-6 pt-6 border-t border-border/50">
              <Link to="/guest">
                <Button variant="outline" className="w-full border-border/50 hover:bg-card/50">
                  Continue as Guest
                </Button>
              </Link>
              <p className="text-xs text-muted-foreground text-center mt-2">
                Limited features available in guest mode
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthSection;