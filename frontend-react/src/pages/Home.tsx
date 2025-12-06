// Home.tsx - Complete with Zero Loading Implementation, Updated UI/Style
import { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { trackHomeScreen } from "@/utils/analytics";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import InterestSelector from "@/components/InterestSelector";
import { trackEvent } from "@/utils/analytics";
import {
  AlertTriangle,
  Heart,
} from "lucide-react";
import logo from "../assets/images/QuizicleLogo.png";
import SplashScreen from "../components/SplashScreen";
import GameStatsHeader from "../components/GameStatsHeader";
import { useToast } from "@/hooks/use-toast";
import DailyCoinClaim from "@/components/DailyCoinClaim";
import { useUser } from "@/contexts/UserContext";
import { globalCache, preloadNextCategory as preloadNextCategoryGlobal, preloadLeaderboardData } from "@/hooks/useAppPreloader";

const avatarImages = import.meta.glob("../assets/images/avatars/*.png", {
  eager: true,
  import: "default",
});
const avatars: string[] = Object.values(avatarImages) as string[];

const BASE_URL = import.meta.env.VITE_BASE_URL;
// Using the QUIZ_COST from the second file as requested
const QUIZ_COST = 50;

interface CategoryToPlayResponse {
  message: string;
  categoryId: string;
  name: string;
  averageRating: number;
  questionsCount: number;
}

interface ErrorResponse {
  message: string;
}

const authenticatedFetch = async (url: string, options: RequestInit) => {
  const userToken = typeof window !== "undefined" ? localStorage.getItem("token") || "" : "";
  const headers = {
    ...options.headers,
    "Authorization": `Bearer ${userToken}`,
    "Content-Type": "application/json",
  };
  
  if (!options.body && (options.method === 'GET' || options.method === 'HEAD')) {
    delete headers["Content-Type"];
  }

  return fetch(url, {
    ...options,
    headers,
  });
};

export default function Home() {
  const { user, loading: userLoading, updateUserLocally, updateCoins } = useUser();
  const [loading, setLoading] = useState(true);
  const [playButtonLoading, setPlayButtonLoading] = useState(false);
  const [showSplash, setShowSplash] = useState(false);
  const [dataLoaded, setDataLoaded] = useState(false);
  const [userAvatar, setUserAvatar] = useState<string | null>(null);
  const [isSmallScreen, setIsSmallScreen] = useState(false);
  const [currentCoins, setCurrentCoins] = useState(0);

  const [isInterestModalOpen, setIsInterestModalOpen] = useState(false);
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [savingInterests, setSavingInterests] = useState(false);

  // Preloading Refs (from first file)
  const preloadedCategoryRef = useRef<CategoryToPlayResponse | null>(null);
  const isPreloadingRef = useRef(false);
  const hasPreloadedLeaderboardRef = useRef(false);

  const navigate = useNavigate();
  const userToken = typeof window !== "undefined" ? localStorage.getItem("token") || "" : "";
  const { toast } = useToast();

  // --- UI/Screen Size Effect (from both files) ---
  useEffect(() => {
    const checkScreenSize = () => setIsSmallScreen(window.innerWidth < 768);
    checkScreenSize();
    window.addEventListener("resize", checkScreenSize);
    return () => window.removeEventListener("resize", checkScreenSize);
  }, []);


  // --- Initialization and Splash Screen (from first file) ---
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

      // Wait for user context to load
      const checkUserLoaded = setInterval(() => {
        if (!userLoading) {
          clearInterval(checkUserLoaded);
          setDataLoaded(true);

          if (shouldShowSplash) {
            const elapsedTime = Date.now() - startTime;
            const remainingTime = Math.max(0, minSplashDuration - elapsedTime);

            setTimeout(() => {
              setShowSplash(false);
              setLoading(false);
              // Start preloading after splash
              preloadNextCategory();
              preloadLeaderboardInBackground();
            }, remainingTime);
          } else {
            setLoading(false);
            // Start preloading immediately
            preloadNextCategory();
            preloadLeaderboardInBackground();
          }
        }
      }, 100);
    };

    initializeApp();
  }, [userLoading]);

  // --- User Data Setup and Interest Modal Logic (from first file) ---
  useEffect(() => {
    if (user && userToken) {
      trackHomeScreen(user._id);

      if (user.coins !== undefined) {
        setCurrentCoins(user.coins);
      }

      // Set avatar
      const avatarIndex = user.avatar ? user.avatar - 1 : 0;
      const calculatedAvatar = avatars[avatarIndex] || null;
      setUserAvatar(calculatedAvatar);

      // Set interests
      setSelectedInterests(user.interests || []);

      // Show interest modal if no interests
      if (!user.interests || user.interests.length === 0) {
        setTimeout(() => {
          setIsInterestModalOpen(true);
          trackEvent("view_interests", {
            user_id: user._id,
            context: "first_login_prompt",
          });
        }, 500);
      }
    } else if (!user && !userToken) {
      navigate("/auth");
    }
  }, [user, userToken, navigate]);

  // --- Preloading Functions (from first file) ---

  // Preload leaderboard data in background (runs once)
  const preloadLeaderboardInBackground = () => {
    if (hasPreloadedLeaderboardRef.current) return;
    
    hasPreloadedLeaderboardRef.current = true;
    
    // Wait 2 seconds after home loads, then preload
    setTimeout(() => {
      preloadLeaderboardData().then(() => {
        console.log("🎯 Leaderboard preloaded in background");
      });
    }, 2000);
  };

  // Preload next category with smart caching
  const preloadNextCategory = async () => {
    if (!userToken || isPreloadingRef.current) return;

    // Check global cache first
    if (globalCache.nextCategory) {
      const cacheAge = Date.now() - globalCache.lastUpdated.category;
      if (cacheAge < 2 * 60 * 1000) { // 2 minutes
        preloadedCategoryRef.current = globalCache.nextCategory;
        console.log("✅ Using cached category:", globalCache.nextCategory.categoryId);
        return;
      }
    }

    isPreloadingRef.current = true;
    try {
      const response = await authenticatedFetch(`${BASE_URL}/api/getGetegoryToPlay`, {
        method: "GET",
      });

      if (response && response.ok) {
        const data: CategoryToPlayResponse = await response.json();
        if (data.categoryId) {
          preloadedCategoryRef.current = data;
          
          // Update global cache
          globalCache.nextCategory = data;
          globalCache.lastUpdated.category = Date.now();
          
          console.log("✅ Preloaded category:", data.categoryId);
        }
      }
    } catch (error) {
      console.error("Error preloading category:", error);
    } finally {
      isPreloadingRef.current = false;
    }
  };

  // --- Handle Quick Quiz (from first file - zero loading logic) ---
  const handleQuickQuiz = async () => {
    if (!userToken) {
      console.log("⚠️ You must be logged in to play.");
      return;
    }

    // Check if user has enough coins
    if (currentCoins < QUIZ_COST) {
      toast({
        title: "Insufficient Coins",
        description: `You need ${QUIZ_COST} coins to start a quiz.`,
        variant: "destructive",
      });
      return;
    }

    // Try cache first - check both local ref and global cache
    const cachedCategory = preloadedCategoryRef.current || globalCache.nextCategory;
    
    if (cachedCategory && cachedCategory.categoryId) {
      const categoryId = cachedCategory.categoryId;
      
      // Optimistic UI update (Deduct coins immediately for visual effect)
      const optimisticCoins = currentCoins - QUIZ_COST;
      setCurrentCoins(optimisticCoins);
      updateCoins(optimisticCoins);
      
      // Clear both caches
      preloadedCategoryRef.current = null;
      globalCache.nextCategory = null;
      globalCache.lastUpdated.category = 0;
      
      console.log("🚀 Instant quiz start with cached category:", categoryId);
      
      // Navigate immediately - ZERO loading time
      navigate(`/quiz/${categoryId}`);
      
      // Preload next category in background for next time
      setTimeout(() => {
        preloadNextCategory();
      }, 1000);
      
      return;
    }

    // Fallback: No cache available, fetch category (should rarely happen)
    console.log("⚠️ No cached category, fetching...");
    
    // Optimistic coin deduction for the fallback path as well
    const optimisticCoins = currentCoins - QUIZ_COST;
    setCurrentCoins(optimisticCoins);
    updateCoins(optimisticCoins);
    setPlayButtonLoading(true);

    try {
      const response = await authenticatedFetch(`${BASE_URL}/api/getGetegoryToPlay`, {
        method: "GET",
      });

      if (!response) {
        // Refund coins on network error
        setCurrentCoins(prev => prev + QUIZ_COST);
        updateCoins(currentCoins);
        setPlayButtonLoading(false);
        toast({
          title: "Network Error",
          description: "Could not connect to the server. Coins refunded.",
          variant: "destructive",
        });
        return;
      }

      if (!response.ok) {
        const errorData: ErrorResponse = await response.json().catch(() => ({
          message: "Unknown error during quiz start."
        }));

        // Refund coins on error (The server should handle the actual refund, but we revert the optimistic update)
        // Note: For robustness, a subsequent GameStatsHeader fetch or manual user stats refresh should confirm the balance.
        setCurrentCoins(prev => prev + QUIZ_COST);
        updateCoins(currentCoins);

        toast({
          title: "Quiz Start Failed",
          description: errorData.message.includes("refunded")
            ? errorData.message
            : `Unable to start quiz: ${errorData.message}`,
          variant: "destructive",
        });

        throw new Error(`Failed to get category to play: ${response.status}`);
      }

      const data: CategoryToPlayResponse = await response.json();

      if (data.categoryId) {
        navigate(`/quiz/${data.categoryId}`);
        // Preload next category in background for next time
        setTimeout(() => {
          preloadNextCategory();
        }, 1000);
      } else {
        // Refund coins if no category returned
        setCurrentCoins(prev => prev + QUIZ_COST);
        updateCoins(currentCoins);
        throw new Error("No category ID returned from server");
      }
    } catch (error) {
      console.error("Error getting category to play:", error);
      toast({
        title: "Error",
        description: "Unable to start quiz. Please try again later.",
        variant: "destructive",
      });
    } finally {
      setPlayButtonLoading(false);
    }
  };


  // --- Interest Modal Handlers (from first file) ---
  const handleInterestChange = (newSelectedIds: string[]) => {
    setSelectedInterests(newSelectedIds);
  };

  const handleSaveInterests = async () => {
    if (!user?._id) return;
    setSavingInterests(true);
    try {
      const token = localStorage.getItem("token");
      if (!token) throw new Error("Authentication token missing.");

      const interestsResponse = await fetch(
        `${BASE_URL}/api/interests/user/${user._id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`,
          },
          body: JSON.stringify({ interests: selectedInterests }),
        }
      );

      if (!interestsResponse.ok) {
        throw new Error("Failed to update interests.");
      }

      updateUserLocally({ interests: selectedInterests });

      trackEvent("update_interests", {
        user_id: user._id,
        interest_count: selectedInterests.length,
        context: "home_screen_modal",
      });

      toast({
        title: "Success",
        description: "Your interests have been updated!",
      });

      setIsInterestModalOpen(false);
    } catch (error) {
      const err = error as Error;
      toast({
        title: "Error",
        description: `Failed to save interests: ${err.message}`,
        variant: "destructive",
      });
    } finally {
      setSavingInterests(false);
    }
  };

  const handleCoinsEarned = (amount: number) => {
    setCurrentCoins(prev => {
      const newTotal = prev + amount;
      updateCoins(newTotal); // Update global context/localStorage
      return newTotal;
    });
  };

  const handleCoinsUpdate = (coins: number) => {
    // Used by GameStatsHeader to update the parent state after a successful fetch
    setCurrentCoins(coins);
    updateCoins(coins); // Keep global context in sync
  };

  // --- Render Logic ---

  // Show splash screen
  if (showSplash) {
    return <SplashScreen dataLoaded={dataLoaded} />;
  }

  // Show loading if no user data yet
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center"
        style={{
          background: `radial-gradient(circle at center, #2a0a3b 0%, #180524 55%, #0e0316 100%)`,
        }}
      >
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-white"></div>
      </div>
    );
  }

  const alias = user.alias || "Guest";
  const avatarImage = userAvatar || undefined;
  const isGuest = user.userType === 'Guest';
  const userLevel = user.level || 1;

  const backgroundStyle = {
    // Using the radial-gradient from the first file, as the second file's image is missing
    background: `radial-gradient(circle at center, #2a0a3b 0%, #180524 55%, #0e0316 100%)`,
  };

  return (
    <div
      className="fixed inset-0 flex flex-col overflow-y-auto"
      style={backgroundStyle}
    >     
      {!isSmallScreen && <Header logoAsTitle imageSrc={logo} showNotifications />}

      <div className="flex-1 flex flex-col px-4 lg:px-8 w-full max-w-4xl mx-auto">
        {/* Top Header Section */}
        <div className={`space-y-3 flex-shrink-0 ${isSmallScreen ? 'pt-2' : 'pt-3'} w-full`}>
          <GameStatsHeader
            userToken={userToken}
            isParentLoading={loading}
            onCoinsUpdate={handleCoinsUpdate}
            currentCoinsFromParent={currentCoins}
          />

          {isGuest && (
            <Card className="bg-gradient-to-br from-[#100321] via-[#2d1b4e] to-[#380d67] border-gray-200 dark:border-gray-700 dark:text-white p-3 shadow-lg flex items-center justify-between space-x-3">
              <div className="flex items-center space-x-3 flex-shrink-0">
                <AlertTriangle className="w-5 h-5 text-amber-500 dark:text-purple-400" />
              </div>
              <p className="text-sm text-white font-semibold leading-snug flex-grow">
                Unlock more features
              </p>
              <Button
                variant="blue"
                size="sm"
                onClick={() => navigate("/profile")}
              >
                Register Now
              </Button>
            </Card>
          )}

          <DailyCoinClaim
            userToken={userToken}
            onCoinsEarned={handleCoinsEarned}
          />
        </div>

       <div className="flex items-center justify-center flex-1 min-h-0 pt-6">
  <div className="relative flex flex-col items-center justify-center">
    <div
      className="
        relative 
        rounded-full 
        flex items-center justify-center
        overflow-visible
        mx-auto
        w-[260px] h-[260px]
        sm:w-[450px] sm:h-[450px]
        md:w-[400px] md:h-[400px]
        lg:w-[260px] lg:h-[260px]
        xl:w-[280px] xl:h-[280px]
      "
      style={{
        backgroundImage: `url('/image.png')`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
      }}
    >
      <Link to="/profile" className="no-underline relative z-10">
        <Avatar
          className="
            rounded-full 
            overflow-visible 
            relative 
            w-[200px] h-[200px]
            sm:w-[240px] sm:h-[240px]
            md:w-[280px] md:h-[280px]
            lg:w-[200px] lg:h-[200px]
            xl:w-[220px] xl:h-[220px]
          "
        >
          <AvatarImage
            src={avatarImage}
            alt={alias}
            className="object-contain scale-[1.12] relative z-10"
          />
          <AvatarFallback className="bg-transparent border-none text-white font-bold text-3xl md:text-4xl">
            {alias.charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>
      </Link>

      <h2
        className="
          absolute 
          left-1/2 -translate-x-1/2 
          text-white font-extrabold text-center whitespace-nowrap
          -bottom-6
          text-xl
          sm:text-2xl
          md:text-3xl
          lg:text-4xl
          max-w-[220px] sm:max-w-[260px] md:max-w-[300px]
        "
        style={{
          textShadow:
            '0 0 8px rgba(255,255,255,0.6), 0 0 12px rgba(255,255,255,0.4)',
        }}
      >
        {alias
          .split(/[\s-_]+/)
          .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
          .join(" ")}
      </h2>
    </div>
  </div>
</div>


        {/* Play Button (Styled from second file) */}
        <div className={`space-y-2 flex-shrink-0 w-full ${isSmallScreen ? 'pb-36 pt-10' : 'pb-24 pt-16'}`}>
          <Button
            variant="default"
            onClick={handleQuickQuiz}
            disabled={loading || playButtonLoading || currentCoins < QUIZ_COST}
            className={`w-full flex items-center justify-between px-6  ${isSmallScreen ? 'h-16' : 'h-20 sm:h-20'}`}
          >
            {playButtonLoading ? (
              <div className="flex items-center text-xl sm:text-2xl justify-center w-full gap-2">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                Starting Quiz...
              </div>
            ) : (
              <>
                <div className="flex items-center gap-3 sm:gap-4">
                  <span className="text-3xl sm:text-4xl font-extrabold text-white leading-none">
                    Play
                  </span>
                  <span className="text-base sm:text-lg font-semibold text-yellow-300 flex items-center gap-1.5 bg-gray-700/70 px-3 py-1.5 rounded-full">
                    <svg viewBox="0 0 24 24" className="h-5 w-5 sm:h-6 sm:w-6" xmlns="http://www.w3.org/2000/svg">
                      <circle cx="12" cy="12" r="8" fill="#f59e0b" />
                      <circle cx="12" cy="12" r="7" fill="#fbbf24" />
                      <circle cx="12" cy="12" r="4" fill="#f59e0b" opacity="0.4" />
                    </svg>
                    {QUIZ_COST}
                  </span>
                </div>

                <div className="bg-white rounded-full w-14 h-14 sm:w-[72px] sm:h-[72px] flex flex-col items-center 
                justify-center shadow-md border-2 border-green-500">
                  <span className="text-green-600 text-2xl sm:text-3xl font-bold leading-none">
                    {userLevel}
                  </span>
                  <span className="text-green-600 text-[10px] sm:text-xs font-semibold uppercase leading-none tracking-wide mt-0.5">
                    Level
                  </span>
                </div>
              </>
            )}
          </Button>

          {currentCoins < QUIZ_COST && !loading && (
            <p className="text-red-400 text-sm text-center font-medium">
              Not enough coins to start a quiz.
            </p>
          )}
        </div>
      </div>
      
      {/* Interest Selection Modal */}
      <Dialog open={isInterestModalOpen} onOpenChange={setIsInterestModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <Heart className="w-5 h-5" />
              <span>Select Your Interests</span>
            </DialogTitle>
            <DialogDescription>
              Help us personalize your experience by selecting topics you're interested in.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            {user._id && (
              <InterestSelector
                userId={user._id}
                initialSelectedIds={selectedInterests}
                onSelectionChange={handleInterestChange}
              />
            )}
          </div>

          <div className="flex justify-end space-x-2 pt-4 border-t">
            <Button
              variant="outline"
              onClick={() => setIsInterestModalOpen(false)}
              className="border-red-600 text-red-600 hover:bg-red-600 hover:text-white"
              disabled={savingInterests}
            >
              Skip for Now
            </Button>
            <Button
              onClick={handleSaveInterests}
              disabled={savingInterests || selectedInterests.length === 0}
            >
              {savingInterests ? (
                <div className="flex items-center space-x-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                  <span>Saving...</span>
                </div>
              ) : (
                `Save Interests (${selectedInterests.length})`
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}