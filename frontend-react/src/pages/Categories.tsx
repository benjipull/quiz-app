import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { CategoryCard } from "@/components/quiz/CategoryCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Search, Plus, AlertTriangle } from "lucide-react";
import AddCategory from "@/components/AddCategory";
import { useToast } from "@/hooks/use-toast";

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

const BASE_URL = "https://quiz-app-node-606998948537.europe-west4.run.app";

export default function Categories() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [categories, setCategories] = useState<Category[]>([]);
  const [filteredCategories, setFilteredCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isGuest, setIsGuest] = useState(false);
  const { toast, dismiss } = useToast();

  const searchQueryFromParams = searchParams.get("search") || "";

  useEffect(() => {
    loadUserType();
    fetchCategories();
  }, []);

  useEffect(() => {
    if (searchQueryFromParams) {
      setSearchQuery(searchQueryFromParams);
      handleSearch(searchQueryFromParams);
    }
  }, [searchQueryFromParams]);

  // ✅ Load user info from API or localStorage
  const loadUserType = async () => {
    const token = localStorage.getItem("token");
    if (!token) {
      const storedUser = localStorage.getItem("user");
      if (storedUser) {
        const parsed = JSON.parse(storedUser);
        setIsGuest(parsed.userType === "Guest");
      } else {
        setIsGuest(true); // default to guest if no data
      }
      return;
    }

    try {
      const res = await fetch(`${BASE_URL}/api/getUserDetails`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });
      if (!res.ok) throw new Error("Failed to load user info");
      const data: User = await res.json();
      setIsGuest(data.userType === "Guest");
      localStorage.setItem("user", JSON.stringify(data));
    } catch (error) {
      console.warn("⚠️ Failed to fetch user type, fallback to local storage:", error);
      const storedUser = localStorage.getItem("user");
      if (storedUser) {
        const parsed = JSON.parse(storedUser);
        setIsGuest(parsed.userType === "Guest");
      }
    }
  };

  const fetchCategories = async () => {
    setError(null);
    setLoading(true);

    try {
      const userToken = localStorage.getItem("token");
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

      const transformed: Category[] = data.map((category: any, index: number) => ({
        _id: category._id,
        name: category.name,
        description: category.description || `Test your knowledge in ${category.name}`,
        createdBy: category.createdBy || "QuizMaster",
        completionCount: category.completionsCount || category.completionCount || 0,
        completionsCount: category.completionsCount || category.completionCount || 0,
        questionCount: category.questionCount || 10,
        averageRating: category.averageRating ?? (3 + Math.random() * 2),
        difficulty:
          category.difficulty ||
          (index % 3 === 0 ? "Easy" : index % 3 === 1 ? "Medium" : "Hard"),
        image: category.imageUrl || category.image,
        imageUrl: category.imageUrl || category.image,
        trending:
          (category.completionsCount || category.completionCount || 0) > 50,
        isNew:
          index < 2 ||
          new Date().getTime() - new Date(category.createdAt || 0).getTime() <
            7 * 24 * 60 * 60 * 1000,
        timeEstimate: `${Math.ceil((category.questionCount || 10) * 0.6)} min`,
      }));

      setCategories(transformed);
      setFilteredCategories(transformed);
    } catch (error: any) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    if (query) {
      const filtered = categories.filter(
        (c) =>
          c.name.toLowerCase().includes(query.toLowerCase()) ||
          c.description?.toLowerCase().includes(query.toLowerCase())
      );
      setFilteredCategories(filtered);
    } else {
      setFilteredCategories(categories);
    }
  };

  const handlePlayQuiz = (categoryId: string) => {
    const userToken = localStorage.getItem("token");
    if (!userToken) {
      alert("❌ You must be logged in to play.");
      return;
    }
    navigate(`/quiz/${categoryId}`);
  };

  // ✅ Restrict category creation for guests
  const handleCreateCategoryAttempt = () => {
    if (isGuest) {
      const { id: toastId } = toast({
        title: "🔒 Registration Required",
        description:
          "You must complete your registration to create a quiz",
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
              variant="secondary"
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

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-quiz-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <h2 className="text-2xl font-bold text-red-500">
            Error Loading Categories
          </h2>
          <p className="text-gray-400">{error}</p>
          <Button onClick={fetchCategories}>Try Again</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-quiz-background pb-20">
      <Header title="Quizzes" showSearch />

      <div className="px-4 lg:px-8 space-y-6 max-w-full mx-auto">
        {/* Search Bar */}
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

          {/* ✅ AddCategory now restricted for guests */}
          <AddCategory
            fetchCategories={fetchCategories}
            isGuest={isGuest}
            onRegistrationRequired={handleCreateCategoryAttempt}
          />
        </div>

        {/* Categories Grid */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-foreground">
              {loading
                ? "Loading..."
                : `${filteredCategories.length} Categories`}
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
              {filteredCategories.map((category) => (
                <CategoryCard
                  key={category._id}
                  id={category._id}
                  title={category.name}
                  description={category.description}
                  difficulty={category.difficulty || "Medium"}
                  questionCount={category.questionCount || 10}
                  completions={
                    category.completionCount || category.completionsCount || 0
                  }
                  rating={category.averageRating || 0}
                  timeEstimate={category.timeEstimate || "5 min"}
                  imageUrl={category.imageUrl || "coming soon"}
                  createdBy={category.createdBy || "Quizicle"}
                  onPlay={handlePlayQuiz}
                />
              ))}
            </div>
          )}
        </div>

        {searchQuery && filteredCategories.length === 0 && !loading && (
          <Card className="p-8 text-center">
            <Search className="h-12 w-12 mx-auto text-muted-foreground" />
            <h4 className="font-semibold text-foreground">No quizzes found</h4>
            <p className="text-sm text-muted-foreground">
              Try searching with different keywords or create your own Quiz
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={handleCreateCategoryAttempt}
            >
              <Plus className="h-4 w-4" />
              Create "{searchQuery}" Quiz
            </Button>
          </Card>
        )}
      </div>
    </div>
  );
}
