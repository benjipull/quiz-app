// Categories.tsx - OPTIMIZED - Cache categories data
import { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { CategoryCard } from "@/components/quiz/CategoryCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Search, Plus, Brain, Globe } from "lucide-react";
import AddCategory from "@/components/AddCategory";
import { useToast } from "@/hooks/use-toast";
import { apiClient } from "@/utils/apiClient";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { preloadQuizSession, isQuizSessionReady } from "@/hooks/useAppPreloader";

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
  image?: string;
  imageUrl?: string;
  trending?: boolean;
  isNew?: boolean;
  createdAt?: string;
  timeEstimate?: string;
}

interface User {
  _id: string;
  alias: string;
  userType: "Guest" | "Registered" | "Admin";
  avatar: number;
  email?: string;
  level?: number;
}

const BASE_URL = import.meta.env.VITE_BASE_URL;

// 🎯 CACHE MANAGEMENT
const categoriesCache = {
  allCategories: [] as Category[],
  userCategories: [] as Category[],
  lastFetchTime: {
    all: 0,
    user: 0,
  },
  CACHE_DURATION: 5 * 60 * 1000, // 5 minutes
};

export default function Categories() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [allCategories, setAllCategories] = useState<Category[]>([]);
  const [userCategories, setUserCategories] = useState<Category[]>([]);
  const [filteredAllCategories, setFilteredAllCategories] = useState<Category[]>([]);
  const [filteredUserCategories, setFilteredUserCategories] = useState<Category[]>([]);
  
  const [loading, setLoading] = useState(false);
  const [userCategoriesLoading, setUserCategoriesLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isGuest, setIsGuest] = useState(false);
  const [activeTab, setActiveTab] = useState("your");
  
  const [preloadedCategories, setPreloadedCategories] = useState<Set<string>>(new Set());
  const [currentlyPreloading, setCurrentlyPreloading] = useState<string | null>(null);
  
  const { toast, dismiss } = useToast();
  const userToken = localStorage.getItem("token");
  const searchQueryFromParams = searchParams.get("search") || "";
  
  const hasInitialized = useRef(false);

  useEffect(() => {
    if (hasInitialized.current) return;
    hasInitialized.current = true;

    loadUserType();
    
    // ✅ Load from cache first for instant display
    const now = Date.now();
    
    if (categoriesCache.allCategories.length > 0 && 
        (now - categoriesCache.lastFetchTime.all) < categoriesCache.CACHE_DURATION) {
      console.log("⚡ Using cached all categories");
      setAllCategories(categoriesCache.allCategories);
      setFilteredAllCategories(categoriesCache.allCategories);
    } else {
      fetchAllCategories();
    }

    if (categoriesCache.userCategories.length > 0 && 
        (now - categoriesCache.lastFetchTime.user) < categoriesCache.CACHE_DURATION) {
      console.log("⚡ Using cached user categories");
      setUserCategories(categoriesCache.userCategories);
      setFilteredUserCategories(categoriesCache.userCategories);
    } else {
      fetchUserCategories();
    }
  }, []);

  useEffect(() => {
    if (searchQueryFromParams) {
      setSearchQuery(searchQueryFromParams);
      handleSearch(searchQueryFromParams);
    }
  }, [searchQueryFromParams, allCategories, userCategories]);

  const loadUserType = async () => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      const parsed: User = JSON.parse(storedUser);
      setIsGuest(parsed.userType === "Guest");
    }
  };

  const fetchAllCategories = async () => {
    const now = Date.now();
    
    // ✅ Check cache freshness
    if (categoriesCache.allCategories.length > 0 && 
        (now - categoriesCache.lastFetchTime.all) < categoriesCache.CACHE_DURATION) {
      console.log("✅ All categories cache is fresh, skipping API call");
      setAllCategories(categoriesCache.allCategories);
      setFilteredAllCategories(categoriesCache.allCategories);
      return;
    }

    setError(null);
    setLoading(true);

    try {
      console.log("🌐 Fetching all categories from API...");
      const response = await apiClient(`${BASE_URL}/api/categories`, {
        method: "GET",
      });
      
      if (!response) {
        setLoading(false);
        return;
      }
      
      if (!response.ok) {
        throw new Error(`Failed to fetch categories. Status: ${response.status}`);
      }

      const data: Category[] = await response.json();

      const transformed: Category[] = data.map((category, index) => ({
        _id: category._id,
        name: category.name,
        description: category.description || `Test your knowledge in ${category.name}`,
        createdBy: category.createdBy || "QuizMaster",
        completionCount: category.completionsCount || category.completionCount || 0,
        completionsCount: category.completionsCount || category.completionCount || 0,
        questionCount: category.questionCount || 10,
        averageRating: category.averageRating ?? (3 + Math.random() * 2),
        difficulty: category.difficulty || (index % 3 === 0 ? "Easy" : index % 3 === 1 ? "Medium" : "Hard"),
        image: category.imageUrl || category.image,
        imageUrl: category.imageUrl || category.image,
        trending: (category.completionsCount || category.completionCount || 0) > 50,
        isNew: index < 2 || new Date().getTime() - new Date(category.createdAt || 0).getTime() < 7 * 24 * 60 * 60 * 1000,
        timeEstimate: `${Math.ceil((category.questionCount || 10) * 0.6)} min`,
      }));

      // ✅ Update cache
      categoriesCache.allCategories = transformed;
      categoriesCache.lastFetchTime.all = now;

      setAllCategories(transformed);
      setFilteredAllCategories(transformed);
    } catch (error) {
      const err = error as Error;
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchUserCategories = async () => {
    const now = Date.now();
    
    // ✅ Check cache freshness
    if (categoriesCache.userCategories.length > 0 && 
        (now - categoriesCache.lastFetchTime.user) < categoriesCache.CACHE_DURATION) {
      console.log("✅ User categories cache is fresh, skipping API call");
      setUserCategories(categoriesCache.userCategories);
      setFilteredUserCategories(categoriesCache.userCategories);
      return;
    }

    setUserCategoriesLoading(true);
    setError(null);
    
    try {
      console.log("🌐 Fetching user categories from API...");
      const response = await apiClient(`${BASE_URL}/api/getUserCategories`, {
        method: "GET",
      });

      if (!response) {
        setUserCategoriesLoading(false);
        return;
      }

      if (!response.ok) throw new Error(`Failed: ${response.status}`);

      const data: Category[] = await response.json();
      
      const storedUser = localStorage.getItem("user");
      const userAlias = storedUser ? JSON.parse(storedUser).alias : "QuizMaster";
      
      const transformed: Category[] = data.map((c, i) => ({
        _id: c._id,
        name: c.name,
        description: c.description || `Test your knowledge in ${c.name}`,
        createdBy: c.createdBy || userAlias,
        completionCount: c.completionCount || 0,
        completionsCount: c.completionsCount || 0,
        questionCount: c.questionCount || 10,
        averageRating: c.averageRating ?? (3 + Math.random() * 2),
        difficulty: c.difficulty || (["Easy", "Medium", "Hard"] as const)[i % 3],
        imageUrl: c.imageUrl || c.image,
        timeEstimate: `${Math.ceil((c.questionCount || 10) * 0.6)} min`,
      }));
      
      // ✅ Update cache
      categoriesCache.userCategories = transformed;
      categoriesCache.lastFetchTime.user = now;

      setUserCategories(transformed);
      setFilteredUserCategories(transformed);
    } catch (e) {
      const error = e as Error;
      setError(error.message);
    } finally {
      setUserCategoriesLoading(false);
    }
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    if (query) {
      const filterCategories = (categories: Category[]) =>
        categories.filter(
          (c) =>
            c.name.toLowerCase().includes(query.toLowerCase()) ||
            c.description?.toLowerCase().includes(query.toLowerCase())
        );
      
      setFilteredAllCategories(filterCategories(allCategories));
      setFilteredUserCategories(filterCategories(userCategories));
    } else {
      setFilteredAllCategories(allCategories);
      setFilteredUserCategories(userCategories);
    }
  };

  const handleCategoryHover = async (categoryId: string) => {
    if (!userToken || 
        preloadedCategories.has(categoryId) || 
        currentlyPreloading === categoryId ||
        isQuizSessionReady(categoryId)) {
      return;
    }

    console.log("🎯 Hover detected - Preloading quiz session for:", categoryId);
    setCurrentlyPreloading(categoryId);

    try {
      const success = await preloadQuizSession(categoryId);
      if (success) {
        setPreloadedCategories(prev => new Set([...prev, categoryId]));
        console.log("✅ Hover preload completed for:", categoryId);
      }
    } catch (error) {
      console.error("❌ Error during hover preload:", error);
    } finally {
      setCurrentlyPreloading(null);
    }
  };

  const handlePlayQuiz = (categoryId: string) => {
    const userToken = localStorage.getItem("token");
    if (!userToken) {
      alert("❌ You must be logged in to play.");
      return;
    }
    
    const sessionReady = isQuizSessionReady(categoryId);
    if (sessionReady) {
      console.log("🚀 Quiz session ready - Instant navigation!");
    }
    
    navigate(`/quiz/${categoryId}`);
  };

  const handleCreateCategoryAttempt = () => {
    if (isGuest) {
      const { id: toastId } = toast({
        title: "🔒 Registration Required",
        description: "You must complete your registration to create a quiz",
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

  // ✅ NEW: Force refresh when category is added
  const handleCategoryAdded = () => {
    console.log("🔄 New category added, invalidating cache");
    categoriesCache.lastFetchTime.all = 0;
    categoriesCache.lastFetchTime.user = 0;
    fetchAllCategories();
    fetchUserCategories();
  };

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#100321] via-[#2d1b4e] to-[#380d67] flex items-center justify-center">
        <div className="text-center space-y-4">
          <h2 className="text-2xl font-bold text-red-500">Error Loading Categories</h2>
          <p className="text-gray-400">{error}</p>
          <Button onClick={() => {
            categoriesCache.lastFetchTime.all = 0;
            categoriesCache.lastFetchTime.user = 0;
            fetchAllCategories();
            fetchUserCategories();
          }}>Try Again</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#100321] via-[#2d1b4e] to-[#380d67] pb-20">
      <Header title="Quizzes" showSearch />

      <div className="px-4 lg:px-8 space-y-6 max-w-full mx-auto">
        <div className="pt-4 space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search quizzes..."
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              className="pl-10 h-12 bg-card/60 backdrop-blur-sm border-border/50 focus:border-primary"
            />
          </div>

          <AddCategory
            fetchCategories={handleCategoryAdded}
            isGuest={isGuest}
            onRegistrationRequired={handleCreateCategoryAttempt}
          />
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="your" className="flex items-center gap-2">
              <Brain className="w-4 h-4" />
              Your Quizzes
            </TabsTrigger>
            <TabsTrigger value="all" className="flex items-center gap-2">
              <Globe className="w-4 h-4" />
              All Quizzes
            </TabsTrigger>
          </TabsList>

          <TabsContent value="your" className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-foreground">
                {userCategoriesLoading ? "Loading..." : `${filteredUserCategories.length} Your Quizzes`}
              </h3>
            </div>

            {userCategoriesLoading ? (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Card key={i} className="p-4 animate-pulse">
                    <div className="h-32 bg-muted/20 rounded mb-4" />
                    <div className="space-y-2">
                      <div className="h-4 bg-muted/20 rounded w-3/4" />
                      <div className="h-3 bg-muted/20 rounded w-full" />
                      <div className="h-3 bg-muted/20 rounded w-1/2" />
                    </div>
                  </Card>
                ))}
              </div>
            ) : filteredUserCategories.length === 0 ? (
              <Card className="p-8 text-center">
                <Brain className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h4 className="font-semibold text-foreground mb-2">No quizzes yet</h4>
                <p className="text-sm text-muted-foreground mb-4">
                  {searchQuery 
                    ? "No matching quizzes found. Try a different search or create a new quiz." 
                    : "Create your first quiz to get started!"}
                </p>
                {searchQuery && (
                  <Button variant="outline" size="sm" onClick={handleCreateCategoryAttempt}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create "{searchQuery}" Quiz
                  </Button>
                )}
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredUserCategories.map((category) => (
                  <CategoryCard
                    key={category._id}
                    id={category._id}
                    title={category.name}
                    description={category.description}
                    difficulty={category.difficulty || "Medium"}
                    questionCount={category.questionCount || 10}
                    completions={category.completionCount || category.completionsCount || 0}
                    rating={category.averageRating || 0}
                    timeEstimate={category.timeEstimate || "5 min"}
                    imageUrl={category.imageUrl || "coming soon"}
                    createdBy={category.createdBy || "You"}
                    onPlay={handlePlayQuiz}
                    onMouseEnter={() => handleCategoryHover(category._id)}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="all" className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-foreground">
                {loading ? "Loading..." : `${filteredAllCategories.length} Quizzes`}
              </h3>
            </div>

            {loading ? (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Card key={i} className="p-4 animate-pulse">
                    <div className="h-32 bg-muted/20 rounded mb-4" />
                    <div className="space-y-2">
                      <div className="h-4 bg-muted/20 rounded w-3/4" />
                      <div className="h-3 bg-muted/20 rounded w-full" />
                      <div className="h-3 bg-muted/20 rounded w-1/2" />
                    </div>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredAllCategories.map((category) => (
                  <CategoryCard
                    key={category._id}
                    id={category._id}
                    title={category.name}
                    description={category.description}
                    difficulty={category.difficulty || "Medium"}
                    questionCount={category.questionCount || 10}
                    completions={category.completionCount || category.completionsCount || 0}
                    rating={category.averageRating || 0}
                    timeEstimate={category.timeEstimate || "5 min"}
                    imageUrl={category.imageUrl || "coming soon"}
                    createdBy={category.createdBy || "Quizicle"}
                    onPlay={handlePlayQuiz}
                    onMouseEnter={() => handleCategoryHover(category._id)}
                  />
                ))}
              </div>
            )}

            {searchQuery && filteredAllCategories.length === 0 && !loading && (
              <Card className="p-8 text-center">
                <Search className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h4 className="font-semibold text-foreground mb-2">No quizzes found</h4>
                <p className="text-sm text-muted-foreground mb-4">
                  Try searching with different keywords or create your own Quiz
                </p>
                <Button variant="outline" size="sm" onClick={handleCreateCategoryAttempt}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create "{searchQuery}" Quiz
                </Button>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}