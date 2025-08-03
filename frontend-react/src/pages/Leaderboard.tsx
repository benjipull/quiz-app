import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Trophy, Crown, Star, Medal, Target, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

const topPlayers = [
  {
    id: "1",
    name: "Sarah Chen",
    avatar: "https://picsum.photos/seed/sarah/200/200",
    level: 15,
    score: 9847,
    accuracy: 94,
    streak: 28,
    position: 1
  },
  {
    id: "2", 
    name: "Mike Johnson",
    avatar: "https://picsum.photos/seed/mike/200/200",
    level: 14,
    score: 9203,
    accuracy: 91,
    streak: 15,
    position: 2
  },
  {
    id: "3",
    name: "Emma Wilson",
    avatar: "https://picsum.photos/seed/emma/200/200", 
    level: 13,
    score: 8956,
    accuracy: 89,
    streak: 22,
    position: 3
  }
];

const leaderboardData = [
  {
    id: "4",
    name: "Alex Rodriguez",
    avatar: "https://picsum.photos/seed/alex/200/200",
    level: 12,
    score: 8234,
    accuracy: 87,
    streak: 12,
    position: 4
  },
  {
    id: "5",
    name: "Lisa Park",
    avatar: "https://picsum.photos/seed/lisa/200/200",
    level: 11,
    score: 7891,
    accuracy: 85,
    streak: 8,
    position: 5
  },
  {
    id: "6",
    name: "John Doe",
    avatar: "https://picsum.photos/seed/john/200/200",
    level: 8,
    score: 6547,
    accuracy: 82,
    streak: 12,
    position: 6,
    isCurrentUser: true
  },
  {
    id: "7",
    name: "Maria Garcia",
    avatar: "https://picsum.photos/seed/maria/200/200",
    level: 10,
    score: 7234,
    accuracy: 88,
    streak: 5,
    position: 7
  }
];

const categories = [
  { name: "Global", active: true },
  { name: "Science", active: false },
  { name: "History", active: false },
  { name: "Sports", active: false },
  { name: "Tech", active: false }
];

export default function Leaderboard() {
  const getPositionIcon = (position: number) => {
    switch (position) {
      case 1: return <Crown className="h-5 w-5 text-yellow-500" />;
      case 2: return <Medal className="h-5 w-5 text-gray-400" />;
      case 3: return <Medal className="h-5 w-5 text-amber-600" />;
      default: return <span className="text-lg font-bold text-muted-foreground">#{position}</span>;
    }
  };

  const getPositionBg = (position: number) => {
    switch (position) {
      case 1: return "bg-gradient-to-r from-yellow-500/20 to-amber-500/20 border-yellow-500/30";
      case 2: return "bg-gradient-to-r from-gray-400/20 to-slate-400/20 border-gray-400/30";
      case 3: return "bg-gradient-to-r from-amber-600/20 to-orange-600/20 border-amber-600/30";
      default: return "bg-card/60 border-border/50";
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-quiz-background pb-20 lg:pb-4">
      <Header title="Leaderboard" />
      
      <div className="px-4 lg:px-8 space-y-6 max-w-md lg:max-w-4xl xl:max-w-6xl mx-auto">
        {/* Category Tabs */}
        <div className="pt-4">
          <div className="flex gap-2 overflow-x-auto pb-2">
            {categories.map((category, index) => (
              <Button
                key={index}
                variant={category.active ? "default" : "outline"}
                size="sm"
                className="shrink-0"
              >
                {category.name}
              </Button>
            ))}
          </div>
        </div>

        {/* Top 3 Podium */}
        <Card className="p-6 bg-gradient-to-r from-primary/10 via-accent/10 to-secondary/10 border-primary/20">
          <div className="text-center mb-6">
            <h2 className="text-lg font-bold text-foreground">Top Performers</h2>
            <p className="text-sm text-muted-foreground">This week's champions</p>
          </div>
          
          <div className="flex items-end justify-center gap-4">
            {/* 2nd Place */}
            <div className="text-center">
              <div className="relative mb-3">
                <Avatar className="w-12 h-12 border-2 border-gray-400">
                  <AvatarImage src={topPlayers[1].avatar} />
                  <AvatarFallback>MJ</AvatarFallback>
                </Avatar>
                <div className="absolute -top-2 -right-2 bg-gray-400 rounded-full p-1">
                  <Medal className="h-3 w-3 text-white" />
                </div>
              </div>
              <div className="bg-gray-400/20 rounded-lg p-3 min-h-16">
                <p className="font-semibold text-sm">{topPlayers[1].name}</p>
                <p className="text-xs text-muted-foreground">{topPlayers[1].score.toLocaleString()}</p>
              </div>
            </div>

            {/* 1st Place */}
            <div className="text-center">
              <div className="relative mb-3">
                <Avatar className="w-16 h-16 border-2 border-yellow-500">
                  <AvatarImage src={topPlayers[0].avatar} />
                  <AvatarFallback>SC</AvatarFallback>
                </Avatar>
                <div className="absolute -top-2 -right-2 bg-yellow-500 rounded-full p-1">
                  <Crown className="h-4 w-4 text-white" />
                </div>
              </div>
              <div className="bg-yellow-500/20 rounded-lg p-4 min-h-20">
                <p className="font-bold text-sm">{topPlayers[0].name}</p>
                <p className="text-xs text-muted-foreground">{topPlayers[0].score.toLocaleString()}</p>
                <Badge variant="outline" className="border-yellow-500 text-yellow-600 mt-1">
                  Champion
                </Badge>
              </div>
            </div>

            {/* 3rd Place */}
            <div className="text-center">
              <div className="relative mb-3">
                <Avatar className="w-12 h-12 border-2 border-amber-600">
                  <AvatarImage src={topPlayers[2].avatar} />
                  <AvatarFallback>EW</AvatarFallback>
                </Avatar>
                <div className="absolute -top-2 -right-2 bg-amber-600 rounded-full p-1">
                  <Medal className="h-3 w-3 text-white" />
                </div>
              </div>
              <div className="bg-amber-600/20 rounded-lg p-3 min-h-16">
                <p className="font-semibold text-sm">{topPlayers[2].name}</p>
                <p className="text-xs text-muted-foreground">{topPlayers[2].score.toLocaleString()}</p>
              </div>
            </div>
          </div>
        </Card>

        {/* Rankings List */}
        <div className="space-y-4">
          <h3 className="text-lg font-bold text-foreground">Global Rankings</h3>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {leaderboardData.map((player) => (
              <Card 
                key={player.id} 
                className={cn(
                  "p-4 transition-all duration-300",
                  getPositionBg(player.position),
                  player.isCurrentUser ? "ring-2 ring-primary ring-offset-2 ring-offset-background" : "",
                  "hover:shadow-lg hover:-translate-y-0.5"
                )}
              >
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-8">
                    {getPositionIcon(player.position)}
                  </div>
                  
                  <Avatar className="w-10 h-10">
                    <AvatarImage src={player.avatar} />
                    <AvatarFallback>{player.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                  </Avatar>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="font-semibold text-foreground truncate">
                        {player.name}
                      </h4>
                      {player.isCurrentUser && (
                        <Badge variant="outline" className="text-xs border-primary text-primary">
                          You
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span>Level {player.level}</span>
                      <span>{player.accuracy}% accuracy</span>
                      <div className="flex items-center gap-1">
                        <TrendingUp className="h-3 w-3" />
                        <span>{player.streak}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <p className="font-bold text-foreground">{player.score.toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground">points</p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>

        {/* Your Rank Card */}
        <Card className="p-4 bg-gradient-to-r from-primary/5 to-accent/5 border-primary/20">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-semibold text-foreground">Your Current Rank</h4>
              <p className="text-sm text-muted-foreground">Keep playing to climb higher!</p>
            </div>
            <div className="text-right">
              <div className="flex items-center gap-2">
                <Target className="h-5 w-5 text-primary" />
                <span className="text-2xl font-bold text-primary">#6</span>
              </div>
              <Button variant="outline" size="sm" className="mt-2">
                <Trophy className="h-4 w-4" />
                View Stats
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}