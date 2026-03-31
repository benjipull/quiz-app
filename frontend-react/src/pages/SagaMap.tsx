import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useUser } from "@/contexts/UserContext";
import { getApiBaseUrl } from "@/utils/baseUrl";
import GameStatsHeader from "@/components/GameStatsHeader";
import { avatarUrls } from "@/utils/avatarPaths";
import { useToast } from "@/hooks/use-toast";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const LEVEL_GAP = 170;
const TOP_PADDING = 120;
const LOAD_BATCH = 30;
const LOAD_THRESHOLD_PX = 320;
const OVERSCAN_PX = LEVEL_GAP * 2;
const UNLOCK_ANIMATION_SIGNAL_MAX_AGE_MS = 2 * 60 * 1000;
const BASE_URL = getApiBaseUrl();

type BubblePoint = {
  level: number;
  x: number;
  y: number;
};

type PathSegment = {
  level: number;
  path: string;
  roadWidth: number;
  glowWidth: number;
  centerLineWidth: number;
  centerDashArray: string;
};

type StarPulseAnimationName =
  | "sagaMapStarPulseA"
  | "sagaMapStarPulseB"
  | "sagaMapStarPulseC";

type SagaMapAmbientStar = {
  id: number;
  xPercent: number;
  yPercent: number;
  sizePx: number;
  tintColor: string;
  glowColor: string;
  glowBlurPx: number;
  minOpacity: number;
  maxOpacity: number;
  minScale: number;
  maxScale: number;
  durationSec: number;
  delaySec: number;
  animationName: StarPulseAnimationName;
};

type SagaMapLocationState = {
  fromSagaLevelCompletion?: boolean;
  unlockedSagaLevel?: number;
  completedSagaNumber?: number;
  completedAt?: number;
};

const STAR_TILE_HEIGHT = 960;
const STAR_COUNT_PER_TILE = 56;
const PATH_WIDTH_SCALE = 0.75;
const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

const getDeterministicRandom = (seed: number) => {
  const value = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
  return value - Math.floor(value);
};

const SAGA_MAP_STAR_TINTS = [
  "rgba(214, 197, 255, 0.92)",
  "rgba(226, 211, 255, 0.9)",
  "rgba(198, 222, 255, 0.88)",
  "rgba(203, 188, 255, 0.86)",
  "rgba(188, 214, 255, 0.84)",
];

const SAGA_MAP_STAR_GLOWS = [
  "rgba(182, 137, 255, 0.6)",
  "rgba(154, 121, 247, 0.52)",
  "rgba(151, 190, 255, 0.54)",
  "rgba(193, 167, 255, 0.56)",
];

const buildSagaMapAmbientStars = (): SagaMapAmbientStar[] => {
  const stars: SagaMapAmbientStar[] = [];

  for (let index = 0; index < STAR_COUNT_PER_TILE; index += 1) {
    const xPercent = 2 + getDeterministicRandom(index + 19) * 96;
    const yPercent = 2 + getDeterministicRandom(index + 103) * 96;
    const sizePx = 0.9 + getDeterministicRandom(index + 211) * 1.9;
    const glowBlurPx = 2.2 + getDeterministicRandom(index + 307) * 4.6;
    const minOpacity = 0.24 + getDeterministicRandom(index + 401) * 0.34;
    const maxOpacity = Math.min(
      0.95,
      minOpacity + 0.18 + getDeterministicRandom(index + 503) * 0.24,
    );
    const minScale = 0.84 + getDeterministicRandom(index + 601) * 0.16;
    const maxScale = minScale + 0.16 + getDeterministicRandom(index + 701) * 0.28;
    const durationSec = 2.6 + getDeterministicRandom(index + 809) * 4.8;
    const delaySec = getDeterministicRandom(index + 907) * 6.4;
    const tintColor =
      SAGA_MAP_STAR_TINTS[
        Math.floor(getDeterministicRandom(index + 1009) * SAGA_MAP_STAR_TINTS.length)
      ];
    const glowColor =
      SAGA_MAP_STAR_GLOWS[
        Math.floor(getDeterministicRandom(index + 1103) * SAGA_MAP_STAR_GLOWS.length)
      ];
    const animationName: StarPulseAnimationName =
      index % 3 === 0
        ? "sagaMapStarPulseA"
        : index % 3 === 1
          ? "sagaMapStarPulseB"
          : "sagaMapStarPulseC";

    stars.push({
      id: index,
      xPercent,
      yPercent,
      sizePx,
      tintColor,
      glowColor,
      glowBlurPx,
      minOpacity,
      maxOpacity,
      minScale,
      maxScale,
      durationSec,
      delaySec,
      animationName,
    });
  }

  return stars;
};

const SAGA_MAP_AMBIENT_STARS = buildSagaMapAmbientStars();

const getSagaMapAmbientStarStyle = (
  star: SagaMapAmbientStar,
  tileIndex: number,
): CSSProperties => {
  const style: CSSProperties = {
    left: `${star.xPercent}%`,
    top: `${star.yPercent}%`,
    width: `${star.sizePx}px`,
    height: `${star.sizePx}px`,
    backgroundColor: star.tintColor,
    boxShadow: `0 0 ${star.glowBlurPx}px ${star.glowColor}`,
    animationName: star.animationName,
    animationDuration: `${star.durationSec}s`,
    animationDelay: `${star.delaySec + tileIndex * 0.21}s`,
  };

  const styleWithVars = style as CSSProperties & Record<string, string>;
  styleWithVars["--star-min-opacity"] = `${star.minOpacity}`;
  styleWithVars["--star-max-opacity"] = `${star.maxOpacity}`;
  styleWithVars["--star-min-scale"] = `${star.minScale}`;
  styleWithVars["--star-max-scale"] = `${star.maxScale}`;

  return style;
};

export default function SagaMap() {
  const { user, loading, refreshUser, updateUserLocally, markUserStale } = useUser();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const scrollRef = useRef<HTMLDivElement>(null);
  const isAppendingRef = useRef(false);
  const centeredPlayableLevelRef = useRef<number | null>(null);
  const hasConsumedUnlockAnimationRef = useRef(false);

  const [maxLevel, setMaxLevel] = useState(40);
  const [scrollTop, setScrollTop] = useState(0);
  const [isGeneratingMore, setIsGeneratingMore] = useState(false);
  const [playerSagaNumber, setPlayerSagaNumber] = useState(0);
  const [isProgressLoading, setIsProgressLoading] = useState(true);
  const [selectedSagaLevel, setSelectedSagaLevel] = useState<number | null>(null);
  const [creatingSagaLevel, setCreatingSagaLevel] = useState<number | null>(null);
  const [editAlias, setEditAlias] = useState("");
  const [editAvatarIndex, setEditAvatarIndex] = useState(0);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [unlockAnimatingLevel, setUnlockAnimatingLevel] = useState<number | null>(null);
  const [isInitialMapReady, setIsInitialMapReady] = useState(false);
  const [viewport, setViewport] = useState({
    width: typeof window !== "undefined" ? window.innerWidth : 390,
    height: typeof window !== "undefined" ? window.innerHeight : 780,
  });

  const mapWidth = Math.max(240, Math.min(440, viewport.width - 24));
  const bubbleSize = viewport.width < 420 ? 58 : 72;
  const highlightedBubbleSize = bubbleSize * 1.5;
  const mapTopPadding = Math.max(TOP_PADDING, viewport.height / 2);
  const mapBottomPadding = Math.max(highlightedBubbleSize / 2, viewport.height / 2);
  const contentHeight = mapTopPadding + mapBottomPadding + (maxLevel - 1) * LEVEL_GAP;
  const fullScreenHeight =
    typeof window !== "undefined" ? window.innerHeight : viewport.height;
  const screenStarTileCount = Math.max(1, Math.ceil(fullScreenHeight / STAR_TILE_HEIGHT) + 1);
  const levelBaseY = contentHeight - mapBottomPadding;
  const centerX = mapWidth / 2;
  const waveAmplitude = Math.max(62, Math.min(126, mapWidth * 0.28));
  const viewMinY = Math.max(0, scrollTop - OVERSCAN_PX);
  const viewMaxY = scrollTop + viewport.height + OVERSCAN_PX;
  const visibleLevelStart = Math.max(
    1,
    Math.ceil((levelBaseY - viewMaxY) / LEVEL_GAP + 1),
  );
  const visibleLevelEnd = Math.min(
    maxLevel,
    Math.floor((levelBaseY - viewMinY) / LEVEL_GAP + 1),
  );
  const maxEnabledSagaNumber = Math.max(0, Number(playerSagaNumber) || 0);
  const nextPlayableSagaLevel = Math.max(1, maxEnabledSagaNumber || 1);
  const userToken =
    typeof window !== "undefined" ? localStorage.getItem("token") || "" : "";
  const currentCoins = user?.coins ?? 0;
  const locationState = (location.state as SagaMapLocationState | null) ?? null;
  const unlockCompletedAt = Number(locationState?.completedAt ?? 0);
  const unlockSignalAgeMs = Date.now() - unlockCompletedAt;
  const hasFreshUnlockSignal =
    Number.isFinite(unlockSignalAgeMs) &&
    unlockSignalAgeMs >= 0 &&
    unlockSignalAgeMs <= UNLOCK_ANIMATION_SIGNAL_MAX_AGE_MS;
  const shouldAnimateUnlockOnEntry = Boolean(
    locationState?.fromSagaLevelCompletion && hasFreshUnlockSignal,
  );
  const requestedUnlockedLevel = Math.max(0, Number(locationState?.unlockedSagaLevel) || 0);
  const isCompactEconomyResolution = viewport.height <= 700 || viewport.width <= 360;
  const selectedAvatarIndex = Math.max(0, (user?.avatar || 1) - 1);
  const userAvatarImage = avatarUrls[selectedAvatarIndex] || avatarUrls[0];

  const openEditDialog = () => {
    const avatarIndex = user?.avatar ? user.avatar - 1 : 0;
    setEditAvatarIndex(avatarIndex >= 0 ? avatarIndex : 0);
    setEditAlias(user?.alias || "");
    setIsEditDialogOpen(true);
  };

  const handleSaveAliasAvatar = async () => {
    const trimmedAlias = editAlias.trim();
    if (!trimmedAlias) {
      toast({
        title: "Validation Error",
        description: "Please enter a valid alias.",
        variant: "destructive",
      });
      return;
    }

    if (!userToken) {
      toast({
        title: "Authentication Error",
        description: "Please log in again.",
        variant: "destructive",
      });
      return;
    }

    setIsSavingProfile(true);
    try {
      const selectedAvatar = editAvatarIndex + 1;
      const response = await fetch(`${BASE_URL}/api/updateUserDetails`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${userToken}`,
        },
        body: JSON.stringify({
          alias: trimmedAlias,
          avatar: selectedAvatar,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData?.error || "Failed to update profile.");
      }

      updateUserLocally({
        alias: trimmedAlias,
        avatar: selectedAvatar,
      });
      markUserStale();
      await refreshUser();
      setIsEditDialogOpen(false);
    } catch (error) {
      toast({
        title: "Error",
        description: `Failed to update profile: ${(error as Error).message}`,
        variant: "destructive",
      });
    } finally {
      setIsSavingProfile(false);
    }
  };

  const getBubbleCenter = (level: number) => {
    const x = centerX + Math.sin(level * 0.74) * waveAmplitude;
    const y = levelBaseY - (level - 1) * LEVEL_GAP;
    return { x, y };
  };

  const visibleBubbles: BubblePoint[] = [];
  for (let level = visibleLevelStart; level <= visibleLevelEnd; level += 1) {
    const { x, y } = getBubbleCenter(level);
    visibleBubbles.push({ level, x, y });
  }

  const visibleSegments: PathSegment[] = [];
  const segmentStart = Math.max(1, visibleLevelStart - 1);
  const segmentEnd = Math.min(maxLevel - 1, visibleLevelEnd);
  const travelHeight = Math.max(1, contentHeight - mapTopPadding - mapBottomPadding);
  for (let level = segmentStart; level <= segmentEnd; level += 1) {
    const previous = getBubbleCenter(Math.max(1, level - 1));
    const start = getBubbleCenter(level);
    const end = getBubbleCenter(level + 1);
    const next = getBubbleCenter(Math.min(maxLevel, level + 2));

    // Catmull-Rom inspired controls keep joins smooth while still passing through each bubble center.
    const smoothing = 0.82;
    const controlStartX = start.x + ((end.x - previous.x) / 6) * smoothing;
    const controlStartY = start.y + ((end.y - previous.y) / 6) * smoothing;
    const controlEndX = end.x - ((next.x - start.x) / 6) * smoothing;
    const controlEndY = end.y - ((next.y - start.y) / 6) * smoothing;

    const segmentMidY = (start.y + end.y) / 2;
    const bottomProgress = clamp((segmentMidY - mapTopPadding) / travelHeight, 0, 1);
    const roadWidth = (8 + bottomProgress * 24) * PATH_WIDTH_SCALE;
    const centerLineWidth = Math.max(2.2 * PATH_WIDTH_SCALE, roadWidth * 0.34);
    const dashLength = Math.round(4 + bottomProgress * 10);
    const dashGap = Math.round(7 + bottomProgress * 10);

    visibleSegments.push({
      level,
      path: `M ${start.x} ${start.y} C ${controlStartX} ${controlStartY} ${controlEndX} ${controlEndY} ${end.x} ${end.y}`,
      roadWidth,
      glowWidth: roadWidth + 9 * PATH_WIDTH_SCALE,
      centerLineWidth,
      centerDashArray: `${dashLength} ${dashGap}`,
    });
  }

  const appendMoreLevels = () => {
    if (isAppendingRef.current) return;
    isAppendingRef.current = true;
    setIsGeneratingMore(true);

    setMaxLevel((previous) => previous + LOAD_BATCH);

    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        const container = scrollRef.current;
        if (container) {
          container.scrollTop += LOAD_BATCH * LEVEL_GAP;
          setScrollTop(container.scrollTop);
        }
        isAppendingRef.current = false;
        setIsGeneratingMore(false);
      });
    });
  };

  const handleScroll = () => {
    const container = scrollRef.current;
    if (!container) return;

    const nextTop = container.scrollTop;
    setScrollTop(nextTop);

    if (nextTop < LOAD_THRESHOLD_PX) {
      appendMoreLevels();
    }
  };

  const isBubbleClickable = (level: number) => {
    if (level === 1) return true;
    return level <= maxEnabledSagaNumber;
  };

  const handleBubbleClick = async (level: number) => {
    if (!isBubbleClickable(level)) return;
    setSelectedSagaLevel(level);

    if (creatingSagaLevel !== null) return;
    setCreatingSagaLevel(level);

    const userToken =
      typeof window !== "undefined" ? localStorage.getItem("token") || "" : "";
    if (!userToken) {
      setCreatingSagaLevel(null);
      return;
    }

    try {
      const response = await fetch(`${BASE_URL}/api/saga/levels/${level}/bootstrap`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${userToken}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed with status ${response.status}`);
      }

      await response.json();
      navigate(`/saga-level/${level}`, {
        state: {
          fromSagaMap: true,
          transitionStartedAt: Date.now(),
        },
      });
    } catch (error) {
      console.error("Failed to bootstrap saga level:", error);
    } finally {
      setCreatingSagaLevel(null);
    }
  };

  useEffect(() => {
    const updateViewport = () => {
      const container = scrollRef.current;
      if (!container) return;
      setViewport({
        width: container.clientWidth,
        height: container.clientHeight,
      });
    };

    updateViewport();
    window.addEventListener("resize", updateViewport);
    return () => {
      window.removeEventListener("resize", updateViewport);
    };
  }, [loading, user?._id]);

  useLayoutEffect(() => {
    if (loading || !user || isProgressLoading) {
      return;
    }

    if (maxLevel < nextPlayableSagaLevel + 1) {
      setMaxLevel((previous) => Math.max(previous, nextPlayableSagaLevel + LOAD_BATCH));
      return;
    }

    if (centeredPlayableLevelRef.current === nextPlayableSagaLevel) {
      setIsInitialMapReady(true);
      return;
    }

    const container = scrollRef.current;
    if (!container) {
      return;
    }

    const { y } = getBubbleCenter(nextPlayableSagaLevel);
    const desiredTop = y - container.clientHeight / 2;
    const maxTop = Math.max(0, container.scrollHeight - container.clientHeight);
    const clampedTop = Math.max(0, Math.min(desiredTop, maxTop));

    // Set scroll position before paint to avoid entry "jump" on saga map load.
    container.scrollTop = clampedTop;
    setScrollTop(clampedTop);
    centeredPlayableLevelRef.current = nextPlayableSagaLevel;
    setIsInitialMapReady(true);
  }, [
    loading,
    user?._id,
    isProgressLoading,
    maxLevel,
    nextPlayableSagaLevel,
    viewport.height,
  ]);

  useEffect(() => {
    if (loading || !user) return;

    let isMounted = true;
    const userToken =
      typeof window !== "undefined" ? localStorage.getItem("token") || "" : "";

    if (!userToken) {
      if (isMounted) {
        setPlayerSagaNumber(0);
        setIsProgressLoading(false);
      }
      return;
    }

    const fetchProgress = async () => {
      setIsInitialMapReady(false);
      centeredPlayableLevelRef.current = null;
      setIsProgressLoading(true);
      try {
        const response = await fetch(`${BASE_URL}/api/saga/progression`, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${userToken}`,
          },
        });

        if (!response.ok) {
          throw new Error(`Failed with status ${response.status}`);
        }

        const data = await response.json();
        if (!isMounted) return;
        const resolvedSagaNumber = Math.max(0, Number(data?.sagaNumber) || 0);
        setPlayerSagaNumber(resolvedSagaNumber);
        setMaxLevel((previous) =>
          Math.max(previous, Math.max(40, resolvedSagaNumber + LOAD_BATCH)),
        );
      } catch (error) {
        console.error("Failed to fetch saga progression:", error);
        if (!isMounted) return;
        setPlayerSagaNumber(0);
      } finally {
        if (isMounted) {
          setIsProgressLoading(false);
        }
      }
    };

    fetchProgress();

    return () => {
      isMounted = false;
    };
  }, [loading, user?._id]);

  useEffect(() => {
    if (isProgressLoading || !shouldAnimateUnlockOnEntry || hasConsumedUnlockAnimationRef.current) {
      return;
    }

    const resolvedRequestedLevel =
      requestedUnlockedLevel > 0 ? requestedUnlockedLevel : nextPlayableSagaLevel;
    const animationLevel =
      resolvedRequestedLevel === nextPlayableSagaLevel
        ? resolvedRequestedLevel
        : nextPlayableSagaLevel;

    if (animationLevel < 1) {
      return;
    }

    hasConsumedUnlockAnimationRef.current = true;
    setUnlockAnimatingLevel(animationLevel);
  }, [
    isProgressLoading,
    shouldAnimateUnlockOnEntry,
    requestedUnlockedLevel,
    nextPlayableSagaLevel,
  ]);

  if (loading) {
    return (
      <div className="min-h-[100dvh] grid place-items-center bg-[#0b1325] text-slate-200">
        Loading Saga Map...
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-[100dvh] grid place-items-center bg-[#0b1325] text-slate-200">
        Restoring your session...
      </div>
    );
  }

  return (
    <div className="relative h-[calc(100dvh-5rem-env(safe-area-inset-bottom))] min-h-[calc(100dvh-5rem-env(safe-area-inset-bottom))] lg:h-[100dvh] lg:min-h-[100dvh] flex flex-col overflow-hidden bg-[#6d93cd]">
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <div className="absolute inset-0 saga-map-scroll-bg-base" />
        <div className="absolute inset-0 saga-map-scroll-bg-bloom" />
        <div className="absolute inset-0 saga-map-scroll-bg-haze" />
        <div className="absolute inset-0 saga-map-scroll-bg-dust-soft" />
        <div className="absolute inset-0 saga-map-scroll-bg-dust-sharp" />
        <div className="absolute inset-0 saga-map-scroll-bg-stars saga-map-scroll-bg-stars-a" />
        <div className="absolute inset-0 saga-map-scroll-bg-stars saga-map-scroll-bg-stars-b" />
        <div className="absolute inset-0 saga-map-scroll-bg-ambient-stars">
          {Array.from({ length: screenStarTileCount }, (_, tileIndex) => (
            <div
              key={`screen-ambient-star-tile-${tileIndex}`}
              className="absolute inset-x-0 saga-map-scroll-bg-ambient-stars-tile"
              style={{ top: tileIndex * STAR_TILE_HEIGHT, height: STAR_TILE_HEIGHT }}
            >
              {SAGA_MAP_AMBIENT_STARS.map((star) => (
                <span
                  key={`screen-ambient-star-${tileIndex}-${star.id}`}
                  className="saga-map-scroll-bg-ambient-star"
                  style={getSagaMapAmbientStarStyle(star, tileIndex)}
                />
              ))}
            </div>
          ))}
        </div>
      </div>

      <div className="relative z-20 pt-[max(0.25rem,env(safe-area-inset-top))] px-1">
        <GameStatsHeader
          userToken={userToken}
          isParentLoading={false}
          currentCoinsFromParent={currentCoins}
          userXP={user.knowledgePoints ?? 0}
          userGem1={user.wisdomGems ?? 0}
          userGem2={user.enlightenmentCrystals ?? 0}
          compactMode={isCompactEconomyResolution}
          centerImageSrc={userAvatarImage}
          centerSubLabel={user.alias || ""}
          centerBadgeValue={user.level ?? 1}
          onCenterClick={openEditDialog}
          centerAriaLabel="Edit avatar and alias"
        />
      </div>

      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="saga-scroll relative isolate z-10 flex-1 min-h-0 overflow-y-auto overscroll-y-contain px-3 pb-[calc(60px+env(safe-area-inset-bottom))] lg:pb-4"
      >
        <div
          className="relative z-10 mx-auto"
          style={{
            width: mapWidth,
            height: contentHeight,
            visibility: isInitialMapReady ? "visible" : "hidden",
          }}
        >
          <svg className="absolute inset-0 h-full w-full pointer-events-none" viewBox={`0 0 ${mapWidth} ${contentHeight}`} preserveAspectRatio="none">
            {visibleSegments.map((segment) => (
              <g key={`path-${segment.level}`}>
                <path
                  d={segment.path}
                  fill="none"
                  stroke="rgba(56, 189, 248, 0.24)"
                  strokeWidth={segment.glowWidth}
                  strokeLinejoin="round"
                  strokeLinecap="round"
                />
                <path
                  d={segment.path}
                  fill="none"
                  stroke="rgba(96, 165, 250, 0.92)"
                  strokeWidth={segment.roadWidth}
                  strokeLinejoin="round"
                  strokeLinecap="round"
                />
                <path
                  d={segment.path}
                  fill="none"
                  stroke="rgba(224, 242, 254, 0.9)"
                  strokeWidth={segment.centerLineWidth}
                  strokeLinejoin="round"
                  strokeLinecap="round"
                  strokeDasharray={segment.centerDashArray}
                />
              </g>
            ))}
          </svg>

          {visibleBubbles.map((bubble) => (
            (() => {
              const isNextPlayable = bubble.level === nextPlayableSagaLevel;
              const isUnlockAnimating = bubble.level === unlockAnimatingLevel;
              const renderedBubbleSize = isNextPlayable ? highlightedBubbleSize : bubbleSize;

              return (
                <button
                  key={`bubble-${bubble.level}`}
                  type="button"
                  onClick={() => handleBubbleClick(bubble.level)}
                  onAnimationEnd={() => {
                    if (isUnlockAnimating) {
                      setUnlockAnimatingLevel(null);
                    }
                  }}
                  disabled={!isBubbleClickable(bubble.level) || creatingSagaLevel !== null}
                  className={`absolute rounded-full border-4 font-black flex items-center justify-center transition-transform ${
                    isBubbleClickable(bubble.level)
                      ? `border-cyan-300/85 text-slate-100 shadow-[0_0_22px_rgba(34,211,238,0.45)] cursor-pointer ${isUnlockAnimating ? "" : "hover:scale-105"}`
                      : "border-slate-500/70 text-slate-300/75 shadow-[0_0_10px_rgba(100,116,139,0.3)] cursor-default opacity-70"
                  } ${
                    selectedSagaLevel === bubble.level
                      ? "ring-4 ring-cyan-200/75 ring-offset-2 ring-offset-[#080f1d]"
                      : ""
                  } ${
                    isNextPlayable
                      ? isUnlockAnimating
                        ? "z-40 saga-unlock-entry-bubble"
                        : "z-40 saga-next-playable-bubble"
                      : "z-20"
                  }`}
                  style={{
                    width: renderedBubbleSize,
                    height: renderedBubbleSize,
                    left: bubble.x - renderedBubbleSize / 2,
                    top: bubble.y - renderedBubbleSize / 2,
                    background: isUnlockAnimating
                      ? "radial-gradient(circle at 30% 22%, rgba(255,255,255,0.75) 0%, rgba(56,189,248,0.88) 30%, rgba(14,116,144,0.95) 100%)"
                      : isNextPlayable
                      ? "radial-gradient(circle at 28% 20%, rgba(255,255,255,0.95) 0%, rgba(250,204,21,0.96) 24%, rgba(234,179,8,0.95) 54%, rgba(14,116,144,0.98) 100%)"
                      : isBubbleClickable(bubble.level)
                        ? "radial-gradient(circle at 30% 22%, rgba(255,255,255,0.75) 0%, rgba(56,189,248,0.88) 30%, rgba(14,116,144,0.95) 100%)"
                        : "radial-gradient(circle at 30% 22%, rgba(226,232,240,0.65) 0%, rgba(100,116,139,0.8) 36%, rgba(51,65,85,0.95) 100%)",
                    borderColor: isUnlockAnimating
                      ? "rgba(103, 232, 249, 0.95)"
                      : isNextPlayable
                        ? "rgba(253, 224, 71, 0.95)"
                        : undefined,
                    boxShadow: isUnlockAnimating
                      ? "0 0 18px rgba(34, 211, 238, 0.5), 0 0 34px rgba(14, 165, 233, 0.36)"
                      : isNextPlayable
                      ? "0 0 24px rgba(250, 204, 21, 0.75), 0 0 44px rgba(6, 182, 212, 0.55)"
                      : undefined,
                  }}
                >
                  <span
                    className="drop-shadow-[0_1px_2px_rgba(0,0,0,0.7)]"
                    style={{
                      fontSize: isNextPlayable ? "1.5rem" : undefined,
                      color: isNextPlayable && !isUnlockAnimating ? "rgba(255, 251, 235, 0.98)" : undefined,
                      textShadow: isNextPlayable && !isUnlockAnimating
                        ? "0 0 8px rgba(255,255,255,0.7), 0 0 16px rgba(251,191,36,0.6)"
                        : undefined,
                    }}
                  >
                    {bubble.level}
                  </span>
                </button>
              );
            })()
          ))}
        </div>

        {(isGeneratingMore || isProgressLoading || creatingSagaLevel !== null) && (
          <div className="sticky top-2 flex justify-center pointer-events-none">
            <div className="px-3 py-1.5 rounded-full bg-cyan-900/80 border border-cyan-400/40 text-[11px] sm:text-xs text-cyan-100 backdrop-blur-sm">
              {creatingSagaLevel !== null
                ? `Loading saga level ${creatingSagaLevel}...`
                : isProgressLoading
                ? "Loading saga progression..."
                : "Generating next saga bubbles..."}
            </div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes sagaNextPlayablePulse {
          0%, 100% {
            box-shadow:
              0 0 20px rgba(250, 204, 21, 0.65),
              0 0 36px rgba(6, 182, 212, 0.45);
            filter: saturate(1) brightness(1);
          }
          50% {
            box-shadow:
              0 0 34px rgba(250, 204, 21, 0.92),
              0 0 58px rgba(6, 182, 212, 0.72);
            filter: saturate(1.25) brightness(1.08);
          }
        }

        .saga-next-playable-bubble {
          animation: sagaNextPlayablePulse 1.5s ease-in-out infinite;
        }

        @keyframes sagaUnlockBubbleEntry {
          0% {
            transform: scale(0.6667);
            background: radial-gradient(circle at 30% 22%, rgba(255,255,255,0.75) 0%, rgba(56,189,248,0.88) 30%, rgba(14,116,144,0.95) 100%);
            border-color: rgba(103, 232, 249, 0.95);
            box-shadow:
              0 0 18px rgba(34, 211, 238, 0.5),
              0 0 34px rgba(14, 165, 233, 0.36);
            filter: saturate(0.95) brightness(1);
          }
          60% {
            transform: scale(1.07);
            background: radial-gradient(circle at 28% 20%, rgba(255,255,255,0.94) 0%, rgba(125,211,252,0.94) 24%, rgba(56,189,248,0.92) 54%, rgba(14,116,144,0.98) 100%);
            border-color: rgba(186, 230, 253, 0.95);
            box-shadow:
              0 0 26px rgba(56, 189, 248, 0.62),
              0 0 42px rgba(6, 182, 212, 0.46);
            filter: saturate(1.08) brightness(1.04);
          }
          100% {
            transform: scale(1);
            background: radial-gradient(circle at 28% 20%, rgba(255,255,255,0.95) 0%, rgba(250,204,21,0.96) 24%, rgba(234,179,8,0.95) 54%, rgba(14,116,144,0.98) 100%);
            border-color: rgba(253, 224, 71, 0.95);
            box-shadow:
              0 0 24px rgba(250, 204, 21, 0.75),
              0 0 44px rgba(6, 182, 212, 0.55);
            filter: saturate(1.2) brightness(1.06);
          }
        }

        .saga-unlock-entry-bubble {
          animation: sagaUnlockBubbleEntry 900ms cubic-bezier(0.2, 0.92, 0.28, 1.05) forwards;
          will-change: transform, background, border-color, box-shadow, filter;
        }

        .saga-scroll {
          scrollbar-width: none;
          -ms-overflow-style: none;
        }

        .saga-scroll::-webkit-scrollbar {
          width: 0;
          height: 0;
          display: none;
        }

        .saga-map-scroll-bg-base {
          background:
            linear-gradient(
              180deg,
              #729ad4 0%,
              #91b2e4 50%,
              #729ad4 100%
            );
          background-size: 100% 960px;
          background-repeat: repeat-y;
          background-position: center top;
        }

        .saga-map-scroll-bg-dust-soft {
          background:
            radial-gradient(56% 34% at 50% 50%, rgba(177, 214, 252, 0.28) 0%, rgba(177, 214, 252, 0.12) 30%, rgba(177, 214, 252, 0) 72%),
            repeating-radial-gradient(circle at 51% 50%, rgba(255, 247, 236, 0.34) 0 1.1px, rgba(255, 247, 236, 0) 1.2px 12px),
            repeating-radial-gradient(circle at 40% 50%, rgba(193, 250, 255, 0.34) 0 1px, rgba(193, 250, 255, 0) 1.1px 11px),
            repeating-radial-gradient(circle at 66% 50%, rgba(255, 216, 230, 0.3) 0 1.1px, rgba(255, 216, 230, 0) 1.2px 13px);
          background-size: 100% 960px, 460px 460px, 380px 380px, 440px 440px;
          background-repeat: repeat-y, repeat, repeat, repeat;
          background-position: center top, 0 0, 100px 120px, -120px 220px;
          filter: blur(1px);
          opacity: 0.66;
          mask-image: linear-gradient(180deg, rgba(0, 0, 0, 0.08) 0%, rgba(0, 0, 0, 0.62) 24%, #000 50%, rgba(0, 0, 0, 0.62) 76%, rgba(0, 0, 0, 0.08) 100%);
        }

        @keyframes sagaMapTwinkle {
          0%, 100% {
            opacity: 0.58;
          }
          50% {
            opacity: 0.9;
          }
        }

        @keyframes sagaMapStarPulseA {
          0%, 100% {
            opacity: var(--star-min-opacity);
            transform: scale(var(--star-min-scale));
            filter: drop-shadow(0 0 0 rgba(174, 126, 255, 0));
          }
          50% {
            opacity: var(--star-max-opacity);
            transform: scale(var(--star-max-scale));
            filter: drop-shadow(0 0 5px rgba(174, 126, 255, 0.5));
          }
        }

        @keyframes sagaMapStarPulseB {
          0%, 100% {
            opacity: var(--star-min-opacity);
            transform: scale(var(--star-min-scale)) translateY(0);
            filter: drop-shadow(0 0 0 rgba(143, 179, 255, 0));
          }
          42% {
            opacity: var(--star-max-opacity);
            transform: scale(var(--star-max-scale)) translateY(-0.35px);
            filter: drop-shadow(0 0 6px rgba(143, 179, 255, 0.52));
          }
          78% {
            opacity: calc(var(--star-min-opacity) + (var(--star-max-opacity) - var(--star-min-opacity)) * 0.62);
            transform: scale(calc(var(--star-min-scale) + (var(--star-max-scale) - var(--star-min-scale)) * 0.62)) translateY(0.2px);
            filter: drop-shadow(0 0 3px rgba(183, 145, 255, 0.34));
          }
        }

        @keyframes sagaMapStarPulseC {
          0%, 100% {
            opacity: var(--star-min-opacity);
            transform: scale(var(--star-min-scale));
            filter: drop-shadow(0 0 0 rgba(198, 166, 255, 0));
          }
          35% {
            opacity: calc(var(--star-min-opacity) + (var(--star-max-opacity) - var(--star-min-opacity)) * 0.78);
            transform: scale(calc(var(--star-min-scale) + (var(--star-max-scale) - var(--star-min-scale)) * 0.78));
            filter: drop-shadow(0 0 4px rgba(198, 166, 255, 0.38));
          }
          68% {
            opacity: var(--star-max-opacity);
            transform: scale(var(--star-max-scale));
            filter: drop-shadow(0 0 6px rgba(154, 125, 255, 0.46));
          }
        }

        .saga-map-scroll-bg-ambient-stars {
          mix-blend-mode: screen;
          opacity: 0.94;
        }

        .saga-map-scroll-bg-ambient-stars-tile {
          position: absolute;
          left: 0;
          right: 0;
        }

        .saga-map-scroll-bg-ambient-star {
          position: absolute;
          border-radius: 999px;
          will-change: transform, opacity, filter;
          animation-timing-function: ease-in-out;
          animation-iteration-count: infinite;
        }

        .saga-map-scroll-bg-bloom {
          background:
            radial-gradient(
              140% 90% at 50% 50%,
              rgba(190, 220, 252, 0.72) 0%,
              rgba(173, 206, 245, 0.58) 24%,
              rgba(145, 182, 232, 0.34) 54%,
              rgba(120, 160, 214, 0.1) 78%,
              rgba(106, 145, 200, 0) 100%
            );
          background-size: 100% 960px;
          background-repeat: repeat-y;
          background-position: center top;
        }

        .saga-map-scroll-bg-haze {
          background:
            radial-gradient(68% 44% at 50% 50%, rgba(177, 215, 255, 0.2) 0%, rgba(154, 193, 238, 0.1) 44%, rgba(129, 168, 229, 0) 100%),
            radial-gradient(42% 34% at 22% 50%, rgba(160, 207, 245, 0.2) 0%, rgba(160, 207, 245, 0) 100%),
            radial-gradient(38% 32% at 82% 50%, rgba(166, 202, 240, 0.18) 0%, rgba(166, 202, 240, 0) 100%);
          background-size: 100% 960px, 100% 960px, 100% 960px;
          background-repeat: repeat-y, repeat-y, repeat-y;
          background-position: center top, center top, center top;
          filter: blur(6px);
          opacity: 0.78;
        }

        .saga-map-scroll-bg-dust-sharp {
          background:
            radial-gradient(circle at 18% 62%, rgba(255, 250, 245, 0.96) 0 2px, rgba(255, 250, 245, 0) 4px),
            radial-gradient(circle at 24% 66%, rgba(201, 250, 255, 0.9) 0 1.6px, rgba(201, 250, 255, 0) 3px),
            radial-gradient(circle at 31% 69%, rgba(255, 236, 224, 0.92) 0 1.8px, rgba(255, 236, 224, 0) 3px),
            radial-gradient(circle at 39% 64%, rgba(224, 242, 255, 0.9) 0 1.5px, rgba(224, 242, 255, 0) 3px),
            radial-gradient(circle at 47% 67%, rgba(255, 220, 233, 0.94) 0 1.7px, rgba(255, 220, 233, 0) 3px),
            radial-gradient(circle at 55% 63%, rgba(255, 247, 230, 0.96) 0 1.8px, rgba(255, 247, 230, 0) 3px),
            radial-gradient(circle at 64% 70%, rgba(205, 242, 255, 0.88) 0 1.5px, rgba(205, 242, 255, 0) 3px),
            radial-gradient(circle at 74% 66%, rgba(255, 236, 248, 0.9) 0 1.7px, rgba(255, 236, 248, 0) 3px),
            radial-gradient(circle at 82% 63%, rgba(253, 247, 235, 0.94) 0 1.9px, rgba(253, 247, 235, 0) 3px),
            radial-gradient(circle at 50% 75%, rgba(255, 249, 242, 0.75) 0 3px, rgba(255, 249, 242, 0) 11px);
          background-size: 100% 760px;
          background-repeat: repeat-y;
          background-position: center top;
          opacity: 0.65;
          filter: blur(0.25px);
          mask-image: linear-gradient(180deg, rgba(0, 0, 0, 0.06) 0%, rgba(0, 0, 0, 0.55) 24%, rgba(0, 0, 0, 0.94) 50%, rgba(0, 0, 0, 0.55) 76%, rgba(0, 0, 0, 0.06) 100%);
        }

        .saga-map-scroll-bg-stars {
          mask-image: linear-gradient(180deg, rgba(0, 0, 0, 0.08) 0%, rgba(0, 0, 0, 0.52) 24%, rgba(0, 0, 0, 0.92) 50%, rgba(0, 0, 0, 0.52) 76%, rgba(0, 0, 0, 0.08) 100%);
          animation: sagaMapTwinkle 4.6s ease-in-out infinite;
          will-change: opacity;
        }

        .saga-map-scroll-bg-stars-a {
          background-image:
            radial-gradient(circle at 8% 69%, rgba(255, 255, 255, 0.94) 0 1.2px, transparent 2px),
            radial-gradient(circle at 12% 73%, rgba(255, 239, 223, 0.88) 0 1px, transparent 2px),
            radial-gradient(circle at 17% 78%, rgba(187, 243, 255, 0.82) 0 1px, transparent 2px),
            radial-gradient(circle at 25% 71%, rgba(255, 228, 238, 0.86) 0 1px, transparent 2px),
            radial-gradient(circle at 30% 83%, rgba(255, 248, 231, 0.86) 0 1.15px, transparent 2px),
            radial-gradient(circle at 37% 76%, rgba(218, 244, 255, 0.86) 0 1px, transparent 2px),
            radial-gradient(circle at 44% 81%, rgba(255, 235, 246, 0.84) 0 1.05px, transparent 2px),
            radial-gradient(circle at 51% 72%, rgba(255, 249, 236, 0.9) 0 1.15px, transparent 2px),
            radial-gradient(circle at 57% 86%, rgba(192, 247, 255, 0.84) 0 1px, transparent 2px),
            radial-gradient(circle at 64% 79%, rgba(255, 231, 243, 0.88) 0 1px, transparent 2px),
            radial-gradient(circle at 71% 69%, rgba(254, 249, 233, 0.9) 0 1.2px, transparent 2px),
            radial-gradient(circle at 78% 82%, rgba(194, 243, 255, 0.84) 0 1px, transparent 2px),
            radial-gradient(circle at 85% 74%, rgba(255, 236, 246, 0.84) 0 1px, transparent 2px),
            radial-gradient(circle at 92% 68%, rgba(255, 250, 237, 0.88) 0 1.1px, transparent 2px),
            radial-gradient(circle at 20% 88%, rgba(255, 255, 255, 0.86) 0 1.3px, transparent 2px),
            radial-gradient(circle at 48% 90%, rgba(255, 246, 224, 0.86) 0 1.2px, transparent 2px),
            radial-gradient(circle at 74% 89%, rgba(205, 245, 255, 0.84) 0 1.1px, transparent 2px);
          background-size: 100% 760px;
          background-repeat: repeat-y;
          background-position: center top;
        }

        .saga-map-scroll-bg-stars-b {
          background-image:
            radial-gradient(circle at 14% 64%, rgba(255, 248, 229, 0.72) 0 0.9px, transparent 1.8px),
            radial-gradient(circle at 22% 68%, rgba(192, 244, 255, 0.7) 0 0.85px, transparent 1.8px),
            radial-gradient(circle at 28% 73%, rgba(255, 225, 238, 0.66) 0 0.8px, transparent 1.8px),
            radial-gradient(circle at 35% 67%, rgba(255, 255, 255, 0.72) 0 0.95px, transparent 1.8px),
            radial-gradient(circle at 41% 74%, rgba(255, 238, 221, 0.7) 0 0.85px, transparent 1.8px),
            radial-gradient(circle at 48% 69%, rgba(196, 243, 255, 0.68) 0 0.8px, transparent 1.8px),
            radial-gradient(circle at 55% 74%, rgba(255, 227, 241, 0.66) 0 0.8px, transparent 1.8px),
            radial-gradient(circle at 63% 68%, rgba(255, 251, 236, 0.72) 0 0.85px, transparent 1.8px),
            radial-gradient(circle at 70% 76%, rgba(198, 245, 255, 0.68) 0 0.8px, transparent 1.8px),
            radial-gradient(circle at 78% 71%, rgba(255, 227, 240, 0.68) 0 0.8px, transparent 1.8px),
            radial-gradient(circle at 86% 76%, rgba(255, 250, 236, 0.72) 0 0.85px, transparent 1.8px),
            radial-gradient(circle at 90% 82%, rgba(206, 245, 255, 0.7) 0 0.85px, transparent 1.8px);
          background-size: 100% 920px;
          background-repeat: repeat-y;
          background-position: center 160px;
          animation-delay: 1.2s;
        }
      `}</style>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-md bg-card/95 backdrop-blur-sm border-border/70">
          <DialogHeader>
            <DialogTitle>Edit Avatar and Alias</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Select Avatar</Label>
              <div className="grid grid-cols-5 gap-2 p-2 border border-border rounded-lg bg-card/60">
                {avatarUrls.map((avatarImg, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => setEditAvatarIndex(index)}
                    className={`rounded-full border-2 transition-all ${
                      editAvatarIndex === index
                        ? "border-primary ring-2 ring-primary/40 scale-105"
                        : "border-transparent hover:border-primary/50"
                    }`}
                    aria-label={`Select avatar ${index + 1}`}
                  >
                    <Avatar className="w-12 h-12">
                      <AvatarImage src={avatarImg} alt={`Avatar ${index + 1}`} />
                      <AvatarFallback>AV</AvatarFallback>
                    </Avatar>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="alias-edit-saga-map">Alias</Label>
              <Input
                id="alias-edit-saga-map"
                value={editAlias}
                onChange={(event) => setEditAlias(event.target.value)}
                placeholder="Enter alias"
                maxLength={30}
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsEditDialogOpen(false)}
                disabled={isSavingProfile}
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleSaveAliasAvatar}
                disabled={isSavingProfile}
              >
                {isSavingProfile ? "Saving..." : "OK"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
