import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { User, Trophy, Clock, RotateCcw, ArrowLeft, Edit, Play, Brain, Users, Star, ShoppingBag, Crown, Target, Zap, Award, TrendingUp, Calendar, Gift, CheckCircle2, XCircle, Coins, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import GameStatsHeader from "@/components/GameStatsHeader";
import { avatarUrls } from "@/utils/avatarPaths";
import { getApiBaseUrl } from "@/utils/baseUrl";

const BASE_URL = getApiBaseUrl();

const avatars = avatarUrls;
const FALLBACK_CATEGORY_IMAGE = "/assets/images/SagaLevelGraphics/Enchanted-Forest.png";

const resolveCategoryImageSrc = (image64, image) => {
  const normalizedImage = typeof image === "string" ? image.trim() : "";
  if (normalizedImage) return normalizedImage;

  const normalizedImage64 = typeof image64 === "string" ? image64.trim() : "";
  if (!normalizedImage64 || normalizedImage64 === "null" || normalizedImage64 === "undefined") {
    return FALLBACK_CATEGORY_IMAGE;
  }

  return normalizedImage64.startsWith("data:")
    ? normalizedImage64
    : `data:image/png;base64,${normalizedImage64}`;
};

const Profile = () => {
  const [user, setUser] = useState<any | null>(null);
  const [avatar, setAvatar] = useState<string | null>(null);
  const [alias, setAlias] = useState("");
  const [age, setAge] = useState("");
  const [isProfileVisible, setIsProfileVisible] = useState(true);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [quizScores, setQuizScores] = useState<any[]>([]);
  const [userCategories, setUserCategories] = useState<any[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(false);
  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: ""
  });
  const [changingPassword, setChangingPassword] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const userToken = localStorage.getItem("token") || "";

  useEffect(() => {
    const fetchDetails = async () => {
      setLoading(true);
      const token = localStorage.getItem("token");
      if (!token) {
        navigate("/login");
        setLoading(false);
        return;
      }

      try {
        const storedUser = localStorage.getItem("user");
        if (storedUser) {
          const parsedUser = JSON.parse(storedUser);
          setUser(parsedUser);
          setAlias(parsedUser.alias || "");
          setAge(parsedUser.age || "");
          setAvatar(localStorage.getItem("userAvatar") || avatars[parsedUser.avatar - 1] || null);
        }

        try {
          const response = await fetch(`${BASE_URL}/api/users/`, {
            method: "GET",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          });

          if (response.ok) {
            const userData = await response.json();
            setUser(userData);
            setAlias(userData.alias || "");
            setAge(userData.age || "");
            setAvatar(localStorage.getItem("userAvatar") || avatars[userData.avatar - 1] || null);
            localStorage.setItem("user", JSON.stringify(userData));
          } else if (response.status === 401) {
            localStorage.removeItem("token");
            localStorage.removeItem("user");
            navigate("/login");
            return;
          }
        } catch (fetchError) {
          console.log("User profile endpoint not available, using localStorage data");
        }
      } catch (error) {
        console.error("Error fetching user details:", (error as Error).message);
        toast({
          title: "Error",
          description: "Failed to load profile. Using cached data.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchDetails();
    fetchQuizScores();
  }, [navigate, toast]);

  useEffect(() => {
    if (user) {
      fetchUserCategories();
    }
  }, [user]);

  const fetchUserCategories = async () => {
    setCategoriesLoading(true);
    try {
      const token = localStorage.getItem("token");
      if (!token) return;

      const response = await fetch(`${BASE_URL}/api/categories`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        const categories = await response.json();
        const userAlias = user?.alias;
        const filteredCategories = Array.isArray(categories)
          ? categories.filter((category) => category.createdBy === userAlias)
          : [];
        const transformedCategories = filteredCategories.map((category) => ({
          _id: category._id || category.id,
          name: category.name,
          description: category.description || `Test your knowledge in ${category.name}`,
          createdBy: category.createdBy || "You",
          completionCount: category.completionsCount || 0,
          completionsCount: category.completionsCount || 0,
          questionCount: category.questionCount || 10,
          averageRating: category.averageRating || 0,
          difficulty: category.difficulty || "Medium",
          image: resolveCategoryImageSrc(category.image64, category.image),
          createdAt: category.createdAt,
        }));
        setUserCategories(transformedCategories);
      } else {
        console.log("User categories endpoint not available");
        setUserCategories([]);
      }
    } catch (error) {
      console.log("Error fetching user categories, using empty array");
      setUserCategories([]);
    } finally {
      setCategoriesLoading(false);
    }
  };

  const fetchQuizScores = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) return;

      try {
        const response = await fetch(`${BASE_URL}/api/users/history`, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });

        if (response.ok) {
          const scores = await response.json();
          setQuizScores(Array.isArray(scores) ? scores : []);
          return;
        }
      } catch (error) {
        console.log("Quiz history endpoint not available");
      }

      const mockScores = [
        {
          id: "1",
          categoryName: "General Knowledge",
          categoryId: "1",
          score: 8,
          totalQuestions: 10,
          completedAt: "2024-01-20T10:30:00Z",
          percentage: 80,
        },
        {
          id: "2",
          categoryName: "Science & Technology",
          categoryId: "2",
          score: 9,
          totalQuestions: 10,
          completedAt: "2024-01-18T14:15:00Z",
          percentage: 90,
        },
      ];
      setQuizScores(mockScores);
    } catch (error) {
      console.log("Error fetching quiz scores, using empty array");
      setQuizScores([]);
    }
  };

  // Calculate statistics
  const calculateStats = () => {
    const totalQuizzes = quizScores.length;
    const totalCorrect = quizScores.reduce((sum, score) => sum + score.score, 0);
    const totalQuestions = quizScores.reduce((sum, score) => sum + score.totalQuestions, 0);
    const totalIncorrect = totalQuestions - totalCorrect;

    return {
      totalQuizzes,
      totalCorrect,
      totalIncorrect,
      totalQuestions
    };
  };

  const stats = calculateStats();

  const handleAvatarSelection = (selectedAvatar: string, index: number) => {
    setAvatar(selectedAvatar);
    localStorage.setItem("userAvatar", selectedAvatar);
    localStorage.setItem("userAvatarIndex", index.toString());
  };

  const updateUserDetails = async () => {
    setUpdating(true);
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        toast({
          title: "Authentication Error",
          description: "Please log in again.",
          variant: "destructive",
        });
        navigate("/auth");
        return;
      }

      // Get the avatar index from localStorage or calculate it
      const avatarIndex = localStorage.getItem("userAvatarIndex");
      const avatarValue = avatarIndex ? parseInt(avatarIndex) + 1 : (avatars.indexOf(avatar || "") + 1) || user.avatar;

      const updateData = {
        alias,
        age: parseInt(age),
        avatar: avatarValue
      };

      const response = await fetch(`${BASE_URL}/api/updateUserDetails`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updateData),
      });

      if (response.ok) {
        const data = await response.json();
        const updatedUser = { ...user, alias, age: parseInt(age), avatar: avatarValue };
        setUser(updatedUser);
        localStorage.setItem("user", JSON.stringify(updatedUser));

        toast({
          title: "Success",
          description: "Profile updated successfully!",
        });

        setIsProfileVisible(true);
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to update profile on server.");
      }
    } catch (error) {
      console.log("Server update failed:", (error as Error).message);
      toast({
        title: "Error",
        description: `Failed to save changes: ${(error as Error).message}`,
        variant: "destructive",
      });
    } finally {
      setUpdating(false);
    }
  };

  const handleChangePassword = async () => {
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast({
        title: "Validation Error",
        description: "New passwords do not match.",
        variant: "destructive",
      });
      return;
    }

    if (passwordData.newPassword.length < 6) {
      toast({
        title: "Validation Error",
        description: "Password must be at least 6 characters long.",
        variant: "destructive",
      });
      return;
    }

    setChangingPassword(true);
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${BASE_URL}/api/users/change-password`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          currentPassword: passwordData.currentPassword,
          newPassword: passwordData.newPassword,
        }),
      });

      if (response.ok) {
        toast({
          title: "Success",
          description: "Password changed successfully!",
        });
        setPasswordData({ currentPassword: "", newPassword: "", confirmPassword: "" });
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to change password.");
      }
    } catch (error) {
      toast({
        title: "Error",
        description: (error as Error).message,
        variant: "destructive",
      });
    } finally {
      setChangingPassword(false);
    }
  };

  const handleSaveClick = async () => {
    if (!alias.trim()) {
      toast({
        title: "Validation Error",
        description: "Please enter a valid username.",
        variant: "destructive",
      });
      return;
    }

    if (!age || isNaN(parseInt(age)) || parseInt(age) <= 0 || parseInt(age) > 120) {
      toast({
        title: "Validation Error",
        description: "Please enter a valid age between 1 and 120.",
        variant: "destructive",
      });
      return;
    }

    if (!avatar) {
      toast({
        title: "Validation Error",
        description: "Please select an avatar.",
        variant: "destructive",
      });
      return;
    }

    await updateUserDetails();
  };

  const getScoreColor = (percentage: number) => {
    if (percentage >= 80) return "text-green-600 dark:text-green-400";
    if (percentage >= 60) return "text-yellow-600 dark:text-yellow-400";
    return "text-red-600 dark:text-red-400";
  };

  const getScoreBadgeVariant = (percentage: number) => {
    if (percentage >= 80) return "default";
    if (percentage >= 60) return "secondary";
    return "destructive";
  };

  const handlePlayAgain = (categoryId: string) => {
    navigate(`/quiz/${categoryId}`);
  };

  const startQuiz = async (categoryId: string, categoryName: string) => {
    const userToken = localStorage.getItem("token");
    if (!userToken) {
      toast({
        title: "Authentication Required",
        description: "You must be logged in to play.",
        variant: "destructive",
      });
      return;
    }

    navigate(`/quiz/${categoryId}`, {
      state: {
        categoryName
      }
    });
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("userAvatar");
    localStorage.removeItem("userAvatarIndex");
    navigate("/auth");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground font-semibold">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">Failed to load profile</p>
          <Button onClick={() => navigate("/login")}>Go to Login</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {isProfileVisible ? (
        <>
          {/* Main sticky header with backdrop blur */}
          <div className="sticky top-0 z-20 w-full bg-background/50 backdrop-blur-md border-b border-border/30">
            {/* Header Stats Bar */}
            <div className="container max-w-4xl mx-auto p-4 flex items-center justify-between">
              <Button variant="ghost" onClick={() => navigate("/")} className="text-foreground p-2 hover:bg-accent">
                <ArrowLeft className="w-5 h-5" />
              </Button>
                <GameStatsHeader userToken={userToken} isParentLoading={loading} />
            </div>
            
            {/* Profile Info Section */}
            <div className="container max-w-4xl mx-auto p-4 pb-6">
              <div className="flex items-center space-x-4 mb-4">
                <div className="relative inline-block">
                  <Avatar className="w-20 h-20 md:w-24 md:h-24 border-4 border-background shadow-2xl">
                    <AvatarImage src={avatars[user.avatar - 1] || avatar} />
                    <AvatarFallback className="text-2xl bg-muted text-muted-foreground">
                      {(alias || user.alias).charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <Button
                    onClick={() => setIsProfileVisible(false)}
                    size="sm"
                    className="absolute -top-2 -right-2 w-8 h-8 p-0 bg-primary hover:bg-primary/80 rounded-full border-2 border-background shadow-lg"
                  >
                    <Edit className="w-4 h-4 text-primary-foreground" />
                  </Button>
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-foreground">{alias || user.alias}</h1>
                  <div className="flex items-center mt-1 space-x-1">
                    <img src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 16'%3E%3Crect width='24' height='16' fill='%23007A4D'/%3E%3Cpath d='M0 0h24v5.33H0z' fill='%23DE3831'/%3E%3Cpath d='M0 10.67h24V16H0z' fill='%23002395'/%3E%3Cpath d='M0 5.33h24v5.34H0z' fill='%23FFB612'/%3E%3Cpath d='M12 8L9 6v4l3-2z' fill='%23007A4D'/%3E%3C/svg%3E" alt="SA Flag" className="w-5 h-3" />
                    <span className="text-muted-foreground text-sm">South Africa</span>
                  </div>
                </div>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-card/50 backdrop-blur-sm rounded-lg p-3 border border-border/30 text-center">
                  <Trophy className="w-5 h-5 text-primary mx-auto mb-1" />
                  <p className="text-2xl font-bold text-foreground">{stats.totalQuizzes}</p>
                  <p className="text-xs text-muted-foreground">Quizzes</p>
                </div>
                <div className="bg-card/50 backdrop-blur-sm rounded-lg p-3 border border-border/30 text-center">
                  <CheckCircle2 className="w-5 h-5 text-green-500 mx-auto mb-1" />
                  <p className="text-2xl font-bold text-foreground">{stats.totalCorrect}</p>
                  <p className="text-xs text-muted-foreground">Correct</p>
                </div>
                <div className="bg-card/50 backdrop-blur-sm rounded-lg p-3 border border-border/30 text-center">
                  <XCircle className="w-5 h-5 text-red-500 mx-auto mb-1" />
                  <p className="text-2xl font-bold text-foreground">{stats.totalIncorrect}</p>
                  <p className="text-xs text-muted-foreground">Incorrect</p>
                </div>
              </div>
            </div>
          </div>

          {/* This container holds the entire Tabs component */}
          <div className="container max-w-4xl mx-auto p-4">
            <Tabs defaultValue="history" className="w-full">
              {/* TabsList is now sticky, appearing right below the main header */}
              <TabsList className="sticky top-[240px] z-10 grid w-full grid-cols-4 bg-background/50 backdrop-blur-sm border-b border-muted-foreground/30">
                <TabsTrigger
                  value="history"
                  className="rounded-none data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:font-bold text-muted-foreground font-semibold hover:bg-transparent transition-all"
                >
                  <Trophy className="w-4 h-4 mr-2" />
                  History
                </TabsTrigger>
                <TabsTrigger
                  value="categories"
                  className="rounded-none data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:font-bold text-muted-foreground font-semibold hover:bg-transparent transition-all"
                >
                  <Brain className="w-4 h-4 mr-2" />
                  My Quizzes
                </TabsTrigger>
                <TabsTrigger
                  value="economy"
                  className="rounded-none data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:font-bold text-muted-foreground font-semibold hover:bg-transparent transition-all"
                >
                  <Coins className="w-4 h-4 mr-2" />
                  Economy
                </TabsTrigger>
                <TabsTrigger
                  value="settings"
                  className="rounded-none data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:font-bold text-muted-foreground font-semibold hover:bg-transparent transition-all"
                >
                  <Lock className="w-4 h-4 mr-2" />
                  Settings
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="history" className="mt-6 space-y-4">
                <Card className="bg-transparent backdrop-blur-sm border-border/50 shadow-xl">
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2 text-foreground">
                      <TrendingUp className="w-5 h-5" />
                      <span>Recent Performances</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {quizScores.length === 0 ? (
                      <div className="text-center py-8">
                        <Target className="w-16 h-16 text-muted-foreground/50 mx-auto mb-4" />
                        <p className="text-muted-foreground mb-4">No quizzes completed yet</p>
                        <Button onClick={() => navigate("/")} className="bg-primary text-primary-foreground hover:bg-primary/80">
                          Take Your First Quiz
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {quizScores.map((score, index) => (
                          <div key={score.id || index} className="flex items-center justify-between p-4 rounded-lg bg-accent/30 border border-border/30 hover:bg-accent/50 transition-colors">
                            <div className="flex-1">
                              <h3 className="font-semibold text-foreground">{score.categoryName}</h3>
                              <p className="text-xs text-muted-foreground flex items-center mt-1">
                                <Calendar className="w-3 h-3 mr-1" />
                                {new Date(score.completedAt).toLocaleDateString()}
                              </p>
                            </div>
                            <div className="flex items-center space-x-3">
                              <div className="text-center">
                                <p className={`text-xl font-bold ${getScoreColor(score.percentage)}`}>
                                  {score.score}/{score.totalQuestions}
                                </p>
                                <Badge variant={getScoreBadgeVariant(score.percentage)}>
                                  {score.percentage}%
                                </Badge>
                              </div>
                              <Button
                                onClick={() => handlePlayAgain(score.categoryId)}
                                size="sm"
                                className="bg-primary text-primary-foreground hover:bg-primary/80"
                              >
                                <RotateCcw className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="categories" className="mt-6">
                <Card className="bg-transparent backdrop-blur-sm border-border/50 shadow-xl">
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2 text-foreground">
                      <Brain className="w-5 h-5" />
                      <span>My Quiz Categories</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {categoriesLoading ? (
                      <div className="text-center py-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                        <p className="mt-4 text-muted-foreground">Loading your categories...</p>
                      </div>
                    ) : userCategories.length === 0 ? (
                      <div className="text-center py-8">
                        <Brain className="w-16 h-16 text-muted-foreground/50 mx-auto mb-4" />
                        <p className="text-muted-foreground mb-4">You haven't created any categories yet</p>
                        <Button onClick={() => navigate("/")} className="bg-primary text-primary-foreground hover:bg-primary/80">
                          <Brain className="w-4 h-4 mr-2" />
                          Create Your First Quiz
                        </Button>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {userCategories.map((category) => (
                          <div
                            key={category._id}
                            onClick={() => startQuiz(category._id, category.name)}
                            className="bg-card border border-border/50 rounded-xl overflow-hidden hover:shadow-lg hover:shadow-primary/10 transition-all duration-300 hover:scale-105 hover:border-primary/30 group cursor-pointer"
                          >
                            <div className="relative overflow-hidden h-32 bg-gradient-to-br from-primary/20 to-secondary/20">
                              <img
                                src={category.image || `https://picsum.photos/seed/${category._id}/300/200`}
                                alt={category.name}
                                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                                onError={(e) => {
                                  const target = e.target as HTMLImageElement;
                                  target.src = `https://picsum.photos/seed/${category._id}/300/200`;
                                }}
                              />
                            </div>
                            <div className="p-4 space-y-2">
                              <h3 className="font-bold text-foreground line-clamp-1">{category.name}</h3>
                              {category.description && (
                                <p className="text-sm text-muted-foreground line-clamp-2">{category.description}</p>
                              )}
                              <div className="flex items-center justify-between text-xs text-muted-foreground">
                                <div className="flex items-center space-x-3">
                                  <div className="flex items-center space-x-1">
                                    <Users className="w-3 h-3" />
                                    <span>{category.completionCount} plays</span>
                                  </div>
                                  {category.averageRating > 0 && (
                                    <div className="flex items-center space-x-1">
                                      <Star className="w-3 h-3 text-yellow-500 dark:text-yellow-400 fill-current" />
                                      <span>{category.averageRating.toFixed(1)}</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                              {category.createdAt && (
                                <p className="text-xs text-muted-foreground">
                                  Created {new Date(category.createdAt).toLocaleDateString()}
                                </p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="economy" className="mt-6">
                <Card className="bg-transparent backdrop-blur-sm border-border/50 shadow-xl">
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2 text-foreground">
                      <Coins className="w-5 h-5" />
                      <span>Economy Overview</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Currency Balance */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-gradient-to-br from-yellow-500/20 to-yellow-600/10 rounded-lg p-6 border border-yellow-500/30">
                        <div className="flex items-center justify-center mb-3">
                          <Coins className="w-12 h-12 text-yellow-500" />
                        </div>
                        <p className="text-center text-3xl font-bold text-foreground mb-1">{user.coins || 0}</p>
                        <p className="text-center text-sm text-muted-foreground">Gold Coins</p>
                      </div>
                      <div className="bg-gradient-to-br from-purple-500/20 to-purple-600/10 rounded-lg p-6 border border-purple-500/30">
                        <div className="flex items-center justify-center mb-3">
                          <Zap className="w-12 h-12 text-purple-500" />
                        </div>
                        <p className="text-center text-3xl font-bold text-foreground mb-1">{user.gems || 0}</p>
                        <p className="text-center text-sm text-muted-foreground">Premium Gems</p>
                      </div>
                    </div>

                    {/* Economy Details */}
                    <div className="space-y-3">
                      <h3 className="font-semibold text-foreground text-lg">Currency Details</h3>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between p-3 rounded-lg bg-accent/30 border border-border/30">
                          <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 rounded-full bg-yellow-500/20 flex items-center justify-center">
                              <Coins className="w-5 h-5 text-yellow-500" />
                            </div>
                            <div>
                              <p className="font-semibold text-foreground">Gold Coins</p>
                              <p className="text-xs text-muted-foreground">Earned from completing quizzes</p>
                            </div>
                          </div>
                          <p className="text-xl font-bold text-yellow-500">{user.coins || 0}</p>
                        </div>
                        
                        <div className="flex items-center justify-between p-3 rounded-lg bg-accent/30 border border-border/30">
                          <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center">
                              <Zap className="w-5 h-5 text-purple-500" />
                            </div>
                            <div>
                              <p className="font-semibold text-foreground">Premium Gems</p>
                              <p className="text-xs text-muted-foreground">Premium currency for special items</p>
                            </div>
                          </div>
                          <p className="text-xl font-bold text-purple-500">{user.gems || 0}</p>
                        </div>

                        {user.tokens && (
                          <div className="flex items-center justify-between p-3 rounded-lg bg-accent/30 border border-border/30">
                            <div className="flex items-center space-x-3">
                              <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center">
                                <Award className="w-5 h-5 text-blue-500" />
                              </div>
                              <div>
                                <p className="font-semibold text-foreground">Quiz Tokens</p>
                                <p className="text-xs text-muted-foreground">Special event currency</p>
                              </div>
                            </div>
                            <p className="text-xl font-bold text-blue-500">{user.tokens}</p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Earning History */}
                    <div className="space-y-3">
                      <h3 className="font-semibold text-foreground text-lg">How to Earn</h3>
                      <div className="space-y-2 text-sm">
                        <div className="flex items-start space-x-2 p-3 rounded-lg bg-card/50">
                          <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5" />
                          <div>
                            <p className="font-semibold text-foreground">Complete Quizzes</p>
                            <p className="text-muted-foreground">Earn 10-50 coins based on performance</p>
                          </div>
                        </div>
                        <div className="flex items-start space-x-2 p-3 rounded-lg bg-card/50">
                          <Trophy className="w-4 h-4 text-yellow-500 mt-0.5" />
                          <div>
                            <p className="font-semibold text-foreground">Perfect Scores</p>
                            <p className="text-muted-foreground">Get bonus 25 coins for 100% accuracy</p>
                          </div>
                        </div>
                        <div className="flex items-start space-x-2 p-3 rounded-lg bg-card/50">
                          <Brain className="w-4 h-4 text-primary mt-0.5" />
                          <div>
                            <p className="font-semibold text-foreground">Create Quizzes</p>
                            <p className="text-muted-foreground">Earn 5 coins when others play your quizzes</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="settings" className="mt-6">
                <Card className="bg-transparent backdrop-blur-sm border-border/50 shadow-xl">
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2 text-foreground">
                      <Lock className="w-5 h-5" />
                      <span>Security Settings</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-6">
                      {/* Change Password Section */}
                      <div className="space-y-4">
                        <h3 className="font-semibold text-foreground">Change Password</h3>
                        <div className="space-y-3">
                          <div className="space-y-2">
                            <Label htmlFor="currentPassword">Current Password</Label>
                            <Input
                              id="currentPassword"
                              type="password"
                              value={passwordData.currentPassword}
                              onChange={(e) => setPasswordData({...passwordData, currentPassword: e.target.value})}
                              placeholder="Enter current password"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="newPassword">New Password</Label>
                            <Input
                              id="newPassword"
                              type="password"
                              value={passwordData.newPassword}
                              onChange={(e) => setPasswordData({...passwordData, newPassword: e.target.value})}
                              placeholder="Enter new password (min 6 characters)"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="confirmPassword">Confirm New Password</Label>
                            <Input
                              id="confirmPassword"
                              type="password"
                              value={passwordData.confirmPassword}
                              onChange={(e) => setPasswordData({...passwordData, confirmPassword: e.target.value})}
                              placeholder="Confirm new password"
                            />
                          </div>
                          <Button 
                            onClick={handleChangePassword}
                            disabled={changingPassword || !passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword}
                            className="w-full bg-primary text-primary-foreground hover:bg-primary/80"
                          >
                            {changingPassword ? (
                              <div className="flex items-center space-x-2">
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                                <span>Changing Password...</span>
                              </div>
                            ) : (
                              "Change Password"
                            )}
                          </Button>
                        </div>
                      </div>

                      {/* Account Actions */}
                      <div className="pt-4 border-t border-border/30">
                        <Button 
                          onClick={handleLogout}
                          variant="destructive"
                          className="w-full"
                        >
                          Logout
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </>
      ) : (
        <div className="container max-w-4xl mx-auto p-4">
          <Card className="bg-card/90 backdrop-blur-sm border-border/50 shadow-xl">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2 text-foreground">
                <User className="w-5 h-5" />
                <span>Edit Profile</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); handleSaveClick(); }}>
                <div className="space-y-2">
                  <Label htmlFor="alias">Username</Label>
                  <Input
                    id="alias"
                    value={alias}
                    onChange={(e) => setAlias(e.target.value)}
                    placeholder="Enter your username"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input
                    value={user.email}
                    disabled
                    className="cursor-not-allowed bg-muted"
                  />
                  <p className="text-xs text-muted-foreground">Email cannot be changed</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="age">Age</Label>
                  <Input
                    id="age"
                    type="number"
                    value={age}
                    onChange={(e) => setAge(e.target.value)}
                    placeholder="Enter your age"
                    min="1"
                    max="120"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Select Avatar</Label>
                  <div className="grid grid-cols-4 gap-2 p-3 border border-border rounded-lg bg-card">
                    {avatars.map((avatarImg, index) => (
                      <Avatar
                        key={index}
                        className={`w-16 h-16 cursor-pointer border-2 transition-all ${
                          avatar === avatarImg
                            ? "border-primary ring-2 ring-primary/30 shadow-lg transform scale-110"
                            : "border-transparent hover:border-primary/50 hover:scale-105"
                        }`}
                        onClick={() => handleAvatarSelection(avatarImg, index)}
                      >
                        <AvatarImage src={avatarImg} alt={`Avatar ${index + 1}`} />
                        <AvatarFallback className="bg-muted text-muted-foreground">AV</AvatarFallback>
                      </Avatar>
                    ))}
                  </div>
                </div>
                <div className="flex flex-col-reverse sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-2 mt-6">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setIsProfileVisible(true);
                      setAlias(user.alias || "");
                      setAge(user.age || "");
                      setAvatar(avatars[user.avatar - 1] || null);
                    }}
                    disabled={updating}
                    className="w-full sm:w-auto"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={updating}
                    className="w-full sm:w-auto bg-primary text-primary-foreground hover:bg-primary/80"
                  >
                    {updating ? (
                      <div className="flex items-center space-x-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                        <span>Saving...</span>
                      </div>
                    ) : (
                      "Save Changes"
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default Profile;
