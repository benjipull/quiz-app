import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { User, Trophy, Clock, RotateCcw, ArrowLeft, Edit } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

// Load avatars using Vite's glob import
const avatarImages = import.meta.glob('../assets/images/avatars/*.png', {
  eager: true,
  import: 'default',
});
const avatars = Object.values(avatarImages);

const Profile = () => {
  const [user, setUser] = useState(null);
  const [avatar, setAvatar] = useState(null);
  const [alias, setAlias] = useState("");
  const [age, setAge] = useState("");
  const [isProfileVisible, setIsProfileVisible] = useState(true);
  const [loading, setLoading] = useState(true);
  const [quizScores, setQuizScores] = useState([]);
  const navigate = useNavigate();

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
          setAvatar(localStorage.getItem("userAvatar") || parsedUser.avatar || null);
        }

        const response = await fetch("http://localhost:3000/api/getUserDetails", {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });

        if (!response.ok) throw new Error("Failed to fetch user details.");
        const userData = await response.json();

        if (userData.alias) {
          localStorage.setItem("user", JSON.stringify(userData));
          setUser(userData);
          setAlias(userData.alias || "");
          setAge(userData.age || "");
          setAvatar(localStorage.getItem("userAvatar") || userData.avatar || null);
        }
      } catch (error) {
        console.error("Error fetching user details:", error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchDetails();
    fetchQuizScores();
  }, [navigate]);

  const fetchQuizScores = async () => {
    try {
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
        {
          id: "3",
          categoryName: "History",
          categoryId: "3",
          score: 6,
          totalQuestions: 10,
          completedAt: "2024-01-15T09:45:00Z",
          percentage: 60,
        },
      ];
      setQuizScores(mockScores);
    } catch (error) {
      console.error("Error fetching quiz scores:", error);
    }
  };

  const handleAvatarSelection = (selectedAvatar) => {
    setAvatar(selectedAvatar);
    localStorage.setItem("userAvatar", selectedAvatar);
  };

  const updateUserDetails = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) return;

      const response = await fetch("http://localhost:3000/api/updateUserDetails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ alias, age, avatar }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Error updating user details.");

      const updatedUser = { ...user, alias, age, avatar };
      setUser(updatedUser);
      localStorage.setItem("user", JSON.stringify(updatedUser));
      alert("Profile updated successfully!");
    } catch (error) {
      console.error("❌ Error updating user:", error.message);
      alert("Error updating user details: " + error.message);
    }
  };

  const handleSaveClick = async () => {
    if (!alias || isNaN(parseInt(age)) || parseInt(age) <= 0) {
      alert("Please enter a valid username and age.");
      return;
    }

    if (!avatar) {
      alert("Please select an avatar.");
      return;
    }

    await updateUserDetails();
    setIsProfileVisible(true);
  };

  const getScoreColor = (percentage) => {
    if (percentage >= 80) return "text-emerald-600";
    if (percentage >= 60) return "text-yellow-600";
    return "text-red-600";
  };

  const getScoreBadgeVariant = (percentage) => {
    if (percentage >= 80) return "default";
    if (percentage >= 60) return "secondary";
    return "destructive";
  };

  const handlePlayAgain = (categoryId) => {
    navigate(`/quiz/${categoryId}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Failed to load profile</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-6xl mx-auto p-6">
        <div className="flex items-center space-x-4 mb-8">
          <Button variant="ghost" onClick={() => navigate("/")} className="flex items-center space-x-2">
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Home</span>
          </Button>
        </div>

        {isProfileVisible ? (
          <>
            <Card className="mb-8">
              <CardContent className="p-8">
                <div className="flex items-center space-x-6">
                  <Avatar className="w-24 h-24">
                    <AvatarImage src={avatar || user.avatar} />
                    <AvatarFallback>{alias.charAt(0).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <h1 className="text-3xl font-bold text-foreground">{alias}</h1>
                    <p className="text-muted-foreground text-lg">{user.email}</p>
                    <p className="text-sm text-muted-foreground mt-2">Age: {age}</p>
                    <p className="text-sm text-muted-foreground mt-2">
                      Member since {user.joinedAt || "N/A"}
                    </p>
                  </div>
                  <div className="text-right space-y-2">
                    <div className="flex items-center space-x-2">
                      <Trophy className="w-5 h-5 text-yellow-500" />
                      <span className="font-semibold">Best Score: {user.bestScore || 0}%</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <User className="w-5 h-5 text-blue-500" />
                      <span className="font-semibold">Avg Score: {user.averageScore || 0}%</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Clock className="w-5 h-5 text-green-500" />
                      <span className="font-semibold">Total Quizzes: {user.totalQuizzes || 0}</span>
                    </div>
                  </div>
                </div>
                <div className="mt-6 text-center">
                  <Button onClick={() => setIsProfileVisible(false)}>
                    <Edit className="w-4 h-4 mr-2" />
                    Edit Profile
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Trophy className="w-6 h-6" />
                  <span>Quiz History</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {quizScores.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground">No quizzes completed yet</p>
                    <Button onClick={() => navigate("/")} className="mt-4">
                      Take Your First Quiz
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {quizScores.map((score, index) => (
                      <div key={score.id}>
                        <div className="flex items-center justify-between p-4 rounded-lg bg-card border">
                          <div className="flex-1">
                            <h3 className="font-semibold text-foreground">{score.categoryName}</h3>
                            <p className="text-sm text-muted-foreground">
                              Completed on {new Date(score.completedAt).toLocaleDateString()}
                            </p>
                          </div>
                          <div className="flex items-center space-x-4">
                            <div className="text-center">
                              <p className={`text-2xl font-bold ${getScoreColor(score.percentage)}`}>
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
                              <span>Play Again</span>
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
          </>
        ) : (
          <Card className="max-w-md mx-auto">
            <CardHeader>
              <CardTitle>Edit Profile</CardTitle>
            </CardHeader>
            <CardContent>
              <form className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="alias">Username</Label>
                  <Input id="alias" value={alias} onChange={(e) => setAlias(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input value={user.email} disabled className="cursor-not-allowed" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="age">Age</Label>
                  <Input id="age" type="number" value={age} onChange={(e) => setAge(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Select Avatar</Label>
                  <div className="grid grid-cols-4 gap-2 p-2 border rounded-md">
                    {avatars.map((avatarImg, index) => (
                      <Avatar
                        key={index}
                        className={`w-16 h-16 cursor-pointer border-2 ${
                          avatar === avatarImg ? "border-primary ring-2 ring-primary" : "border-transparent"
                        }`}
                        onClick={() => handleAvatarSelection(avatarImg)}
                      >
                        <AvatarImage src={avatarImg} alt={`Avatar ${index + 1}`} />
                        <AvatarFallback>AV</AvatarFallback>
                      </Avatar>
                    ))}
                  </div>
                </div>
                <div className="flex justify-end space-x-2 mt-6">
                  <Button variant="outline" onClick={() => setIsProfileVisible(true)}>
                    Cancel
                  </Button>
                  <Button onClick={handleSaveClick}>Save Changes</Button>
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
