import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Play, Star, Users, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

interface CategoryCardProps {
  id: string;
  title: string;
  description: string;
  imageUrl?: string;
  difficulty: "Easy" | "Medium" | "Hard";
  questionCount: number;
  completions: number;
  rating: number;
  timeEstimate: string;
  createdBy?: string;
  onPlay: (id: string) => void;
}

export const CategoryCard = ({
  id,
  title,
  description,
  imageUrl,
  difficulty,
  questionCount,
  completions,
  rating,
  timeEstimate,
  createdBy,
  onPlay,
}: CategoryCardProps) => {
  const getDifficultyColor = (diff: string) => {
    switch (diff) {
      case "Easy": return "bg-success text-success-foreground";
      case "Medium": return "bg-warning text-warning-foreground";
      case "Hard": return "bg-destructive text-destructive-foreground";
      default: return "bg-primary text-primary-foreground";
    }
  };

  return (
    <Card className="group relative overflow-hidden bg-card border border-border/50 hover:border-primary/30 transition-all duration-300 hover:shadow-xl hover:shadow-primary/10 hover:-translate-y-1">
      {/* Background Image */}
      <div className="relative h-48 overflow-hidden">
        <img 
          src={imageUrl || "https://picsum.photos/seed/default/600/300"} 
          alt={title}
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-black/20" />
        
        {/* Difficulty Badge */}
        <div className="absolute top-3 right-3">
          <Badge className={cn("", getDifficultyColor(difficulty))}>
            {difficulty}
          </Badge>
        </div>
        
        {/* Title and Description Overlay */}
        <div className="absolute bottom-0 left-0 right-0 p-4 text-white">
          <h3 className="font-bold text-xl mb-1 group-hover:text-primary-glow transition-colors">
            {title}
          </h3>
          <p className="text-sm text-white/80 line-clamp-2">
            {description}
          </p>
        </div>
      </div>
      
      {/* Stats Section */}
      <div className="p-4 space-y-3 bg-card">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <Users className="h-3 w-3" />
              {completions}
            </span>
            <div className="flex items-center gap-1">
              <Star className="h-3 w-3 fill-warning text-warning" />
              <span className="font-medium">{rating.toFixed(1)}</span>
            </div>
          </div>
          <span className="text-xs text-muted-foreground">
            {questionCount} questions
          </span>
        </div>

        <div className="flex items-center justify-between">
          <div className="text-xs text-muted-foreground">
            {createdBy && `Created by ${createdBy}`}
          </div>
          <Button 
            size="sm" 
            variant="default"
            onClick={() => onPlay(id)}
            className="group-hover:shadow-lg"
          >
            <Play className="h-4 w-4" />
            Start Quiz
          </Button>
        </div>
      </div>
    </Card>
  );
};