"use client";

import React, { useEffect, useState, useRef } from "react";

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

const GameStatsHeader: React.FC<GameStatsHeaderProps> = ({
  userToken,
  isParentLoading,
}) => {
  const [stats, setStats] = useState<UserStats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [animatedXP, setAnimatedXP] = useState(0);
  const xpRef = useRef<number>(0);

  useEffect(() => {
    if (isParentLoading || !userToken) return;

    const fetchStats = async () => {
      try {
        const res = await fetch(
          "https://quiz-app-node-606998948537.europe-west4.run.app/api/getUserDetails",
          {
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${userToken}`,
            },
          }
        );
        if (!res.ok) throw new Error(`Error ${res.status}`);
        const data = await res.json();
        setStats({
          coins: data.coins ?? 0,
          xp: data.knowledgePoints ?? 0,
          gem1: data.wisdomGems ?? 0,
          gem2: data.enlightenmentCrystals ?? 0,
        });
      } catch (err: any) {
        console.error("Error fetching stats:", err);
        setError("Failed to load stats");
      }
    };
    fetchStats();
  }, [userToken, isParentLoading]);

  useEffect(() => {
    if (stats?.xp != null) {
      const start = xpRef.current;
      const end = stats.xp;
      const duration = 800;
      const startTime = performance.now();
      const animate = (time: number) => {
        const progress = Math.min((time - startTime) / duration, 1);
        setAnimatedXP(Math.floor(start + (end - start) * progress));
        if (progress < 1) requestAnimationFrame(animate);
      };
      requestAnimationFrame(animate);
      xpRef.current = end;
    }
  }, [stats?.xp]);

  if (isParentLoading || !userToken || !stats) return null;
  if (error) return <div className="text-red-500 text-center">{error}</div>;

  // Increased icon size — smaller bg
  const statItems = [
    {
      value: stats.coins ?? 0,
      color: "cyan",
      icon: (
        <svg
          viewBox="0 0 24 24"
          className="h-[22px] w-[22px] sm:h-7 sm:w-7"
          xmlns="http://www.w3.org/2000/svg"
        >
          <circle cx="8" cy="9" r="5" fill="#f59e0b" />
          <circle cx="8" cy="9" r="4" fill="#fbbf24" />
          <circle cx="8" cy="9" r="2.5" fill="#f59e0b" opacity="0.4" />
          <circle cx="14" cy="13" r="6" fill="#f59e0b" />
          <circle cx="14" cy="13" r="5" fill="#fbbf24" />
          <circle cx="14" cy="13" r="3" fill="#f59e0b" opacity="0.4" />
          <text
            x="14"
            y="15.5"
            fontSize="6"
            fontWeight="bold"
            fill="#d97706"
            textAnchor="middle"
          >
            $
          </text>
        </svg>
      ),
    },
    {
      value: animatedXP,
      color: "yellow",
      icon: (
        <svg
          viewBox="0 0 24 24"
          fill="currentColor"
          xmlns="http://www.w3.org/2000/svg"
          className="h-[22px] w-[22px] sm:h-7 sm:w-7 text-amber-500"
        >
          <path d="M9 21c0 .5.4 1 1 1h4c.6 0 1-.4 1-1v-1H9v1z" />
          <path d="M12 2C8.1 2 5 5.1 5 9c0 2.4 1.2 4.5 3 5.7V17c0 .6.4 1 1 1h6c.6 0 1-.4 1-1v-2.3c1.8-1.2 3-3.3 3-5.7 0-3.9-3.1-7-7-7z" />
          <circle cx="12" cy="9" r="2" fill="#fff" />
        </svg>
      ),
    },
    {
      value: stats.gem1 ?? 0,
      color: "cyan",
      icon: (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-[22px] w-[22px] sm:h-7 sm:w-7 text-cyan-400"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path d="M6 3h12l4 6-10 12L2 9l4-6z" />
          <path d="m6 3 6 6 6-6" />
          <path d="m2 9 10 12 10-12" />
        </svg>
      ),
    },
    {
      value: stats.gem2 ?? 0,
      color: "purple",
      icon: (
        <svg
          viewBox="0 0 24 24"
          fill="currentColor"
          className="h-[22px] w-[22px] sm:h-7 sm:w-7 text-purple-500"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path d="M6 3h12l4 6-10 12L2 9l4-6z" />
          <path d="m6 3 6 6 6-6" fill="#fff" fillOpacity="0.3" />
          <path d="m2 9 10 12 10-12" fill="#fff" fillOpacity="0.2" />
        </svg>
      ),
    },
  ];

  return (
    <div className="w-full px-2 sm:px-4 mb-3 animate-fade-in-down mt-2">
      <div
        className="
          flex items-center justify-between 
          w-full max-w-lg sm:max-w-2xl md:max-w-3xl lg:max-w-4xl 
          p-2 sm:p-3 md:p-4 
          bg-slate-800/60 rounded-xl border-2 border-slate-600 backdrop-blur-sm mx-auto
        "
      >
        {statItems.map((item, i) => (
          <div
            key={i}
            className="flex items-center gap-1 sm:gap-2 justify-center flex-1 min-w-0"
          >
            {/* Smaller bg, bigger icon */}
            <div
              className={`
                w-8 h-8 sm:w-10 sm:h-10
                rounded-lg 
                bg-${item.color}-500/30 
                border border-${item.color}-500/50 
                flex items-center justify-center
              `}
            >
              {item.icon}
            </div>

            <div className="text-base sm:text-xl font-bold text-slate-200 tabular-nums truncate">
              {item.value}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default GameStatsHeader;
