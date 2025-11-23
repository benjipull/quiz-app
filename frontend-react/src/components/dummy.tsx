import React, { useState, useEffect, useCallback } from 'react';

// --- Inline SVG Icons (Replacing lucide-react) ---

const Gift = (props) => (<svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 12V7H4v5" /><line x1="12" y1="17" x2="12" y2="22" /><path d="M17 22H7" /><path d="M12 7V2" /><path d="M7 22h10" /><path d="M17 7H7" /><path d="M12 2v5" /><path d="M4 7V4a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v3" /><rect x="4" y="7" width="16" height="5" rx="1" /><path d="M12 12V7" /></svg>);
const Sparkles = (props) => (<svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20.25l-2.065-4.13L5.805 14.12l-2.065-4.13 2.065-4.13 4.13-2.065 4.13 2.065 4.13 2.065-4.13 2.065z" fill="currentColor"/><path d="M15.5 15.5l1.5-3 1.5 3 3 1.5-3 1.5-1.5 3-1.5-3-3-1.5z" stroke="none" fill="currentColor"/></svg>);
const Clock = (props) => (<svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>);
const Coins = (props) => (<svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="8" cy="18" r="4" /><path d="M18.78 15.22L20.5 12.5l-2.22-3.28" /><path d="M20 7h-7l-1 2-2 4-5 3v1h11a2 2 0 0 0 2-2v-5a2 2 0 0 0-2-2z" /></svg>);
const Star = (props) => (<svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg>);

// --- Custom Toast Component (Replacing useToast) ---
const Toast = ({ message, type, onClose }) => {
  const bgColor = type === "success" ? "bg-green-500" : "bg-red-500";
  return (
    <div className={`fixed bottom-4 right-4 p-4 rounded-lg text-white shadow-xl z-50 transition-transform transform translate-x-0 ${bgColor}`}>
      <div className="flex justify-between items-center">
        <span>{message}</span>
        <button onClick={onClose} className="ml-4 font-bold">×</button>
      </div>
    </div>
  );
};

// --- Custom App Component (Replacing DailyCoinClaim and Wrapper) ---
const COOLDOWN_MS = 60 * 1000; // 1 minute cooldown for testing

function Claim() {
  const [timeRemaining, setTimeRemaining] = useState<number>(0);
  const [canClaim, setCanClaim] = useState<boolean>(false);
  const [isClaiming, setIsClaiming] = useState<boolean>(false);
  const [showRewardModal, setShowRewardModal] = useState<boolean>(false);
  const [showAnimation, setShowAnimation] = useState<boolean>(false);
  const [claimedAmount, setClaimedAmount] = useState<number>(500);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showCustomToast = useCallback((message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  // --- Dummy Backend/Persistence Logic ---
  const checkClaimStatus = useCallback(() => {
    const lastClaimTime = localStorage.getItem('lastDailyCoinClaim');
    const now = Date.now();

    if (lastClaimTime) {
      const lastClaim = parseInt(lastClaimTime, 10);
      const remaining = COOLDOWN_MS - (now - lastClaim);

      if (remaining > 0) {
        setTimeRemaining(remaining);
        setCanClaim(false);
      } else {
        setTimeRemaining(0);
        setCanClaim(true);
      }
    } else {
      // New user - can claim immediately
      setTimeRemaining(0);
      setCanClaim(true);
    }
  }, []);

  // --- Timer and Status Effect ---
  useEffect(() => {
    checkClaimStatus();
    
    // Check every second for countdown
    const interval = setInterval(() => {
      setTimeRemaining((prev) => {
        const newTime = prev - 1000;
        
        if (newTime <= 1000) {
          if (!canClaim) {
            setCanClaim(true);
            setTimeRemaining(0);
            return 0;
          }
        }
        return newTime > 0 ? newTime : 0;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [canClaim, checkClaimStatus]);

  // --- Event Handlers ---

  const handleClaimClick = () => {
    // Only show modal if the user is allowed to claim
    if (canClaim && !isClaiming) {
      setShowRewardModal(true);
    }
  };

  const handleConfirmClaim = async () => {
    setIsClaiming(true);

    // --- Dummy API Call Simulation ---
    try {
      // Check for an intentional double-claim failure (simulating a backend error)
      const lastClaimTime = localStorage.getItem('lastDailyCoinClaim');
      if (lastClaimTime && Date.now() - parseInt(lastClaimTime, 10) < COOLDOWN_MS) {
        throw new Error("Already claimed today!");
      }

      // Simulate network delay for claim success
      await new Promise(resolve => setTimeout(resolve, 1500));

      const coinsEarned = 500; // Fixed dummy reward
      setClaimedAmount(coinsEarned);

      // 1. Update localStorage (simulating successful backend update)
      localStorage.setItem('lastDailyCoinClaim', Date.now().toString());

      // 2. Show coin animation
      setShowAnimation(true);

      // 3. Start the UI reset process after animation completes (3 seconds)
      setTimeout(() => {
        setShowRewardModal(false);
        setShowAnimation(false);
        
        // 4. Reset cooldown states
        setCanClaim(false);
        setTimeRemaining(COOLDOWN_MS);
        setIsClaiming(false); 
      }, 3000);

      // 5. Show toast notification immediately
      showCustomToast(`You earned ${coinsEarned} coins!`, "success");

    } catch (error) {
      console.error("Error claiming coins (DUMMY):", error);
      showCustomToast("Failed to claim daily reward. Cooldown not met.", "error");
      setShowRewardModal(false);
      setIsClaiming(false);
      checkClaimStatus(); // Re-check status in case of failure
    } 
  };

  // --- Utility Functions ---

  const formatTimeRemaining = (ms: number) => {
    if (ms <= 0) return "Ready!";

    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    // Display in a compact format (m:s is enough for a 1-minute test)
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else if (minutes > 0) {
      return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    } else {
      return `${seconds}s`;
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center p-4 sm:p-8 font-inter">
      
      <h1 className="text-3xl sm:text-4xl font-extrabold text-white mb-8 text-center drop-shadow-lg">
          Daily Reward Demo
      </h1>

      {/* DAILY REWARD CARD (Replacing <Card>) */}
      <div 
        className="
          w-full max-w-8xl mx-auto
          rounded-[30px]
          bg-[#3a0077]
          bg-gradient-to-br from-[#4d008d] to-[#25004d]
          border-[3px] border-[#b535ff]
          shadow-[0_0_2px_rgba(181,53,255,0.55)]
          p-4 sm:p-5
          transition-all duration-300
        "
      >
        <div className="flex items-center justify-between gap-2 sm:gap-4">

          {/* LEFT SECTION */}
          <div className="flex items-center gap-2 sm:gap-4 min-w-0">
            
            {/* Gift Icon Box */}
            <div
              className="
                w-12 h-12 sm:w-14 sm:h-14
                rounded-2xl
                flex items-center justify-center
                bg-gradient-to-br from-[#a020f0] to-[#6a0dad]
                border-[3px] border-[#ff4dff]
                shadow-[0_0_25px_rgba(255,77,255,0.65)]
                flex-shrink-0
              "
            >
              <Gift className="w-6 h-6 sm:w-8 sm:h-8 text-[#ffe14d]" />
            </div>

            {/* Text */}
            <div className="leading-tight min-w-0">
              <h3 className="text-white font-bold text-xl sm:text-2xl">
                Daily
              </h3>
              <h3 className="text-white font-bold text-xl sm:text-2xl -mt-1">
                Reward
              </h3>
            </div>
          </div>

          {/* RIGHT SIDE — TIMER / CLAIM BUTTON */}
          <button
            className={`
              flex items-center gap-1.5 sm:gap-2
              px-3 py-2 sm:px-6 sm:py-3
              rounded-full
              min-w-0
              shadow-lg
              select-none
              transition-all duration-200
              ${
                canClaim 
                  ? "bg-yellow-500/10 border-[3px] border-yellow-400 shadow-[0_0_25px_rgba(255,255,0,0.5)] cursor-pointer hover:bg-yellow-500/20 active:scale-[0.98]"
                  : "bg-[#501b9b] border-[3px] border-[#ff78ff] shadow-[0_0_25px_rgba(255,115,255,0.5)] cursor-not-allowed opacity-80"
              }
            `}
            onClick={handleClaimClick}
            disabled={!canClaim || isClaiming}
          >
            {canClaim ? (
              // Claim Button State
              <>
                <Sparkles className={`w-5 h-5 sm:w-6 sm:h-6 ${isClaiming ? "text-gray-400" : "text-yellow-400"} ${isClaiming ? "animate-none" : "animate-pulse"}`} />
                <span className={`font-bold text-sm sm:text-lg whitespace-nowrap transition-colors ${isClaiming ? "text-gray-400" : "text-yellow-400"}`}>
                  {isClaiming ? 'Claiming...' : 'Claim Now'}
                </span>
              </>
            ) : (
              // Timer State
              <>
                <Clock className="w-5 h-5 sm:w-6 sm:h-6 text-[#f0abf0] opacity-90" />
                <span className="text-white font-bold text-sm sm:text-lg whitespace-nowrap">
                  {formatTimeRemaining(timeRemaining)}
                </span>
              </>
            )}
          </button>

        </div>
      </div>

      {/* Reward Modal Overlay */}
      {showRewardModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm transition-opacity duration-300">
          <div className="relative w-full max-w-md mx-4 transform scale-100 transition-transform duration-300">
            
            {/* Sparkle Effects Container */}
            <div className="absolute inset-0 pointer-events-none">
              {[...Array(20)].map((_, i) => (
                <div
                  key={i}
                  className="absolute animate-sparkle"
                  style={{
                    left: `${Math.random() * 100}%`,
                    top: `${Math.random() * 100}%`,
                    animationDelay: `${Math.random() * 2}s`,
                  }}
                >
                  <div className="w-1 h-1 bg-white rounded-full"></div>
                </div>
              ))}
            </div>

            {/* Main Modal Content */}
            <div className="bg-gradient-to-b from-gray-900 to-black rounded-3xl p-8 shadow-2xl border border-yellow-500/30 relative overflow-hidden">
              {/* Glow Effect */}
              <div className="absolute inset-0 bg-gradient-radial from-yellow-500/20 via-transparent to-transparent"></div>

              {/* Title */}
              <h2 className="text-5xl font-black text-center mb-8 text-yellow-400 tracking-wider relative z-10" style={{ textShadow: '0 0 20px rgba(234, 179, 8, 0.5)' }}>
                REWARD
              </h2>

              {/* Reward Icon */}
              <div className="relative flex justify-center mb-6">
                <div className="relative">
                  {/* Glow Background */}
                  <div className="absolute inset-0 bg-gradient-radial from-white/40 via-white/10 to-transparent blur-3xl scale-150"></div>
                  
                  {/* Main Circle */}
                  <div className="relative w-32 h-32 bg-gradient-to-br from-red-500 to-red-600 rounded-full flex items-center justify-center shadow-2xl animate-bounce-slow">
                    <Star className="w-16 h-16 text-yellow-400 fill-yellow-400" />
                  </div>

                  {/* Floating Coins Animation */}
                  {showAnimation && (
                    <>
                      {[...Array(12)].map((_, i) => (
                        <div
                          key={i}
                          className="absolute animate-float-coin-modal"
                          style={{
                            // Start positions slightly offset from center
                            left: `calc(50% + ${Math.random() * 100 - 50}px)`,
                            top: `calc(50% + ${Math.random() * 100 - 50}px)`,
                            animationDelay: `${Math.random() * 0.5}s`,
                            transform: 'translate(-50%, -50%)',
                          }}
                        >
                          <Coins className="w-6 h-6 text-yellow-400" />
                        </div>
                      ))}
                    </>
                  )}
                </div>
              </div>

              {/* Points Display */}
              <div className="text-center mb-8 relative z-10">
                <p className="text-white text-2xl font-semibold mb-1">Coins</p>
                <p className="text-yellow-400 text-5xl font-black">x{claimedAmount}</p>
              </div>

              {/* Buttons (Replacing <Button>) */}
              <div className="space-y-3 relative z-10">
                <button
                  onClick={handleConfirmClaim}
                  disabled={isClaiming || showAnimation}
                  className="
                    w-full h-14 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 
                    text-white font-bold text-lg rounded-full shadow-lg transition-all duration-200
                    disabled:from-gray-500 disabled:to-gray-600 disabled:cursor-not-allowed
                  "
                >
                  {isClaiming ? (
                    <div className="flex items-center justify-center space-x-2">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                      <span>Claiming...</span>
                    </div>
                  ) : showAnimation ? (
                    <span>Claimed! 🎉</span>
                  ) : (
                    <span>Claim reward</span>
                  )}
                </button>

                {!showAnimation && (
                  <button
                    onClick={() => setShowRewardModal(false)}
                    disabled={isClaiming}
                    className="w-full text-white/70 hover:text-white text-sm py-2 transition-colors"
                  >
                    Tap to continue
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      {/* CSS Styles for Animations */}
      <style>{`
        @keyframes float-coin-modal {
          0% {
            transform: translate(-50%, -50%) scale(0.5) rotate(0deg);
            opacity: 0;
          }
          50% {
            opacity: 1;
          }
          100% {
            transform: translate(-50%, -250px) scale(1.5) rotate(360deg); /* Increased Y distance */
            opacity: 0;
          }
        }

        @keyframes bounce-slow {
          0%, 100% {
            transform: translateY(0) scale(1);
          }
          50% {
            transform: translateY(-10px) scale(1.05);
          }
        }

        @keyframes sparkle {
          0%, 100% {
            opacity: 0;
            transform: scale(0);
          }
          50% {
            opacity: 1;
            transform: scale(1);
          }
        }

        .animate-float-coin-modal {
          animation: float-coin-modal 2s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards; /* Custom easing for launch effect */
        }

        .animate-bounce-slow {
          animation: bounce-slow 2s ease-in-out infinite;
        }

        .animate-sparkle {
          animation: sparkle 2s ease-in-out infinite;
        }

        .bg-gradient-radial {
          background: radial-gradient(circle, var(--tw-gradient-stops));
        }
      `}</style>
    </div>
  );
}

export default Claim;