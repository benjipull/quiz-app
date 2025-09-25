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
} from "lucide-react";
import logo from "../assets/images/QuizicleLogo.png";
// Import the new components
import SplashScreen from "../components/SplashScreen";
import GameStatsHeader from "../components/GameStatsHeader";
import AddCategory from "@/components/AddCategory";

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

export default function Home() {
  const [userCategories, setUserCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [playButtonLoading, setPlayButtonLoading] = useState(false);
  const [categoriesLoading, setCategoriesLoading] = useState(false);

  // Splash screen state - only show on initial app load
  const [showSplash, setShowSplash] = useState(false);
  const [dataLoaded, setDataLoaded] = useState(false);

  const [userProfile, setUserProfile] = useState<any | null>(null);
  const [userAvatar, setUserAvatar] = useState<string | null>(null);
  const [userLevel, setUserLevel] = useState(1);

  // New state to track screen size
  const [isSmallScreen, setIsSmallScreen] = useState(false);

  // State to control AddCategory component visibility
  const [showAddCategory, setShowAddCategory] = useState(false);

  const navigate = useNavigate();
  const userToken = typeof window !== 'undefined' ? localStorage.getItem("token") || "" : "";

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
          loadUserProfile(),
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

  // Fetch user categories when user profile is loaded
  useEffect(() => {
    if (userProfile && userToken) {
      fetchUserCategories();
    }
  }, [userProfile, userToken]);

  const loadUserProfile = () => {
    return new Promise<void>((resolve) => {
      const storedUser = typeof window !== 'undefined' ? localStorage.getItem("user") : null;
      const storedAvatar = typeof window !== 'undefined' ? localStorage.getItem("userAvatar") : null;

      if (storedUser) {
        try {
          const parsedUser = JSON.parse(storedUser);
          setUserProfile(parsedUser);

          if (storedAvatar) {
            setUserAvatar(storedAvatar);
          } else if (parsedUser.avatar) {
            setUserAvatar(avatars[parsedUser.avatar - 1] || null);
          }

          if (parsedUser.level) setUserLevel(parsedUser.level);
        } catch (e) {
          console.error("Failed to parse user data:", e);
        }
      }
      resolve();
    });
  };

  const fetchUserCategories = async () => {
    setCategoriesLoading(true);
    setError(null);

    try {
      const response = await fetch(`${BASE_URL}/api/categories`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${userToken}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch categories. Status: ${response.status}`);
      }

      const data = await response.json();

      // Filter categories by the logged-in user's alias
      const userAlias = userProfile?.alias;
      const filteredCategories = Array.isArray(data)
        ? data.filter((category) => category.createdBy === userAlias)
        : [];

      // Transform API data to match interface
      const transformedCategories: Category[] = filteredCategories.map((category: any, index: number) => ({
        _id: category._id,
        name: category.name,
        description: category.description || `Test your knowledge in ${category.name}`,
        createdBy: category.createdBy || "QuizMaster",
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

  const handleCreateFirstCategory = () => {
    setShowAddCategory(true);
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
        <div className="pb-3">
          <Button
            onClick={handleQuickQuiz}
            disabled={loading || playButtonLoading}
            className="w-full h-12 bg-success hover:bg-success/90 text-white text-lg font-bold rounded-xl disabled:opacity-50"
          >
            {playButtonLoading ? (
              <div className="flex items-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Starting Quiz...
              </div>
            ) : (
              <>
                Play
                <div className="ml-2 flex items-center bg-white/20 px-2 py-0.5 rounded-full">
                  <span className="font-bold">{userLevel}</span>
                  <span className="ml-1 text-xs">Lvl</span>
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
              Categories Created by You
            </h3>
            <Button
              onClick={() => navigate("/categories")}
              variant="outline"
              size="sm"
              className="text-xs"
            >
              View All Categories
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
                    <h4 className="font-semibold text-foreground">No categories yet</h4>
                    <p className="text-sm text-muted-foreground">
                      Create your first quiz category to get started
                    </p>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="mt-2"
                      onClick={handleCreateFirstCategory}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Create Your First Category
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
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
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
                <AddCategory fetchCategories={fetchUserCategories} />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}