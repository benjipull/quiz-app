import React from "react";
import { Star, Clock } from "lucide-react"; 
import avatar1 from '../assets/images/avatars/1.png';
import avatar2 from '../assets/images/avatars/2.png';
import avatar3 from '../assets/images/avatars/3.png';
import avatar4 from '../assets/images/avatars/4.png';
import avatar5 from '../assets/images/avatars/5.png';

const Leaderboard = () => {
  const avatarMap = {
    1: avatar1,
    2: avatar2,
    3: avatar3,
    4: avatar4,
    5: avatar5, 
  };

  const players = [
    { rank: 63, name: "Player", id: "#48573826", score: 183, avatar: 1 },
    { rank: 64, name: "Chris", id: null, score: 180, avatar: 2 },
    { rank: 67, name: "Hope", id: null, score: 153, avatar: 3, highlight: true },
    { rank: 68, name: "siphola", id: null, score: 145, avatar: 4 }, 
    { rank: 69, name: "Yusuf", id: null, score: 142, avatar: 5 }, 
    { rank: 68, name: "siphola", id: null, score: 145, avatar: 4 }, 
    { rank: 69, name: "Yusuf", id: null, score: 142, avatar: 5 }, 
    { rank: 68, name: "siphola", id: null, score: 145, avatar: 4 }, 
    { rank: 69, name: "Yusuf", id: null, score: 142, avatar: 5 }, 
    { rank: 68, name: "siphola", id: null, score: 145, avatar: 4 }, 
    { rank: 69, name: "Yusuf", id: null, score: 142, avatar: 5 }, 
    { rank: 68, name: "siphola", id: null, score: 145, avatar: 4 }, 
    { rank: 69, name: "Yusuf", id: null, score: 142, avatar: 5 }, 
    { rank: 68, name: "siphola", id: null, score: 145, avatar: 4 }, 
    { rank: 69, name: "Yusuf", id: null, score: 142, avatar: 5 }, 
    { rank: 68, name: "siphola", id: null, score: 145, avatar: 4 }, 
    { rank: 69, name: "Yusuf", id: null, score: 142, avatar: 5 }, 
    { rank: 68, name: "siphola", id: null, score: 145, avatar: 4 }, 
    { rank: 69, name: "Yusuf", id: null, score: 142, avatar: 5 }, 
    { rank: 68, name: "siphola", id: null, score: 145, avatar: 4 }, 
    { rank: 69, name: "Yusuf", id: null, score: 142, avatar: 5 }, 
  ];

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

      {/* Daily + Timer */}
      <div className="text-center "> 
        <h1
          className="text-5xl font-bold text-purple-200 drop-shadow-lg"
          style={{ fontFamily: "Georgia, serif" }}
        >
          Daily
        </h1>

        <div className="flex items-center justify-center gap-2 text-purple-200 mt-2">
          <Clock className="w-5 h-5" />
          <span className="text-lg">left 22 h 1 m</span>
        </div>
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
        {players.map((player, index) => (
          <div
            key={index}
            className={`
              flex items-center gap-4 px-4 py-3
              ${player.highlight ? "bg-green-300/50" : "bg-transparent"}
              ${index < players.length - 1 ? "border-b border-purple-400" : ""}
            `}
          >
            {/* Rank */}
            <div className="text-xl font-bold text-purple-200 w-10 text-center"> 
              {player.rank}
            </div>

            {/* Avatar */}
            <div className="relative flex-shrink-0"> 
              <img
                src={avatarMap[player.avatar]}
                alt={`${player.name}'s avatar`}
                className="
                  w-10 h-10 rounded-full object-cover 
                  border border-gray-300/50 
                "
              />

              {/* Optional Badge */}
              <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-purple-900 flex items-center justify-center" />
            </div>

            {/* Name + ID */}
            <div className="flex-1 flex flex-col justify-center"> 
              <div className="text-lg font-semibold text-purple-100">
                {player.name}
              </div>
              {player.id && (
                <div className="text-sm text-purple-300/70 -mt-0.5">
                  {player.id}
                </div>
              )}
            </div>

            {/* Score + Star */}
            <div className="flex items-center gap-1"> 
              <span className="text-xl font-bold text-purple-100"> 
                {player.score}
              </span>

              {/* Star SVG */}
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
        ))}
      </div>
    </div>
  );
};

export default Leaderboard;
