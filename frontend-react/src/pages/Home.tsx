// Home.tsx

"use client";

import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { CategoryCard } from "@/components/quiz/CategoryCard";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Zap,
  TrendingUp,
  Award,
  Clock,
  Plus,
  Brain,
  AlertTriangle, // NEW: Import AlertTriangle
} from "lucide-react";
import logo from "../assets/images/QuizicleLogo.png";
// Import the new components
import SplashScreen from "../components/SplashScreen";
import GameStatsHeader from "../components/GameStatsHeader";
import AddCategory from "@/components/AddCategory";
import { useToast } from "@/hooks/use-toast"; // NEW: Import useToast

const avatarImages = import.meta.glob("../assets/images/avatars/*.png", {
  eager: true,
  import: "default",
});
const avatars: string[] = Object.values(avatarImages) as string[];

const BASE_URL = "https://quiz-app-node-606998948537.europe-west4.run.app";

// ... (Category and CategoryToPlayResponse interfaces remain the same) ...
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


// --- New Interface for User Details from API (Updated to include playerType) ---
interface UserDetails {
  _id: string;
  alias: string;
  level: number;
  avatar: number; // Index or ID of the avatar
  playerType?: 'Guest' | 'Normal'; // NEW: Player type field
  // ... other fields you might get from the API
}

export default function Home() {
  const [userCategories, setUserCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [playButtonLoading, setPlayButtonLoading] = useState(false);
  const [categoriesLoading, setCategoriesLoading] = useState(false);

  // Splash screen state - only show on initial app load
  const [showSplash, setShowSplash] = useState(false);
  const [dataLoaded, setDataLoaded] = useState(false);

  const [userProfile, setUserProfile] = useState<UserDetails | any | null>(null); // Updated type hint
  const [userAvatar, setUserAvatar] = useState<string | null>(null);
  const [userLevel, setUserLevel] = useState(1); // Initial state is 1

  // New state to track screen size
  const [isSmallScreen, setIsSmallScreen] = useState(false);

  // State to control AddCategory component visibility
  const [showAddCategory, setShowAddCategory] = useState(false);
  
  // NEW: State for Guest status
  const [isGuest, setIsGuest] = useState(false);

  const navigate = useNavigate();
  const userToken = typeof window !== 'undefined' ? localStorage.getItem("token") || "" : "";
  const { toast, dismiss } = useToast(); // FIX: Initialize toast and include dismiss function

  // ... (useEffect for initialization and screen size remains the same) ...
  useEffect(() => {
    const initializeApp = async () => {
      // Check if this is the first time loading the app in this session
      const hasShownSplash = typeof window !== 'undefined' ? sessionStorage.getItem("splashShown") : null;
      const shouldShowSplash = !hasShownSplash;
      
      if (shouldShowSplash) {
        setShowSplash(true);
        // Mark that we've shown the splash screen for this session
        if (typeof window !== 'undefined') {
          sessionStorage.setItem("splashShown", "true");
        }
      }

      const startTime = Date.now();
      const minSplashDuration = shouldShowSplash ? 2500 : 0; // 2.5 seconds for gaming vibes, 0 if not showing splash

      try {
        // Load all data concurrently
        await Promise.all([
          loadUserProfile(), // This is now async and fetches from API
        ]);

        setDataLoaded(true);

        if (shouldShowSplash) {
          // Calculate remaining time for splash screen
          const elapsedTime = Date.now() - startTime;
          const remainingTime = Math.max(0, minSplashDuration - elapsedTime);

          // Wait for the remaining time before hiding splash
          setTimeout(() => {
            setShowSplash(false);
            setLoading(false);
          }, remainingTime);
        } else {
          // No splash screen, just set loading to false
          setLoading(false);
        }

      } catch (error) {
        console.error("Error during app initialization:", error);
        if (shouldShowSplash) {
          // Even if there's an error, show the app after minimum duration
          setTimeout(() => {
            setShowSplash(false);
            setLoading(false);
          }, minSplashDuration);
        } else {
          setLoading(false);
        }
      }
    };

    initializeApp();

    // Function to check screen size
    const checkScreenSize = () => {
      setIsSmallScreen(window.innerWidth < 768);
    };

    checkScreenSize();
    window.addEventListener("resize", checkScreenSize);

    return () => window.removeEventListener("resize", checkScreenSize);
  }, []);
// ... (useEffect for fetching categories remains the same) ...
  useEffect(() => {
    if (userProfile && userToken) {
      fetchUserCategories();
    }
  }, [userProfile, userToken]);


  // ----------------------------------------------------------------
  // REVISED loadUserProfile to fetch from API and handle guest status
  // ----------------------------------------------------------------
  const loadUserProfile = async () => {
    if (!userToken) {
      // Fallback to local storage if token is missing (e.g., Guest user logic)
      const storedUser = typeof window !== 'undefined' ? localStorage.getItem("user") : null;
      if (storedUser) {
        try {
          const parsedUser = JSON.parse(storedUser);
          setUserProfile(parsedUser);
          if (parsedUser.level) setUserLevel(parsedUser.level);
          // NEW: Check guest status from local storage fallback
          setIsGuest(parsedUser.playerType === 'Guest'); 
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
        // If API fails, try to load from local storage as a fallback
        console.warn(`Failed to fetch user details from API. Status: ${response.status}. Falling back to local storage.`);
        const storedUser = typeof window !== 'undefined' ? localStorage.getItem("user") : null;
        if (storedUser) {
          const parsedUser = JSON.parse(storedUser);
          setUserProfile(parsedUser);
          if (parsedUser.level) setUserLevel(parsedUser.level);
          // NEW: Check guest status from local storage fallback
          setIsGuest(parsedUser.playerType === 'Guest'); 
        }
        return;
      }

      const apiUser: UserDetails = await response.json();

      // 1. Update State with fresh API data
      setUserProfile(apiUser);
      if (apiUser.level !== undefined) {
        setUserLevel(apiUser.level);
      } else {
        // Ensure level is set, defaults to 1 if not present in API response
        setUserLevel(1); 
      }
      
      // NEW: Update Guest status
      setIsGuest(apiUser.playerType === 'Guest');

      // 2. Update Avatar
      const avatarIndex = apiUser.avatar ? apiUser.avatar - 1 : 0;
      const calculatedAvatar = avatars[avatarIndex] || null;
      setUserAvatar(calculatedAvatar);
      
      // 3. OPTIONAL: Update local storage with fresh data, including playerType
      if (typeof window !== 'undefined') {
        const userToStore = { 
            ...apiUser, 
            level: apiUser.level !== undefined ? apiUser.level : 1, 
            playerType: apiUser.playerType || 'Normal' 
        };
        localStorage.setItem("user", JSON.stringify(userToStore));
        if(calculatedAvatar) {
           localStorage.setItem("userAvatar", calculatedAvatar);
        }
      }

    } catch (error) {
      console.error("Error fetching user details from API:", error);
      // Even on fetch error, try to load from local storage
      const storedUser = typeof window !== 'undefined' ? localStorage.getItem("user") : null;
      if (storedUser) {
        try {
          const parsedUser = JSON.parse(storedUser);
          setUserProfile(parsedUser);
          if (parsedUser.level) setUserLevel(parsedUser.level);
          // NEW: Check guest status from local storage fallback
          setIsGuest(parsedUser.playerType === 'Guest'); 
        } catch (e) {
           console.error("Failed to parse local user data on API error:", e);
        }
      }
    }
  };


// ... (rest of the component's functions and render logic remain the same) ...

const fetchUserCategories = async () => {
    setCategoriesLoading(true);
    setError(null);
// ... (implementation of fetchUserCategories remains the same) ...
    try {
      // 1. Change the endpoint to the new dedicated one
      const response = await fetch(`${BASE_URL}/api/getUserCategories`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${userToken}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch user categories. Status: ${response.status}`);
      }

      const data = await response.json();

      // 2. Remove client-side filtering since the new API endpoint handles it
      const categoriesFromApi = Array.isArray(data) ? data : [];

      // Transform API data to match interface
      const transformedCategories: Category[] = categoriesFromApi.map((category: any, index: number) => ({
        _id: category._id,
        name: category.name,
        description: category.description || `Test your knowledge in ${category.name}`,
        createdBy: category.createdBy || "QuizMaster", // This should now always be the user's alias
        completionCount: category.completionsCount || category.completionCount || 0,
        completionsCount: category.completionsCount || category.completionCount || 0,
        questionCount: category.questionCount || 10,
        averageRating: category.averageRating ?? (3 + Math.random() * 2),
        difficulty: category.difficulty || (index % 3 === 0 ? "Easy" : index % 3 === 1 ? "Medium" : "Hard"),
        imageUrl: category.imageUrl || category.image,
        trending: (category.completionsCount || category.completionCount || 0) > 50,
        isNew: index < 2 || (new Date().getTime() - new Date(category.createdAt || 0).getTime()) < (7 * 24 * 60 * 60 * 1000),
        timeEstimate: `${Math.ceil((category.questionCount || 10) * 0.6)} min`
      }));

      setUserCategories(transformedCategories);
    } catch (error: any) {
      setError(error.message);
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
        console.log(`🎮 Starting quiz with category: ${data.name} (${data.categoryId})`);
        navigate(`/quiz/${data.categoryId}`);
      } else {
        throw new Error("No category ID returned from server");
      }
    } catch (error: any) {
      console.error("Error getting category to play:", error);
      // fallback to first user category
      if (userCategories.length > 0) {
        navigate(`/quiz/${userCategories[0]._id}`);
      } else {
        console.log("❌ Unable to start quiz. Please try again later.");
      }
    } finally {
      setPlayButtonLoading(false);
    }
  };
  
  // NEW: Unified handler to check for guest status before allowing category creation
  const handleCreateCategoryAttempt = () => {
    if (isGuest) {
        // Prompt the guest user to register and capture the toast ID from the return value
        const { id: toastId } = toast({
            title: "🔒 Registration Required",
            description: "You must complete your registration to create a quiz and save your progress. Register now?",
            variant: "destructive", // Using destructive for a strong prompt
            action: (
                <div className="flex space-x-2">
                    <Button
                        variant="default"
                        size="sm"
                        onClick={() => {
                            navigate("/profile"); // Navigate to profile screen
                            dismiss(toastId); // FIX: Use the dismiss function with the captured ID
                        }}
                        className="bg-primary hover:bg-primary/80"
                    >
                        Register
                    </Button>
                    <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => dismiss(toastId)} // FIX: Use the dismiss function with the captured ID
                    >
                        Cancel
                    </Button>
                </div>
            ),
        });
    } else {
        // If not a guest, proceed to show the AddCategory component
        setShowAddCategory(true);
    }
  };

  // Original handler now calls the new unified handler
  const handleCreateFirstCategory = () => {
    handleCreateCategoryAttempt();
  };

  const handleCategoryCreated = () => {
    // Refresh categories after creating a new one
    fetchUserCategories();
  };

  // Conditionally render the splash screen only on initial load
  if (showSplash) {
    return <SplashScreen dataLoaded={dataLoaded} />;
  }

  const alias = userProfile?.alias || userProfile?.name || "Guest";
  const avatarImage = userAvatar || undefined;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-quiz-background">
      {/* Conditionally render the Header based on screen size */}
      {!isSmallScreen && <Header logoAsTitle imageSrc={logo} showNotifications />}

      <div className="mx-auto max-w-full space-y-4 px-4 pb-4 lg:px-8 lg:pb-8">
        {/* Game Stats Header - It will now wait for isParentLoading to be false */}
        <GameStatsHeader userToken={userToken} isParentLoading={loading} />

        {/* NEW: Guest User Registration Panel */}
        {isGuest && (
          <Card className="bg-amber-100 border-amber-400 text-amber-900 p-4 shadow-md flex items-start space-x-3">
            <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <div className="flex-grow">
              <h4 className="font-semibold leading-snug">Don't lose your progress!</h4>
              <p className="text-sm">
                You are currently logged in as a **Guest**. Complete your registration to secure your account and save all your quiz progress.
              </p>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => navigate("/profile")}
              className="bg-amber-500 hover:bg-amber-600 text-white border-amber-500 hover:border-amber-600 flex-shrink-0"
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
                {/* The main "Play" text */}
                <span className="text-3xl font-bold">Play</span>

                {/* The Level Badge - circular design matching the reference */}
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
            // Show AddCategory component when no categories exist
            <div className="space-y-4">
              {!showAddCategory ? (
                <Card className="p-8 text-center">
                  <div className="space-y-3">
                    <Brain className="h-12 w-12 mx-auto text-muted-foreground" />
                    <h4 className="font-semibold text-foreground">No quizzes yet</h4>
                    <p className="text-sm text-muted-foreground">
                      Create your first quiz to get started
                    </p>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="mt-2"
                      onClick={handleCreateFirstCategory} // Uses the handler that checks for guest status
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Create Your First Quiz
                    </Button>
                  </div>
                </Card>
              ) : (
                <AddCategory fetchCategories={handleCategoryCreated} />
              )}
            </div>
          ) : (
            // Show categories list and AddCategory component after
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
                createdBy={cat.createdBy || "You"}
                onPlay={handlePlayQuiz}
              />
            ))}
          </div>

              
              {/* Add Category Section - Always show after categories */}
              <div className="mt-6">
                {/* Conditionally render AddCategory or a registration prompt button */}
                {isGuest ? (
                    <Button 
                        onClick={handleCreateCategoryAttempt} 
                        className="w-full h-12 bg-green-500 hover:bg-green-600 text-white font-semibold rounded-lg shadow-lg"
                    >
                        <Plus className="h-4 w-4 mr-2" />
                        Create New Quiz (Register to Enable)
                    </Button>
                ) : (
                    <AddCategory fetchCategories={fetchUserCategories} />
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}