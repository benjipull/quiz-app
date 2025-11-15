import React, { useState, useEffect, useMemo } from "react";
import { Clock } from "lucide-react"; 
// Assuming the following files are correct relative paths in your project
import avatar1 from '../assets/images/avatars/1.png';
import avatar2 from '../assets/images/avatars/2.png';
import avatar3 from '../assets/images/avatars/3.png';
import avatar4 from '../assets/images/avatars/4.png';
import avatar5 from '../assets/images/avatars/5.png';

// --- ADDED BASE_URL ---
const BASE_URL = import.meta.env.VITE_BASE_URL;
// ----------------------

// Define the expected structure of a single player item from the API
interface LeaderboardPlayer {
  userId: string;
  username: string;
  totalPoints: number;
  level: number;
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
  
  // NOTE: You must replace this with the actual authenticated user's ID
  const currentUserId = "5f8d07..."; // Placeholder for the logged-in user's ID

  const avatarMap = useMemo(() => ({
    1: avatar1,
    2: avatar2,
    3: avatar3,
    4: avatar4,
    5: avatar5, 
  }), []);

  // --- API FETCH LOGIC ---
  useEffect(() => {
    const fetchLeaderboard = async () => {
      setLoading(true);
      
      const token = localStorage.getItem('userToken'); 
      if (!token) {
        console.error("Authentication token not found.");
        setLoading(false);
        return;
      }
      
      const apiUrl = `${BASE_URL}/api/leaderboard?period=${currentPeriod}`;

      try {
        const response = await fetch(apiUrl, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        setLeaderboardData(data.leaderboard);

      } catch (error) {
        console.error("Error fetching leaderboard data:", error);
        setLeaderboardData([]); 
      } finally {
        setLoading(false);
      }
    };

    fetchLeaderboard();
  }, [currentPeriod]); 

  // Helper to determine the avatar source (simple circular assignment)
  const getAvatarSource = (index: number) => {
    const avatarKeys = Object.keys(avatarMap);
    const key = (index % avatarKeys.length) + 1;
    return avatarMap[key as keyof typeof avatarMap];
  };

  return (
    <div
      className="
        min-h-screen w-full 
        flex flex-col items-center 
        px-4 pb-10 
        bg-[#100321]
        bg-[url('/leaderboard.jpg')]
        bg-no-repeat
        bg-center
        bg-cover
        bg-fixed
      "
    >

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
      <div className="text-center "> 
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

      {/* Leaderboard List */}
      <div className="w-full max-w-2xl rounded-xl bg-purple-900/55 shadow-md overflow-hidden -mt-8">
        {loading ? (
            <div className="p-8 text-center text-purple-200">Loading Leaderboard...</div>
        ) : leaderboardData.length === 0 ? (
            <div className="p-8 text-center text-purple-200">No players found for this period.</div>
        ) : (
            leaderboardData.map((player, index) => {
              const rank = index + 1;
              const isCurrentUser = player.userId === currentUserId; // Highlight the logged-in player
              
              return (
                <div
                  key={player.userId}
                  className={`
                    flex items-center gap-4 px-4 py-3 transition-all duration-500
                    ${isCurrentUser ? "bg-green-300/50 scale-[1.02]" : "bg-transparent"}
                    ${index < leaderboardData.length - 1 ? "border-b border-purple-400" : ""}
                  `}
                >
                  {/* Rank */}
                  <div className="text-xl font-bold text-purple-200 w-10 text-center"> 
                    {rank}
                  </div>

                  {/* Avatar */}
                  <div className="relative flex-shrink-0"> 
                    <img
                      src={getAvatarSource(rank)} // Use dynamic avatar helper
                      alt={`${player.username}'s avatar`}
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