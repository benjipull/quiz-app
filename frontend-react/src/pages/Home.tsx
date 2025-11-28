// Home.tsx - Fixed Layout (No Scroll, Perfect Fit)
import { useState, useEffect } from "react";
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

import { AlertTriangle, Heart } from "lucide-react";
import logo from "../assets/images/QuizicleLogo.png";
import SplashScreen from "../components/SplashScreen";
import GameStatsHeader from "../components/GameStatsHeader";
import { useToast } from "@/hooks/use-toast";
import { apiClient } from "@/utils/apiClient";
import DailyCoinClaim from "@/components/DailyCoinClaim";

const avatarImages = import.meta.glob("../assets/images/avatars/*.png", {
  eager: true,
  import: "default",
});
const avatars: string[] = Object.values(avatarImages) as string[];

const BASE_URL = import.meta.env.VITE_BASE_URL;
const QUIZ_COST = 100;

interface CategoryToPlayResponse {
  message: string;
  categoryId: string;
  name: string;
  averageRating: number;
  questionsCount: number;
}

interface UserDetails {
  _id: string;
  alias: string;
  level: number;
  avatar: number;
  userType?: "Guest" | "Registered" | "Admin";
  interests?: string[];
  coins?: number;
}

interface ErrorResponse {
  message: string;
}

export default function Home() {
  const [loading, setLoading] = useState(true);
  const [playButtonLoading, setPlayButtonLoading] = useState(false);
  const [showSplash, setShowSplash] = useState(false);
  const [dataLoaded, setDataLoaded] = useState(false);
  const [userProfile, setUserProfile] = useState<UserDetails | null>(null);
  const [userAvatar, setUserAvatar] = useState<string | null>(null);
  const [userLevel, setUserLevel] = useState(1);
  const [isSmallScreen, setIsSmallScreen] = useState(false);
  const [isGuest, setIsGuest] = useState(false);
  const [currentCoins, setCurrentCoins] = useState(0);

  const [isInterestModalOpen, setIsInterestModalOpen] = useState(false);
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [savingInterests, setSavingInterests] = useState(false);

  const navigate = useNavigate();
  const userToken = typeof window !== "undefined" ? localStorage.getItem("token") || "" : "";
  const { toast, dismiss } = useToast();

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
    if (userProfile && userToken) {
      trackHomeScreen(userProfile._id);

      if (userProfile.coins !== undefined) {
        setCurrentCoins(userProfile.coins);
      }

      if (!userProfile.interests || userProfile.interests.length === 0) {
        setTimeout(() => {
          setIsInterestModalOpen(true);
          trackEvent("view_interests", {
            user_id: userProfile._id,
            context: "first_login_prompt",
          });
        }, 500);
      }
    }
  }, [userProfile, userToken]);

  const loadUserProfile = async () => {
    if (!userToken) {
      const storedUser = typeof window !== 'undefined' ? localStorage.getItem("user") : null;
      if (storedUser) {
        try {
          const parsedUser: UserDetails = JSON.parse(storedUser);
          setUserProfile(parsedUser);
          if (parsedUser.level) setUserLevel(parsedUser.level);
          setIsGuest(parsedUser.userType === 'Guest');
          setSelectedInterests(parsedUser.interests || []);
          if (parsedUser.coins !== undefined) setCurrentCoins(parsedUser.coins);
        } catch (e) {
          console.error("Failed to parse local user data:", e);
        }
      } else {
        navigate("/auth");
      }
      return;
    }

    try {
      const response = await apiClient(`${BASE_URL}/api/getUserDetails`, {
        method: "GET",
      });

      if (!response) return;

      if (!response.ok) {
        console.warn(`Failed to fetch user details (Status: ${response.status}). Falling back to local storage.`);
        const storedUser = typeof window !== 'undefined' ? localStorage.getItem("user") : null;
        if (storedUser) {
          const parsedUser: UserDetails = JSON.parse(storedUser);
          setUserProfile(parsedUser);
          if (parsedUser.level) setUserLevel(parsedUser.level);
          setIsGuest(parsedUser.userType === 'Guest');
          setSelectedInterests(parsedUser.interests || []);
          if (parsedUser.coins !== undefined) setCurrentCoins(parsedUser.coins);
        }
        return;
      }

      const apiUser: UserDetails = await response.json();

      setUserProfile(apiUser);
      setUserLevel(apiUser.level || 1);
      setIsGuest(apiUser.userType === 'Guest');
      setSelectedInterests(apiUser.interests || []);
      if (apiUser.coins !== undefined) setCurrentCoins(apiUser.coins);

      const avatarIndex = apiUser.avatar ? apiUser.avatar - 1 : 0;
      const calculatedAvatar = avatars[avatarIndex] || null;
      setUserAvatar(calculatedAvatar);

      if (typeof window !== 'undefined') {
        const userToStore = {
          ...apiUser,
          level: apiUser.level || 1,
          userType: apiUser.userType || 'Registered',
          interests: apiUser.interests || [],
          coins: apiUser.coins || 0,
        };
        localStorage.setItem("user", JSON.stringify(userToStore));
        if (calculatedAvatar) {
          localStorage.setItem("userAvatar", calculatedAvatar);
        }
      }
    } catch (error) {
      console.error("Error fetching user details from API:", error);
      const storedUser = typeof window !== 'undefined' ? localStorage.getItem("user") : null;
      if (storedUser) {
        try {
          const parsedUser: UserDetails = JSON.parse(storedUser);
          setUserProfile(parsedUser);
          if (parsedUser.level) setUserLevel(parsedUser.level);
          setIsGuest(parsedUser.userType === 'Guest');
          setSelectedInterests(parsedUser.interests || []);
          if (parsedUser.coins !== undefined) setCurrentCoins(parsedUser.coins);
        } catch (e) {
          console.error("Failed to parse local user data on API error:", e);
        }
      }
    }
  };

  const handleQuickQuiz = async () => {
    if (!userToken) {
      console.log("⚠️ You must be logged in to play.");
      return;
    }

    const optimisticCoins = currentCoins - QUIZ_COST;
    setCurrentCoins(optimisticCoins);
    setPlayButtonLoading(true);

    try {
      const response = await apiClient(`${BASE_URL}/api/getGetegoryToPlay`, {
        method: "GET",
      });

      if (!response) {
        setCurrentCoins(prev => prev + QUIZ_COST);
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

        toast({
          title: "Quiz Start Failed",
          description: errorData.message.includes("refunded")
            ? errorData.message
            : `Unable to start quiz: ${errorData.message}`,
          variant: "destructive",
        });

        await loadUserProfile();
        throw new Error(`Failed to get category to play: ${response.status}`);
      }

      const data: CategoryToPlayResponse = await response.json();

      if (data.categoryId) {
        navigate(`/quiz/${data.categoryId}`);
      } else {
        setCurrentCoins(prev => prev + QUIZ_COST);
        throw new Error("No category ID returned from server");
      }
    } catch (error) {
      console.error("Error getting category to play:", error);
      console.log("❌ Unable to start quiz. Please try again later.");
    } finally {
      setPlayButtonLoading(false);
    }
  };

  const handleInterestChange = (newSelectedIds: string[]) => {
    setSelectedInterests(newSelectedIds);
  };

  const handleSaveInterests = async () => {
    if (!userProfile?._id) return;
    setSavingInterests(true);
    try {
      const token = localStorage.getItem("token");
      if (!token) throw new Error("Authentication token missing.");

      const interestsResponse = await fetch(
        `${BASE_URL}/api/interests/user/${userProfile._id}`,
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

      const updatedUser = {
        ...userProfile,
        interests: selectedInterests,
      };

      setUserProfile(updatedUser);
      localStorage.setItem("user", JSON.stringify(updatedUser));

      trackEvent("update_interests", {
        user_id: userProfile._id,
        interest_count: selectedInterests.length,
        context: "home_screen_modal",
      });

      toast({
        title: "Success",
        description: `Interests updated successfully! (${selectedInterests.length} selected)`,
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

      const storedUser = localStorage.getItem("user");
      if (storedUser) {
        try {
          const user: UserDetails = JSON.parse(storedUser);
          const updatedUser = { ...user, coins: newTotal };
          localStorage.setItem("user", JSON.stringify(updatedUser));
        } catch (e) {
          console.error("Failed to update coins in localStorage:", e);
        }
      }

      return newTotal;
    });
  };

  const handleCoinsUpdate = (coins: number) => {
    setCurrentCoins(coins);
  };

  if (showSplash) {
    return <SplashScreen dataLoaded={dataLoaded} />;
  }

  const alias = userProfile?.alias || "Guest";
  const avatarImage = userAvatar || undefined;

  return (
    <div className="fixed inset-0 flex flex-col bg-background overflow-hidden">
      {!isSmallScreen && <Header logoAsTitle imageSrc={logo} showNotifications />}

      <div className="flex-1 flex flex-col px-4 lg:px-8 w-full overflow-hidden">
        {/* Top Section - Stats and Notifications */}
        <div className={`space-y-3 flex-shrink-0 ${isSmallScreen ? 'pt-2' : 'pt-3'} max-w-4xl mx-auto w-full`}>
          <GameStatsHeader
            userToken={userToken}
            isParentLoading={loading}
            onCoinsUpdate={handleCoinsUpdate}
            currentCoinsFromParent={currentCoins}
          />

          {isGuest && (
            <Card className="bg-gradient-to-br from-[#100321] via-[#2d1b4e] to-[#380d67] border-gray-200 dark:border-gray-700 dark:text-white p-3 shadow-lg flex items-center justify-between space-x-3">
              <div className="flex items-center space-x-3 flex-shrink-0">
                <AlertTriangle className="w-5 h-5 text-red-500 dark:text-purple-400" />
              </div>
              <p className="text-sm text-white font-semibold leading-snug flex-grow">
                Don't lose your progress
              </p>
              <Button
                variant="default"
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

        {/* Middle Section - Avatar (Flexibly sized) */}
        <div className="flex items-center justify-center flex-1 min-h-0">
          <div className="relative flex flex-col items-center justify-center">
            <Link to="/profile" className="z-10">
              <Avatar className={`${isSmallScreen ? 'w-[190px] h-[190px]' : 'w-[180px] h-[180px] sm:w-[200px] sm:h-[200px]'}`}>
                <AvatarImage src={avatarImage} className="object-contain scale-110" />
                <AvatarFallback className="text-white text-5xl">{alias[0]}</AvatarFallback>
              </Avatar>
            </Link>

            <h2 className={`mt-4 text-white font-extrabold drop-shadow-lg capitalize ${isSmallScreen ? 'text-3xl' : 'text-3xl sm:text-4xl'}`}>
              {alias}
            </h2>
          </div>
        </div>

        {/* Bottom Section - Play Button (Fixed) */}
        <div className={`space-y-2 flex-shrink-0 max-w-4xl mx-auto w-full ${isSmallScreen ? 'pb-32' : 'pb-20'}`}>
          <Button
            variant="default"
            onClick={handleQuickQuiz}
            disabled={loading || playButtonLoading || currentCoins < QUIZ_COST}
            className="w-full h-20 sm:h-24 flex items-center justify-between px-6 rounded-[50px]"
          >
            {playButtonLoading ? (
              <div className="flex items-center text-2xl sm:text-3xl justify-center w-full">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white mr-3"></div>
                Starting Quiz...
              </div>
            ) : (
              <>
                <div className="flex items-center gap-3">
                  <span className="text-4xl sm:text-5xl font-extrabold text-white leading-none">
                    Play
                  </span>
                  <span className="text-base sm:text-lg font-semibold text-yellow-300 flex items-center gap-1">
                    <svg viewBox="0 0 24 24" className="h-7 w-7 sm:h-8 sm:w-8" xmlns="http://www.w3.org/2000/svg">
                      <circle cx="12" cy="12" r="8" fill="#f59e0b" />
                      <circle cx="12" cy="12" r="7" fill="#fbbf24" />
                      <circle cx="12" cy="12" r="4" fill="#f59e0b" opacity="0.4" />
                    </svg>
                    {QUIZ_COST}
                  </span>
                </div>

                <div className="bg-white rounded-full w-16 h-16 sm:w-20 sm:h-20 flex flex-col items-center justify-center shadow-md border-2 border-indigo-300">
                  <span className="text-green-600 text-2xl sm:text-3xl font-bold leading-none">
                    {userLevel}
                  </span>
                  <span className="text-green-600 text-xs sm:text-sm font-semibold uppercase leading-none tracking-wide">
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
            {userProfile?._id && (
              <InterestSelector
                userId={userProfile._id}
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