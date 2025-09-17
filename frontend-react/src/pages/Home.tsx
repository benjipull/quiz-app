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
import GameStatsHeader from "@/components/GameStatsHeader";

const avatarImages = import.meta.glob("../assets/images/avatars/*.png", {
  eager: true,
  import: "default",
});
const avatars: string[] = Object.values(avatarImages) as string[];

const BASE_URL = "https://quiz-app-node-606998948537.europe-west4.run.app";

interface Category {
  _id: string;
  name: string;
  description?: string;
  createdBy?: string;
  completionCount?: number;
  questionCount?: number;
  averageRating?: number;
  difficulty?: "Easy" | "Medium" | "Hard";
  imageUrl?: string;
  createdAt?: string;
}

interface CategoryToPlayResponse {
  message: string;
  categoryId: string;
  name: string;
  averageRating: number;
  questionsCount: number;
}

export default function Home() {
  const [featuredCategories, setFeaturedCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [playButtonLoading, setPlayButtonLoading] = useState(false);

  const [userProfile, setUserProfile] = useState<any | null>(null);
  const [userAvatar, setUserAvatar] = useState<string | null>(null);
  const [userLevel, setUserLevel] = useState(1);

  const navigate = useNavigate();
  const userToken = localStorage.getItem("token") || "";

  useEffect(() => {
    fetchFeaturedCategories();

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

        if (parsedUser.level) setUserLevel(parsedUser.level);
      } catch (e) {
        console.error("Failed to parse user data:", e);
      }
    }
  }, []);

  const fetchFeaturedCategories = async () => {
    setError(null);
    setLoading(true);

    try {
      const response = await fetch(`${BASE_URL}/api/categories`, {
        headers: {
          "Content-Type": "application/json",
          ...(userToken && { Authorization: `Bearer ${userToken}` }),
        },
      });

      if (!response.ok) throw new Error("Failed to fetch categories");

      const data = await response.json();
      const transformed: Category[] = data.map((category: any) => ({
        _id: category._id,
        name: category.name,
        description: category.description || `Test your knowledge in ${category.name}`,
        createdBy: category.createdBy || "QuizMaster",
        completionCount: category.completionsCount || category.completionCount || 0,
        questionCount: category.questionCount || 10,
        averageRating: category.averageRating || 3,
        difficulty: category.difficulty || "Medium",
        imageUrl: category.imageUrl || category.image,
        createdAt: category.createdAt,
      }));

      setFeaturedCategories(transformed.slice(0, 9));
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePlayQuiz = (categoryId: string) => {
    if (!userToken) {
      alert("⚠ You must be logged in to play.");
      return;
    }
    navigate(`/quiz/${categoryId}`);
  };

  const handleQuickQuiz = async () => {
    if (!userToken) {
      alert("⚠ You must be logged in to play.");
      return;
    }

    setPlayButtonLoading(true);

    try {
      const response = await fetch(`${BASE_URL}/api/getGetegoryToPlay`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${userToken}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to get category to play: ${response.status}`);
      }

      const data: CategoryToPlayResponse = await response.json();

      if (data.categoryId) {
        console.log(`🎮 Starting quiz with category: ${data.name} (${data.categoryId})`);
        navigate(`/quiz/${data.categoryId}`);
      } else {
        throw new Error("No category ID returned from server");
      }
    } catch (error: any) {
      console.error("Error getting category to play:", error);
      // fallback to first featured category
      if (featuredCategories.length > 0) {
        navigate(`/quiz/${featuredCategories[0]._id}`);
      } else {
        alert("❌ Unable to start quiz. Please try again later.");
      }
    } finally {
      setPlayButtonLoading(false);
    }
  };

  const alias = userProfile?.alias || userProfile?.name || "Guest";
  const avatarImage = userAvatar || undefined;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-quiz-background">
      {/* <Header logoAsTitle imageSrc={logo} showNotifications /> */}

      <div className="mx-auto max-w-full space-y-4 px-4 pb-4 lg:px-8 lg:pb-8">
        {/* Game Stats Header */}
        <GameStatsHeader userToken={userToken} />

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
            disabled={loading || playButtonLoading}
            className="w-full h-12 bg-success hover:bg-success/90 text-white text-lg font-bold rounded-xl disabled:opacity-50"
          >
            {playButtonLoading ? (
              <div className="flex items-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Starting Quiz...
              </div>
            ) : (
              <>
                Play
                <div className="ml-2 flex items-center bg-white/20 px-2 py-0.5 rounded-full">
                  <span className="font-bold">{userLevel}</span>
                  <span className="ml-1 text-xs">Lvl</span>
                </div>
              </>
            )}
          </Button>
        </div>

        {/* Featured Categories */}
        <div className="mt-4">
          <h3 className="text-lg font-bold mb-3">Featured Categories</h3>
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
