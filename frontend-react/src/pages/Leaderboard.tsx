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

// Define the expected structure of a single player item from the API
interface LeaderboardPlayer {
  userId: string;
  username: string;
  totalPoints: number;
  level: number;
  // ✅ CORRECTION: Changed from avatarUrl?: string to avatar: number
  avatar: number; 
}

// Map for period display names and API values
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
  // userAvatar stores the local image URL path (fallback for current user)
  const [userAvatar, setUserAvatar] = useState<string | null>(null); 
  
  // STATE: To track the user's previous rank for animation
  const [previousLeaderboardData, setPreviousLeaderboardData] = useState<LeaderboardPlayer[]>([]);
  const [isAnimating, setIsAnimating] = useState(false);
  const [animatingUserId, setAnimatingUserId] = useState<string | null>(null);
  const [translateY, setTranslateY] = useState(0);
  
  // REF: For auto-scrolling to the current user's position
  const currentUserRef = useRef<HTMLDivElement>(null);
  // containerRef now points to the scrollable list container
  const containerRef = useRef<HTMLDivElement>(null);

  // Get current user ID and avatar from localStorage
  useEffect(() => {
    const storedUser = typeof window !== 'undefined' ? localStorage.getItem("user") : null;
    const storedUserAvatarIndex = typeof window !== 'undefined' ? localStorage.getItem("userAvatarIndex") : null;

    if (storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser);
        setCurrentUserId(parsedUser._id || "");
        
        // Logic to retrieve the current user's local avatar image path
        let avatarIndex = 0;
        if (storedUserAvatarIndex !== null) {
          // localStorage stores the index as a 0-based number
          avatarIndex = parseInt(storedUserAvatarIndex);
        } else if (parsedUser.avatar) {
          // Fallback: If 'avatar' is a 1-based index (e.g., 1, 2, 3...)
          avatarIndex = parsedUser.avatar - 1;
        }

        // Set the local path as the fallback userAvatar state
        // Ensure index is within bounds of the avatars array
        const initialAvatar = avatars[avatarIndex % avatars.length] || avatars[0] || null;
        setUserAvatar(initialAvatar);

      } catch (e) {
        console.error("Failed to parse user data:", e);
      }
    }
  }, []);

  // Fetch leaderboard data
  useEffect(() => {
    const fetchLeaderboard = async () => {
      setLoading(true);
      
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      if (!token) {
        console.error("Authentication token not found.");
        setLoading(false);
        return;
      }
      
      const apiUrl = `${BASE_URL}/api/leaderboard?period=${currentPeriod}`;
      
      // Save the current data as "previous" before fetching new data
      if (leaderboardData.length > 0) {
        setPreviousLeaderboardData(leaderboardData);
      }

      try {
        const response = await apiClient(apiUrl, {
          method: "GET",
        });

        if (!response) {
          setLoading(false);
          return;
        }
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error(`HTTP error! status: ${response.status}`, errorText);
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        setLeaderboardData(data.leaderboard || []);

      } catch (error) {
        console.error("Error fetching leaderboard data:", error);
        setLeaderboardData([]); 
      } finally {
        setLoading(false);
      }
    };

    fetchLeaderboard();
  }, [currentPeriod]); 
  
  // Animate rank change when data loads
  useEffect(() => {
    if (loading || previousLeaderboardData.length === 0 || leaderboardData.length === 0 || !currentUserId) {
      // Don't auto-scroll on initial load or period change
      return;
    }

    const previousIndex = previousLeaderboardData.findIndex(p => p.userId === currentUserId);
    const currentIndex = leaderboardData.findIndex(p => p.userId === currentUserId);

    if (previousIndex === -1 || currentIndex === -1 || previousIndex === currentIndex) {
      // No rank change or user not found - don't scroll
      return;
    }

    // Calculate the distance to move (in row heights)
    const rankDifference = previousIndex - currentIndex;
    const rowHeight = 60; // Approximate height of each row in pixels
    const distance = rankDifference * rowHeight;

    // Start animation
    setIsAnimating(true);
    setAnimatingUserId(currentUserId);
    setTranslateY(-distance);

    // Complete animation
    const animationDuration = Math.abs(rankDifference) * 400; // 400ms per rank
    setTimeout(() => {
      setTranslateY(0);
      setIsAnimating(false);
      setAnimatingUserId(null);
    }, animationDuration);

  }, [leaderboardData, loading, currentUserId]);
  
  // Auto-scroll to current user when data is loaded/updated
  useEffect(() => {
    // Only scroll if the container is available and the list is not animating a rank change.
    if (!loading && !isAnimating && currentUserRef.current && containerRef.current) {
      const userElement = currentUserRef.current;
      const container = containerRef.current;

      // Check if the user's row is outside the visible area of the container
      const containerRect = container.getBoundingClientRect();
      const userRect = userElement.getBoundingClientRect();

      const isBelow = userRect.bottom > containerRect.bottom;
      const isAbove = userRect.top < containerRect.top;

      if (isBelow || isAbove) {
        // Scroll the container to bring the user's row into view.
        userElement.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'center' // Center the item in the view if possible
        });
      }
    }
  }, [leaderboardData, loading, isAnimating]); // Rerun when data changes and animation stops

  
  // Helper function: Calculates if the user moved up or down
  const getRankChange = (player: LeaderboardPlayer, currentRank: number) => {
    // Only calculate if there was previous data
    if (previousLeaderboardData.length === 0) {
        return 'new'; 
    }
    
    // Find the player's previous rank
    const previousIndex = previousLeaderboardData.findIndex(p => p.userId === player.userId);
    
    if (previousIndex === -1) {
        return 'new'; // Player wasn't in the previous list
    }
    
    const previousRank = previousIndex + 1;

    if (currentRank < previousRank) {
      return 'up';
    } else if (currentRank > previousRank) {
      return 'down';
    } else {
      return 'same';
    }
  };


  return (
    <div
      className="
        w-full 
        flex flex-col items-center 
        px-4 pb-24
        bg-[#100321]
        bg-[url('/leaderboard.jpg')]
        bg-no-repeat
        bg-center
        bg-cover
        bg-fixed
      "
    >
      {/* CSS Keyframes for Rank Change Animation */}
      <style>{`
        @keyframes glow-pulse {
          0%, 100% { 
            box-shadow: 0 0 20px rgba(76, 209, 55, 0.6);
          }
          50% { 
            box-shadow: 0 0 40px rgba(76, 209, 55, 0.9);
          }
        }

        @keyframes glow-pulse-down {
          0%, 100% { 
            box-shadow: 0 0 20px rgba(255, 82, 82, 0.6);
          }
          50% { 
            box-shadow: 0 0 40px rgba(255, 82, 82, 0.9);
          }
        }

        .animating-row {
          position: relative;
          z-index: 50;
          transition: transform 0.4s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .glow-up {
          animation: glow-pulse 0.8s ease-in-out infinite;
        }

        .glow-down {
          animation: glow-pulse-down 0.8s ease-in-out infinite;
        }
      `}</style>
      
      {/* Top spacing */}
      <div className="pt-5 lg:pt-10"></div>

      {/* Period Selection Tabs */}
      <div className="flex justify-center w-full max-w-lg mb-4 p-1 rounded-full bg-purple-900/55 shadow-xl">
        {PERIODS.map((period) => (
          <button
            key={period}
            onClick={() => setCurrentPeriod(period)}
            className={`
              flex-1 py-2 text-sm font-semibold rounded-full transition-colors duration-300
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

      {/* Title + Timer */}
      <div className="text-center"> 
        <h1
          className="text-5xl font-bold text-purple-200 drop-shadow-lg"
          style={{ fontFamily: "Georgia, serif" }}
        >
          {PERIOD_MAP[currentPeriod]}
        </h1>

        {/* This timer is typically only shown for the Daily leaderboard to show reset time */}
        {currentPeriod === 'day' && (
          <div className="flex items-center justify-center gap-2 text-purple-200 mt-2">
            <Clock className="w-5 h-5" />
            <span className="text-lg">left 22 h 1 m</span> 
          </div>
        )}
      </div>

      {/* Trophy */}
      <div className="-mt-16 flex justify-center">
        <img
          src="/trophy.png"
          alt="Trophy"
          className="w-72 h-72 md:w-96 md:h-96 object-contain drop-shadow-2xl"
        />
      </div>

      {/* Leaderboard List (Internal Scroll Container) */}
      <div 
        ref={containerRef}
        className="
          w-full max-w-2xl 
          rounded-xl 
          bg-purple-900/55 
          shadow-md 
          overflow-hidden 
          -mt-8
          max-h-[60vh] md:max-h-[70vh] 
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
          <div className="p-8 text-center text-purple-200">
            No players found for this period.
          </div>
        ) : (
          leaderboardData.map((player, index) => {
            const rank = index + 1;
            const isCurrentUser = player.userId === currentUserId; 
            const rankChange = isCurrentUser ? getRankChange(player, rank) : null;
            const isAnimatingThis = isAnimating && animatingUserId === player.userId;
            
            // --- FINAL AVATAR RESOLUTION LOGIC ---
            let avatarSrc: string;
            
            // ✅ CORRECTION: Use the numeric 'avatar' ID returned from the backend (1-based index)
            if (player.avatar && player.avatar > 0) {
                const avatarIndex = (player.avatar - 1) % avatars.length;
                // Priority 1: Use the avatar ID to look up the local asset.
                avatarSrc = avatars[avatarIndex] || avatars[0] || "/default-avatar-placeholder.png"; 
            } else if (isCurrentUser && userAvatar) {
                // Priority 2: Use the current user's local state fallback (if their avatar ID failed).
                avatarSrc = userAvatar;
            } else {
                // Priority 3: Fallback for all other players.
                // Use a deterministic rotation of local avatars based on their rank/index.
                const defaultAvatarIndex = index % avatars.length;
                avatarSrc = avatars[defaultAvatarIndex] || "/default-avatar-placeholder.png"; 
            }
            // ------------------------------------

            return (
              <div
                key={player.userId}
                ref={isCurrentUser ? currentUserRef : null} 
                className={`
                  flex items-center gap-4 px-4 py-3 transition-all duration-300
                  ${isCurrentUser ? "bg-green-300/50 rounded-lg" : "bg-transparent"}
                  ${index < leaderboardData.length - 1 ? "border-b border-purple-400" : ""}
                  ${isAnimatingThis ? "animating-row" : ""}
                  ${isAnimatingThis && rankChange === 'up' ? "glow-up" : ""}
                  ${isAnimatingThis && rankChange === 'down' ? "glow-down" : ""}
                `}
                style={{
                  transform: isAnimatingThis ? `translateY(${translateY}px)` : 'translateY(0)',
                }}
              >
                {/* Rank + Indicator (REFINED STYLING) */}
                <div className="text-xl font-bold text-purple-200 w-10 text-center flex items-center justify-center gap-0.5"> 
                  
                  {/* Rank Change Indicator (Up/Down Arrow) */}
                  {isCurrentUser && !isAnimating && rankChange === 'down' && (
                      // Red triangle for moving down
                      <span className="text-red-400 text-base font-extrabold -mt-1">▼</span> 
                  )}
                  {isCurrentUser && !isAnimating && rankChange === 'up' && (
                      // Green triangle for moving up
                      <span className="text-green-400 text-base font-extrabold -mt-1">▲</span>
                  )}
                  
                  {/* Rank Number */}
                  {rank}
                </div>

                {/* Avatar */}
                <div className="relative flex-shrink-0"> 
                  <img
                    src={avatarSrc}
                    alt={`${player.username}'s avatar`}
                    // Add an onError handler to replace the image with the placeholder if the URL fails to load
                    onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        // Only change if it's not already the placeholder to prevent infinite loop
                        if (target.src !== "/default-avatar-placeholder.png") {
                           target.src = "/default-avatar-placeholder.png";
                        }
                    }}
                    className="
                      w-10 h-10 rounded-full object-cover 
                      border border-gray-300/50 
                    "
                  />

                  {/* Optional Badge (e.g., for Top 3) */}
                  {(rank <= 3) && (
                    <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-yellow-400 rounded-full border-2 border-purple-900 flex items-center justify-center" />
                  )}
                </div>

                {/* Name + Level */}
                <div className="flex-1 flex flex-col justify-center"> 
                  <div className="text-lg font-semibold text-purple-100">
                    {player.username}
                  </div>
                  {player.level && (
                    <div className="text-sm text-purple-300/70 -mt-0.5">
                      Level: {player.level}
                    </div>
                  )}
                </div>

                {/* Score + Star */}
                <div className="flex items-center gap-1"> 
                  <span className="text-xl font-bold text-purple-100"> 
                    {player.totalPoints}
                  </span>

                  {/* Star SVG (Wisdom Points Icon) */}
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 100 100"
                    className="w-8 h-8"
                  >
                    <defs>
                      <filter id="star-background-glow" x="-50%" y="-50%" width="200%" height="200%">
                        <feGaussianBlur in="SourceGraphic" stdDeviation="5" result="blur" />
                        <feMerge>
                          <feMergeNode in="blur" />
                          <feMergeNode in="SourceGraphic" />
                        </feMerge>
                        </filter>
                    </defs>

                    {/* Background circle */}
                    <circle
                      cx="50"
                      cy="50"
                      r="30"
                      fill="#e84c3d"
                      filter="url(#star-background-glow)"
                    />

                    {/* Star */}
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