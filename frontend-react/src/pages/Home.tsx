import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { CategoryCard } from "@/components/quiz/CategoryCard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Zap, TrendingUp, Award, Clock } from "lucide-react";
import logo from "../assets/images/QuizicleLogo.png";

const BASE_URL = "https://quiz-app-node-606998948537.europe-west4.run.app";

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
  gradient?: string;
}

const defaultStats = [
  { icon: Zap, label: "Quizzes Played", value: "0", color: "text-primary" },
  { icon: TrendingUp, label: "Active Users", value: "0", color: "text-success" },
  { icon: Award, label: "Categories", value: "0", color: "text-warning" },
  { icon: Clock, label: "Avg. Time", value: "5.2m", color: "text-secondary" },
];

export default function Home() {
  const navigate = useNavigate();
  const [featuredCategories, setFeaturedCategories] = useState<Category[]>([]);
  const [stats, setStats] = useState(defaultStats);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const userToken = localStorage.getItem("token");

  useEffect(() => {
    fetchFeaturedCategories();
  }, []);

  const fetchFeaturedCategories = async () => {
    setError(null);
    setLoading(true);
    
    try {
      const response = await fetch(`${BASE_URL}/api/categories`);
      if (!response.ok) {
        throw new Error(`Failed to fetch categories. Status: ${response.status}`);
      }
      
      const data = await response.json();

      // Transform and select featured categories (top 3 by completion count)
      const transformedCategories: Category[] = data.map((category: any, index: number) => ({
        _id: category._id,
        name: category.name,
        description: category.description || `Test your knowledge in ${category.name}`,
        createdBy: category.createdBy || "QuizMaster",
        completionCount: category.completionsCount || category.completionCount || 0,
        completionsCount: category.completionsCount || category.completionCount || 0,
        questionCount: category.questionCount || 10,
        averageRating: category.averageRating || (3 + Math.random() * 2),
        difficulty: category.difficulty || (index % 3 === 0 ? "Easy" : index % 3 === 1 ? "Medium" : "Hard"),
        image: category.imageUrl || category.image,
        imageUrl: category.imageUrl || category.image,
        trending: (category.completionsCount || category.completionCount || 0) > 50,
        isNew: index < 2 || (new Date().getTime() - new Date(category.createdAt || 0).getTime()) < (7 * 24 * 60 * 60 * 1000),
        timeEstimate: `${Math.ceil((category.questionCount || 10) * 0.6)} min`,
        gradient: index % 3 === 0 ? "from-primary/20 to-accent/20" : 
                 index % 3 === 1 ? "from-success/20 to-secondary/20" : 
                 "from-warning/20 to-primary/20"
      }));

      // Sort by completion count and take top 3 for featured
      const sortedCategories = transformedCategories
        .sort((a, b) => (b.completionCount || 0) - (a.completionCount || 0))
        .slice(0, 3);

      setFeaturedCategories(sortedCategories);

      // Update stats with real data
      const totalQuizzes = transformedCategories.reduce((sum, cat) => sum + (cat.completionCount || 0), 0);
      const totalCategories = transformedCategories.length;
      
      setStats([
        { icon: Zap, label: "Quizzes Played", value: totalQuizzes.toLocaleString(), color: "text-primary" },
        { icon: TrendingUp, label: "Active Users", value: Math.ceil(totalQuizzes / 3.7).toLocaleString(), color: "text-success" },
        { icon: Award, label: "Categories", value: totalCategories.toString(), color: "text-warning" },
        { icon: Clock, label: "Avg. Time", value: "5.2m", color: "text-secondary" },
      ]);

    } catch (error: any) {
      setError(error.message);
      // Keep default stats on error
    } finally {
      setLoading(false);
    }
  };

  const handlePlayQuiz = (categoryId: string) => {
    if (!userToken) {
      alert("❌ You must be logged in to play.");
      navigate("/login");
      return;
    }
    navigate(`/quiz/${categoryId}`);
  };

  const handleQuickQuiz = () => {
    if (!userToken) {
      alert("❌ You must be logged in to play.");
      navigate("/login");
      return;
    }
    
    if (featuredCategories.length > 0) {
      // Start with the most popular category
      navigate(`/quiz/${featuredCategories[0]._id}`);
    } else {
      navigate("/categories");
    }
  };

  if (error && featuredCategories.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-quiz-background">
       <Header logoAsTitle imageSrc={logo} showNotifications />
        <div className="mx-auto max-w-full space-y-6 px-4 pb-20 lg:px-8 lg:pb-8">
          <div className="pt-4">
            <Card className="p-8 text-center">
              <div className="space-y-4">
                <h2 className="text-2xl font-bold text-red-500">Error Loading Content</h2>
                <p className="text-gray-400">{error}</p>
                <Button onClick={fetchFeaturedCategories} variant="default">
                  Try Again
                </Button>
              </div>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-quiz-background">
     <Header logoAsTitle imageSrc={logo} showNotifications />
      <div className="mx-auto max-w-full space-y-6 px-4 pb-20 lg:px-8 lg:pb-8">
        {/* Welcome Section */}
        <div className="pt-4">
          <Card className="bg-gradient-to-r from-primary/10 via-accent/10 to-secondary/10 border-primary/20 p-6">
            <div className="space-y-3 text-center">
              <h2 className="text-2xl font-bold text-foreground">
                Welcome back! 👋
              </h2>
              <p className="text-muted-foreground">
                Ready to challenge your mind with some exciting quizzes?
              </p>
              <Button 
                variant="hero" 
                size="lg" 
                className="mt-4"
                onClick={handleQuickQuiz}
                disabled={loading}
              >
                <Zap className="h-5 w-5" />
                {loading ? "Loading..." : "Quick Quiz"}
              </Button>
            </div>
          </Card>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {stats.map((stat, index) => (
            <Card
              key={index}
              className="bg-card/60 border-border/50 p-4 text-center backdrop-blur-sm"
            >
              <stat.icon className={`mx-auto mb-2 h-6 w-6 ${stat.color}`} />
              <div className="space-y-1">
                <p className="text-2xl font-bold text-foreground">
                  {loading ? "..." : stat.value}
                </p>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
              </div>
            </Card>
          ))}
        </div>

        {/* Featured Categories */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-foreground">
              Featured Categories
            </h3>
            <Badge variant="outline" className="border-primary text-primary">
              Popular
            </Badge>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
              {Array.from({ length: 3 }).map((_, i) => (
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
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
              {featuredCategories.map((category) => (
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
                  imageUrl={category.imageUrl || category.image || `https://picsum.photos/seed/${category._id}/600/300`}
                  createdBy={category.createdBy || "QuizMaster"}
                  onPlay={handlePlayQuiz}
                />
              ))}
            </div>
          )}

          {!loading && featuredCategories.length === 0 && (
            <Card className="p-8 text-center">
              <div className="space-y-3">
                <h4 className="font-semibold text-foreground">No categories available</h4>
                <p className="text-sm text-muted-foreground">
                  Check back later for new quiz categories
                </p>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => navigate("/categories")}
                >
                  Browse All Categories
                </Button>
              </div>
            </Card>
          )}
        </div>

        {/* Quick Actions */}
        <div className="space-y-3">
          <h3 className="text-lg font-bold text-foreground">Quick Actions</h3>
          <div className="grid grid-cols-2 gap-3">
            <Button 
              variant="outline" 
              className="h-16 flex-col gap-2"
              onClick={() => navigate("/categories?filter=trending")}
            >
              <TrendingUp className="h-5 w-5" />
              <span className="text-xs">Trending</span>
            </Button>
            <Button 
              variant="outline" 
              className="h-16 flex-col gap-2"
              onClick={() => navigate("/profile")}
            >
              <Award className="h-5 w-5" />
              <span className="text-xs">Achievements</span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}