import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { CategoryCard } from "@/components/quiz/CategoryCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Search, Plus } from "lucide-react";
import AddCategory from "@/components/AddCategory";

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

export default function Categories() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [categories, setCategories] = useState<Category[]>([]);
  const [filteredCategories, setFilteredCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const searchQueryFromParams = searchParams.get("search") || "";

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    if (searchQueryFromParams) {
      setSearchQuery(searchQueryFromParams);
      handleSearch(searchQueryFromParams);
    }
  }, [searchQueryFromParams]);

  const BASE_URL = "https://quiz-app-node-606998948537.europe-west4.run.app";

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

      // Transform API data to match interface
      const transformedCategories: Category[] = data.map((category: any, index: number) => ({
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
        isNew: index < 2 || (new Date().getTime() - new Date(category.createdAt || 0).getTime()) < (7 * 24 * 60 * 60 * 1000),
        timeEstimate: `${Math.ceil((category.questionCount || 10) * 0.6)} min`
      }));

      setCategories(transformedCategories);
      setFilteredCategories(transformedCategories);
    } catch (error: any) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    if (query) {
      const currentCategories = categories.filter(category =>
        category.name.toLowerCase().includes(query.toLowerCase()) ||
        category.description?.toLowerCase().includes(query.toLowerCase())
      );
      setFilteredCategories(currentCategories);
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

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-quiz-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <h2 className="text-2xl font-bold text-red-500">Error Loading Categories</h2>
          <p className="text-gray-400">{error}</p>
          <Button onClick={fetchCategories} variant="default">
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-quiz-background pb-20">
      <Header title="Categories" showSearch />

      <div className="px-4 lg:px-8 space-y-6 max-w-full mx-auto">
        {/* Search Bar */}
        <div className="pt-4 space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search categories..."
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              className="pl-10 h-12 bg-card/60 backdrop-blur-sm border-border/50 focus:border-primary"
            />
          </div>

          <AddCategory />
        </div>
        
        {/* Categories Grid */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-foreground">
              {loading ? "Loading..." : `${filteredCategories.length} Categories`}
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
                  description={category.description || `Test your knowledge in ${category.name}`}
                  difficulty={category.difficulty || "Medium"}
                  questionCount={category.questionCount || 10}
                  completions={category.completionCount || category.completionsCount || 0}
                  rating={category.averageRating || 0}
                  timeEstimate={category.timeEstimate || "5 min"}
                  imageUrl={category.imageUrl || category.image || `coming soon`}
                  createdBy={category.createdBy || "Quizicle"}
                  onPlay={handlePlayQuiz}
                />
              ))}
            </div>
          )}
        </div>

        {searchQuery && filteredCategories.length === 0 && !loading && (
          <Card className="p-8 text-center">
            <div className="space-y-3">
              <Search className="h-12 w-12 mx-auto text-muted-foreground" />
              <h4 className="font-semibold text-foreground">No categories found</h4>
              <p className="text-sm text-muted-foreground">
                Try searching with different keywords or create your own category
              </p>
              <Button variant="outline" size="sm">
                <Plus className="h-4 w-4" />
                Create "{searchQuery}" Category
              </Button>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}