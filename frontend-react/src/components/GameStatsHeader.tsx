"use client";

import React, { useEffect, useState } from "react";

// Enhanced Diamond icon for Enlightenment Crystals
const EnlightenmentDiamond = () => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    className="h-5 w-5 text-cyan-400"
  >
    <path d="M6 3h12l4 6-10 12L2 9l4-6z" />
    <path d="m6 3 6 6 6-6" />
    <path d="m2 9 10 12 10-12" />
  </svg>
);

// Enhanced Knowledge Points icon (brain/lightbulb hybrid)
const KnowledgeIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="currentColor"
    className="h-5 w-5 text-amber-500"
  >
    <path d="M9 21c0 .5.4 1 1 1h4c.6 0 1-.4 1-1v-1H9v1z" />
    <path d="M12 2C8.1 2 5 5.1 5 9c0 2.4 1.2 4.5 3 5.7V17c0 .6.4 1 1 1h6c.6 0 1-.4 1-1v-2.3c1.8-1.2 3-3.3 3-5.7 0-3.9-3.1-7-7-7z" />
    <circle cx="12" cy="9" r="2" fill="#fff" />
  </svg>
);

// Enhanced Wisdom Gems icon (gem/crystal)
const WisdomGem = () => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    viewBox="0 0 24 24" 
    fill="currentColor" 
    className="h-5 w-5 text-purple-500"
  >
    <path d="M6 3h12l4 6-10 12L2 9l4-6z" />
    <path d="m6 3 6 6 6-6" fill="#fff" fillOpacity="0.3" />
    <path d="m2 9 10 12 10-12" fill="#fff" fillOpacity="0.2" />
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
    <div className="top-0 z-10 bg-transparent">
      <div className="pt-4 flex justify-between items-center max-w-4xl mx-auto px-4">
        <div className="flex gap-4">
          {/* Enlightenment Crystals */}
          <div className="flex items-center bg-card/80 backdrop-blur-sm rounded-full px-3 py-2 border border-border/50 shadow-sm hover:bg-card/90 transition-colors">
            <EnlightenmentDiamond />
            <span className="font-semibold text-foreground ml-2 text-sm">
              {stats.enlightenmentCrystals}
            </span>
          </div>
          
          {/* Knowledge Points */}
          <div className="flex items-center bg-card/80 backdrop-blur-sm rounded-full px-3 py-2 border border-border/50 shadow-sm hover:bg-card/90 transition-colors">
            <KnowledgeIcon />
            <span className="font-semibold text-foreground ml-2 text-sm">
              {stats.knowledgePoints}
            </span>
          </div>
        </div>
        
        {/* Wisdom Gems */}
        <div className="flex items-center bg-card/80 backdrop-blur-sm rounded-full px-3 py-2 border border-border/50 shadow-sm hover:bg-card/90 transition-colors">
          <WisdomGem />
          <span className="font-semibold text-foreground ml-2 text-sm">
            {stats.wisdomGems}
          </span>
        </div>
      </div>
    </div>
  );
};

export default GameStatsHeader;