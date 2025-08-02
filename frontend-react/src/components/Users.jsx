import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Users as UsersIcon, ArrowLeft, Circle, Trophy, Brain } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const Users = () => {
  const [users, setUsers] = useState([]);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      // Mock data
      const mockUsers = [
        {
          id: "1",
          name: "Alex Johnson",
          avatar: "",
          isOnline: true,
          lastSeen: "2024-01-20T10:30:00Z",
          totalQuizzes: 25,
          averageScore: 85,
          createdCategories: [
            {
              id: "1",
              name: "Programming Basics",
              questionsCount: 15,
              completionCount: 120,
              averageRating: 4.5,
            },
            {
              id: "2",
              name: "Web Development",
              questionsCount: 20,
              completionCount: 95,
              averageRating: 4.2,
            },
          ],
        },
        {
          id: "2",
          name: "Sarah Smith",
          avatar: "",
          isOnline: true,
          lastSeen: "2024-01-20T09:15:00Z",
          totalQuizzes: 18,
          averageScore: 92,
          createdCategories: [
            {
              id: "3",
              name: "Mathematics",
              questionsCount: 30,
              completionCount: 200,
              averageRating: 4.7,
            },
          ],
        },
        {
          id: "3",
          name: "Mike Chen",
          avatar: "",
          isOnline: false,
          lastSeen: "2024-01-19T16:45:00Z",
          totalQuizzes: 12,
          averageScore: 78,
          createdCategories: [
            {
              id: "4",
              name: "Science Facts",
              questionsCount: 25,
              completionCount: 150,
              averageRating: 4.3,
            },
            {
              id: "5",
              name: "Space & Astronomy",
              questionsCount: 18,
              completionCount: 80,
              averageRating: 4.6,
            },
          ],
        },
        {
          id: "4",
          name: "Emma Wilson",
          avatar: "",
          isOnline: false,
          lastSeen: "2024-01-18T14:20:00Z",
          totalQuizzes: 30,
          averageScore: 88,
          createdCategories: [],
        },
      ];

      setUsers(mockUsers);
      setOnlineUsers(mockUsers.filter((user) => user.isOnline));
    } catch (error) {
      console.error("Error fetching users:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleUserClick = (user) => {
    setSelectedUser(user);
  };

  const handlePlayQuiz = (categoryId) => {
    navigate(`/quiz/${categoryId}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading users...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-6xl mx-auto p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-4">
            <Button variant="ghost" onClick={() => navigate("/")} className="flex items-center space-x-2">
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Home</span>
            </Button>
            <div className="flex items-center space-x-2">
              <UsersIcon className="w-6 h-6" />
              <h1 className="text-3xl font-bold">Community</h1>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Users List */}
          <div className="lg:col-span-2">
            <Tabs defaultValue="all" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="online">Online ({onlineUsers.length})</TabsTrigger>
                <TabsTrigger value="all">All Users ({users.length})</TabsTrigger>
              </TabsList>

              <TabsContent value="online" className="space-y-4">
                {onlineUsers.map((user) => (
                  <Card
                    key={user.id}
                    className="cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => handleUserClick(user)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center space-x-4">
                        <div className="relative">
                          <Avatar className="w-12 h-12">
                            <AvatarImage src={user.avatar} alt={user.name} />
                            <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
                          </Avatar>
                          <Circle className="absolute -bottom-1 -right-1 w-4 h-4 text-green-500 fill-current" />
                        </div>
                        <div className="flex-1">
                          <h3 className="font-semibold">{user.name}</h3>
                          <p className="text-sm text-muted-foreground">Online now</p>
                        </div>
                        <div className="text-right space-y-1">
                          <Badge variant="secondary">{user.totalQuizzes} quizzes</Badge>
                          <p className="text-sm text-muted-foreground">{user.averageScore}% avg</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </TabsContent>

              <TabsContent value="all" className="space-y-4">
                {users.map((user) => (
                  <Card
                    key={user.id}
                    className="cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => handleUserClick(user)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center space-x-4">
                        <div className="relative">
                          <Avatar className="w-12 h-12">
                            <AvatarImage src={user.avatar} alt={user.name} />
                            <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
                          </Avatar>
                          <Circle
                            className={`absolute -bottom-1 -right-1 w-4 h-4 ${
                              user.isOnline ? "text-green-500" : "text-gray-400"
                            } fill-current`}
                          />
                        </div>
                        <div className="flex-1">
                          <h3 className="font-semibold">{user.name}</h3>
                          <p className="text-sm text-muted-foreground">
                            {user.isOnline
                              ? "Online now"
                              : `Last seen ${new Date(user.lastSeen).toLocaleDateString()}`}
                          </p>
                        </div>
                        <div className="text-right space-y-1">
                          <Badge variant="secondary">{user.totalQuizzes} quizzes</Badge>
                          <p className="text-sm text-muted-foreground">{user.averageScore}% avg</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </TabsContent>
            </Tabs>
          </div>

          {/* Selected User Details */}
          <div className="lg:col-span-1">
            {selectedUser ? (
              <Card className="sticky top-6">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Brain className="w-5 h-5" />
                    <span>{selectedUser.name}'s Quizzes</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="text-center p-4 bg-muted rounded-lg">
                      <Avatar className="w-16 h-16 mx-auto mb-2">
                        <AvatarImage src={selectedUser.avatar} alt={selectedUser.name} />
                        <AvatarFallback className="text-lg">
                          {selectedUser.name.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <h3 className="font-semibold">{selectedUser.name}</h3>
                      <div className="flex items-center justify-center space-x-2 mt-2">
                        <Trophy className="w-4 h-4 text-yellow-500" />
                        <span className="text-sm">{selectedUser.averageScore}% average</span>
                      </div>
                    </div>

                    {selectedUser.createdCategories.length > 0 ? (
                      <div className="space-y-3">
                        <h4 className="font-medium text-sm text-muted-foreground">Created Categories</h4>
                        {selectedUser.createdCategories.map((category) => (
                          <Card key={category.id} className="p-3">
                            <div className="space-y-2">
                              <h5 className="font-medium">{category.name}</h5>
                              <div className="flex justify-between text-sm text-muted-foreground">
                                <span>{category.questionsCount} questions</span>
                                <span>{category.completionCount} plays</span>
                              </div>
                              <div className="flex items-center justify-between">
                                <Badge variant="outline">⭐ {category.averageRating}</Badge>
                                <Button
                                  size="sm"
                                  onClick={() => handlePlayQuiz(category.id)}
                                  className="text-xs"
                                >
                                  Play Quiz
                                </Button>
                              </div>
                            </div>
                          </Card>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-6">
                        <p className="text-sm text-muted-foreground">
                          {selectedUser.name} hasn't created any quizzes yet
                        </p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card className="sticky top-6">
                <CardContent className="p-8 text-center">
                  <UsersIcon className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">
                    Click on a user to see their created quizzes
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Users;
