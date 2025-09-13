"use client";

import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { CategoryCard } from "@/components/quiz/CategoryCard";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Zap,
  TrendingUp,
  Award,
  Clock,
} from "lucide-react";
import logo from "../assets/images/QuizicleLogo.png";
import { cn } from "@/lib/utils";
import GameStatsHeader from "@/components/GameStatsHeader";

const avatarImages = import.meta.glob("../assets/images/avatars/*.png", {
  eager: true,
  import: "default",
});
const avatars: string[] = Object.values(avatarImages) as string[];

const BASE_URL =
  "https://quiz-app-node-606998948537.europe-west4.run.app";

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
  const [featuredCategories, setFeaturedCategories] = useState<Category[]>([]);
  const [stats, setStats] = useState(defaultStats);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [userLevel, setUserLevel] = useState(1);
  const [userScore, setUserScore] = useState(36);
  const [userCoins, setUserCoins] = useState(500);
  const [userLives, setUserLives] = useState(5);

  const userToken = localStorage.getItem("token");

  const [userProfile, setUserProfile] = useState<any | null>(null);
  const [userAvatar, setUserAvatar] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchFeaturedCategories();
    loadUserStats();

    const storedUser = localStorage.getItem("user");
    const storedAvatar = localStorage.getItem("userAvatar");

    if (storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser);
        setUserProfile(parsedUser);

        if (storedAvatar) {
          setUserAvatar(storedAvatar);
        } else if (parsedUser.avatar) {
          setUserAvatar(avatars[parsedUser.avatar - 1] || null);
        }
      } catch (e) {
        console.error("Failed to parse user data from localStorage:", e);
      }
    }
  }, []);

  const loadUserStats = () => {
    const savedLevel = localStorage.getItem("userLevel");
    const savedScore = localStorage.getItem("userScore");
    const savedCoins = localStorage.getItem("userCoins");
    const savedLives = localStorage.getItem("userLives");

    if (savedLevel) setUserLevel(parseInt(savedLevel));
    if (savedScore) setUserScore(parseInt(savedScore));
    if (savedCoins) setUserCoins(parseInt(savedCoins));
    if (savedLives) setUserLives(parseInt(savedLives));
  };

  const fetchFeaturedCategories = async () => {
    setError(null);
    setLoading(true);

    try {
      const response = await fetch(`${BASE_URL}/api/categories`);
      if (!response.ok) throw new Error(`Failed to fetch categories`);
      const data = await response.json();

      const transformed: Category[] = data.map(
        (category: any, index: number) => ({
          _id: category._id,
          name: category.name,
          description:
            category.description ||
            `Test your knowledge in ${category.name}`,
          createdBy: category.createdBy || "QuizMaster",
          completionCount:
            category.completionsCount || category.completionCount || 0,
          completionsCount:
            category.completionsCount || category.completionCount || 0,
          questionCount: category.questionCount || 10,
          averageRating: category.averageRating || 3 + Math.random() * 2,
          difficulty:
            category.difficulty ||
            (index % 3 === 0
              ? "Easy"
              : index % 3 === 1
              ? "Medium"
              : "Hard"),
          image: category.imageUrl || category.image,
          imageUrl: category.imageUrl || category.image,
          trending:
            (category.completionsCount || category.completionCount || 0) > 50,
          isNew:
            index < 2 ||
            new Date().getTime() -
              new Date(category.createdAt || 0).getTime() <
              7 * 24 * 60 * 60 * 1000,
          timeEstimate: `${Math.ceil(
            (category.questionCount || 10) * 0.6
          )} min`,
          gradient:
            index % 3 === 0
              ? "from-primary/20 to-accent/20"
              : index % 3 === 1
              ? "from-success/20 to-secondary/20"
              : "from-warning/20 to-primary/20",
        })
      );

      setFeaturedCategories(
        transformed
          .sort(
            (a, b) => (b.completionCount || 0) - (a.completionCount || 0)
          )
          .slice(0, 9)
      );
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePlayQuiz = (categoryId: string) => {
    if (!userToken) return alert("❌ You must be logged in to play.");
    navigate(`/quiz/${categoryId}`);
  };

  const handleQuickQuiz = () => {
    if (!userToken) return alert("❌ You must be logged in to play.");
    if (featuredCategories.length > 0) {
      navigate(`/quiz/${featuredCategories[0]._id}`);
    } else {
      alert("No categories available to start a quick quiz.");
    }
  };

  if (error && featuredCategories.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-quiz-background">
        <Header logoAsTitle imageSrc={logo} showNotifications />
        <div className="mx-auto max-w-full space-y-6 px-4 pb-8 lg:px-8">
          <Card className="p-8 text-center mt-12">
            <h2 className="text-2xl font-bold text-red-500 mb-2">
              Error Loading
            </h2>
            <p className="text-gray-400 mb-4">{error}</p>
            <Button onClick={fetchFeaturedCategories}>Retry</Button>
          </Card>
        </div>
      </div>
    );
  }

  const alias = userProfile?.alias || userProfile?.name || "Guest";
  const avatarImage = userAvatar || undefined;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-quiz-background">
      <Header logoAsTitle imageSrc={logo} showNotifications />

      <div className="mx-auto max-w-full space-y-4 px-4 pb-4 lg:px-8 lg:pb-8">
        {/* Game Stats Header */}
        <div className=" top-0 z-10 bg-gradient-to-br from-background to-quiz-background">
          <GameStatsHeader/>
          
          {/* User Avatar Section */}
          <div className="flex flex-col items-center space-y-2 py-3">
            <div className="relative">
              <Link to="/profile" className="no-underline">
                <Avatar className="w-20 h-20">
                  <AvatarImage src={avatarImage} alt={alias} />
                  <AvatarFallback className="bg-gradient-to-br from-primary/20 to-accent/20 border-4 border-primary/20 text-2xl font-bold text-primary">
                    {alias.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </Link>
              <div className="absolute bottom-0 right-0 w-5 h-5 bg-success rounded-full border-2 border-background"></div>
            </div>
            <h2 className="text-lg font-bold">{alias}</h2>
          </div>

          {/* Play Button */}
          <div className="pb-3">
            <Button
              onClick={handleQuickQuiz}
              disabled={loading}
              className="w-full h-12 bg-success hover:bg-success/90 text-white text-lg font-bold rounded-xl"
            >
              {loading ? "Loading..." : "Play"}
              <div className="ml-2 flex items-center bg-white/20 px-2 py-0.5 rounded-full">
                <span className="font-bold">{userLevel}</span>
                <span className="ml-1 text-xs">Lvl</span>
              </div>
            </Button>
          </div>
        </div>

        {/* Featured Categories */}
        <div className="mt-4">
          <h3 className="text-lg font-bold mb-3">
            Featured Categories
          </h3>
          {loading ? (
            <div className="flex justify-center py-12">
              <p className="text-muted-foreground">Loading categories...</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {featuredCategories.map((cat) => (
                <CategoryCard
                  key={cat._id}
                  id={cat._id}
                  title={cat.name}
                  description={cat.description}
                  difficulty={cat.difficulty || "Medium"}
                  questionCount={cat.questionCount || 10}
                  completions={cat.completionCount || 0}
                  rating={cat.averageRating || 0}
                  timeEstimate={cat.timeEstimate || "5 min"}
                  imageUrl={cat.imageUrl || ""}
                  createdBy={cat.createdBy || "QuizMaster"}
                  onPlay={handlePlayQuiz}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}