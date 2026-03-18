import React, { useState, useEffect, useRef } from "react";
import { Clock, ArrowLeft } from "lucide-react";
import { apiClient } from "@/utils/apiClient";
import { useNavigate } from "react-router-dom";
import { globalLeaderboardCache, waitForCache } from "@/hooks/useLeaderboardPreloader";
import { getApiBaseUrl } from "@/utils/baseUrl";
import { avatarUrls } from "@/utils/avatarPaths";

const avatars = avatarUrls;

const BASE_URL = getApiBaseUrl();

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

const PERIODS = Object.keys(PERIOD_MAP) as ("day" | "week" | "month" | "year")[];

const Leaderboard = () => {
  const navigate = useNavigate();

  const [currentPeriod, setCurrentPeriod] = useState<"day" | "week" | "month" | "year">("day");
  const [leaderboardData, setLeaderboardData] = useState<LeaderboardPlayer[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string>("");
  const [userAvatar, setUserAvatar] = useState<string | null>(null);
  const [previousLeaderboardData, setPreviousLeaderboardData] = useState<LeaderboardPlayer[]>([]);
  const [timeLeft, setTimeLeft] = useState<string>("");

  const currentUserRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Load initial data - wait for cache if needed
  useEffect(() => {
    const loadInitialData = async () => {
      const cachedData = globalLeaderboardCache[currentPeriod];
      
      if (cachedData && cachedData.length > 0) {
        // Cache is ready immediately
        setLeaderboardData(cachedData);
        setLoading(false);
      } else {
        // Wait for preload to complete
        setLoading(true);
        try {
          const data = await waitForCache(currentPeriod);
          setLeaderboardData(data);
        } catch (e) {
          setLeaderboardData([]);
        } finally {
          setLoading(false);
        }
      }
    };

    loadInitialData();
  }, []);

  // Load current user
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

  // Switch between periods using cache
  useEffect(() => {
    const cachedData = globalLeaderboardCache[currentPeriod];
    if (cachedData && cachedData.length > 0) {
      if (leaderboardData.length > 0) setPreviousLeaderboardData(leaderboardData);
      setLeaderboardData(cachedData);
      setLoading(false);
      return;
    }

    // If not in cache, fetch it
    const fetchLeaderboard = async () => {
      setLoading(true);
      if (leaderboardData.length > 0) setPreviousLeaderboardData(leaderboardData);

      try {
        const res = await apiClient(`${BASE_URL}/api/leaderboard?period=${currentPeriod}`);
        if (res?.ok) {
          const data = await res.json();
          setLeaderboardData(data.leaderboard || []);
          globalLeaderboardCache[currentPeriod] = data.leaderboard || [];
        } else {
          setLeaderboardData([]);
        }
      } catch (e) {
        setLeaderboardData([]);
      } finally {
        setLoading(false);
      }
    };

    fetchLeaderboard();
  }, [currentPeriod]);

  // Auto scroll to current user
  useEffect(() => {
    if (!loading && currentUserRef.current) {
      setTimeout(() => {
        currentUserRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 100);
    }
  }, [leaderboardData, loading]);

  // Calculate time left for current period
  useEffect(() => {
    const calculateTimeLeft = () => {
      const now = new Date();
      let endTime: Date;

      switch (currentPeriod) {
        case "day":
          endTime = new Date(now);
          endTime.setHours(23, 59, 59, 999);
          break;
        case "week":
          endTime = new Date(now);
          const daysUntilSunday = 7 - now.getDay();
          endTime.setDate(now.getDate() + daysUntilSunday);
          endTime.setHours(23, 59, 59, 999);
          break;
        case "month":
          endTime = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
          break;
        case "year":
          endTime = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
          break;
        default:
          endTime = new Date(now);
      }

      const diff = endTime.getTime() - now.getTime();
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

      if (days > 0) setTimeLeft(`${days} d ${hours} h ${minutes} m`);
      else setTimeLeft(`${hours} h ${minutes} m`);
    };

    calculateTimeLeft();
    const interval = setInterval(calculateTimeLeft, 60000);
    return () => clearInterval(interval);
  }, [currentPeriod]);

  const getRankChange = (player: LeaderboardPlayer, currentRank: number) => {
    if (previousLeaderboardData.length === 0) return "new";

    const previousIndex = previousLeaderboardData.findIndex((p) => p.userId === player.userId);
    if (previousIndex === -1) return "new";

    const previousRank = previousIndex + 1;
    if (currentRank < previousRank) return "up";
    if (currentRank > previousRank) return "down";
    return "same";
  };

  return (
    <div className="w-full h-[100dvh] max-h-[100dvh] flex flex-col items-center px-3 sm:px-4 bg-[#100321] bg-[url('/assets/images/leaderboard.jpg')] bg-no-repeat bg-center bg-cover overflow-hidden fixed inset-0">
      {/* Responsive CSS */}
      <style>{`
        @media (max-width: 420px) {
          .lb-row { gap: 10px !important; padding: 8px 10px !important; }
          .lb-name { font-size: 0.95rem !important; }
          .lb-score { font-size: 1rem !important; }
          .lb-avatar { width: 34px !important; height: 34px !important; }
        }
        @media (max-width: 360px) {
          .lb-name { font-size: 0.88rem !important; }
          .lb-score { font-size: 0.95rem !important; }
        }
      `}</style>

      {/* Header */}
      <div className="w-full flex flex-col items-center flex-shrink-0 pb-4">
        <div className="pt-4 sm:pt-6 relative w-full max-w-2xl">
          <button
            onClick={() => navigate("/")}
            className="absolute left-0 top-4 sm:top-6 p-2 rounded-full bg-purple-800/50 hover:bg-purple-700/70 transition-all"
            aria-label="Go back"
          >
            <ArrowLeft className="w-5 h-5 sm:w-6 sm:h-6 text-purple-100" />
          </button>
        </div>

        {/* Period selection */}
        <div className="flex justify-center w-full max-w-lg mb-3 p-1 rounded-full bg-purple-900/55 shadow-xl overflow-hidden">
          {PERIODS.map((period) => (
            <button
              key={period}
              onClick={() => setCurrentPeriod(period)}
              className={`flex-1 py-2 text-xs sm:text-sm font-semibold rounded-full transition-all ${
                currentPeriod === period
                  ? "bg-purple-500 text-white shadow-lg"
                  : "text-purple-200 hover:bg-purple-700/50"
              }`}
            >
              {PERIOD_MAP[period]}
            </button>
          ))}
        </div>

        {/* Title + Clock */}
        <div className="text-center">
          <h1 className="text-3xl sm:text-4xl font-bold text-purple-200 drop-shadow-lg font-serif">
            {PERIOD_MAP[currentPeriod]}
          </h1>
          <div className="flex items-center justify-center gap-2 text-purple-200 mt-1">
            <Clock className="w-4 h-4" />
            <span className="text-sm">left {timeLeft}</span>
          </div>
        </div>

        {/* Trophy */}
        <div className="-mt-8 sm:-mt-12 flex justify-center mb-4">
          <img src="/assets/images/trophy.png" alt="Trophy" className="w-40 h-40 sm:w-56 sm:h-56 object-contain drop-shadow-2xl" />
        </div>
      </div>

      {/* Scrollable leaderboard */}
      <div
        ref={containerRef}
        className="w-full max-w-2xl flex-1 rounded-xl bg-purple-900/55 shadow-md overflow-y-auto overflow-x-hidden min-h-0"
        style={{ touchAction: "pan-y", WebkitOverflowScrolling: "touch", paddingBottom: "80px" }}
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

            let avatarSrc = "";
            if (player.avatar && typeof player.avatar === "number" && player.avatar > 0) {
              const avatarIndex = (player.avatar - 1) % avatars.length;
              avatarSrc = avatars[avatarIndex];
            } else if (isCurrentUser && userAvatar) avatarSrc = userAvatar;

            return (
              <div
                key={player.userId}
                ref={isCurrentUser ? currentUserRef : null}
                className={`lb-row flex items-center gap-4 px-4 py-3 transition-all ${
                  isCurrentUser ? "bg-green-300/40" : ""
                } ${index < leaderboardData.length - 1 ? "border-b border-purple-400/40" : ""} ${
                  index === leaderboardData.length - 1 ? "mb-2" : ""
                }`}
              >
                {/* Rank */}
                <div className="text-lg sm:text-xl font-bold text-purple-200 w-8 sm:w-10 text-center flex items-center justify-center">
                  {rank}
                </div>

                {/* Avatar */}
                <img
                  src={avatarSrc}
                  alt={player.username}
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
                  <span className="lb-score text-purple-100 font-bold text-lg sm:text-xl">{player.totalPoints}</span>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    className="h-5 w-5 sm:h-6 sm:w-6 text-amber-500"
                  >
                    <path d="M9 21c0 .5.4 1 1 1h4c.6 0 1-.4 1-1v-1H9v1z" />
                    <path d="M12 2C8.1 2 5 5.1 5 9c0 2.4 1.2 4.5 3 5.7V17c0 .6.4 1 1 1h6c.6 0 1-.4 1-1v-2.3c1.8-1.2 3-3.3 3-5.7 0-3.9-3.1-7-7-7z" />
                    <circle cx="12" cy="9" r="2" fill="#fff" />
                  </svg>
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="h-4 flex-shrink-0"></div>
    </div>
  );
};

export default Leaderboard;
