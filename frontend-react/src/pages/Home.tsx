// Home.tsx - Direct API calls without preloader
import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { trackHomeScreen } from "@/utils/analytics";
import { trackEvent } from "@/utils/analytics";
import { trackFirstSessionInteraction } from "@/utils/analytics";
import { setGAUser } from "@/utils/gaClient";
import {
  AlertTriangle,
  RefreshCw,
} from "lucide-react";
import logo from "../assets/images/QuizicleLogo.png";
import SplashScreen from "../components/SplashScreen";
import GameStatsHeader from "../components/GameStatsHeader";
import { useToast } from "@/hooks/use-toast";
import DailyCoinClaim from "@/components/DailyCoinClaim";
import { useUser } from "@/contexts/UserContext";
import { loadLevelConfig, resolveLevelProgress, type LevelConfigEntry } from "@/utils/levelConfig";
import { getApiBaseUrl } from "@/utils/baseUrl";

const avatarImages = import.meta.glob("../assets/images/avatars/*.png", {
  eager: true,
  import: "default",
});
const avatars: string[] = Object.values(avatarImages) as string[];

const BASE_URL = getApiBaseUrl();
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
  const [refreshCategoryLoading, setRefreshCategoryLoading] = useState(false);
  const [nextCategoryPreview, setNextCategoryPreview] = useState<CategoryToPlayResponse | null>(null);
  const [levelConfig, setLevelConfig] = useState<LevelConfigEntry[] | null>(null);
  const [levelConfigError, setLevelConfigError] = useState<string | null>(null);
  const [hasCategoryBootstrapCompleted, setHasCategoryBootstrapCompleted] = useState(false);
  const [showSplash, setShowSplash] = useState(false);
  const [userAvatar, setUserAvatar] = useState<string | null>(null);
  const [editAlias, setEditAlias] = useState("");
  const [editAvatarIndex, setEditAvatarIndex] = useState(0);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isSmallScreen, setIsSmallScreen] = useState(false);
  const [viewportWidth, setViewportWidth] = useState<number>(typeof window !== "undefined" ? window.innerWidth : 390);
  const [viewportHeight, setViewportHeight] = useState<number>(typeof window !== "undefined" ? window.innerHeight : 800);

  // Simple component-level cache for next category
  const categoryCache = useRef<{
    data: CategoryToPlayResponse | null;
    timestamp: number;
  }>({ data: null, timestamp: 0 });
  const categoryPrefetchPromiseRef = useRef<Promise<CategoryToPlayResponse | null> | null>(null);
  const categoryBootstrapUserIdRef = useRef<string | null>(null);

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

  const trackHomeScreenIfNeeded = (resolvedUserId?: string) => {
    if (hasTrackedHomeRef.current) return;
    if (resolvedUserId) {
      setGAUser(resolvedUserId);
    }
    hasTrackedHomeRef.current = true;
    trackHomeScreen(resolvedUserId);
  };

  // Check screen size
  useEffect(() => {
    const checkScreenSize = () => {
      setIsSmallScreen(window.innerWidth < 768);
      setViewportWidth(window.innerWidth);
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
      setEditAvatarIndex(avatarIndex >= 0 ? avatarIndex : 0);
      setEditAlias(user.alias || "");

    }
  }, [user, userLoading, navigate, refreshUser]);

  useEffect(() => {
    trackHomeScreenIfNeeded(storedUserId);
  }, [storedUserId]);

  useEffect(() => {
    trackHomeScreenIfNeeded(user?._id || storedUserId);
  }, [user?._id, storedUserId]);

  useEffect(() => {
    let isMounted = true;

    loadLevelConfig()
      .then((levels) => {
        if (!isMounted) return;
        setLevelConfig(levels);
      })
      .catch((error) => {
        if (!isMounted) return;
        setLevelConfigError((error as Error).message);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  // ✅ Fetch category on-demand (with component-level cache)
  const fetchCategoryToPlay = async (
    options?: { force?: boolean; excludeCategoryId?: string }
  ): Promise<CategoryToPlayResponse | null> => {
    const now = Date.now();
    const CACHE_DURATION = 2 * 60 * 1000; // 2 minutes cache
    const force = options?.force === true;
    const excludeCategoryId = options?.excludeCategoryId;

    const buildCategoryToPlayUrl = (endpoint: string) => {
      if (!excludeCategoryId) return endpoint;
      return `${endpoint}?exclude=${encodeURIComponent(excludeCategoryId)}`;
    };
    
    // Check cache first
    if (
      !force &&
      categoryCache.current.data &&
      (now - categoryCache.current.timestamp) < CACHE_DURATION &&
      categoryCache.current.data.categoryId !== excludeCategoryId
    ) {
      console.log("⚡ Using cached category");
      setNextCategoryPreview(categoryCache.current.data);
      return categoryCache.current.data;
    }

    try {
      console.log("🌐 Fetching next category from API...");
      let response = await fetchWithTimeout(
        buildCategoryToPlayUrl(`${BASE_URL}/api/getCategoryToPlay`),
        { method: "GET" },
        API_TIMEOUT
      );

      if (response.status === 404) {
        response = await fetchWithTimeout(
          buildCategoryToPlayUrl(`${BASE_URL}/api/getGetegoryToPlay`),
          { method: "GET" },
          API_TIMEOUT
        );
      }

      if (response && response.ok) {
        const data: CategoryToPlayResponse = await response.json();
        if (data.categoryId) {
          // Update cache
          categoryCache.current = {
            data: data,
            timestamp: now
          };
          console.log("✅ Category fetched and cached:", data.categoryId);
          setNextCategoryPreview(data);
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

  useEffect(() => {
    if (!userToken || userLoading || !user) return;

    if (categoryBootstrapUserIdRef.current !== user._id) {
      categoryBootstrapUserIdRef.current = user._id;
      setHasCategoryBootstrapCompleted(false);
      categoryCache.current = { data: null, timestamp: 0 };
      setNextCategoryPreview(null);
    }

    if (categoryCache.current.data) {
      setNextCategoryPreview(categoryCache.current.data);
      setHasCategoryBootstrapCompleted(true);
      return;
    }

    if (!categoryPrefetchPromiseRef.current) {
      categoryPrefetchPromiseRef.current = fetchCategoryToPlay().finally(() => {
        categoryPrefetchPromiseRef.current = null;
      });
    }

    categoryPrefetchPromiseRef.current
      .catch((error) => {
        console.warn("Category prefetch on home load failed:", (error as Error).message);
      })
      .finally(() => {
        setHasCategoryBootstrapCompleted(true);
      });
  }, [userToken, userLoading, user?._id]);

  const handleQuickQuiz = async () => {
    const resolvedUserId = user?._id || storedUserId;
    trackHomeScreenIfNeeded(resolvedUserId);
    trackFirstSessionInteraction({
      user_id: resolvedUserId,
      event_label: "Play Now",
      location: "home",
      cta: "play_quiz",
    });
    trackEvent("home_cta_click", { user_id: resolvedUserId, cta: "play_quiz" });

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
      // Reuse the value loaded for the home screen first.
      const cachedCategory = categoryCache.current.data || nextCategoryPreview;
      if (!categoryPrefetchPromiseRef.current) {
        categoryPrefetchPromiseRef.current = fetchCategoryToPlay().finally(() => {
          categoryPrefetchPromiseRef.current = null;
        });
      }

      const category = cachedCategory?.categoryId
        ? cachedCategory
        : await categoryPrefetchPromiseRef.current;
      
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

  const handleRefreshCategory = async () => {
    if (!userToken || refreshCategoryLoading || playButtonLoading) return;

    const resolvedUserId = user?._id || storedUserId;
    trackFirstSessionInteraction({
      user_id: resolvedUserId,
      event_label: "Refresh Category",
      location: "home",
      cta: "refresh_category",
    });
    trackEvent("home_cta_click", { user_id: resolvedUserId, cta: "refresh_category" });

    setRefreshCategoryLoading(true);
    try {
      const refreshedCategory = await fetchCategoryToPlay({
        force: true,
        excludeCategoryId: nextCategoryPreview?.categoryId,
      });

      if (!refreshedCategory?.categoryId) {
        toast({
          title: "No Category Found",
          description: "Could not load another category right now. Please try again.",
          variant: "destructive",
        });
        return;
      }

      if (refreshedCategory.categoryId === nextCategoryPreview?.categoryId) {
        toast({
          title: "No New Category",
          description: "No alternate category is currently available.",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: `Failed to refresh category: ${(error as Error).message}`,
        variant: "destructive",
      });
    } finally {
      setRefreshCategoryLoading(false);
    }
  };

  const handleCoinsEarned = (amount: number) => {
    const newTotal = currentCoins + amount;
    updateCoins(newTotal);
    updateUserLocally({ dailyClaimAvailable: false });
    markUserStale();
  };

  const openEditDialog = () => {
    const avatarIndex = user?.avatar ? user.avatar - 1 : 0;
    setEditAvatarIndex(avatarIndex >= 0 ? avatarIndex : 0);
    setEditAlias(user?.alias || "");
    setIsEditDialogOpen(true);
  };

  const handleSaveAliasAvatar = async () => {
    const trimmedAlias = editAlias.trim();
    if (!trimmedAlias) {
      toast({
        title: "Validation Error",
        description: "Please enter a valid alias.",
        variant: "destructive",
      });
      return;
    }

    if (!userToken) {
      toast({
        title: "Authentication Error",
        description: "Please log in again.",
        variant: "destructive",
      });
      return;
    }

    setIsSavingProfile(true);
    try {
      const selectedAvatar = editAvatarIndex + 1;
      const response = await fetch(`${BASE_URL}/api/updateUserDetails`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${userToken}`,
        },
        body: JSON.stringify({
          alias: trimmedAlias,
          avatar: selectedAvatar,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData?.error || "Failed to update profile.");
      }

      updateUserLocally({
        alias: trimmedAlias,
        avatar: selectedAvatar,
      });
      setUserAvatar(avatars[editAvatarIndex] || null);
      markUserStale();
      await refreshUser();
      setIsEditDialogOpen(false);
    } catch (error) {
      toast({
        title: "Error",
        description: `Failed to update profile: ${(error as Error).message}`,
        variant: "destructive",
      });
    } finally {
      setIsSavingProfile(false);
    }
  };

  const isLevelConfigLoading = !levelConfig && !levelConfigError;
  const isHomeDataLoading =
    userLoading ||
    isLevelConfigLoading ||
    (!!userToken && !!user && !hasCategoryBootstrapCompleted);

  if (showSplash || isHomeDataLoading) {
    return <SplashScreen dataLoaded={!showSplash && !isHomeDataLoading} />;
  }

  if (levelConfigError) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{
          background: `radial-gradient(circle at center, #2a0a3b 0%, #180524 55%, #0e0316 100%)`,
        }}
      >
        <div className="flex flex-col items-center gap-4 text-center px-4">
          <AlertTriangle className="w-16 h-16 text-yellow-500" />
          <p className="text-white text-lg">Unable to load level configuration</p>
          <p className="text-white/80 text-sm max-w-md">{levelConfigError}</p>
          <Button onClick={() => window.location.reload()}>Reload Page</Button>
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
  const knowledgePoints = Math.max(0, user.knowledgePoints ?? 0);
  const levelProgress = levelConfig ? resolveLevelProgress(knowledgePoints, levelConfig) : null;
  const userLevel = levelProgress?.currentLevel ?? Math.max(1, Number(user.level ?? 1));
  const nextLevel = levelProgress?.nextLevel ?? userLevel;
  const levelProgressPoints = levelProgress?.progressIntoLevel ?? 0;
  const levelProgressTarget = levelProgress?.progressToNextLevel ?? 0;
  const remainingKpToNextLevel = levelProgress?.remainingKpToNextLevel ?? 0;
  const levelProgressPercent = levelProgressTarget > 0
    ? (levelProgressPoints / levelProgressTarget) * 100
    : 100;
  const isUltraShortHeight = isSmallScreen && viewportHeight <= 520;
  const isCompactEconomyResolution = isSmallScreen && (viewportHeight <= 700 || viewportWidth <= 360);
  const isTinyPhone = isSmallScreen && viewportWidth <= 360 && viewportHeight <= 700;
  const isShortPhone = isSmallScreen && viewportHeight < 780;
  const isDesktopView = viewportWidth >= 1024;
  const hasBottomTabs = !isDesktopView;
  const avatarSizeClass = `${
    isTinyPhone
      ? "w-[clamp(112px,min(33vw,20vh),150px)] h-[clamp(112px,min(33vw,20vh),150px)]"
      : isShortPhone
      ? "w-[clamp(140px,min(39vw,25vh),205px)] h-[clamp(140px,min(39vw,25vh),205px)]"
      : "w-[clamp(192px,min(55vw,36vh),286px)] h-[clamp(192px,min(55vw,36vh),286px)]"
  } sm:w-[clamp(200px,min(34vw,30vh),280px)] sm:h-[clamp(200px,min(34vw,30vh),280px)]`;
  // Keep a consistent moon-to-avatar proportion across all resolutions.
  const moonScale = 1.4;
  const moonTranslateY = "calc(-56% - 10px)";
  const aliasHeadingClass = isTinyPhone
    ? "text-white font-extrabold text-center whitespace-nowrap text-xl max-w-[180px]"
    : "text-white font-extrabold text-center whitespace-nowrap text-2xl sm:text-3xl md:text-4xl max-w-[220px] sm:max-w-[300px] md:max-w-[360px]";

  return (
    <div className="relative isolate min-h-[100dvh] flex flex-col overflow-y-auto bg-[#0e0316]">
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-[#0e0316]">
        <img
          src="/homebg1.jpg"
          alt=""
          aria-hidden="true"
          className="h-full w-full object-cover object-center"
        />
      </div>

      {isDesktopView && <Header logoAsTitle imageSrc={logo} showNotifications />}

      <div className={`relative flex-1 flex flex-col px-4 lg:px-8 w-full max-w-4xl mx-auto ${hasBottomTabs ? "min-h-[calc(100dvh-4rem-env(safe-area-inset-bottom))] pt-2" : "min-h-0 pt-3 pb-4"}`}>
        <div className={`relative z-20 ${isUltraShortHeight ? "space-y-2" : "space-y-[28px]"} flex-shrink-0 ${isSmallScreen ? 'pt-1' : 'pt-2'} w-full`}>
          <GameStatsHeader
            userToken={userToken}
            isParentLoading={false}
            currentCoinsFromParent={currentCoins}
            userXP={user.knowledgePoints ?? 0}
            userGem1={user.wisdomGems ?? 0}
            userGem2={user.enlightenmentCrystals ?? 0}
            compactMode={isCompactEconomyResolution}
          />

          <DailyCoinClaim
            userToken={userToken}
            onCoinsEarned={refreshUser}
            isClaimAvailable={user.dailyClaimAvailable ?? false} 
            updateUserLocally={updateUserLocally}
            lastDailyCoinClaim={user.lastDailyCoinClaim ?? null}
          />
        </div>

        <div className={`relative z-20 ${isSmallScreen ? "flex-1 min-h-0 flex items-center justify-center py-2" : "flex items-center justify-center flex-1 py-4"}`}>
          <div className="relative flex flex-col items-center justify-center">
            <div className="relative rounded-full flex items-center justify-center overflow-visible mx-auto">
              <div className="relative z-10 flex flex-col items-center">
                <div
                  role="button"
                  tabIndex={0}
                  onClick={openEditDialog}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      openEditDialog();
                    }
                  }}
                  aria-label="Edit avatar and alias"
                  className="cursor-pointer flex flex-col items-center"
                >
                  <div className={`relative ${avatarSizeClass}`}>
                    <div
                      className="pointer-events-none absolute left-1/2 top-1/2 z-0"
                      style={{
                        width: `${moonScale * 100}%`,
                        height: `${moonScale * 100}%`,
                        backgroundImage: "url('/image.png')",
                        backgroundSize: "contain",
                        backgroundPosition: "center",
                        backgroundRepeat: "no-repeat",
                        transform: `translate(-50%, ${moonTranslateY})`,
                        opacity: 0.96,
                      }}
                    />
                  <Avatar className="rounded-full overflow-visible relative z-10 w-full h-full">
                    <AvatarImage
                      src={avatarImage}
                      alt={alias}
                      className="object-contain scale-[1.12] relative z-10"
                    />
                    <AvatarFallback className="bg-transparent border-none text-white font-bold text-3xl md:text-4xl">
                      {alias.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  </div>
                  <div className={`z-20 pointer-events-none ${isTinyPhone ? "mt-4 sm:mt-8" : "mt-7 sm:mt-8"} flex justify-center`}>
                    <div className="relative w-fit">
                      <h2
                        className={aliasHeadingClass}
                        style={{
                          textShadow: '0 0 8px rgba(255,255,255,0.6), 0 0 12px rgba(255,255,255,0.4)',
                        }}
                      >
                        {alias
                          .split(/[\s-_]+/)
                          .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
                          .join(" ")}
                      </h2>
                      <img
                        src="/assets/images/icons/edit-icon-cropped.png"
                        alt=""
                        aria-hidden="true"
                        className={`absolute left-full top-1/2 -translate-y-1/2 ml-2 sm:ml-2.5 ${isTinyPhone ? "text-xl w-[1.8em] h-[1.8em]" : "text-2xl sm:text-3xl md:text-4xl w-[2em] h-[2em]"} opacity-100 drop-shadow-[0_0_6px_rgba(255,255,255,0.55)] shrink-0`}
                      />
                    </div>
                  </div>
                </div>
                <div
                  className={`z-20 ${isTinyPhone ? "mt-4 sm:mt-8 w-[min(92vw,320px)] sm:w-[min(70vw,430px)]" : "mt-7 sm:mt-8 w-[min(92vw,380px)] sm:w-[min(70vw,430px)]"}`}
                >
                  <div className={`relative ${isTinyPhone ? "h-[30px] sm:h-[39px]" : "h-[35px] sm:h-[39px]"} w-full rounded-full bg-white/20 overflow-hidden border border-white/25`}>
                    <div
                      className="h-full rounded-full transition-[width] duration-500 ease-out"
                      style={{
                        width: `${levelProgressPercent}%`,
                        background: "linear-gradient(90deg, #22D3EE 0%, #06B6D4 55%, #67E8F9 100%)",
                        boxShadow: "0 0 14px rgba(34,211,238,0.55)",
                      }}
                    />
                    <span className={`absolute left-2 sm:left-2.5 top-1/2 -translate-y-1/2 z-10 ${isTinyPhone ? "text-[9px] sm:text-xs" : "text-[10px] sm:text-xs"} font-extrabold uppercase tracking-[0.08em] text-[#D8FFBD] drop-shadow-[0_1px_2px_rgba(0,0,0,0.7)]`}>
                      Level {userLevel}
                    </span>
                    <span className={`absolute right-2 sm:right-2.5 top-1/2 -translate-y-1/2 z-10 ${isTinyPhone ? "text-[9px] sm:text-xs" : "text-[10px] sm:text-xs"} font-extrabold uppercase tracking-[0.08em] text-[#D8FFBD] drop-shadow-[0_1px_2px_rgba(0,0,0,0.7)]`}>
                      Level {nextLevel}
                    </span>
                    <span className={`absolute inset-0 z-10 flex items-center justify-center ${isTinyPhone ? "text-[9px] sm:text-xs" : "text-[10px] sm:text-xs"} font-bold text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.7)]`}>
                      {levelProgressPoints}/{levelProgressTarget || levelProgressPoints} KP
                    </span>
                  </div>
                  <p className={`mt-1.5 text-center ${isTinyPhone ? "text-[10px] sm:text-sm" : "text-[11px] sm:text-sm"} font-semibold text-[#D8FFBD] drop-shadow-[0_1px_2px_rgba(0,0,0,0.7)]`}>
                    {remainingKpToNextLevel}KP left to Level {nextLevel}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className={`space-y-2 flex-shrink-0 w-full mt-auto ${hasBottomTabs ? 'pt-1 pb-[calc(7.1rem+env(safe-area-inset-bottom))]' : 'pt-6'}`}>
          <Button
            variant="default"
            onClick={handleQuickQuiz}
            disabled={playButtonLoading || currentCoins < QUIZ_COST}
            className={`relative w-full overflow-hidden px-3 sm:px-4 py-0 ${isTinyPhone ? 'h-[4rem]' : isSmallScreen ? 'h-[4.5rem]' : 'h-[5.4rem] sm:h-[5.4rem]'} ${!playButtonLoading && currentCoins >= QUIZ_COST ? "home-play-glow-pulse" : ""}`}
            style={{
              borderRadius: isTinyPhone ? "18px" : isSmallScreen ? "22px" : "28px",
              border: "2px solid #B2F574",
              background: "linear-gradient(180deg, rgba(103,217,63,0.58) 0%, rgba(63,188,55,0.5) 38%, rgba(28,157,42,0.45) 70%, rgba(18,132,32,0.4) 100%)",
              boxShadow: "0 10px 20px rgba(15,102,28,0.22)",
            }}
          >
            {playButtonLoading ? (
              <div className="flex items-center justify-center w-full gap-2 text-lg sm:text-2xl">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                Starting Quiz...
              </div>
            ) : (
              <>
                <span
                  className="pointer-events-none absolute left-0 right-0 top-0 h-[42%] opacity-95"
                  style={{
                    background:
                      "linear-gradient(180deg, rgba(255,255,255,0.5) 0%, rgba(255,255,255,0.08) 60%, rgba(255,255,255,0) 100%)",
                    borderRadius: isTinyPhone ? "18px" : isSmallScreen ? "22px" : "28px",
                  }}
                />
                <span
                  className="pointer-events-none absolute inset-0 opacity-80"
                  style={{
                    background:
                      "radial-gradient(circle at 16% 28%, rgba(255,255,120,0.2) 0%, rgba(255,255,120,0) 32%), radial-gradient(circle at 85% 70%, rgba(255,255,255,0.14) 0%, rgba(255,255,255,0) 36%)",
                    borderRadius: isTinyPhone ? "18px" : isSmallScreen ? "22px" : "28px",
                  }}
                />

                <div className="relative z-10 grid h-full w-full grid-cols-[1fr_auto] items-center gap-2 sm:gap-3">
                  <span className={`pointer-events-none absolute ${isTinyPhone ? "left-[-18px]" : "left-[-23px]"} inset-y-0 inline-flex items-center justify-start w-7 sm:w-8 md:w-9 shrink-0`}>
                    <img
                      src="/assets/images/icons/Play Icon.png"
                      alt=""
                      aria-hidden="true"
                      className={`h-7 sm:h-8 md:h-9 w-auto object-contain ${isTinyPhone ? "scale-[4.2] translate-y-[4px]" : "scale-[4.8] translate-y-[6px]"} origin-left`}
                    />
                  </span>
                  <div className={`${isTinyPhone ? "pl-[3.25rem] sm:pl-20 md:pl-24" : "pl-16 sm:pl-20 md:pl-24"} flex items-center gap-2.5 sm:gap-3`}>
                    <span className={`${isTinyPhone ? "text-base sm:text-2xl md:text-3xl" : "text-lg sm:text-2xl md:text-3xl"} font-bold text-white leading-none whitespace-nowrap flex items-center gap-1.5 sm:gap-2 drop-shadow-[0_2px_0_rgba(0,0,0,0.35)]`}>
                      Play Now
                    </span>

                    <span
                      className={`relative ${isTinyPhone ? "h-7 min-w-[66px] text-xs px-2" : "h-8 min-w-[74px] text-sm px-2.5"} sm:h-10 sm:min-w-[90px] sm:text-lg font-bold text-[#F6DE6C] flex items-center justify-center gap-1.5 sm:px-3 rounded-full`}
                      style={{
                        border: "1px solid rgba(158, 228, 120, 0.62)",
                        background: "linear-gradient(180deg, rgba(34,118,52,0.75) 0%, rgba(24,88,39,0.84) 48%, rgba(18,68,30,0.9) 100%)",
                        boxShadow: "inset 0 3px 6px rgba(5,35,11,0.74), inset 0 -2px 2px rgba(255,255,255,0.08), inset 0 0 0 1px rgba(10,52,20,0.62)",
                      }}
                    >
                      <span
                        className={`inline-flex items-center justify-center rounded-full ${isTinyPhone ? "h-3.5 w-3.5" : "h-4 w-4"} sm:h-5 sm:w-5`}
                        style={{
                          color: "#2D5E19",
                          background: "linear-gradient(180deg, #FFE98F 0%, #F2C63A 60%, #DAAB1D 100%)",
                          boxShadow: "inset 0 1px 0 rgba(255,255,255,0.62), inset 0 -1px 0 rgba(125,92,0,0.28), 0 1px 2px rgba(0,0,0,0.25)",
                        }}
                      >
                        <svg
                          viewBox="0 0 24 24"
                          className="h-2.5 w-2.5 sm:h-3 sm:w-3"
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                        >
                          <path
                            d="M5.5 12.5L10 17L18.5 8.5"
                            stroke="currentColor"
                            strokeWidth="3"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </span>
                      {QUIZ_COST}
                    </span>
                  </div>

                  <div
                    className={`rounded-full ${isTinyPhone ? "w-10 h-10" : "w-12 h-12"} sm:w-[72px] sm:h-[72px] flex flex-col items-center justify-center`}
                    style={{
                      border: "2px solid #7BD651",
                      background: "radial-gradient(circle at 34% 22%, #FFFFFF 0%, #F5FFF0 65%, #E8F8DF 100%)",
                      boxShadow: "0 2px 8px rgba(0,0,0,0.28), inset 0 2px 5px rgba(255,255,255,0.78), inset 0 -2px 4px rgba(132,181,94,0.25)",
                    }}
                  >
                    <span className={`text-[#41B646] ${isTinyPhone ? "text-lg" : "text-xl"} sm:text-3xl font-bold leading-none`}>
                      {userLevel}
                    </span>
                    <span className={`text-[#41B646] ${isTinyPhone ? "text-[8px]" : "text-[9px]"} sm:text-xs font-semibold uppercase leading-none tracking-wide`}>
                      Level
                    </span>
                  </div>
                </div>
              </>
            )}
          </Button>

          {nextCategoryPreview?.name && (
            <div className="w-full flex items-center justify-center">
              <div className="inline-flex items-center gap-2 sm:gap-3">
                <p className="text-center">
                <span className={`text-yellow-400 ${isTinyPhone ? "text-base sm:text-2xl" : "text-lg sm:text-2xl"} font-bold tracking-wide`}>
                  {nextCategoryPreview.name}
                </span>
                {/* Legacy preview text intentionally hidden */}
                {/*
                {nextCategoryPreview.name} - 5 Questions - ¬60 Seconds
                */}
                </p>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={handleRefreshCategory}
                  disabled={refreshCategoryLoading || playButtonLoading}
                  className="h-8 w-8 sm:h-9 sm:w-9 rounded-full border-yellow-400/70 bg-black/20 text-yellow-400 hover:bg-yellow-400/15 hover:text-yellow-300"
                  aria-label="Refresh category"
                >
                  <RefreshCw className={`h-4 w-4 ${refreshCategoryLoading ? "animate-spin" : ""}`} />
                </Button>
              </div>
            </div>
          )}

          {currentCoins < QUIZ_COST && (
            <p className="text-red-400 text-sm text-center font-medium">
              Not enough coins to start a quiz.
            </p>
          )}
        </div>
      </div>

      <style>{`
        @keyframes home-play-glow-pulse {
          0%, 80%, 100% {
            box-shadow: 0 10px 20px rgba(15,102,28,0.22);
          }
          90% {
            box-shadow:
              0 10px 20px rgba(15,102,28,0.22),
              0 0 18px rgba(178,245,116,0.58),
              0 0 32px rgba(178,245,116,0.36);
          }
        }

        .home-play-glow-pulse {
          animation: home-play-glow-pulse 4s ease-in-out infinite;
        }
      `}</style>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-md bg-card/95 backdrop-blur-sm border-border/70">
          <DialogHeader>
            <DialogTitle>Edit Avatar and Alias</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Select Avatar</Label>
              <div className="grid grid-cols-5 gap-2 p-2 border border-border rounded-lg bg-card/60">
                {avatars.map((avatarImg, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => setEditAvatarIndex(index)}
                    className={`rounded-full border-2 transition-all ${
                      editAvatarIndex === index
                        ? "border-primary ring-2 ring-primary/40 scale-105"
                        : "border-transparent hover:border-primary/50"
                    }`}
                    aria-label={`Select avatar ${index + 1}`}
                  >
                    <Avatar className="w-12 h-12">
                      <AvatarImage src={avatarImg} alt={`Avatar ${index + 1}`} />
                      <AvatarFallback>AV</AvatarFallback>
                    </Avatar>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="alias-edit">Alias</Label>
              <Input
                id="alias-edit"
                value={editAlias}
                onChange={(e) => setEditAlias(e.target.value)}
                placeholder="Enter alias"
                maxLength={30}
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsEditDialogOpen(false)}
                disabled={isSavingProfile}
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleSaveAliasAvatar}
                disabled={isSavingProfile}
              >
                {isSavingProfile ? "Saving..." : "OK"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
