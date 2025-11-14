// Home.tsx
import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { CategoryCard } from "@/components/quiz/CategoryCard";
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
  Brain,
  AlertTriangle,
  Heart,
} from "lucide-react";
import logo from "../assets/images/QuizicleLogo.png";
import SplashScreen from "../components/SplashScreen";
import GameStatsHeader from "../components/GameStatsHeader";
import AddCategory from "@/components/AddCategory";
import { useToast } from "@/hooks/use-toast";

import { apiClient } from "@/utils/apiClient";

const avatarImages = import.meta.glob("../assets/images/avatars/*.png", {
  eager: true,
  import: "default",
});
const avatars: string[] = Object.values(avatarImages) as string[];

const BASE_URL = import.meta.env.VITE_BASE_URL;

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

interface UserDetails {
  _id: string;
  alias: string;
  level: number;
  avatar: number;
  userType?: "Guest" | "Registered" | "Admin";
  interests?: string[];
}

export default function Home() {
  const [userCategories, setUserCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [playButtonLoading, setPlayButtonLoading] = useState(false);
  const [categoriesLoading, setCategoriesLoading] = useState(false);
  const [showSplash, setShowSplash] = useState(false);
  const [dataLoaded, setDataLoaded] = useState(false);
  const [userProfile, setUserProfile] = useState<UserDetails | null>(null);
  const [userAvatar, setUserAvatar] = useState<string | null>(null);
  const [userLevel, setUserLevel] = useState(1);
  const [isSmallScreen, setIsSmallScreen] = useState(false);
  const [isGuest, setIsGuest] = useState(false);
  
  // Interest modal state
  const [isInterestModalOpen, setIsInterestModalOpen] = useState(false);
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [savingInterests, setSavingInterests] = useState(false);

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
      fetchUserCategories();
      
      // Check if user has no interests selected - show modal if needed
      if (!userProfile.interests || userProfile.interests.length === 0) {
        // Small delay to ensure smooth UI load
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
          const parsedUser = JSON.parse(storedUser);
          setUserProfile(parsedUser);
          if (parsedUser.level) setUserLevel(parsedUser.level);
          setIsGuest(parsedUser.userType === 'Guest');
          setSelectedInterests(parsedUser.interests || []);
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
          const parsedUser = JSON.parse(storedUser);
          setUserProfile(parsedUser);
          if (parsedUser.level) setUserLevel(parsedUser.level);
          setIsGuest(parsedUser.userType === 'Guest');
          setSelectedInterests(parsedUser.interests || []);
        }
        return;
      }

      const apiUser: UserDetails = await response.json();

      setUserProfile(apiUser);
      setUserLevel(apiUser.level || 1);
      setIsGuest(apiUser.userType === 'Guest');
      setSelectedInterests(apiUser.interests || []);

      const avatarIndex = apiUser.avatar ? apiUser.avatar - 1 : 0;
      const calculatedAvatar = avatars[avatarIndex] || null;
      setUserAvatar(calculatedAvatar);

      if (typeof window !== 'undefined') {
        const userToStore = {
          ...apiUser,
          level: apiUser.level || 1,
          userType: apiUser.userType || 'Registered',
          interests: apiUser.interests || [],
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
          const parsedUser = JSON.parse(storedUser);
          setUserProfile(parsedUser);
          if (parsedUser.level) setUserLevel(parsedUser.level);
          setIsGuest(parsedUser.userType === 'Guest');
          setSelectedInterests(parsedUser.interests || []);
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
      const response = await apiClient(`${BASE_URL}/api/getUserCategories`, {
        method: "GET",
      });

      if (!response) {
        setCategoriesLoading(false);
        return;
      }

      if (!response.ok) throw new Error(`Failed: ${response.status}`);

      const data = await response.json();
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
      const response = await apiClient(`${BASE_URL}/api/getGetegoryToPlay`, {
        method: "GET",
      });

      if (!response) {
        setPlayButtonLoading(false);
        return;
      }

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

  const handleCreateCategoryAttempt = () => {
    if (isGuest) {
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
                navigate("/profile");
                dismiss(toastId);
              }}
              className="bg-primary hover:bg-primary/80"
            >
              Register
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => dismiss(toastId)}
            >
              Cancel
            </Button>
          </div>
        ),
      });
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
      toast({
        title: "Error",
        description: `Failed to save interests: ${(error as Error).message}`,
        variant: "destructive",
      });
    } finally {
      setSavingInterests(false);
    }
  };

  if (showSplash) {
    return <SplashScreen dataLoaded={dataLoaded} />;
  }

  const alias = userProfile?.alias || "Guest";
  const avatarImage = userAvatar || undefined;

  // Improved background style with better positioning
  const backgroundStyle = {
    backgroundImage: `url('/homebg1.jpg')`,
    backgroundSize: 'cover',
    backgroundPosition: 'center center',
    backgroundRepeat: 'no-repeat',
    backgroundAttachment: 'fixed',
    backgroundColor: '#100321',
    minHeight: '100vh',
  };

  return (
    <div
      className="min-h-screen"
      style={backgroundStyle}
    >
      {!isSmallScreen && <Header logoAsTitle imageSrc={logo} showNotifications />}

      <div className="mx-auto max-w-full space-y-4 px-4 pb-20 lg:px-8 lg:pb-8">
        <GameStatsHeader userToken={userToken} isParentLoading={loading} />

        {/* Guest User Registration Panel */}
        {isGuest && (
          <Card
            className="bg-gradient-to-br from-[#100321] via-[#2d1b4e] to-[#380d67] border-gray-200 dark:border-gray-700 dark:text-white p-3 shadow-lg flex items-center justify-between space-x-3"
          >
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
            {/* User Avatar and Alias */}
    <div className="flex flex-col items-center py-6">
      <div
        className="relative w-[210px] h-[210px] md:w-[260px] md:h-[260px] rounded-full flex items-center justify-center"
        style={{
          backgroundImage: `url('/image.png')`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
        }}
      >
        <Link to="/profile" className="no-underline relative z-10">
          <Avatar className="w-[165px] h-[165px] md:w-[200px] md:h-[200px] overflow-visible relative">
            <AvatarImage
              src={avatarImage}
              alt={alias}
              className="object-contain scale-[1.12] relative z-10"
            />
            <AvatarFallback className="bg-transparent border-none text-white text-3xl md:text-4xl font-bold">
              {alias.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
        </Link>

        {/* Username / Alias */}
        <h2
          className="absolute -bottom-6 left-1/2 transform -translate-x-1/2 text-white font-extrabold
            text-2xl md:text-4xl whitespace-nowrap max-w-[180px] md:max-w-[230px] text-center"
          style={{
            textShadow: '0 0 8px rgba(255,255,255,0.7), 0 0 12px rgba(255,255,255,0.4)',
          }}
        >
          {alias
            .split(/[\s-_]+/) // split by space, dash, or underscore
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ')}
        </h2>
      </div>
    </div>
        {/* Play Button */}
        <div className="pb-3 relative">
          <Button
            onClick={handleQuickQuiz}
            disabled={loading || playButtonLoading}
            className="w-full h-16 md:h-20 flex items-center justify-between px-6 relative overflow-hidden rounded-full shadow-lg"
          >
            {playButtonLoading ? (
              <div className="flex items-center text-xl md:text-2xl justify-center w-full">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div>
                Starting Quiz...
              </div>
            ) : (
              <>
                <span className="text-3xl md:text-4xl font-bold text-white">Play</span>
                <div className="relative">
                  <div className="bg-white rounded-full w-14 h-14 md:w-16 md:h-16 flex flex-col items-center justify-center shadow-md">
                    <span className="text-green-500 text-xl md:text-2xl font-bold leading-none">{userLevel}</span>
                    <span className="text-green-500 text-xs font-medium uppercase leading-none">Level</span>
                  </div>
                </div>
              </>
            )}
          </Button>
        </div>

        {/* My Categories */}
        <div className="mt-4 pb-20">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg md:text-xl font-bold flex items-center text-white">
              <Brain className="w-5 h-5 mr-2" />
              Your Quizzes
            </h3>
          </div>

          {error ? (
            <Card className="p-8 text-center bg-white/5 backdrop-blur-sm border-white/10">
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
                <Card key={i} className="p-4 animate-pulse bg-white/5 backdrop-blur-sm border-white/10">
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
            // Empty State with Better Centering
            <div className="flex justify-center items-center min-h-[200px]">
              <AddCategory
                fetchCategories={fetchUserCategories}
                isGuest={isGuest}
                onRegistrationRequired={handleCreateCategoryAttempt}
                isEmbeddedInEmptyState={true} 
              />
            </div>
          ) : (
            // Display existing categories
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
              
              {/* Add Category Button below existing categories */}
              <div className="mt-6">
                <AddCategory
                  fetchCategories={fetchUserCategories}
                  isGuest={isGuest}
                  onRegistrationRequired={handleCreateCategoryAttempt}
                  isEmbeddedInEmptyState={false}
                />
              </div>
            </div>
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