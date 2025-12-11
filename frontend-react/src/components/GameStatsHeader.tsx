import React, { useEffect, useState, useRef } from "react";

// Note: BASE_URL is no longer needed since fetching is removed.
// const BASE_URL = import.meta.env.VITE_BASE_URL;

interface UserStatsDisplay {
xp: number;
gem1: number;
gem2: number;
}

interface GameStatsHeaderProps {
userToken: string;
isParentLoading: boolean;
// REMOVED: onCoinsUpdate?: (coins: number) => void;
currentCoinsFromParent: number;
userXP: number; // New prop for XP
userGem1: number; // New prop for Gem1
userGem2: number; // New prop for Gem2
}

const GameStatsHeader: React.FC<GameStatsHeaderProps> = ({
userToken,
isParentLoading,
currentCoinsFromParent,
userXP,
userGem1,
userGem2,
}) => {
// Removed internal stats state
const [error, setError] = useState<string | null>(null);
const [animatedXP, setAnimatedXP] = useState(userXP);
const [animatedCoins, setAnimatedCoins] = useState(currentCoinsFromParent);

// NOTE: coinsRef and xpRef are now primarily used to hold the target value 
// for quick comparison to avoid unnecessary animation triggers.
const xpRef = useRef<number>(userXP);
const coinsRef = useRef<number>(currentCoinsFromParent);

// REMOVED: hasFetchedRef and the entire fetching useEffect.

// Effect for smooth XP animation (from parent)
useEffect(() => {
if (userXP != null) {
// FIX: Start the animation from the *current animated state*
const start = animatedXP; 
const end = userXP;
const duration = 800;
const startTime = performance.now();

if (start === end) return;

const animate = (time: number) => {
const progress = Math.min((time - startTime) / duration, 1);
setAnimatedXP(Math.floor(start + (end - start) * progress));

if (progress < 1) {
requestAnimationFrame(animate);
} else {
xpRef.current = end;
}
};

requestAnimationFrame(animate);

      // Cleanup: ensure the ref is updated if the effect re-runs prematurely
      return () => {
        xpRef.current = end;
      }
}
}, [userXP, animatedXP]); // Added animatedXP to dependencies

// Effect for smooth Coins animation (from parent)
useEffect(() => {
if (currentCoinsFromParent != null) {
// FIX: Start the animation from the *current animated state*
const start = animatedCoins; 
const end = currentCoinsFromParent;
const duration = 800;
const startTime = performance.now();

if (start === end) return;

const animate = (time: number) => {
const progress = Math.min((time - startTime) / duration, 1);
setAnimatedCoins(Math.floor(start + (end - start) * progress));

if (progress < 1) {
requestAnimationFrame(animate);
} else {
coinsRef.current = end;
}
};

requestAnimationFrame(animate);

      // Cleanup: ensure the ref is updated if the effect re-runs prematurely
      return () => {
        coinsRef.current = end;
      }
}
}, [currentCoinsFromParent, animatedCoins]); // Added animatedCoins to dependencies

// Render logic for loading and errors
if (isParentLoading || !userToken) {
return (
<div className="w-full px-2 py-2">
<div className="flex items-center justify-center gap-2 max-w-4xl mx-auto">
<div className="flex flex-col gap-2">
<div className="h-12 w-32 bg-slate-700/50 rounded-full animate-pulse"></div>
<div className="h-12 w-32 bg-slate-700/50 rounded-full animate-pulse"></div>
</div>
<div className="h-20 w-20 bg-slate-700/50 rounded-full animate-pulse"></div>
<div className="flex flex-col gap-2">
<div className="h-12 w-32 bg-slate-700/50 rounded-full animate-pulse"></div>
<div className="h-12 w-32 bg-slate-700/50 rounded-full animate-pulse"></div>
</div>
</div>
</div>
);
}

// Since we rely on parent, we only render if the parent's context is fully loaded
// No need for separate `if (!stats) return null;`

if (error) return <div className="text-red-400 text-center font-semibold p-4 bg-red-900/50 border border-red-700 rounded-lg max-w-md mx-auto my-4">{error}</div>;

const formatNumber = (num: number) => {
return num.toLocaleString('en-US');
};

return (
<div className="w-full px-2 py-1.5 sm:py-2">
<div className="flex items-center justify-between gap-2 sm:gap-3 md:gap-4 max-w-md sm:max-w-lg md:max-w-2xl lg:max-w-3xl mx-auto">
{/* Left Stats - Coins & Gem1 */}
<div className="flex flex-col gap-1.5 sm:gap-2 flex-1">
{/* Coins */}
<div 
data-coin-header=""
className="flex items-center justify-end gap-1.5 sm:gap-2 md:gap-3 px-3 sm:px-4 md:px-5 py-1.5 sm:py-2 md:py-2.5
 bg-gradient-to-r from-cyan-400 to-blue-400 rounded-full border-2 border-blue-300 shadow-lg w-full transition-all hover:scale-105"
>
<div className="text-base sm:text-lg md:text-xl lg:text-2xl font-black text-slate-800 tabular-nums tracking-tight flex-1 min-w-0 truncate">
{formatNumber(animatedCoins)}
</div>
<div className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 lg:w-9 lg:h-9 flex-shrink-0 bg-yellow-400 rounded-full flex items-center justify-center shadow-md">
<svg
viewBox="0 0 24 24"
className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6"
xmlns="http://www.w3.org/2000/svg"
>
<circle cx="12" cy="12" r="10" fill="#f59e0b" />
<circle cx="12" cy="12" r="8" fill="#fbbf24" />
<text
x="12"
y="16"
fontSize="10"
fontWeight="bold"
fill="#d97706"
textAnchor="middle"
>
$
</text>
</svg>
</div>
</div>

{/* Gem 1 (Wisdom Gems) */}
<div className="flex items-center justify-end gap-1.5 sm:gap-2 md:gap-3 px-3 sm:px-4 md:px-5 py-1.5 sm:py-2 md:py-2.5 bg-gradient-to-r from-emerald-400 to-green-400 rounded-full border-2 border-green-300 shadow-lg w-full transition-all hover:scale-105">
<div className="text-base sm:text-lg md:text-xl lg:text-2xl font-black text-slate-800 tabular-nums tracking-tight flex-1 min-w-0 truncate">
{formatNumber(userGem1)}
</div>
<div className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 lg:w-9 lg:h-9 flex-shrink-0 bg-green-400 rounded-full flex items-center justify-center shadow-md">
<svg
viewBox="0 0 24 24"
className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 text-slate-800"
fill="currentColor"
xmlns="http://www.w3.org/2000/svg"
>
<path d="M12 2L5 21l7-3 7 3L12 2z" />
</svg>
</div>
</div>
</div>

{/* Middle - User Icon  */}
<div className="flex-shrink-0 w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 lg:w-28 lg:h-28 
     rounded-full border-4 border-slate-300 shadow-2xl overflow-hidden">

  <img
    src="/q.jpg"
    alt="center icon"
    className="w-full h-full object-cover"
  />
</div>

{/* Right Stats - XP & Gem2 */}
<div className="flex flex-col gap-1.5 sm:gap-2 flex-1">
{/* XP (Knowledge Points) */}
<div className="flex items-center justify-start gap-1.5 sm:gap-2 md:gap-3 px-3 sm:px-4 md:px-5 py-1.5 sm:py-2 md:py-2.5
 bg-gradient-to-r from-cyan-400 to-blue-400 rounded-full border-2 border-blue-300 shadow-lg w-full transition-all hover:scale-105">
<div className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 lg:w-9 lg:h-9 flex-shrink-0 bg-amber-200 rounded-full flex items-center justify-center shadow-md">
<svg
viewBox="0 0 24 24"
fill="currentColor"
xmlns="http://www.w3.org/2000/svg"
className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 text-amber-500"
>
<path d="M9 21c0 .5.4 1 1 1h4c.6 0 1-.4 1-1v-1H9v1z" />
<path d="M12 2C8.1 2 5 5.1 5 9c0 2.4 1.2 4.5 3 5.7V17c0 .6.4 1 1 1h6c.6 0 1-.4 1-1v-2.3c1.8-1.2 3-3.3 3-5.7 0-3.9-3.1-7-7-7z" />
<circle cx="12" cy="9" r="2" fill="#fff" />
</svg>
</div>
<div className="text-base sm:text-lg md:text-xl lg:text-2xl font-black text-slate-800 tabular-nums tracking-tight flex-1 min-w-0 truncate">
{formatNumber(animatedXP)}
</div>
</div>

{/* Gem 2 (Enlightenment Crystals) */}
<div className="flex items-center justify-start gap-1.5 sm:gap-2 md:gap-3 px-3 sm:px-4 md:px-5 py-1.5 sm:py-2 md:py-2.5 
bg-gradient-to-r from-emerald-400 to-green-400 rounded-full border-2 border-green-300 shadow-lg w-full transition-all hover:scale-105">
<div className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 lg:w-9 lg:h-9 flex-shrink-0 bg-emerald-500 rounded-full flex items-center justify-center shadow-md">
<svg
viewBox="0 0 24 24"
className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 text-slate-800"
fill="currentColor"
xmlns="http://www.w3.org/2000/svg"
>
<path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z" />
</svg>
</div>
<div className="text-base sm:text-lg md:text-xl lg:text-2xl font-black text-slate-800 tabular-nums tracking-tight flex-1 min-w-0 truncate">
{formatNumber(userGem2)}
</div>
</div>
</div>
</div>
</div>
);
};

export default GameStatsHeader;