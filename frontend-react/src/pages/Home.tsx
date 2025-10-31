// Home.tsx

"use client";

import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { CategoryCard } from "@/components/quiz/CategoryCard";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import ReactGA from "react-ga4";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Brain,
  Plus,
  AlertTriangle,
  Zap, // Added back for completeness if needed elsewhere
  TrendingUp, // Added back for completeness if needed elsewhere
  Award, // Added back for completeness if needed elsewhere
  Clock, // Added back for completeness if needed elsewhere
} from "lucide-react";
import logo from "../assets/images/QuizicleLogo.png";
import SplashScreen from "../components/SplashScreen";
import GameStatsHeader from "../components/GameStatsHeader";
import AddCategory from "@/components/AddCategory";
import { useToast } from "@/hooks/use-toast";

const avatarImages = import.meta.glob("../assets/images/avatars/*.png", {
  eager: true,
  import: "default",
});
const avatars: string[] = Object.values(avatarImages) as string[];

const BASE_URL = "https://quiz-app-node-606998948537.europe-west4.run.app";

interface Category {
  _id: string;
  name: string;
  description?: string;
  createdBy?: string;
  completionCount?: number;
  completionsCount?: number;
  questionCount?: number;
  averageRating?: number;
  difficulty?: "Easy" | "Medium" | "Hard";
  imageUrl?: string;
  createdAt?: string;
  timeEstimate?: string;
}

interface CategoryToPlayResponse {
  message: string;
  categoryId: string;
  name: string;
  averageRating: number;
  questionsCount: number;
}

// CRITICAL: Ensure playerType is now userType across the interface
interface UserDetails {
  _id: string;
  alias: string;
  level: number;
  avatar: number;
  userType?: "Guest" | "Registered" | "Admin"; // Changed from playerType
}

export default function Home() {
  const [userCategories, setUserCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [playButtonLoading, setPlayButtonLoading] = useState(false);
  const [categoriesLoading, setCategoriesLoading] = useState(false);
  const [showSplash, setShowSplash] = useState(false);
  const [dataLoaded, setDataLoaded] = useState(false);
  // Use UserDetails type
  const [userProfile, setUserProfile] = useState<UserDetails | null>(null);
  const [userAvatar, setUserAvatar] = useState<string | null>(null);
  const [userLevel, setUserLevel] = useState(1);
  const [isSmallScreen, setIsSmallScreen] = useState(false);

  // State for AddCategory logic is now ONLY based on isGuest
  // Removed showAddCategory state as the logic is now handled by the AddCategory component itself.

  const [isGuest, setIsGuest] = useState(false);

  const navigate = useNavigate();
  const userToken = typeof window !== "undefined" ? localStorage.getItem("token") || "" : "";
  const { toast, dismiss } = useToast();

  // Initial load effect
  useEffect(() => {
    const initializeApp = async () => {
      const hasShownSplash = typeof window !== 'undefined' ? sessionStorage.getItem("splashShown") : null;
      const shouldShowSplash = !hasShownSplash;

      if (shouldShowSplash) {
        setShowSplash(true);
        if (typeof window !== 'undefined') {
          sessionStorage.setItem("splashShown", "true");
        }
      }

      const startTime = Date.now();
      const minSplashDuration = shouldShowSplash ? 2500 : 0;

      try {
        await loadUserProfile();
        setDataLoaded(true);

        if (shouldShowSplash) {
          const elapsedTime = Date.now() - startTime;
          const remainingTime = Math.max(0, minSplashDuration - elapsedTime);

          setTimeout(() => {
            setShowSplash(false);
            setLoading(false);
          }, remainingTime);
        } else {
          setLoading(false);
        }

        ReactGA.event({
          category: "engagement",
          action: "home_shown",
          label: isGuest ? "Guest" : "Registered",
          value: isSmallScreen ? 1 : 0, // e.g. 1 = mobile, 0 = desktop
        });

      } catch (err) {
        console.error("Init error:", err);
        setLoading(false);
      }
    };

    initializeApp();
    const checkScreenSize = () => setIsSmallScreen(window.innerWidth < 768);
    checkScreenSize();
    window.addEventListener("resize", checkScreenSize);
    return () => window.removeEventListener("resize", checkScreenSize);
  }, []);

  useEffect(() => {
    // Only fetch categories if userProfile is loaded AND we have a token (to prevent fetching for the generic 'Guest' in a token-less state)
    if (userProfile && userToken) {
      fetchUserCategories();
    }
  }, [userProfile, userToken]);

  // ----------------------------------------------------------------
  // REVISED loadUserProfile for 'userType'
  // ----------------------------------------------------------------
  const loadUserProfile = async () => {
    if (!userToken) {
      // Fallback to local storage for a token-less user (likely Guest)
      const storedUser = typeof window !== 'undefined' ? localStorage.getItem("user") : null;
      if (storedUser) {
        try {
          const parsedUser = JSON.parse(storedUser);
          setUserProfile(parsedUser);
          if (parsedUser.level) setUserLevel(parsedUser.level);
          // Check guest status from local storage fallback (using userType)
          setIsGuest(parsedUser.userType === 'Guest');
        } catch (e) {
          console.error("Failed to parse local user data:", e);
        }
      } else {
        // If no token AND no local user, redirect to auth
        navigate("/auth");
      }
      return;
    }

    try {
      const response = await fetch(`${BASE_URL}/api/getUserDetails`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${userToken}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        // Fallback to local storage on API failure
        console.warn(`Failed to fetch user details. Falling back to local storage.`);
        const storedUser = typeof window !== 'undefined' ? localStorage.getItem("user") : null;
        if (storedUser) {
          const parsedUser = JSON.parse(storedUser);
          setUserProfile(parsedUser);
          if (parsedUser.level) setUserLevel(parsedUser.level);
          // Check guest status from local storage fallback (using userType)
          setIsGuest(parsedUser.userType === 'Guest');
        }
        return;
      }

      const apiUser: UserDetails = await response.json();

      // 1. Update State with fresh API data
      setUserProfile(apiUser);
      setUserLevel(apiUser.level || 1);

      // Update Guest status (using userType)
      setIsGuest(apiUser.userType === 'Guest');

      // 2. Update Avatar
      const avatarIndex = apiUser.avatar ? apiUser.avatar - 1 : 0;
      const calculatedAvatar = avatars[avatarIndex] || null;
      setUserAvatar(calculatedAvatar);

      // 3. Update local storage with fresh data, using userType
      if (typeof window !== 'undefined') {
        const userToStore = {
          ...apiUser,
          level: apiUser.level || 1,
          userType: apiUser.userType || 'Registered' // Ensure userType is stored
        };
        localStorage.setItem("user", JSON.stringify(userToStore));
        if (calculatedAvatar) {
          localStorage.setItem("userAvatar", calculatedAvatar);
        }
      }

    } catch (error) {

      ReactGA.event({
        category: "API Error",
        action: "fetch_failed",
        label: "getUserDetails",
      });

      console.error("Error fetching user details from API:", error);
      // Even on fetch error, try to load from local storage
      const storedUser = typeof window !== 'undefined' ? localStorage.getItem("user") : null;
      if (storedUser) {
        try {
          const parsedUser = JSON.parse(storedUser);
          setUserProfile(parsedUser);
          if (parsedUser.level) setUserLevel(parsedUser.level);
          // Check guest status from local storage fallback (using userType)
          setIsGuest(parsedUser.userType === 'Guest');
        } catch (e) {
          console.error("Failed to parse local user data on API error:", e);
        }
      }
    }
  };


  const fetchUserCategories = async () => {
    setCategoriesLoading(true);
    setError(null);
    try {
      const res = await fetch(`${BASE_URL}/api/getUserCategories`, {
        method: "GET",
        headers: { Authorization: `Bearer ${userToken}` },
      });
      if (!res.ok) throw new Error(`Failed: ${res.status}`);
      const data = await res.json();
      const transformed: Category[] = data.map((c: any, i: number) => ({
        _id: c._id,
        name: c.name,
        description: c.description || `Test your knowledge in ${c.name}`,
        createdBy: c.createdBy || userProfile?.alias || "QuizMaster",
        completionCount: c.completionCount || 0,
        completionsCount: c.completionsCount || 0,
        questionCount: c.questionCount || 10,
        averageRating: c.averageRating ?? (3 + Math.random() * 2),
        difficulty: c.difficulty || ["Easy", "Medium", "Hard"][i % 3],
        imageUrl: c.imageUrl || c.image,
        timeEstimate: `${Math.ceil((c.questionCount || 10) * 0.6)} min`,
      }));
      setUserCategories(transformed);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setCategoriesLoading(false);
    }
  };


  const handlePlayQuiz = (categoryId: string) => {
    if (!userToken) {
      console.log("⚠️ You must be logged in to play.");
      return;
    }
    navigate(`/quiz/${categoryId}`);
  };

  const handleQuickQuiz = async () => {
    if (!userToken) {
      console.log("⚠️ You must be logged in to play.");
      return;
    }

    setPlayButtonLoading(true);

    try {
      const response = await fetch(`${BASE_URL}/api/getGetegoryToPlay`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${userToken}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to get category to play: ${response.status}`);
      }

      const data: CategoryToPlayResponse = await response.json();

      if (data.categoryId) {
        navigate(`/quiz/${data.categoryId}`);
      } else {
        throw new Error("No category ID returned from server");
      }
    } catch (error: any) {
      console.error("Error getting category to play:", error);
      if (userCategories.length > 0) {
        navigate(`/quiz/${userCategories[0]._id}`);
      } else {
        console.log("❌ Unable to start quiz. Please try again later.");
      }
    } finally {
      setPlayButtonLoading(false);
    }
  };


  // UNIFIED HANDLER: Handles all category creation attempts (both buttons)
  // CRITICAL FIX: Only handles the GUEST requirement, as the AddCategory component handles the modal open.
  const handleCreateCategoryAttempt = () => {
    if (isGuest) {
      // Show the registration toast for Guest users
      const { id: toastId } = toast({
        title: "🔒 Registration Required",
        description: "You must complete your registration to create a quiz.",
        variant: "destructive",
        action: (
          <div className="flex space-x-2">
            <Button
              variant="default"
              size="sm"
              onClick={() => {
                navigate("/profile"); // Navigate to profile screen
                dismiss(toastId);
              }}
              className="bg-primary hover:bg-primary/80"
            >
              Register
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => dismiss(toastId)}
            >
              Cancel
            </Button>
          </div>
        ),
      });
    }
    // No else block needed; the AddCategory component handles the non-guest flow 
    // by opening its internal modal via handleMainButtonClick.
  };

  // REMOVE: handleCategoryCreated is no longer needed since showAddCategory state was removed.

  // Conditionally render the splash screen only on initial load
  if (showSplash) {
    return <SplashScreen dataLoaded={dataLoaded} />;
  }

  const alias = userProfile?.alias || "Guest";
  const avatarImage = userAvatar || undefined;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-quiz-background">
      {!isSmallScreen && <Header logoAsTitle imageSrc={logo} showNotifications />}

      <div className="mx-auto max-w-full space-y-4 px-4 pb-4 lg:px-8 lg:pb-8">
        <GameStatsHeader userToken={userToken} isParentLoading={loading} />

        {/* Guest User Registration Panel */}
        {isGuest && (
          <Card className="bg-purple-100 border-purple-400 text-purple-900 p-4 shadow-md flex items-start space-x-3">
            <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <div className="flex-grow">
              <h4 className="font-semibold leading-snug">Don't lose your progress!</h4>
              <p className="text-sm">
                Complete your registration to secure your account and save all your quiz progress.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate("/profile")}
              className="bg-purple-500 hover:bg-purple-600 text-white border-purple-500 hover:border-purple-600 flex-shrink-0"
            >
              Register Now
            </Button>
          </Card>
        )}

        {/* User Avatar Section */}
        <div className="flex flex-col items-center space-y-2 py-3">
          <div className="relative">
            <Link to="/profile" className="no-underline">
              <Avatar className="w-20 h-20">
                <AvatarImage src={avatarImage} alt={alias} />
                <AvatarFallback className="bg-gradient-to-br from-primary/20 to-accent/20 border-4 border-primary/20 text-2xl font-bold text-primary">
                  {alias.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            </Link>
            <div className="absolute bottom-0 right-0 w-5 h-5 bg-success rounded-full border-2 border-background"></div>
          </div>
          <h2 className="text-lg font-bold">{alias}</h2>
        </div>

        {/* Play Button */}
        <div className="pb-3 relative">
          <Button
            onClick={handleQuickQuiz}
            disabled={loading || playButtonLoading}
            className="w-full h-16 bg-purple-500 hover:bg-purple-600 text-white font-bold rounded-2xl disabled:opacity-50 flex items-center justify-between px-6 relative overflow-hidden shadow-lg"
          >
            {playButtonLoading ? (
              <div className="flex items-center text-xl justify-center w-full">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div>
                Starting Quiz...
              </div>
            ) : (
              <>
                <span className="text-3xl font-bold">Play</span>
                <div className="relative">
                  <div className="bg-white rounded-full w-14 h-14 flex flex-col items-center justify-center shadow-md">
                    <span className="text-purple-500 text-xl font-bold leading-none">{userLevel}</span>
                    <span className="text-purple-500 text-xs font-medium uppercase leading-none">Level</span>
                  </div>
                </div>
              </>
            )}
          </Button>
        </div>

        {/* My Categories */}
        <div className="mt-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-bold flex items-center">
              <Brain className="w-5 h-5 mr-2" />
              Your Quizzes
            </h3>
            <Button
              onClick={() => navigate("/categories")}
              variant="outline"
              size="sm"
              className="text-xs"
            >
              View All Quizzes
            </Button>
          </div>

          {error ? (
            <Card className="p-8 text-center">
              <div className="space-y-3">
                <p className="text-red-500">Error: {error}</p>
                <Button onClick={fetchUserCategories} variant="outline" size="sm">
                  Try Again
                </Button>
              </div>
            </Card>
          ) : categoriesLoading ? (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <Card key={i} className="p-4 animate-pulse">
                  <div className="h-32 bg-muted/20 rounded mb-4" />
                  <div className="space-y-2">
                    <div className="h-4 bg-muted/20 rounded w-3/4" />
                    <div className="h-3 bg-muted/20 rounded w-1/2" />
                    <div className="h-3 bg-muted/20 rounded w-1/2" />
                  </div>
                </Card>
              ))}
            </div>
          ) : userCategories.length === 0 ? (
            // Show 'No quizzes yet' card. The creation button is now on the AddCategory component rendered below.
            <Card className="p-8 text-center">
              <div className="space-y-3">
                <Brain className="h-12 w-12 mx-auto text-muted-foreground" />
                <h4 className="font-semibold text-foreground">No quizzes yet</h4>
                <p className="text-sm text-muted-foreground">
                  Create your first quiz to get started
                </p>
                {/* The create button is removed from here and is now always in the AddCategory card below */}
              </div>
            </Card>
          ) : (
            // Show categories list
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {userCategories.map((cat) => (
                  <CategoryCard
                    key={cat._id}
                    id={cat._id}
                    title={cat.name}
                    description={cat.description}
                    difficulty={cat.difficulty || "Medium"}
                    questionCount={cat.questionCount || 10}
                    completions={cat.completionCount || cat.completionsCount || 0}
                    rating={cat.averageRating || 0}
                    timeEstimate={cat.timeEstimate || "5 min"}
                    imageUrl={cat.imageUrl || `coming soon`}
                    createdBy={cat.createdBy || alias}
                    onPlay={handlePlayQuiz}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Add Category Section - Always show after quizzes or the empty state card */}
          <div className="mt-6">
            <AddCategory
              fetchCategories={fetchUserCategories}
              isGuest={isGuest}
              onRegistrationRequired={handleCreateCategoryAttempt}
            />
          </div>
        </div>
      </div>
    </div>
  );
}