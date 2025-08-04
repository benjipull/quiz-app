import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { User, Trophy, Clock, RotateCcw, ArrowLeft, Edit, Play, Brain, Users, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";

const BASE_URL = "https://quiz-app-node-606998948537.europe-west4.run.app";

const avatarImages = import.meta.glob('../assets/images/avatars/*.png', {
  eager: true,
  import: 'default',
});
const avatars: string[] = Object.values(avatarImages) as string[];

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
  const navigate = useNavigate();
  const { toast } = useToast();

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
          imageUrl: category.imageUrl || category.image,
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
        navigate("/login");
        return;
      }

      const updateData = {
        alias,
        age: parseInt(age),
        avatar: avatar || user.avatar,
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
        const updatedUser = { ...user, alias, age: parseInt(age), avatar: data.user.avatar };
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
    if (percentage >= 80) return "text-emerald-600";
    if (percentage >= 60) return "text-yellow-600";
    return "text-red-600";
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

    navigate("/", {
      state: {
        startQuiz: true,
        categoryId,
        categoryName
      }
    });
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("userAvatar");
    localStorage.removeItem("userAvatarIndex");
    navigate("/login");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading profile...</p>
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
      <div className="container max-w-6xl mx-auto p-4 md:p-6">
        {/* Header with back and logout buttons */}
        <div className="flex items-center justify-between mb-6 md:mb-8">
          <Button variant="ghost" onClick={() => navigate("/")} className="flex items-center space-x-1 p-2 md:p-4">
            <ArrowLeft className="w-4 h-4 md:w-5 md:h-5" />
            <span className="hidden md:inline">Back to Home</span>
          </Button>
          <Button variant="outline" onClick={handleLogout} className="flex items-center space-x-1 p-2 md:p-4">
            <span className="hidden md:inline">Logout</span>
            <span className="md:hidden">Logout</span>
          </Button>
        </div>

        {isProfileVisible ? (
          <>
            {/* Profile Card Section */}
            <Card className="mb-6 md:mb-8">
              <CardContent className="p-4 md:p-8">
                <div className="flex flex-col md:flex-row items-center md:items-start space-y-4 md:space-y-0 md:space-x-6">
                  <Avatar className="w-20 h-20 md:w-24 md:h-24">
                    <AvatarImage src={avatars[user.avatar - 1] || avatar} />
                    <AvatarFallback>{(alias || user.alias).charAt(0).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 text-center md:text-left">
                    <h1 className="text-2xl md:text-3xl font-bold text-foreground">{alias || user.alias}</h1>
                    <p className="text-muted-foreground text-sm md:text-lg">{user.email}</p>
                    <p className="text-xs md:text-sm text-muted-foreground mt-2">Age: {age || user.age}</p>
                    <p className="text-xs md:text-sm text-muted-foreground mt-1">
                      Member since {user.created_at ? new Date(user.created_at).toLocaleDateString() : "N/A"}
                    </p>
                  </div>
                  <div className="text-center md:text-right space-y-2 w-full md:w-auto">
                    <div className="flex items-center space-x-2 justify-center md:justify-end">
                      <Trophy className="w-4 h-4 md:w-5 md:h-5 text-yellow-500" />
                      <span className="font-semibold text-sm md:text-base">Best Score: {user.bestScore || 0}%</span>
                    </div>
                    <div className="flex items-center space-x-2 justify-center md:justify-end">
                      <User className="w-4 h-4 md:w-5 md:h-5 text-blue-500" />
                      <span className="font-semibold text-sm md:text-base">Avg Score: {user.averageScore || 0}%</span>
                    </div>
                    <div className="flex items-center space-x-2 justify-center md:justify-end">
                      <Clock className="w-4 h-4 md:w-5 md:h-5 text-green-500" />
                      <span className="font-semibold text-sm md:text-base">Total Quizzes: {user.totalQuizzes || quizScores.length}</span>
                    </div>
                    <div className="flex items-center space-x-2 justify-center md:justify-end">
                      <Brain className="w-4 h-4 md:w-5 md:h-5 text-purple-500" />
                      <span className="font-semibold text-sm md:text-base">Categories Created: {userCategories.length}</span>
                    </div>
                  </div>
                </div>
                <div className="mt-6 text-center">
                  <Button onClick={() => setIsProfileVisible(false)} className="w-full md:w-auto">
                    <Edit className="w-4 h-4 mr-2" />
                    Edit Profile
                  </Button>
                </div>
              </CardContent>
            </Card>
            <Tabs defaultValue="quiz-history" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="quiz-history" className="flex items-center justify-center space-x-2">
                  <Trophy className="w-4 h-4" />
                  <span>History</span>
                </TabsTrigger>
                <TabsTrigger value="my-categories" className="flex items-center justify-center space-x-2">
                  <Brain className="w-4 h-4" />
                  <span>My Quizzes</span>
                </TabsTrigger>
              </TabsList>
              <TabsContent value="quiz-history">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2 text-xl md:text-2xl">
                      <Trophy className="w-5 h-5 md:w-6 md:h-6" />
                      <span>Quiz History</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {quizScores.length === 0 ? (
                      <div className="text-center py-8">
                        <p className="text-muted-foreground mb-4">No quizzes completed yet</p>
                        <Button onClick={() => navigate("/")} className="mt-4">
                          Take Your First Quiz
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {quizScores.map((score, index) => (
                          <div key={score.id || index}>
                            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 rounded-lg bg-card border space-y-2 sm:space-y-0">
                              <div className="flex-1">
                                <h3 className="font-semibold text-foreground text-base sm:text-lg">{score.categoryName}</h3>
                                <p className="text-xs text-muted-foreground">
                                  Completed on {new Date(score.completedAt).toLocaleDateString()}
                                </p>
                              </div>
                              <div className="flex items-center space-x-4">
                                <div className="text-center">
                                  <p className={`text-xl sm:text-2xl font-bold ${getScoreColor(score.percentage)}`}>
                                    {score.score}/{score.totalQuestions}
                                  </p>
                                  <Badge variant={getScoreBadgeVariant(score.percentage)}>
                                    {score.percentage}%
                                  </Badge>
                                </div>
                                <Button
                                  onClick={() => handlePlayAgain(score.categoryId)}
                                  size="sm"
                                  className="flex items-center space-x-2"
                                >
                                  <RotateCcw className="w-4 h-4" />
                                  <span className="hidden sm:inline">Play Again</span>
                                </Button>
                              </div>
                            </div>
                            {index < quizScores.length - 1 && <Separator />}
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
              <TabsContent value="my-categories">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2 text-xl md:text-2xl">
                      <Brain className="w-5 h-5 md:w-6 md:h-6" />
                      <span>Categories I Created</span>
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
                        <Brain className="w-12 h-12 md:w-16 md:h-16 text-muted-foreground/50 mx-auto mb-4" />
                        <p className="text-muted-foreground mb-4">You haven't created any categories yet</p>
                        <Button onClick={() => navigate("/")} className="flex items-center space-x-2">
                          <Brain className="w-4 h-4" />
                          <span>Create Your First Quiz</span>
                        </Button>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                        {userCategories.map((category) => (
                          <div
                            key={category._id}
                            className="bg-card border rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer group"
                          >
                            <div className="relative overflow-hidden rounded-lg mb-3 h-32 bg-gradient-to-br from-blue-500/20 to-purple-500/20">
                              <img
                                src={category.imageUrl || `https://picsum.photos/seed/${category._id}/300/200`}
                                alt={category.name}
                                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                                onError={(e) => {
                                  const target = e.target as HTMLImageElement;
                                  target.src = `https://picsum.photos/seed/${category._id}/300/200`;
                                }}
                              />
                              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent flex items-end justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                <Button
                                  size="sm"
                                  onClick={() => startQuiz(category._id, category.name)}
                                  className="mb-2 bg-primary/90 hover:bg-primary text-primary-foreground"
                                >
                                  <Play className="w-4 h-4 mr-2" />
                                  Play Quiz
                                </Button>
                              </div>
                            </div>
                            <div className="space-y-2">
                              <h3 className="font-semibold text-foreground line-clamp-1">{category.name}</h3>
                              {category.description && (
                                <p className="text-sm text-muted-foreground line-clamp-2">{category.description}</p>
                              )}
                              <div className="flex items-center justify-between text-xs text-muted-foreground">
                                <div className="flex items-center space-x-3">
                                  {category.completionCount > 0 && (
                                    <div className="flex items-center space-x-1">
                                      <Users className="w-3 h-3" />
                                      <span>{category.completionCount}</span>
                                    </div>
                                  )}
                                  {category.averageRating > 0 && (
                                    <div className="flex items-center space-x-1">
                                      <Star className="w-3 h-3 text-yellow-500 fill-current" />
                                      <span>{category.averageRating.toFixed(1)}</span>
                                    </div>
                                  )}
                                </div>
                                <Badge variant="secondary" className="text-xs">
                                  {category.questionCount} questions
                                </Badge>
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
            </Tabs>
          </>
        ) : (
          <Card className="max-w-full md:max-w-md mx-auto">
            <CardHeader>
              <CardTitle>Edit Profile</CardTitle>
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
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 p-2 border rounded-md">
                    {avatars.map((avatarImg, index) => (
                      <Avatar
                        key={index}
                        className={`w-16 h-16 cursor-pointer border-2 transition-all ${
                          avatar === avatarImg
                            ? "border-primary ring-2 ring-primary shadow-lg"
                            : "border-transparent hover:border-muted-foreground"
                        }`}
                        onClick={() => handleAvatarSelection(avatarImg, index)}
                      >
                        <AvatarImage src={avatarImg} alt={`Avatar ${index + 1}`} />
                        <AvatarFallback>AV</AvatarFallback>
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
                  <Button type="submit" disabled={updating} className="w-full sm:w-auto">
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
        )}
      </div>
    </div>
  );
};

export default Profile;