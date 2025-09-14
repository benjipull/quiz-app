"use client";

import React, { useEffect, useState } from "react";

// New custom SVG for Enlightenment Crystals (Diamond)
const EnlightenmentDiamond = () => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    className="h-6 w-6 text-cyan-400"
  >
    <path d="M12 2L6 8l6 14 6-14-6-6zM12 2v20M6 8l-4 4 10 10 10-10-4-4z" />
  </svg>
);

// New custom SVG icon for Knowledge Points (a gold coin)
const KnowledgeCoin = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="currentColor"
    className="h-6 w-6 text-yellow-500"
  >
    <circle cx="12" cy="12" r="10" />
    <path
      fill="#fff"
      d="M12 4.5l-2.43 5.21-5.57.81 4.04 3.94-.96 5.55 4.92-2.59 4.92 2.59-.96-5.55 4.04-3.94-5.57-.81L12 4.5z"
    />
  </svg>
);

// New custom SVG for Wisdom Gems (Heart)
const WisdomHeart = () => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    viewBox="0 0 24 24" 
    fill="currentColor" 
    className="h-6 w-6 text-red-500"
  >
    <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5A5.4 5.4 0 017.5 3c2.24 0 4.1.84 5.5 2.5C14.4 3.84 16.26 3 18.5 3A5.4 5.4 0 0124 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
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
          {/* Enlightenment Crystals - now a Diamond */}
          <div className="flex items-center bg-card rounded-full px-3 py-2 border border-border/50 shadow-sm">
            <EnlightenmentDiamond />
            <span className="font-bold text-foreground ml-2">
              {stats.enlightenmentCrystals}
            </span>
          </div>
          {/* Knowledge Points - remains a Coin */}
          <div className="flex items-center bg-card rounded-full px-3 py-2 border border-border/50 shadow-sm">
            <KnowledgeCoin />
            <span className="font-bold text-foreground ml-2">{stats.knowledgePoints}</span>
          </div>
        </div>
        {/* Wisdom Gems - now a Heart */}
        <div className="flex items-center bg-card rounded-full px-3 py-2 border border-border/50 shadow-sm">
          <WisdomHeart />
          <span className="font-bold text-foreground ml-2">{stats.wisdomGems}</span>
        </div>
      </div>
    </div>
  );
};

export default GameStatsHeader;