"use client";

import React, { useEffect, useState } from "react";
import { Star } from "lucide-react";

// Placeholder for WisdomGem icon
const WisdomGem = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="currentColor"
    className="h-5 w-5"
  >
    <path d="M12 2L15 8l6 1-4.5 4 1 6-5.5-3-5.5 3 1-6L3 9l6-1 3-6z" />
  </svg>
);

interface UserStats {
  enlightenmentCrystals: number;
  knowledgePoints: number;
  wisdomGems: number;
}

interface GameStatsHeaderProps {
  userToken: string;
}

const GameStatsHeader: React.FC<GameStatsHeaderProps> = ({ userToken }) => {
  const [stats, setStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userToken) {
      setError("User not logged in");
      setLoading(false);
      return;
    }

    const fetchUserStats = async () => {
      try {
        const res = await fetch(
          "https://quiz-app-node-606998948537.europe-west4.run.app/api/getUserDetails",
          {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${userToken}`,
            },
            cache: "no-store",
          }
        );

        if (!res.ok) {
          const text = await res.text();
          throw new Error(`API returned ${res.status}: ${text}`);
        }

        const data = await res.json();
        setStats({
          enlightenmentCrystals: data.enlightenmentCrystals ?? 0,
          knowledgePoints: data.knowledgePoints ?? 0,
          wisdomGems: data.wisdomGems ?? 0,
        });
        setError(null);
      } catch (err: any) {
        console.error("Failed to fetch user stats:", err);
        setError(err.message || "Unknown error occurred");
      } finally {
        setLoading(false);
      }
    };

    fetchUserStats();
  }, [userToken]);

  if (loading) return <div>Loading stats...</div>;
  if (error) return <div className="text-red-500 font-bold">{error}</div>;
  if (!stats) return null;

  return (
    <div className="sticky top-10 z-10 bg-transparent p-4">
      <div className="pt-4 flex justify-between items-center max-w-4xl mx-auto">
        <div className="flex gap-3">
          <div className="flex items-center bg-card rounded-full px-3 py-2 border border-border/50 shadow-sm">
            <Star className="h-5 w-5 text-yellow-500 mr-2" />
            <span className="font-bold text-foreground">
              {stats.enlightenmentCrystals}
            </span>
          </div>
          <div className="flex items-center bg-card rounded-full px-3 py-2 border border-border/50 shadow-sm">
            <span className="mr-2">📘</span>
            <span className="font-bold text-foreground">{stats.knowledgePoints}</span>
          </div>
        </div>
        <div className="flex items-center bg-card rounded-full px-3 py-2 border border-border/50 shadow-sm">
          <WisdomGem />
          <span className="font-bold text-foreground ml-2">{stats.wisdomGems}</span>
        </div>
      </div>
    </div>
  );
};

export default GameStatsHeader;
