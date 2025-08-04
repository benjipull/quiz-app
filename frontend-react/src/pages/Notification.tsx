import { Bell, Trophy, Users, Star, Clock } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Header } from "@/components/layout/Header";

const mockNotifications = [
  {
    id: 1,
    type: "new_category",
    title: "New Quiz Category Added!",
    description: "Science & Technology category has been added with 50+ questions",
    time: "2 hours ago",
    icon: Star,
    unread: true,
  },
  {
    id: 2,
    type: "achievement",
    title: "Achievement Unlocked",
    description: "You've completed 10 quizzes! Keep up the great work!",
    time: "1 day ago",
    icon: Trophy,
    unread: true,
  },
  {
    id: 3,
    type: "leaderboard",
    title: "Leaderboard Update",
    description: "You've moved up to rank #5 in the Sports category!",
    time: "2 days ago",
    icon: Users,
    unread: false,
  },
  {
    id: 4,
    type: "new_category",
    title: "History Quiz Available",
    description: "Explore world history with our new comprehensive quiz set",
    time: "3 days ago",
    icon: Star,
    unread: false,
  },
  {
    id: 5,
    type: "achievement",
    title: "Streak Master!",
    description: "You've maintained a 7-day quiz streak! Amazing dedication!",
    time: "1 week ago",
    icon: Trophy,
    unread: false,
  },
];

const getNotificationColor = (type: string) => {
  switch (type) {
    case "new_category":
      return "text-blue-500";
    case "achievement":
      return "text-yellow-500";
    case "leaderboard":
      return "text-green-500";
    default:
      return "text-primary";
  }
};

const Notifications = () => {
  const unreadCount = mockNotifications.filter(n => n.unread).length;

  return (
    <div className="min-h-screen">
      <Header 
        title="Notifications" 
        showNotifications={false}
      />
      
      <div className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-primary" />
            <span className="text-sm text-muted-foreground">
              {unreadCount} unread notifications
            </span>
          </div>
          <Button variant="ghost" size="sm" className="text-primary">
            Mark all as read
          </Button>
        </div>

        <div className="space-y-3">
          {mockNotifications.map((notification) => {
            const IconComponent = notification.icon;
            return (
              <Card 
                key={notification.id} 
                className={`transition-all duration-200 hover:shadow-md ${
                  notification.unread ? 'border-primary/20 bg-primary/5' : ''
                }`}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-full bg-background ${getNotificationColor(notification.type)}`}>
                      <IconComponent className="h-4 w-4" />
                    </div>
                    
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium text-sm">{notification.title}</h3>
                        {notification.unread && (
                          <Badge variant="secondary" className="text-xs px-1.5 py-0.5">
                            New
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {notification.description}
                      </p>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        <span>{notification.time}</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {mockNotifications.length === 0 && (
          <div className="text-center py-12">
            <Bell className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium text-muted-foreground mb-2">
              No notifications yet
            </h3>
            <p className="text-sm text-muted-foreground">
              You'll see updates about new quizzes and achievements here
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Notifications;