import { useEffect, useRef, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
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
const BASE_URL = getApiBaseUrl();

type BubblePoint = {
  level: number;
  x: number;
  y: number;
};

type PathSegment = {
  level: number;
  path: string;
};

export default function SagaMap() {
  const { user, loading, refreshUser, updateUserLocally, markUserStale } = useUser();
  const navigate = useNavigate();
  const { toast } = useToast();
  const scrollRef = useRef<HTMLDivElement>(null);
  const isAppendingRef = useRef(false);
  const centeredPlayableLevelRef = useRef<number | null>(null);

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
  for (let level = segmentStart; level <= segmentEnd; level += 1) {
    const start = getBubbleCenter(level);
    const end = getBubbleCenter(level + 1);

    const controlShift = level % 2 === 0 ? 56 : -56;
    const controlX = (start.x + end.x) / 2 + controlShift;
    const controlY = (start.y + end.y) / 2;
    visibleSegments.push({
      level,
      path: `M ${start.x} ${start.y} Q ${controlX} ${controlY} ${end.x} ${end.y}`,
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

  const centerLevelInViewport = (level: number, behavior: ScrollBehavior = "auto") => {
    const container = scrollRef.current;
    if (!container) return null;

    const { y } = getBubbleCenter(level);
    const desiredTop = y - container.clientHeight / 2;
    const maxTop = Math.max(0, container.scrollHeight - container.clientHeight);
    const clampedTop = Math.max(0, Math.min(desiredTop, maxTop));
    container.scrollTo({
      top: clampedTop,
      behavior,
    });
    const currentTop = container.scrollTop;
    setScrollTop(currentTop);
    return {
      targetTop: clampedTop,
      currentTop,
      achieved: Math.abs(currentTop - clampedTop) <= 2,
    };
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

  useEffect(() => {
    if (loading || !user || user.userType !== "Admin" || isProgressLoading) {
      return;
    }

    if (maxLevel < nextPlayableSagaLevel + 1) {
      setMaxLevel((previous) => Math.max(previous, nextPlayableSagaLevel + LOAD_BATCH));
      return;
    }

    if (centeredPlayableLevelRef.current === nextPlayableSagaLevel) {
      return;
    }

    let cancelled = false;
    let attempts = 0;
    let kickoffTimer: number | null = null;
    let rafId: number | null = null;

    const maxAttempts = 12;
    const tryCenter = () => {
      if (cancelled) return;

      const result = centerLevelInViewport(nextPlayableSagaLevel, "auto");
      if (!result) {
        attempts += 1;
        if (attempts <= maxAttempts) {
          rafId = window.requestAnimationFrame(tryCenter);
        }
        return;
      }

      if (result.achieved || attempts >= maxAttempts) {
        centeredPlayableLevelRef.current = nextPlayableSagaLevel;
        return;
      }

      attempts += 1;
      rafId = window.requestAnimationFrame(tryCenter);
    };

    kickoffTimer = window.setTimeout(() => {
      tryCenter();
    }, 70);

    return () => {
      cancelled = true;
      if (kickoffTimer !== null) {
        window.clearTimeout(kickoffTimer);
      }
      if (rafId !== null) {
        window.cancelAnimationFrame(rafId);
      }
    };
  }, [
    loading,
    user?._id,
    user?.userType,
    isProgressLoading,
    maxLevel,
    nextPlayableSagaLevel,
    viewport.height,
  ]);

  useEffect(() => {
    if (loading || !user || user.userType !== "Admin") return;

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
  }, [loading, user?._id, user?.userType]);

  if (loading) {
    return (
      <div className="min-h-[100dvh] grid place-items-center bg-[#0b1325] text-slate-200">
        Loading Saga Map...
      </div>
    );
  }

  if (!user || user.userType !== "Admin") {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="relative h-[calc(100dvh-5rem-env(safe-area-inset-bottom))] min-h-[calc(100dvh-5rem-env(safe-area-inset-bottom))] lg:h-[100dvh] lg:min-h-[100dvh] flex flex-col overflow-hidden bg-[#080f1d]">
      <div className="pointer-events-none absolute inset-0 opacity-80" style={{
        background:
          "radial-gradient(circle at 15% 15%, rgba(56,189,248,0.24) 0%, rgba(56,189,248,0) 35%), radial-gradient(circle at 85% 20%, rgba(34,197,94,0.16) 0%, rgba(34,197,94,0) 30%), linear-gradient(180deg, #091226 0%, #070d1b 45%, #050a15 100%)",
      }} />

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
        className="saga-scroll relative z-10 flex-1 min-h-0 overflow-y-auto overscroll-y-contain px-3 pb-[calc(60px+env(safe-area-inset-bottom))] lg:pb-4"
      >
        <div className="relative mx-auto" style={{ width: mapWidth, height: contentHeight }}>
          <svg className="absolute inset-0 h-full w-full pointer-events-none" viewBox={`0 0 ${mapWidth} ${contentHeight}`} preserveAspectRatio="none">
            {visibleSegments.map((segment) => (
              <g key={`path-${segment.level}`}>
                <path
                  d={segment.path}
                  fill="none"
                  stroke="rgba(103, 232, 249, 0.22)"
                  strokeWidth={14}
                  strokeLinecap="round"
                />
                <path
                  d={segment.path}
                  fill="none"
                  stroke="rgba(186, 230, 253, 0.78)"
                  strokeWidth={6}
                  strokeLinecap="round"
                  strokeDasharray="6 9"
                />
              </g>
            ))}
          </svg>

          {visibleBubbles.map((bubble) => (
            (() => {
              const isNextPlayable = bubble.level === nextPlayableSagaLevel;
              const renderedBubbleSize = isNextPlayable ? highlightedBubbleSize : bubbleSize;

              return (
                <button
                  key={`bubble-${bubble.level}`}
                  type="button"
                  onClick={() => handleBubbleClick(bubble.level)}
                  disabled={!isBubbleClickable(bubble.level) || creatingSagaLevel !== null}
                  className={`absolute rounded-full border-4 font-black flex items-center justify-center transition-transform ${
                    isBubbleClickable(bubble.level)
                      ? "border-cyan-300/85 text-slate-100 shadow-[0_0_22px_rgba(34,211,238,0.45)] cursor-pointer hover:scale-105"
                      : "border-slate-500/70 text-slate-300/75 shadow-[0_0_10px_rgba(100,116,139,0.3)] cursor-default opacity-70"
                  } ${
                    selectedSagaLevel === bubble.level
                      ? "ring-4 ring-cyan-200/75 ring-offset-2 ring-offset-[#080f1d]"
                      : ""
                  } ${
                    isNextPlayable ? "z-40 saga-next-playable-bubble" : "z-20"
                  }`}
                  style={{
                    width: renderedBubbleSize,
                    height: renderedBubbleSize,
                    left: bubble.x - renderedBubbleSize / 2,
                    top: bubble.y - renderedBubbleSize / 2,
                    background: isNextPlayable
                      ? "radial-gradient(circle at 28% 20%, rgba(255,255,255,0.95) 0%, rgba(250,204,21,0.96) 24%, rgba(234,179,8,0.95) 54%, rgba(14,116,144,0.98) 100%)"
                      : isBubbleClickable(bubble.level)
                        ? "radial-gradient(circle at 30% 22%, rgba(255,255,255,0.75) 0%, rgba(56,189,248,0.88) 30%, rgba(14,116,144,0.95) 100%)"
                        : "radial-gradient(circle at 30% 22%, rgba(226,232,240,0.65) 0%, rgba(100,116,139,0.8) 36%, rgba(51,65,85,0.95) 100%)",
                    borderColor: isNextPlayable ? "rgba(253, 224, 71, 0.95)" : undefined,
                    boxShadow: isNextPlayable
                      ? "0 0 24px rgba(250, 204, 21, 0.75), 0 0 44px rgba(6, 182, 212, 0.55)"
                      : undefined,
                  }}
                >
                  <span
                    className="drop-shadow-[0_1px_2px_rgba(0,0,0,0.7)]"
                    style={{
                      fontSize: isNextPlayable ? "1.5rem" : undefined,
                      color: isNextPlayable ? "rgba(255, 251, 235, 0.98)" : undefined,
                      textShadow: isNextPlayable
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

        .saga-scroll {
          scrollbar-width: none;
          -ms-overflow-style: none;
        }

        .saga-scroll::-webkit-scrollbar {
          width: 0;
          height: 0;
          display: none;
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
