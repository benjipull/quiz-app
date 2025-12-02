// Home.tsx - Using Preloaded Data (No Loading States)
import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
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
import GameStatsHeader from "../components/GameStatsHeader";
import { useToast } from "@/hooks/use-toast";
import DailyCoinClaim from "@/components/DailyCoinClaim";
import { appCache } from "@/App"; // Import the preloaded cache

const avatarImages = import.meta.glob("../assets/images/avatars/*.png", {
  eager: true,
  import: "default",
});
const avatars: string[] = Object.values(avatarImages) as string[];

const BASE_URL = import.meta.env.VITE_BASE_URL;
const QUIZ_COST = 50;

interface UserDetails {
  _id: string;
  alias: string;
  level: number;
  avatar: number;
  userType?: "Guest" | "Registered" | "Admin";
  interests?: string[];
  coins?: number;
}

export default function Home() {
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
  const userToken = localStorage.getItem("token") || "";
  const { toast } = useToast();

  useEffect(() => {
    // Load from preloaded cache instantly - NO API CALLS
    if (appCache.userProfile) {
      const cachedProfile = appCache.userProfile;
      
      setUserProfile(cachedProfile);
      setUserLevel(cachedProfile.level || 1);
      setIsGuest(cachedProfile.userType === 'Guest');
      setSelectedInterests(cachedProfile.interests || []);
      setCurrentCoins(cachedProfile.coins || 0);

      const avatarIndex = cachedProfile.avatar ? cachedProfile.avatar - 1 : 0;
      const calculatedAvatar = avatars[avatarIndex] || null;
      setUserAvatar(calculatedAvatar);

      console.log("✅ Loaded profile from cache");
    }

    const checkScreenSize = () => setIsSmallScreen(window.innerWidth < 768);
    checkScreenSize();
    window.addEventListener("resize", checkScreenSize);
    return () => window.removeEventListener("resize", checkScreenSize);
  }, []);

  useEffect(() => {
    if (userProfile && userToken) {
      trackHomeScreen(userProfile._id);

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

  const handleQuickQuiz = () => {
    if (!userToken) {
      console.log("⚠️ You must be logged in to play.");
      return;
    }

    // Check coins
    if (currentCoins < QUIZ_COST) {
      toast({
        title: "Not Enough Coins",
        description: `You need ${QUIZ_COST} coins to start a quiz.`,
        variant: "destructive",
      });
      return;
    }

    // Use preloaded category from cache
    if (appCache.firstQuestion && appCache.firstQuestion.categoryId) {
      const categoryId = appCache.firstQuestion.categoryId;
      
      // Optimistically update coins
      setCurrentCoins(prev => prev - QUIZ_COST);
      
      // Navigate instantly - NO LOADING
      navigate(`/quiz/${categoryId}`);
      
      console.log("✅ Starting quiz instantly with preloaded category");
      return;
    }

    // Fallback if cache is empty (shouldn't happen)
    toast({
      title: "Loading Quiz",
      description: "Please wait a moment...",
    });
    
    setTimeout(() => {
      if (appCache.firstQuestion?.categoryId) {
        setCurrentCoins(prev => prev - QUIZ_COST);
        navigate(`/quiz/${appCache.firstQuestion.categoryId}`);
      }
    }, 500);
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
      
      // Update cache
      appCache.userProfile = updatedUser;

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
          appCache.userProfile = updatedUser;
        } catch (e) {
          console.error("Failed to update coins:", e);
        }
      }

      return newTotal;
    });
  };

  const handleCoinsUpdate = (coins: number) => {
    setCurrentCoins(coins);
  };

  const alias = userProfile?.alias || "Guest";
  const avatarImage = userAvatar || undefined;

  return (
    <div
      className="fixed inset-0 flex flex-col overflow-hidden"
      style={{
        background: `radial-gradient(circle at center, #2a0a3b 0%, #180524 55%, #0e0316 100%)`,
      }}
    >     
      {!isSmallScreen && <Header logoAsTitle imageSrc={logo} showNotifications />}

      <div className="flex-1 flex flex-col px-4 lg:px-8 w-full overflow-hidden">
        {/* Top Section - Stats and Notifications */}
        <div className={`space-y-3 flex-shrink-0 ${isSmallScreen ? 'pt-2' : 'pt-3'} max-w-4xl mx-auto w-full`}>
          <GameStatsHeader
            userToken={userToken}
            isParentLoading={false}
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

        {/* Middle Section - Avatar */}
        <div className="flex items-center justify-center flex-1 min-h-0">
          <div className="relative flex flex-col items-center justify-center">
            <Link to="/profile" className="z-10">
              <div
                className={
                  isSmallScreen
                    ? "w-[180px] h-[180px]"
                    : "w-[220px] h-[220px] sm:w-[240px] sm:h-[240px]"
                }
              >
                {avatarImage ? (
                  <img
                    src={avatarImage}
                    alt={alias}
                    className="w-full h-full object-contain"
                    style={{ background: "transparent" }}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-white"></div>
                  </div>
                )}
              </div>
            </Link>

            <h2
              className={`mt-6 text-white font-extrabold drop-shadow-lg capitalize lg:pb-20 ${
                isSmallScreen ? "text-5xl" : "text-4xl sm:text-5xl"
              } tracking-wide`}
            >
              {alias}
            </h2>
          </div>
        </div>

        {/* Bottom Section - Play Button */}
        <div className={`space-y-2 flex-shrink-0 max-w-4xl mx-auto w-full ${isSmallScreen ? 'pb-36' : 'pb-24'}`}>
          <Button
            variant="default"
            onClick={handleQuickQuiz}
            disabled={currentCoins < QUIZ_COST}
            className={`w-full flex items-center justify-between px-6 ${isSmallScreen ? 'h-16' : 'h-20 sm:h-20'}`}
          >
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

            <div className="bg-white rounded-full w-14 h-14 sm:w-[72px] sm:h-[72px] flex flex-col items-center justify-center shadow-md border-2 border-indigo-300">
              <span className="text-green-600 text-2xl sm:text-3xl font-bold leading-none">
                {userLevel}
              </span>
              <span className="text-green-600 text-[10px] sm:text-xs font-semibold uppercase leading-none tracking-wide mt-0.5">
                Level
              </span>
            </div>
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