import React, { useEffect, useState, useRef } from "react";

interface UserStatsDisplay {
  xp: number;
  gem1: number;
  gem2: number;
}

interface GameStatsHeaderProps {
  userToken: string;
  isParentLoading: boolean;
  currentCoinsFromParent: number;
  userXP: number;
  userGem1: number;
  userGem2: number;
  showSecondaryEconomyItems?: boolean;
  showKpProgressBar?: boolean;
  kpProgressPercent?: number;
  kpProgressLabel?: string;
  kpProgressMeta?: string;
  compactMode?: boolean;
  panelVariant?: "default" | "saga3d";
  centerImageSrc?: string;
  centerSubLabel?: string;
  onCenterClick?: () => void;
  centerAriaLabel?: string;
  centerBadgeValue?: string | number | null;
  economyNumberStyle?: "default" | "whiteOutline";
  economyValueTextSize?: "default" | "large";
  sagaKpOverlayOnly?: boolean;
}

const GameStatsHeader: React.FC<GameStatsHeaderProps> = ({
  userToken,
  isParentLoading,
  currentCoinsFromParent,
  userXP,
  userGem1,
  userGem2,
  showSecondaryEconomyItems = true,
  showKpProgressBar = false,
  kpProgressPercent = 0,
  kpProgressLabel = "",
  kpProgressMeta = "",
  compactMode = false,
  panelVariant = "default",
  centerImageSrc = "/assets/images/q.jpg",
  centerSubLabel,
  onCenterClick,
  centerAriaLabel = "Open profile editor",
  centerBadgeValue = null,
  economyNumberStyle = "default",
  economyValueTextSize = "default",
  sagaKpOverlayOnly = false,
}) => {
  const [error, setError] = useState<string | null>(null);
  const [animatedXP, setAnimatedXP] = useState(userXP);
  const [animatedCoins, setAnimatedCoins] = useState(currentCoinsFromParent);

  // Refs to track the previous values
  const prevCoinsRef = useRef<number>(currentCoinsFromParent);
  const prevXPRef = useRef<number>(userXP);
  const isAnimatingCoinsRef = useRef(false);
  const isAnimatingXPRef = useRef(false);

  // ✅ FIX: Faster coin animation that starts from current value
  useEffect(() => {
    // Skip if value hasn't changed or if we're already animating
    if (currentCoinsFromParent === prevCoinsRef.current || isAnimatingCoinsRef.current) {
      return;
    }

    isAnimatingCoinsRef.current = true;
    const start = prevCoinsRef.current; // Start from previous value, not animatedCoins
    const end = currentCoinsFromParent;
    const duration = 400; // ✅ Reduced from 800ms to 400ms for faster animation
    const startTime = performance.now();

    const animate = (time: number) => {
      const progress = Math.min((time - startTime) / duration, 1);
      const easeProgress = 1 - Math.pow(1 - progress, 3); // Ease-out cubic for smoother end
      
      setAnimatedCoins(Math.floor(start + (end - start) * easeProgress));

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        prevCoinsRef.current = end;
        isAnimatingCoinsRef.current = false;
      }
    };

    requestAnimationFrame(animate);
  }, [currentCoinsFromParent]); // ✅ FIXED: Removed animatedCoins from dependencies

  // ✅ FIX: Faster XP animation that starts from current value
  useEffect(() => {
    // Skip if value hasn't changed or if we're already animating
    if (userXP === prevXPRef.current || isAnimatingXPRef.current) {
      return;
    }

    isAnimatingXPRef.current = true;
    const start = prevXPRef.current; // Start from previous value, not animatedXP
    const end = userXP;
    const duration = 400; // ✅ Reduced from 800ms to 400ms
    const startTime = performance.now();

    const animate = (time: number) => {
      const progress = Math.min((time - startTime) / duration, 1);
      const easeProgress = 1 - Math.pow(1 - progress, 3); // Ease-out cubic
      
      setAnimatedXP(Math.floor(start + (end - start) * easeProgress));

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        prevXPRef.current = end;
        isAnimatingXPRef.current = false;
      }
    };

    requestAnimationFrame(animate);
  }, [userXP]); // ✅ FIXED: Removed animatedXP from dependencies

  // ✅ Initialize on mount to prevent 0 flash
  useEffect(() => {
    setAnimatedCoins(currentCoinsFromParent);
    setAnimatedXP(userXP);
    prevCoinsRef.current = currentCoinsFromParent;
    prevXPRef.current = userXP;
  }, []); // Run once on mount

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

  if (error) {
    return (
      <div className="text-red-400 text-center font-semibold p-4 bg-red-900/50 border border-red-700 rounded-lg max-w-md mx-auto my-4">
        {error}
      </div>
    );
  }

  const formatNumber = (num: number) => {
    return num.toLocaleString('en-US');
  };

  const compact = compactMode;
  const useSaga3dPanels = panelVariant === "saga3d";
  const panelInteractionClass = useSaga3dPanels
    ? "hover:-translate-y-[1px] active:translate-y-[1px] hover:brightness-[1.03]"
    : "hover:scale-105";
  const getPanel3DStyle = (tone: "blue" | "green"): React.CSSProperties | undefined => {
    if (!useSaga3dPanels) return undefined;
    if (tone === "blue") {
      return {
        boxShadow:
          "inset 0 2px 0 rgba(255,255,255,0.6), inset 0 -3px 0 rgba(8,47,73,0.36), 0 6px 0 rgba(12,74,110,0.55), 0 11px 16px rgba(2,6,23,0.35)",
      };
    }

    return {
      boxShadow:
        "inset 0 2px 0 rgba(255,255,255,0.55), inset 0 -3px 0 rgba(5,84,63,0.34), 0 6px 0 rgba(6,95,70,0.52), 0 11px 16px rgba(2,6,23,0.33)",
    };
  };
  const icon3DStyle: React.CSSProperties | undefined = useSaga3dPanels
    ? {
        boxShadow:
          "inset 0 1px 0 rgba(255,255,255,0.42), inset 0 -2px 0 rgba(15,23,42,0.25), 0 3px 7px rgba(2,6,23,0.35)",
      }
    : undefined;
  const normalizedKpProgressPercent = Number.isFinite(kpProgressPercent)
    ? Math.max(0, Math.min(100, kpProgressPercent))
    : 0;
  const useSagaEconomyTileStyle = useSaga3dPanels && !showSecondaryEconomyItems;
  const economyTileRadiusClass = useSagaEconomyTileStyle ? "rounded-xl sm:rounded-2xl" : "rounded-full";
  const useWhiteOutlinedEconomyNumbers = economyNumberStyle === "whiteOutline";
  const useLargeEconomyValueText = economyValueTextSize === "large";
  const outlinedEconomyNumberStyle: React.CSSProperties | undefined =
    useWhiteOutlinedEconomyNumbers
      ? {
          WebkitTextStroke: "0.7px #000",
          textShadow:
            "-0.6px -0.6px 0 #000, 0.6px -0.6px 0 #000, -0.6px 0.6px 0 #000, 0.6px 0.6px 0 #000",
        }
      : undefined;
  const shouldShowKpProgress = showKpProgressBar && userToken && !isParentLoading;
  const shouldUseSaga3dKpStyle = shouldShowKpProgress && useSaga3dPanels;
  const kpMetaText = kpProgressMeta.trim();
  const kpMetaMatch = /^(\d+)\s+KP to Level\s+(\d+)$/i.exec(kpMetaText);
  const remainingKpLabel = kpMetaMatch?.[1] || null;
  const nextLevelLabel = kpMetaMatch?.[2] || null;
  const sagaKpMetaTextClass = sagaKpOverlayOnly
    ? "text-[12px] sm:text-[14px]"
    : "text-[9px] sm:text-[10px]";
  const sagaKpBarHeightRem = compact ? 0.52 : 0.68;
  const resolvedSagaKpBarHeightRem = sagaKpOverlayOnly
    ? sagaKpBarHeightRem * 1.5
    : sagaKpBarHeightRem;

  return (
    <div className={`w-full px-2 ${compact ? "py-0.5" : "py-1.5 sm:py-2"}`}>
      <div className={`${compact ? "max-w-sm" : "max-w-md sm:max-w-lg md:max-w-2xl lg:max-w-3xl"} mx-auto`}>
        <div className={`flex items-center justify-between ${compact ? "gap-1.5" : "gap-2 sm:gap-3 md:gap-4"}`}>
          {/* Left Stats - Coins & Gem1 */}
          <div className={`flex flex-col ${compact ? "gap-1" : "gap-1.5 sm:gap-2"} flex-1`}>
            {/* Coins */}
            <div 
              data-coin-header=""
              className={`flex items-center justify-end ${
                compact
                  ? "gap-1 px-2 py-1"
                  : "gap-1.5 sm:gap-2 md:gap-3 px-3 sm:px-4 md:px-5 py-1.5 sm:py-2 md:py-2.5"
              } ${
                useSagaEconomyTileStyle
                  ? `${compact ? "justify-center py-[0.16rem] pr-8 pl-3" : "justify-center py-[0.26rem] pr-12 pl-4"} relative bg-gradient-to-b from-[#40c7ef] via-[#20ace2] to-[#1792d3] border-2 border-[#6fe6ff] shadow-[inset_0_2px_0_rgba(255,255,255,0.36),inset_0_-2px_0_rgba(8,56,116,0.6),0_8px_18px_rgba(5,18,58,0.45)]`
                  : "bg-gradient-to-r from-cyan-400 to-blue-400 border-2 border-blue-300"
              } ${economyTileRadiusClass} ${useSaga3dPanels ? "shadow-none" : "shadow-lg"} w-full transition-all duration-200 ${panelInteractionClass}`}
              style={useSagaEconomyTileStyle ? undefined : getPanel3DStyle("blue")}
            >
              <div className={`${
                compact
                  ? useSagaEconomyTileStyle
                    ? useLargeEconomyValueText
                      ? "text-[0.72rem] sm:text-[0.82rem]"
                      : "text-[0.5rem]"
                    : useLargeEconomyValueText
                      ? "text-base sm:text-lg"
                      : "text-sm"
                  : useSagaEconomyTileStyle
                    ? useLargeEconomyValueText
                      ? "text-[1.35rem] sm:text-[1.5rem]"
                      : "text-[1rem] sm:text-[1.075rem]"
                    : useLargeEconomyValueText
                      ? "text-lg sm:text-xl md:text-2xl lg:text-3xl"
                      : "text-base sm:text-lg md:text-xl lg:text-2xl"
              } font-black ${
                useWhiteOutlinedEconomyNumbers
                  ? `${useSagaEconomyTileStyle ? "text-center w-full" : "flex-1 min-w-0 truncate"} text-white tracking-tight`
                  : useSagaEconomyTileStyle
                    ? "text-white drop-shadow-[0_3px_0_rgba(5,42,89,0.95)] tracking-[0.02em] text-center w-full"
                    : "text-slate-800 tracking-tight flex-1 min-w-0 truncate"
              } tabular-nums`}>
                <span style={outlinedEconomyNumberStyle}>{formatNumber(animatedCoins)}</span>
              </div>
              {useSagaEconomyTileStyle ? (
                <img
                  data-coin-header-icon=""
                  className={`absolute top-1/2 ${
                    compact ? "-right-2 h-9 w-9" : "-right-4 h-14 w-14 sm:h-16 sm:w-16"
                  } -translate-y-1/2 rounded-full object-contain`}
                  src="/assets/images/icons/coin.png"
                  alt=""
                  aria-hidden="true"
                  style={{ imageRendering: "auto", backfaceVisibility: "hidden" }}
                />
              ) : (
                <div
                  data-coin-header-icon=""
                  className={`${compact ? "w-5 h-5" : "w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 lg:w-9 lg:h-9"} flex-shrink-0 bg-yellow-400 rounded-full flex items-center justify-center ${useSaga3dPanels ? "shadow-none" : "shadow-md"}`}
                  style={icon3DStyle}
                >
                  <img
                    src="/assets/images/icons/coin.png"
                    alt=""
                    aria-hidden="true"
                    className="h-full w-full rounded-full object-contain"
                    style={{ imageRendering: "auto", backfaceVisibility: "hidden" }}
                  />
                </div>
              )}
            </div>

            {showSecondaryEconomyItems ? (
              <div className={`flex items-center justify-end ${
                compact
                  ? "gap-1 px-2 py-1"
                  : "gap-1.5 sm:gap-2 md:gap-3 px-3 sm:px-4 md:px-5 py-1.5 sm:py-2 md:py-2.5"
              } bg-gradient-to-r from-emerald-400 to-green-400 rounded-full border-2 border-green-300 ${useSaga3dPanels ? "shadow-none" : "shadow-lg"} w-full transition-all duration-200 ${panelInteractionClass}`}
                style={icon3DStyle}
              >
                <div className={`${compact ? "text-sm" : "text-base sm:text-lg md:text-xl lg:text-2xl"} font-black text-slate-800 tabular-nums tracking-tight flex-1 min-w-0 truncate`}>
                  {formatNumber(userGem1)}
                </div>
                <div
                  className={`${compact ? "w-5 h-5" : "w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 lg:w-9 lg:h-9"} flex-shrink-0 bg-green-400 rounded-full flex items-center justify-center ${useSaga3dPanels ? "shadow-none" : "shadow-md"}`}
                  style={icon3DStyle}
                >
                  <svg
                    viewBox="0 0 24 24"
                    className={compact ? "w-3 h-3 text-slate-800" : "w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 text-slate-800"}
                    fill="currentColor"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path d="M12 2L5 21l7-3 7 3L12 2z" />
                  </svg>
                </div>
              </div>
            ) : null}
          </div>

          {/* Middle - User Icon  */}
          <div
            className={`flex-shrink-0 flex flex-col items-center ${onCenterClick ? "cursor-pointer" : ""} ${useSagaEconomyTileStyle ? "mx-2 sm:mx-3 md:mx-4" : ""}`}
            onClick={onCenterClick}
            onKeyDown={(event) => {
              if (!onCenterClick) return;
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                onCenterClick();
              }
            }}
            role={onCenterClick ? "button" : undefined}
            tabIndex={onCenterClick ? 0 : undefined}
            aria-label={onCenterClick ? centerAriaLabel : undefined}
          >
            <div className="relative">
              <div className={`${compact ? "w-[3.75rem] h-[3.75rem] border-2" : "w-20 h-20 sm:w-[6.25rem] sm:h-[6.25rem] md:w-[7.5rem] md:h-[7.5rem] lg:w-[8.75rem] lg:h-[8.75rem] border-4"} rounded-full border-slate-300 shadow-2xl overflow-hidden`}>
                <img
                  src={centerImageSrc}
                  alt="center icon"
                  className="w-full h-full object-cover"
                  style={{ imageRendering: "auto", backfaceVisibility: "hidden" }}
                />
              </div>
              {centerBadgeValue !== null && centerBadgeValue !== undefined && centerBadgeValue !== "" ? (
                <div
                  className={`absolute -right-1 -bottom-1 ${
                    compact ? "min-w-5 h-5 text-[10px] px-1" : "min-w-6 h-6 sm:min-w-7 sm:h-7 text-[11px] sm:text-xs px-1.5"
                  } rounded-full bg-emerald-400 border-2 border-white text-slate-900 font-black flex items-center justify-center shadow-lg leading-none`}
                  aria-label={`Level ${centerBadgeValue}`}
                >
                  {centerBadgeValue}
                </div>
              ) : null}
            </div>
            {centerSubLabel ? (
              <p className={`${compact ? "text-[11px] mt-0.5 max-w-[84px]" : "text-xs sm:text-sm mt-1 max-w-[128px]"} text-cyan-100 font-semibold leading-none truncate text-center drop-shadow-[0_1px_2px_rgba(0,0,0,0.65)]`}>
                {centerSubLabel}
              </p>
            ) : null}
          </div>

          {/* Right Stats - XP & Gem2 */}
          <div className={`flex flex-col ${compact ? "gap-1" : "gap-1.5 sm:gap-2"} flex-1`}>
            {/* XP (Knowledge Points) */}
            <div className={`flex items-center justify-start ${
              compact
                ? "gap-1 px-2 py-1"
                : "gap-1.5 sm:gap-2 md:gap-3 px-3 sm:px-4 md:px-5 py-1.5 sm:py-2 md:py-2.5"
            } ${
              useSagaEconomyTileStyle
                ? `${compact ? "justify-center py-[0.16rem] pl-8 pr-3" : "justify-center py-[0.26rem] pl-12 pr-4"} relative bg-gradient-to-b from-[#40c7ef] via-[#20ace2] to-[#1792d3] border-2 border-[#6fe6ff] shadow-[inset_0_2px_0_rgba(255,255,255,0.36),inset_0_-2px_0_rgba(8,56,116,0.6),0_8px_18px_rgba(5,18,58,0.45)]`
                : "bg-gradient-to-r from-cyan-400 to-blue-400 border-2 border-blue-300"
            } ${economyTileRadiusClass} ${useSaga3dPanels ? "shadow-none" : "shadow-lg"} w-full transition-all duration-200 ${panelInteractionClass}`}
              style={useSagaEconomyTileStyle ? undefined : getPanel3DStyle("blue")}
            >
              {useSagaEconomyTileStyle ? (
                <img
                  data-coin-header-icon=""
                  className={`absolute top-1/2 ${
                    compact ? "-left-2 h-9 w-9" : "-left-4 h-14 w-14 sm:h-16 sm:w-16"
                  } -translate-y-1/2 z-10 rounded-full object-contain`}
                  src="/assets/images/icons/KP Icon.png"
                  alt=""
                  aria-hidden="true"
                  style={{ imageRendering: "auto", backfaceVisibility: "hidden" }}
                />
              ) : (
                <div
                  className={`${compact ? "w-5 h-5" : "w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 lg:w-9 lg:h-9"} flex-shrink-0 bg-amber-200 rounded-full flex items-center justify-center ${useSaga3dPanels ? "shadow-none" : "shadow-md"}`}
                  style={icon3DStyle}
                >
                  <svg
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    xmlns="http://www.w3.org/2000/svg"
                    className={compact ? "w-3 h-3 text-amber-500" : "w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 text-amber-500"}
                  >
                    <path d="M9 21c0 .5.4 1 1 1h4c.6 0 1-.4 1-1v-1H9v1z" />
                    <path d="M12 2C8.1 2 5 5.1 5 9c0 2.4 1.2 4.5 3 5.7V17c0 .6.4 1 1 1h6c.6 0 1-.4 1-1v-2.3c1.8-1.2 3-3.3 3-5.7 0-3.9-3.1-7-7-7z" />
                    <circle cx="12" cy="9" r="2" fill="#fff" />
                  </svg>
                </div>
              )}
              <div className={`${
                compact
                  ? useSagaEconomyTileStyle
                    ? useLargeEconomyValueText
                      ? "text-[0.72rem] sm:text-[0.82rem]"
                      : "text-[0.5rem]"
                    : useLargeEconomyValueText
                      ? "text-base sm:text-lg"
                      : "text-sm"
                  : useSagaEconomyTileStyle
                    ? useLargeEconomyValueText
                      ? "text-[1.35rem] sm:text-[1.5rem]"
                      : "text-[1rem] sm:text-[1.075rem]"
                    : useLargeEconomyValueText
                      ? "text-lg sm:text-xl md:text-2xl lg:text-3xl"
                      : "text-base sm:text-lg md:text-xl lg:text-2xl"
              } font-black ${
                useWhiteOutlinedEconomyNumbers
                  ? `${useSagaEconomyTileStyle ? "text-center w-full" : "flex-1 min-w-0 truncate"} text-white tracking-tight`
                  : useSagaEconomyTileStyle
                    ? "text-white drop-shadow-[0_3px_0_rgba(5,42,89,0.95)] tracking-[0.02em] text-center w-full"
                    : "text-slate-800 tracking-tight flex-1 min-w-0 truncate"
              } tabular-nums`}>
                <span style={outlinedEconomyNumberStyle}>{formatNumber(animatedXP)}</span>
              </div>
            </div>

            {showSecondaryEconomyItems ? (
              <div className={`flex items-center justify-start ${
                compact
                  ? "gap-1 px-2 py-1"
                  : "gap-1.5 sm:gap-2 md:gap-3 px-3 sm:px-4 md:px-5 py-1.5 sm:py-2 md:py-2.5"
              } bg-gradient-to-r from-emerald-400 to-green-400 rounded-full border-2 border-green-300 ${useSaga3dPanels ? "shadow-none" : "shadow-lg"} w-full transition-all duration-200 ${panelInteractionClass}`}
                style={getPanel3DStyle("green")}
              >
                <div
                  className={`${compact ? "w-5 h-5" : "w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 lg:w-9 lg:h-9"} flex-shrink-0 bg-emerald-500 rounded-full flex items-center justify-center ${useSaga3dPanels ? "shadow-none" : "shadow-md"}`}
                  style={icon3DStyle}
                >
                  <svg
                    viewBox="0 0 24 24"
                    className={compact ? "w-3 h-3 text-slate-800" : "w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 text-slate-800"}
                    fill="currentColor"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z" />
                  </svg>
                </div>
                <div className={`${compact ? "text-sm" : "text-base sm:text-lg md:text-xl lg:text-2xl"} font-black text-slate-800 tabular-nums tracking-tight flex-1 min-w-0 truncate`}>
                  {formatNumber(userGem2)}
                </div>
              </div>
            ) : null}
          </div>
        </div>
        {shouldShowKpProgress ? (
          shouldUseSaga3dKpStyle ? (
            <div className={`${compact ? "mt-1 px-1" : "mt-2 px-1.5"}`}>
              <div
                className={
                  sagaKpOverlayOnly
                    ? "relative px-0.5 py-0"
                    : "relative overflow-hidden rounded-[1.1rem] border-2 border-[#2f86ff] bg-gradient-to-b from-[#1a4695] via-[#173f87] to-[#123677] px-1.5 py-1 shadow-[0_0_0_1px_rgba(111,174,255,0.2)_inset,0_10px_24px_rgba(5,16,48,0.62)]"
                }
              >
                {!sagaKpOverlayOnly ? (
                  <div className="pointer-events-none absolute left-2 right-2 top-0.5 h-px bg-gradient-to-r from-transparent via-white/70 to-transparent" />
                ) : null}
                {!sagaKpOverlayOnly ? (
                  <div className="flex items-center justify-between text-[10px] sm:text-[11px] font-black tracking-wide text-[#f3f8ff] drop-shadow-[0_1px_2px_rgba(6,15,42,0.85)]">
                    <span>KP</span>
                    <span>{kpProgressLabel}</span>
                  </div>
                ) : null}
                <div className={`${sagaKpOverlayOnly ? "mt-0.5" : "mt-1"} rounded-full border-2 border-[#2f86ff] bg-[#0f3576] p-px shadow-[inset_0_1px_0_rgba(255,255,255,0.16)]`}>
                  <div
                    className="h-6 w-full overflow-hidden rounded-full bg-[#0d2f69]"
                    style={{ height: `${resolvedSagaKpBarHeightRem}rem` }}
                  >
                    <div
                      className="relative h-full rounded-full bg-gradient-to-r from-[#4fe8ff] via-[#38d8ff] to-[#2cb7ff] transition-[width] duration-500 ease-out shadow-[0_0_16px_rgba(79,232,255,0.7)]"
                      style={{ width: `${normalizedKpProgressPercent}%` }}
                    >
                      <span className="game-stats-kp-shine absolute inset-y-0 left-[-24%] w-[28%] bg-gradient-to-r from-transparent via-white/80 to-transparent" />
                    </div>
                  </div>
                </div>
                {kpMetaText ? (
                  <div className="mt-1 flex items-center justify-center gap-1">
                    <span className="game-stats-kp-dot-line" aria-hidden="true" />
                    {remainingKpLabel && nextLevelLabel ? (
                      <p className={`${sagaKpMetaTextClass} font-black tracking-wide leading-none drop-shadow-[0_1px_2px_rgba(6,15,42,0.7)]`}>
                        <span className="text-[#26e4ff]">{remainingKpLabel} KP</span>
                        <span className="text-[#d5e5ff]"> to Level {nextLevelLabel}</span>
                      </p>
                    ) : (
                      <p className={`${sagaKpMetaTextClass} font-black tracking-wide leading-none text-[#d5e5ff] drop-shadow-[0_1px_2px_rgba(6,15,42,0.7)]`}>
                        {kpMetaText}
                      </p>
                    )}
                    <span className="game-stats-kp-dot-line" aria-hidden="true" />
                  </div>
                ) : null}
              </div>
            </div>
          ) : (
            <div className={`${compact ? "mt-1 px-1.5" : "mt-2 px-2"}`}>
              <div className="rounded-full border border-cyan-200/45 bg-slate-900/55 px-2 py-1.5 backdrop-blur-md shadow-[0_8px_18px_rgba(8,47,73,0.35)]">
                <div className="flex items-center justify-between text-[10px] sm:text-xs font-semibold text-cyan-100/95">
                  <span>KP</span>
                  <span>{kpProgressLabel}</span>
                </div>
                <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-800/80 ring-1 ring-cyan-200/30">
                  <div
                    className="relative h-full rounded-full bg-gradient-to-r from-cyan-300 via-cyan-400 to-sky-300 transition-[width] duration-500 ease-out shadow-[0_0_10px_rgba(34,211,238,0.75)]"
                    style={{ width: `${normalizedKpProgressPercent}%` }}
                  >
                    <span className="game-stats-kp-shine absolute inset-y-0 left-[-32%] w-[32%] bg-gradient-to-r from-transparent via-white/80 to-transparent" />
                  </div>
                </div>
                {kpProgressMeta ? (
                  <p className="mt-1 text-right text-[9px] sm:text-[10px] font-semibold tracking-wide text-cyan-100/85">
                    {kpProgressMeta}
                  </p>
                ) : null}
              </div>
            </div>
          )
        ) : null}
      </div>
      {shouldShowKpProgress ? (
        <style>{`
          @keyframes gameStatsKpShineSweep {
            0% { transform: translateX(-130%); opacity: 0; }
            20% { opacity: 0.9; }
            100% { transform: translateX(390%); opacity: 0; }
          }

          .game-stats-kp-shine {
            animation: gameStatsKpShineSweep 1.35s linear infinite;
            filter: blur(0.5px);
          }

          .game-stats-kp-dot-line {
            display: block;
            width: clamp(28px, 8vw, 61px);
            height: 4px;
            opacity: 0.8;
            background:
              radial-gradient(circle, rgba(169, 201, 255, 0.8) 0.72px, transparent 0.8px) center / 5px 4px repeat-x;
          }
        `}</style>
      ) : null}
    </div>
  );
};

export default GameStatsHeader;
