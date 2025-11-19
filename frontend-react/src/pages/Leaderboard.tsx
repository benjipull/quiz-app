import React, { useState, useEffect, useMemo, useRef } from "react";
import { Clock } from "lucide-react";
import { apiClient } from "@/utils/apiClient";

// 1. Avatar Imports (Needed for the current user's local fallback and general defaults)
const avatarImages = import.meta.glob("../assets/images/avatars/*.png", {
  eager: true,
  import: "default",
});
const avatars: string[] = Object.values(avatarImages) as string[];

const BASE_URL = import.meta.env.VITE_BASE_URL;

interface LeaderboardPlayer {
  userId: string;
  username: string;
  totalPoints: number;
  level: number;
  avatar: number; 
}

const PERIOD_MAP = {
  day: "Daily",
  week: "Weekly",
  month: "Monthly",
  year: "Yearly",
};

const PERIODS = Object.keys(PERIOD_MAP) as ('day' | 'week' | 'month' | 'year')[];

const Leaderboard = () => {
  const [currentPeriod, setCurrentPeriod] = useState<'day' | 'week' | 'month' | 'year'>('day');
  const [leaderboardData, setLeaderboardData] = useState<LeaderboardPlayer[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string>("");
  const [userAvatar, setUserAvatar] = useState<string | null>(null); 

  const [previousLeaderboardData, setPreviousLeaderboardData] = useState<LeaderboardPlayer[]>([]);
  const [isAnimating, setIsAnimating] = useState(false);
  const [animatingUserId, setAnimatingUserId] = useState<string | null>(null);
  const [translateY, setTranslateY] = useState(0);

  const currentUserRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Get current user ID + avatar
  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    const storedUserAvatarIndex = localStorage.getItem("userAvatarIndex");

    if (storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser);
        setCurrentUserId(parsedUser._id || "");

        let avatarIndex = 0;
        if (storedUserAvatarIndex !== null) avatarIndex = parseInt(storedUserAvatarIndex);
        else if (parsedUser.avatar) avatarIndex = parsedUser.avatar - 1;

        const fallbackAvatar = avatars[avatarIndex % avatars.length] || avatars[0] || null;
        setUserAvatar(fallbackAvatar);

      } catch (e) {}
    }
  }, []);

  // Fetch leaderboard
  useEffect(() => {
    const fetchLeaderboard = async () => {
      setLoading(true);
      
      const token = localStorage.getItem('token');
      if (!token) {
        setLoading(false);
        return;
      }

      const apiUrl = `${BASE_URL}/api/leaderboard?period=${currentPeriod}`;

      if (leaderboardData.length > 0) {
        setPreviousLeaderboardData(leaderboardData);
      }

      try {
        const response = await apiClient(apiUrl, { method: "GET" });

        if (!response || !response.ok) {
          setLeaderboardData([]);
          setLoading(false);
          return;
        }

        const data = await response.json();
        setLeaderboardData(data.leaderboard || []);

      } catch (error) {
        setLeaderboardData([]); 
      } finally {
        setLoading(false);
      }
    };

    fetchLeaderboard();
  }, [currentPeriod]);

  // Rank-change animation
  useEffect(() => {
    if (loading || previousLeaderboardData.length === 0 || leaderboardData.length === 0 || !currentUserId) return;

    const prevIndex = previousLeaderboardData.findIndex(p => p.userId === currentUserId);
    const newIndex = leaderboardData.findIndex(p => p.userId === currentUserId);

    if (prevIndex === -1 || newIndex === -1 || prevIndex === newIndex) return;

    const diff = prevIndex - newIndex;
    const rowHeight = 56; // slightly reduced for mobile friendliness
    const distance = diff * rowHeight;

    setIsAnimating(true);
    setAnimatingUserId(currentUserId);
    setTranslateY(-distance);

    const animDuration = Math.abs(diff) * 350;
    setTimeout(() => {
      setTranslateY(0);
      setIsAnimating(false);
      setAnimatingUserId(null);
    }, animDuration);

  }, [leaderboardData, loading, currentUserId]);

  // Auto scroll
  useEffect(() => {
    if (!loading && !isAnimating && currentUserRef.current && containerRef.current) {
      const userEl = currentUserRef.current;
      const container = containerRef.current;

      const containerRect = container.getBoundingClientRect();
      const userRect = userEl.getBoundingClientRect();

      const below = userRect.bottom > containerRect.bottom;
      const above = userRect.top < containerRect.top;

      if (below || above) {
        userEl.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }
  }, [leaderboardData, loading, isAnimating]);


  const getRankChange = (player: LeaderboardPlayer, currentRank: number) => {
    if (previousLeaderboardData.length === 0) return "new";

    const previousIndex = previousLeaderboardData.findIndex(p => p.userId === player.userId);
    if (previousIndex === -1) return "new";

    const previousRank = previousIndex + 1;
    if (currentRank < previousRank) return "up";
    if (currentRank > previousRank) return "down";
    return "same";
  };

  return (
    <div
      className="
        w-full 
        flex flex-col items-center 
        px-3 sm:px-4 pb-24
        bg-[#100321]
        bg-[url('/leaderboard.jpg')]
        bg-no-repeat bg-center bg-cover
      "
    >

      {/* Improved responsiveness CSS */}
      <style>{`
        @media (max-width: 420px) {
          .lb-row {
            gap: 10px !important;
            padding: 8px 10px !important;
          }
          .lb-name {
            font-size: 0.95rem !important;
          }
          .lb-score {
            font-size: 1rem !important;
          }
          .lb-avatar {
            width: 34px !important;
            height: 34px !important;
          }
        }
        @media (max-width: 360px) {
          .lb-name { font-size: 0.88rem !important; }
          .lb-score { font-size: 0.95rem !important; }
        }
      `}</style>

      <style>{`
        @keyframes glow-pulse {
          0%, 100% { box-shadow: 0 0 14px rgba(76, 209, 55, 0.6); }
          50% { box-shadow: 0 0 26px rgba(76, 209, 55, 0.9); }
        }
        @keyframes glow-pulse-down {
          0%, 100% { box-shadow: 0 0 14px rgba(255, 82, 82, 0.6); }
          50% { box-shadow: 0 0 26px rgba(255, 82, 82, 0.9); }
        }
        .animating-row { transition: transform 0.35s; }
        .glow-up { animation: glow-pulse 0.8s infinite; }
        .glow-down { animation: glow-pulse-down 0.8s infinite; }
      `}</style>

      <div className="pt-6 sm:pt-10"></div>

      {/* Period selection */}
      <div className="flex justify-center w-full max-w-lg mb-4 p-1 rounded-full bg-purple-900/55 shadow-xl overflow-hidden">
        {PERIODS.map((period) => (
          <button
            key={period}
            onClick={() => setCurrentPeriod(period)}
            className={`
              flex-1 py-2 text-xs sm:text-sm font-semibold rounded-full transition-all
              ${currentPeriod === period
                ? "bg-purple-500 text-white shadow-lg"
                : "text-purple-200 hover:bg-purple-700/50"
              }
            `}
          >
            {PERIOD_MAP[period]}
          </button>
        ))}
      </div>

      {/* Title */}
      <div className="text-center"> 
        <h1 className="text-4xl sm:text-5xl font-bold text-purple-200 drop-shadow-lg font-serif">
          {PERIOD_MAP[currentPeriod]}
        </h1>

        {currentPeriod === 'day' && (
          <div className="flex items-center justify-center gap-2 text-purple-200 mt-2">
            <Clock className="w-4 h-4 sm:w-5 sm:h-5" />
            <span className="text-sm sm:text-lg">left 22 h 1 m</span> 
          </div>
        )}
      </div>

      {/* Trophy */}
      <div className="-mt-10 sm:-mt-16 flex justify-center">
        <img
          src="/trophy.png"
          alt="Trophy"
          className="w-52 h-52 sm:w-72 sm:h-72 object-contain drop-shadow-2xl"
        />
      </div>

      {/* Scroll list */}
      <div
        ref={containerRef}
        className="
          w-full max-w-2xl 
          rounded-xl 
          bg-purple-900/55 
          shadow-md 
          overflow-hidden 
          -mt-6 sm:-mt-8
          max-h-[60vh] sm:max-h-[70vh]
          overflow-y-auto
          scrollbar-thin scrollbar-thumb-purple-500 scrollbar-track-purple-900
        "
      >
        {loading ? (
          <div className="p-8 text-center text-purple-200">
            <div className="flex items-center justify-center space-x-2">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-200"></div>
              <span>Loading Leaderboard...</span>
            </div>
          </div>
        ) : leaderboardData.length === 0 ? (
          <div className="p-8 text-center text-purple-200">No players found.</div>
        ) : (
          leaderboardData.map((player, index) => {
            const rank = index + 1;
            const isCurrentUser = player.userId === currentUserId;
            const rankChange = isCurrentUser ? getRankChange(player, rank) : null;
            const animating = isAnimating && animatingUserId === player.userId;

            let avatarSrc = "";
            if (player.avatar && typeof player.avatar === "number" && player.avatar > 0) {
              const avatarIndex = (player.avatar - 1) % avatars.length;
              avatarSrc = avatars[avatarIndex];
            } else if (isCurrentUser && userAvatar) avatarSrc = userAvatar;

            return (
              <div
                key={player.userId}
                ref={isCurrentUser ? currentUserRef : null}
                className={`
                  lb-row 
                  flex items-center gap-4 px-4 py-3 transition-all
                  ${isCurrentUser ? "bg-green-300/40 rounded-lg" : ""}
                  ${index < leaderboardData.length - 1 ? "border-b border-purple-400/40" : ""}
                  ${animating ? "animating-row" : ""}
                  ${animating && rankChange === "up" ? "glow-up" : ""}
                  ${animating && rankChange === "down" ? "glow-down" : ""}
                `}
                style={{ transform: animating ? `translateY(${translateY}px)` : "none" }}
              >
                {/* Rank */}
                <div className="text-lg sm:text-xl font-bold text-purple-200 w-8 sm:w-10 text-center flex items-center justify-center">
                  {isCurrentUser && !isAnimating && rankChange === "down" && (
                    <span className="text-red-400 text-sm font-extrabold">▼</span>
                  )}
                  {isCurrentUser && !isAnimating && rankChange === "up" && (
                    <span className="text-green-400 text-sm font-extrabold">▲</span>
                  )}
                  {rank}
                </div>

                {/* Avatar */}
                <img
                  src={avatarSrc}
                  className="lb-avatar w-10 h-10 sm:w-12 sm:h-12 rounded-full object-cover border border-gray-300/50"
                />

                {/* Name + Level */}
                <div className="flex-1 flex flex-col">
                  <div className="lb-name text-purple-100 text-base sm:text-lg font-semibold truncate">
                    {player.username}
                  </div>
                  {player.level && (
                    <div className="text-xs sm:text-sm text-purple-300/70">Lvl {player.level}</div>
                  )}
                </div>

                {/* Score */}
                <div className="flex items-center gap-1">
                  <span className="lb-score text-purple-100 font-bold text-lg sm:text-xl">
                    {player.totalPoints}
                  </span>

                  {/* Star */}
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" className="w-6 sm:w-8 h-6 sm:h-8">
                    <circle cx="50" cy="50" r="30" fill="#e84c3d" />
                    <path
                      fill="#f9a825"
                      d="M50 28 L55.75 44.25 L74 46.35 L59.25 58.25 L61.7 73 L50 65.25 L38.3 73 L40.75 58.25 L26 46.35 L44.25 44.25 Z"
                    />
                  </svg>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default Leaderboard;
