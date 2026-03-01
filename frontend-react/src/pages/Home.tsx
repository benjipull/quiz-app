// Home.tsx - Direct API calls without preloader
import { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { trackHomeScreen } from "@/utils/analytics";
import { trackEvent } from "@/utils/analytics";
import { setGAUser } from "@/utils/gaClient";
import {
  AlertTriangle,
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
  const [viewportHeight, setViewportHeight] = useState<number>(typeof window !== "undefined" ? window.innerHeight : 800);

  // Simple component-level cache for next category
  const categoryCache = useRef<{
    data: CategoryToPlayResponse | null;
    timestamp: number;
  }>({ data: null, timestamp: 0 });

  const hasInitializedRef = useRef(false);
  const hasDeductedRef = useRef(false);
  const hasTrackedHomeRef = useRef(false);

  const navigate = useNavigate();
  const userToken = typeof window !== "undefined" ? localStorage.getItem("token") || "" : "";
  const storedUserId = (() => {
    if (typeof window === "undefined") return undefined;
    try {
      const raw = localStorage.getItem("user");
      if (!raw) return undefined;
      const parsed = JSON.parse(raw);
      return parsed?._id as string | undefined;
    } catch {
      return undefined;
    }
  })();
  const { toast } = useToast();
  
  const currentCoins = user?.coins ?? 0;

  // Check screen size
  useEffect(() => {
    const checkScreenSize = () => {
      setIsSmallScreen(window.innerWidth < 768);
      setViewportHeight(window.innerHeight);
    };
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

      const avatarIndex = user.avatar ? user.avatar - 1 : 0;
      const calculatedAvatar = avatars[avatarIndex] || null;
      setUserAvatar(calculatedAvatar);

    }
  }, [user, userLoading, navigate, refreshUser]);

  useEffect(() => {
    const resolvedUserId = user?._id || storedUserId;
    if (hasTrackedHomeRef.current || userLoading || !resolvedUserId) return;

    setGAUser(resolvedUserId);
    hasTrackedHomeRef.current = true;
    trackHomeScreen(resolvedUserId);
  }, [userLoading, user?._id, storedUserId]);

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
    trackEvent("home_cta_click", { user_id: user?._id, cta: "play_quiz" });

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

  const handleRegisterNow = () => {
    trackEvent("home_cta_click", { user_id: user?._id, cta: "register_now" });
    navigate("/profile");
  };

  const handleCoinsEarned = (amount: number) => {
    const newTotal = currentCoins + amount;
    updateCoins(newTotal);
    updateUserLocally({ dailyClaimAvailable: false });
    markUserStale();
  };

  if (showSplash || userLoading) {
    return <SplashScreen dataLoaded={!userLoading} />;
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
  const isShortPhone = isSmallScreen && viewportHeight < 780;

  const backgroundStyle = {
    backgroundColor: "#0e0316",
    backgroundImage: "url('/homebg1.jpg')",
    backgroundSize: "cover",
    backgroundPosition: "center",
    backgroundRepeat: "no-repeat",
  };

  return (
    <div
      className="min-h-[100dvh] flex flex-col overflow-y-auto"
      style={backgroundStyle}
    >     
      {!isSmallScreen && <Header logoAsTitle imageSrc={logo} showNotifications />}

      <div className={`flex-1 flex flex-col px-4 lg:px-8 w-full max-w-4xl mx-auto ${isSmallScreen ? "min-h-[calc(100dvh-4rem-env(safe-area-inset-bottom))] pt-2" : "min-h-0 pt-3 pb-4"}`}>
        <div className={`space-y-2 flex-shrink-0 ${isSmallScreen ? 'pt-1' : 'pt-2'} w-full`}>
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
                onClick={handleRegisterNow}
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

        <div className={`${isSmallScreen ? "flex-1 min-h-0 flex items-center justify-center py-2" : "flex items-center justify-center flex-1 py-4"}`}>
          <div className="relative flex flex-col items-center justify-center">
            <div
              className={`relative rounded-full flex items-center justify-center overflow-visible mx-auto ${
                isShortPhone
                  ? "w-[clamp(185px,min(52vw,34vh),265px)] h-[clamp(185px,min(52vw,34vh),265px)]"
                  : "w-[clamp(247px,min(73vw,47vh),377px)] h-[clamp(247px,min(73vw,47vh),377px)]"
              } sm:w-[clamp(250px,min(40vw,36vh),360px)] sm:h-[clamp(250px,min(40vw,36vh),360px)] md:w-[clamp(280px,38vw,400px)] md:h-[clamp(280px,38vw,400px)]`}
            >
              <div
                className="absolute inset-0 z-0"
                style={{
                  backgroundImage: `url('/image.png')`,
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                  backgroundRepeat: "no-repeat",
                  transform: "translateY(-14%)",
                }}
              />
              <Link to="/profile" className="no-underline relative z-10">
                <Avatar className={`rounded-full overflow-visible relative ${
                  isShortPhone
                    ? "w-[clamp(140px,min(39vw,25vh),205px)] h-[clamp(140px,min(39vw,25vh),205px)]"
                    : "w-[clamp(192px,min(55vw,36vh),286px)] h-[clamp(192px,min(55vw,36vh),286px)]"
                } sm:w-[clamp(200px,min(34vw,30vh),280px)] sm:h-[clamp(200px,min(34vw,30vh),280px)]`}>
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
                className="absolute left-1/2 -translate-x-1/2 text-white font-extrabold text-center whitespace-nowrap -bottom-5 text-lg sm:text-2xl md:text-3xl max-w-[190px] sm:max-w-[260px] md:max-w-[300px]"
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

        <div className={`space-y-2 flex-shrink-0 w-full mt-auto ${isSmallScreen ? 'pt-1 pb-[calc(7.1rem+env(safe-area-inset-bottom))]' : 'pt-6'}`}>
          <Button
            variant="default"
            onClick={handleQuickQuiz}
            disabled={playButtonLoading || currentCoins < QUIZ_COST}
            className={`w-full flex items-center justify-between px-4 sm:px-6 ${isSmallScreen ? 'h-16' : 'h-24 sm:h-24'}`}
          >
            {playButtonLoading ? (
              <div className="flex items-center justify-center w-full gap-2 text-lg sm:text-2xl">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                Starting Quiz...
              </div>
            ) : (
              <>
                <div className="flex items-center justify-center gap-3 sm:gap-4 h-full">
                  <span className="text-3xl sm:text-5xl font-bold text-white leading-none flex items-center -translate-y-[1px]">
                    Play
                  </span>

                  <span className="text-sm sm:text-lg font-semibold text-yellow-300 flex items-center gap-1.5 bg-gray-700/70 px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-full">
                    <svg
                      viewBox="0 0 24 24"
                      className="h-4 w-4 sm:h-6 sm:w-6"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <circle cx="12" cy="12" r="8" fill="#f59e0b" />
                      <circle cx="12" cy="12" r="7" fill="#fbbf24" />
                      <circle cx="12" cy="12" r="4" fill="#f59e0b" opacity="0.4" />
                    </svg>
                    {QUIZ_COST}
                  </span>
                </div>

                <div className="bg-white rounded-full w-12 h-12 sm:w-[72px] sm:h-[72px] flex flex-col items-center justify-center shadow-md border-2 border-green-500">
                  <span className="text-green-600 text-xl sm:text-3xl font-bold leading-none">
                    {userLevel}
                  </span>
                  <span className="text-green-600 text-[9px] sm:text-xs font-semibold uppercase leading-none tracking-wide mt-0.5">
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
    </div>
  );
}
