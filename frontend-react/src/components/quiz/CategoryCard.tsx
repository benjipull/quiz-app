"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Play, Star, Users } from "lucide-react";
import { cn } from "@/lib/utils";

interface CategoryCardProps {
  id: string;
  title: string;
  description: string;
  imageSrc?: string;
  difficulty?: "Easy" | "Medium" | "Hard";
  questionCount?: number;
  completions: number;
  rating: number;
  timeEstimate?: string;
  createdBy?: string;
  onPlay: (id: string) => void;
  onMouseEnter?: () => void; // NEW: For hover preloading
}

export const CategoryCard = ({
  id,
  title,
  description,
  imageSrc,
  completions,
  rating,
  createdBy,
  onPlay,
  onMouseEnter, // NEW
}: CategoryCardProps) => {
  return (
    <Card
      onClick={() => onPlay(id)}
      onMouseEnter={onMouseEnter} // NEW: Trigger preload on hover
      className={cn(
        "group relative overflow-hidden border border-border/40 cursor-pointer",
        "bg-gradient-to-b from-zinc-900/80 via-zinc-900/70 to-black/80 backdrop-blur-md",
        "hover:shadow-[0_0_25px_-5px_rgba(0,150,255,0.5)] hover:-translate-y-1 transition-all duration-300"
      )}
    >
      {/* Background Image */}
      <div className="relative h-48 overflow-hidden rounded-t-xl">
        <img
          src={imageSrc || ""}
          alt={title}
          className="w-full h-full object-cover brightness-90 transition-transform duration-500 group-hover:scale-110"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent" />

        {/* Floating glow ring effect */}
        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition duration-500">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(0,150,255,0.3)_0%,transparent_70%)] blur-3xl" />
        </div>

        {/* Hover Play Button */}
        <div className="hidden lg:flex absolute inset-0 items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-500">
          <Button
            variant="purple"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onPlay(id);
            }}
          >
            <Play className="h-5 w-5 mr-2" /> Play
          </Button>
        </div>

        {/* Title & Description */}
        <div className="absolute bottom-0 left-0 right-0 p-4">
          <h3 className="font-bold text-xl mb-1 text-white group-hover:text-primary transition-colors">
            {title}
          </h3>
          <p className="text-sm text-white/80 line-clamp-2">{description}</p>
        </div>
      </div>

      {/* Stats Section */}
      <div className="p-4 space-y-2 bg-black/40 backdrop-blur-md rounded-b-xl border-t border-border/40">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <Users className="h-3.5 w-3.5 text-primary" />
              <span>{completions}</span>
            </span>
            <span className="flex items-center gap-1">
              <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
              <span className="font-medium">{rating.toFixed(1)}</span>
            </span>
          </div>
          {createdBy && (
            <span className="text-xs italic text-muted-foreground/80">
              by {createdBy}
            </span>
          )}
        </div>
      </div>
    </Card>
  );
};
