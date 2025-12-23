// Home.tsx - Direct API calls without preloader
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

const avatarImages = import.meta.glob("../assets/images/avatars/*.png", {
  eager: true,
  import: "default",
});
const avatars: string[] = Object.values(avatarImages) as string[];

const BASE_URL = import.meta.env.VITE_BASE_URL;
const QUIZ_COST = 50;
const API_TIMEOUT = 15000; // 15 second timeout for API calls

interface CategoryToPlayResponse {
  message: string;
  categoryId: string;
  name: string;
  averageRating: number;
  questionsCount: number;
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

// ✅ Fetch with timeout wrapper
const fetchWithTimeout = async (url: string, options: RequestInit, timeout = API_TIMEOUT) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await authenticatedFetch(url, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error: any) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      throw new Error('Request timeout - server took too long to respond');
    }
    throw error;
  }
};

export default function Home() {
  const { user, loading: userLoading, refreshUser, updateUserLocally, updateCoins, markUserStale } = useUser();
  const [playButtonLoading, setPlayButtonLoading] = useState(false);
  const [showSplash, setShowSplash] = useState(false);
  const [userAvatar, setUserAvatar] = useState<string | null>(null);
  const [isSmallScreen, setIsSmallScreen] = useState(false);

  const [isInterestModalOpen, setIsInterestModalOpen] = useState(false);
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [savingInterests, setSavingInterests] = useState(false);

  // Simple component-level cache for next category
  const categoryCache = useRef<{
    data: CategoryToPlayResponse | null;
    timestamp: number;
  }>({ data: null, timestamp: 0 });

  const hasInitializedRef = useRef(false);
  const hasDeductedRef = useRef(false);

  const navigate = useNavigate();
  const userToken = typeof window !== "undefined" ? localStorage.getItem("token") || "" : "";
  const { toast } = useToast();
  
  const currentCoins = user?.coins ?? 0;

  // Check screen size
  useEffect(() => {
    const checkScreenSize = () => setIsSmallScreen(window.innerWidth < 768);
    checkScreenSize();
    window.addEventListener("resize", checkScreenSize);
    return () => window.removeEventListener("resize", checkScreenSize);
  }, []);

  // ✅ SINGLE initialization effect - only splash screen
  useEffect(() => {
    if (hasInitializedRef.current) return;
    
    hasInitializedRef.current = true;
    console.log("✅ Initializing app");
    
    const hasShownSplash = typeof window !== 'undefined' ? sessionStorage.getItem("splashShown") : null;
    const shouldShowSplash = !hasShownSplash;

    if (shouldShowSplash) {
      console.log("✨ Showing splash screen");
      setShowSplash(true);
      if (typeof window !== 'undefined') {
        sessionStorage.setItem("splashShown", "true");
      }
      
      const timer = setTimeout(() => {
        console.log("🎬 Hiding splash screen");
        setShowSplash(false);
      }, 2500);
      
      return () => clearTimeout(timer);
    }
  }, []);

  // User data setup
  useEffect(() => {
    const hasToken = typeof window !== "undefined" ? localStorage.getItem("token") : null;
    
    if (!hasToken) {
      console.log("🔒 No token, redirecting to auth");
      navigate("/auth");
      return;
    }

    if (userLoading) {
      console.log("⏳ User still loading...");
      return;
    }

    if (!user && !userLoading && hasToken) {
      console.log("⚠️ Have token but no user, attempting refresh...");
      refreshUser();
      return;
    }

    if (user) {
      console.log("✅ User loaded:", user.alias);
      
      trackHomeScreen(user._id);
      
      const avatarIndex = user.avatar ? user.avatar - 1 : 0;
      const calculatedAvatar = avatars[avatarIndex] || null;
      setUserAvatar(calculatedAvatar);

      setSelectedInterests(user.interests || []);

      if (!user.interests || user.interests.length === 0) {
        setTimeout(() => {
          setIsInterestModalOpen(true);
          trackEvent("view_interests", {
            user_id: user._id,
            context: "first_login_prompt",
          });
        }, 500);
      }
    }
  }, [user, userLoading, navigate, refreshUser]);

  // ✅ Fetch category on-demand (with component-level cache)
  const fetchCategoryToPlay = async (): Promise<CategoryToPlayResponse | null> => {
    const now = Date.now();
    const CACHE_DURATION = 2 * 60 * 1000; // 2 minutes cache
    
    // Check cache first
    if (categoryCache.current.data && (now - categoryCache.current.timestamp) < CACHE_DURATION) {
      console.log("⚡ Using cached category");
      return categoryCache.current.data;
    }

    try {
      console.log("🌐 Fetching next category from API...");
      const response = await fetchWithTimeout(
        `${BASE_URL}/api/getGetegoryToPlay`,
        { method: "GET" },
        API_TIMEOUT
      );

      if (response && response.ok) {
        const data: CategoryToPlayResponse = await response.json();
        if (data.categoryId) {
          // Update cache
          categoryCache.current = {
            data: data,
            timestamp: now
          };
          console.log("✅ Category fetched and cached:", data.categoryId);
          return data;
        }
      } else {
        console.warn("⚠️ Category API returned non-OK status");
      }
    } catch (error: any) {
      console.error("❌ Error fetching category:", error.message);
      
      if (error.message.includes('timeout')) {
        console.warn("⏱️ API timeout");
        throw new Error('Request timeout - server took too long to respond');
      }
      throw error;
    }
    
    return null;
  };

  const handleQuickQuiz = async () => {
    if (!userToken) {
      console.log("⚠️ You must be logged in to play.");
      return;
    }

    if (currentCoins < QUIZ_COST) {
      toast({
        title: "Insufficient Coins",
        description: `You need ${QUIZ_COST} coins to start a quiz.`,
        variant: "destructive",
      });
      return;
    }

    if (hasDeductedRef.current) return;
    hasDeductedRef.current = true;

    // Optimistically deduct coins
    const optimisticCoins = currentCoins - QUIZ_COST;
    updateCoins(optimisticCoins);
    setPlayButtonLoading(true);

    try {
      // Fetch category when needed
      const category = await fetchCategoryToPlay();
      
      if (!category || !category.categoryId) {
        // Restore coins on failure
        updateCoins(currentCoins);
        hasDeductedRef.current = false;
        toast({
          title: "Error",
          description: "Could not find a category to play. Please try again later.",
          variant: "destructive",
        });
        return;
      }

      // Mark user as stale for next refresh
      markUserStale();
      
      // Clear cache before navigation
      categoryCache.current = { data: null, timestamp: 0 };
      
      console.log("🎮 Navigating to quiz:", category.categoryId);
      navigate(`/quiz/${category.categoryId}`);
      
      // Reset deducted flag after navigation
      setTimeout(() => {
        hasDeductedRef.current = false;
      }, 1000);

    } catch (error: any) {
      // Restore coins on error
      updateCoins(currentCoins);
      hasDeductedRef.current = false;
      
      // User-friendly error messages
      const errorMessage = error.message.includes('timeout')
        ? 'Server is taking too long to respond. Please check your connection and try again.'
        : `Failed to start quiz: ${error.message}`;
      
      toast({
        title: error.message.includes('timeout') ? "Request Timeout" : "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setPlayButtonLoading(false);
    }
  };

  // Interest Modal Handlers
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
      markUserStale();
      
      trackEvent("update_interests", {
        user_id: user._id,
        interest_count: selectedInterests.length,
        context: "home_screen_modal",
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
    const newTotal = currentCoins + amount;
    updateCoins(newTotal);
    updateUserLocally({ dailyClaimAvailable: false });
    markUserStale();
  };

  if (showSplash) {
    return <SplashScreen dataLoaded={!userLoading} />;
  }

  if (userLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center"
        style={{
          background: `radial-gradient(circle at center, #2a0a3b 0%, #180524 55%, #0e0316 100%)`,
        }}
      >
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-white"></div>
          <p className="text-white text-sm">Loading your profile...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center"
        style={{
          background: `radial-gradient(circle at center, #2a0a3b 0%, #180524 55%, #0e0316 100%)`,
        }}
      >
        <div className="flex flex-col items-center gap-4 text-center px-4">
          <AlertTriangle className="w-16 h-16 text-yellow-500" />
          <p className="text-white text-lg">Unable to load user data</p>
          <Button onClick={() => window.location.reload()}>Reload Page</Button>
        </div>
      </div>
    );
  }

  const alias = user.alias || "Guest";
  const avatarImage = userAvatar || undefined;
  const isGuest = user.userType === 'Guest';
  const userLevel = user.level || 1;

  const backgroundStyle = {
    background: `radial-gradient(circle at center, #2a0a3b 0%, #180524 55%, #0e0316 100%)`,
  };

  return (
    <div
      className="fixed inset-0 flex flex-col overflow-y-auto"
      style={backgroundStyle}
    >     
      {!isSmallScreen && <Header logoAsTitle imageSrc={logo} showNotifications />}

      <div className="flex-1 flex flex-col px-4 lg:px-8 w-full max-w-4xl mx-auto">
        <div className={`space-y-3 flex-shrink-0 ${isSmallScreen ? 'pt-2' : 'pt-3'} w-full`}>
          <GameStatsHeader
            userToken={userToken}
            isParentLoading={false}
            currentCoinsFromParent={currentCoins}
            userXP={user.knowledgePoints ?? 0}
            userGem1={user.wisdomGems ?? 0}
            userGem2={user.enlightenmentCrystals ?? 0}
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
            onCoinsEarned={refreshUser}
            isClaimAvailable={user.dailyClaimAvailable ?? false} 
            updateUserLocally={updateUserLocally}
          />
        </div>

        <div className="flex items-center justify-center flex-1 min-h-0 pt-6">
          <div className="relative flex flex-col items-center justify-center">
            <div
              className="relative rounded-full flex items-center justify-center overflow-visible mx-auto w-[260px] h-[260px] sm:w-[450px] sm:h-[450px] md:w-[400px] md:h-[400px] lg:w-[260px] lg:h-[260px] xl:w-[280px] xl:h-[280px]"
              style={{
                backgroundImage: `url('/image.png')`,
                backgroundSize: "cover",
                backgroundPosition: "center",
                backgroundRepeat: "no-repeat",
              }}
            >
              <Link to="/profile" className="no-underline relative z-10">
                <Avatar className="rounded-full overflow-visible relative w-[200px] h-[200px] sm:w-[240px] sm:h-[240px] md:w-[280px] md:h-[280px] lg:w-[200px] lg:h-[200px] xl:w-[220px] xl:h-[220px]">
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
                className="absolute left-1/2 -translate-x-1/2 text-white font-extrabold text-center whitespace-nowrap -bottom-6 text-xl sm:text-2xl md:text-3xl lg:text-4xl max-w-[220px] sm:max-w-[260px] md:max-w-[300px]"
                style={{
                  textShadow: '0 0 8px rgba(255,255,255,0.6), 0 0 12px rgba(255,255,255,0.4)',
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

        <div className={`space-y-2 flex-shrink-0 w-full ${isSmallScreen ? 'pb-36 pt-10' : 'pb-24 pt-16'}`}>
          <Button
            variant="default"
            onClick={handleQuickQuiz}
            disabled={playButtonLoading || currentCoins < QUIZ_COST}
            className={`w-full flex items-center justify-between px-6 ${isSmallScreen ? 'h-20' : 'h-24 sm:h-24'}`}
          >
            {playButtonLoading ? (
              <div className="flex items-center justify-center w-full gap-2 text-xl sm:text-2xl">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                Starting Quiz...
              </div>
            ) : (
              <>
                <div className="flex items-center justify-center gap-3 sm:gap-4 h-full">
                  <span className="text-4xl sm:text-5xl font-bold text-white leading-none flex items-center -translate-y-[1px]">
                    Play
                  </span>

                  <span className="text-base sm:text-lg font-semibold text-yellow-300 flex items-center gap-1.5 bg-gray-700/70 px-3 py-1.5 rounded-full">
                    <svg
                      viewBox="0 0 24 24"
                      className="h-5 w-5 sm:h-6 sm:w-6"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <circle cx="12" cy="12" r="8" fill="#f59e0b" />
                      <circle cx="12" cy="12" r="7" fill="#fbbf24" />
                      <circle cx="12" cy="12" r="4" fill="#f59e0b" opacity="0.4" />
                    </svg>
                    {QUIZ_COST}
                  </span>
                </div>

                <div className="bg-white rounded-full w-14 h-14 sm:w-[72px] sm:h-[72px] flex flex-col items-center justify-center shadow-md border-2 border-green-500">
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

          {currentCoins < QUIZ_COST && (
            <p className="text-red-400 text-sm text-center font-medium">
              Not enough coins to start a quiz.
            </p>
          )}
        </div>
      </div>
      
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