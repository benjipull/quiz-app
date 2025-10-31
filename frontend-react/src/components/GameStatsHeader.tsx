"use client";

import React, { useEffect, useState } from "react";

// --- ICONS ---

// Coins icon (placeholder)
const CoinsIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    className="h-6 w-6"
  >
    {/* Back coin */}
    <circle cx="8" cy="9" r="5" fill="#f59e0b" />
    <circle cx="8" cy="9" r="4" fill="#fbbf24" />
    <circle cx="8" cy="9" r="2.5" fill="#f59e0b" opacity="0.4" />
    
    {/* Front coin */}
    <circle cx="14" cy="13" r="6" fill="#f59e0b" />
    <circle cx="14" cy="13" r="5" fill="#fbbf24" />
    <circle cx="14" cy="13" r="3" fill="#f59e0b" opacity="0.4" />
    <text x="14" y="15.5" fontSize="6" fontWeight="bold" fill="#d97706" textAnchor="middle">$</text>
  </svg>
);

// XP / Knowledge Points (brain/lightbulb hybrid)
const XPBadge = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    fill="currentColor"
    viewBox="0 0 24 24"
    className="h-5 w-5 text-amber-500"
  >
    <path d="M9 21c0 .5.4 1 1 1h4c.6 0 1-.4 1-1v-1H9v1z" />
    <path d="M12 2C8.1 2 5 5.1 5 9c0 2.4 1.2 4.5 3 5.7V17c0 .6.4 1 1 1h6c.6 0 1-.4 1-1v-2.3c1.8-1.2 3-3.3 3-5.7 0-3.9-3.1-7-7-7z" />
    <circle cx="12" cy="9" r="2" fill="#fff" />
  </svg>
);

// Gem 1 (e.g., Wisdom)
const Gem1Icon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    fill="currentColor"
    viewBox="0 0 24 24"
    className="h-5 w-5 text-purple-500"
  >
    <path d="M6 3h12l4 6-10 12L2 9l4-6z" />
  </svg>
);

// Gem 2 (e.g., Enlightenment)
const Gem2Icon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    viewBox="0 0 24 24"
    className="h-5 w-5 text-cyan-400"
  >
    <path d="M6 3h12l4 6-10 12L2 9l4-6z" />
    <path d="m6 3 6 6 6-6" />
    <path d="m2 9 10 12 10-12" />
  </svg>
);

// --- TYPES ---
interface UserStats {
  coins: number;
  xp: number;
  gem1: number;
  gem2: number;
}

interface GameStatsHeaderProps {
  userToken: string;
  isParentLoading: boolean;
}

// --- COMPONENT ---
const GameStatsHeader: React.FC<GameStatsHeaderProps> = ({
  userToken,
  isParentLoading,
}) => {
  const [stats, setStats] = useState<UserStats | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isParentLoading) return;
    if (!userToken) {
      setError("User not logged in");
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

        if (!res.ok) throw new Error(`API returned ${res.status}`);

        const data = await res.json();

        // Map API response → fixed structure
        setStats({
          coins: data.coins ?? 0,
          xp: data.knowledgePoints ?? 0,
          gem1: data.wisdomGems ?? 0,
          gem2: data.enlightenmentCrystals ?? 0,
        });
      } catch (err: any) {
        console.error("Failed to fetch user stats:", err);
        setError(err.message);
      }
    };

    fetchUserStats();
  }, [userToken, isParentLoading]);

  if (isParentLoading || !userToken) return null;
  if (error) return <div className="text-red-500 font-bold">{error}</div>;
  if (!stats) return null;

  return (
    <div className="top-0 z-10 bg-transparent">
      <div className="pt-4 flex justify-between items-center max-w-4xl mx-auto px-4">
        {/* Left side — coins + XP */}
        <div className="flex gap-4">
          {/* Coins */}
          <div className="flex items-center bg-card/80 backdrop-blur-sm rounded-full px-3 py-2 border border-border/50 shadow-sm">
            <CoinsIcon />
            <span className="font-semibold text-foreground ml-2 text-sm">
              {stats.coins}
            </span>
          </div>

          {/* XP */}
          <div className="flex items-center bg-card/80 backdrop-blur-sm rounded-full px-3 py-2 border border-border/50 shadow-sm">
            <XPBadge />
            <span className="font-semibold text-foreground ml-2 text-sm">
              {stats.xp}
            </span>
          </div>
        </div>

        {/* Right side — Gem1 + Gem2 */}
        <div className="flex gap-4">
          {/* Gem1 */}
          <div className="flex items-center bg-card/80 backdrop-blur-sm rounded-full px-3 py-2 border border-border/50 shadow-sm">
            <Gem1Icon />
            <span className="font-semibold text-foreground ml-2 text-sm">
              {stats.gem1}
            </span>
          </div>

          {/* Gem2 */}
          <div className="flex items-center bg-card/80 backdrop-blur-sm rounded-full px-3 py-2 border border-border/50 shadow-sm">
            <Gem2Icon />
            <span className="font-semibold text-foreground ml-2 text-sm">
              {stats.gem2}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GameStatsHeader;