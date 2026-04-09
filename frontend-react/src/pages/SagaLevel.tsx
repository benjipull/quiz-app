import { useEffect, useRef, useState } from "react";
import { Navigate, useLocation, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Brain, CircleDollarSign, Star } from "lucide-react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import { useUser } from "@/contexts/UserContext";
import { getApiBaseUrl } from "@/utils/baseUrl";
import { useToast } from "@/hooks/use-toast";
import { trackEnteredSagaLevelMap } from "@/utils/analytics";
import GameStatsHeader from "@/components/GameStatsHeader";
import { avatarUrls } from "@/utils/avatarPaths";

const BASE_URL = getApiBaseUrl();
const QUIZ_COST = 100;
const STAR_COUNT = 5;
const QUIZ_COMPLETION_SIGNAL_MAX_AGE_MS = 2 * 60 * 1000;
const QUIZ_COMPLETION_SCROLL_TO_COMPLETED_DELAY_MS = 120;
const QUIZ_COMPLETION_SCROLL_SETTLE_BEFORE_STARS_MS = 820;
const QUIZ_COMPLETION_STARS_SEQUENCE_MS = 3400;
const QUIZ_COMPLETION_PANEL_REVEAL_ANIMATION_MS = 980;
const DEFAULT_CATEGORY_IMAGE_SRC = "/assets/images/SagaLevelGraphics/Enchanted-Forest.png";

type SagaLevelRow = {
  _id: string;
  sagaNumber: number;
  isCompleted?: boolean;
  completionRating?: number;
  category: {
    _id: string;
    name: string;
    image64: string;
    disabled?: boolean;
  } | null;
};

type Point = { x: number; y: number };
type SagaPathDot = {
  x: number;
  y: number;
  radius: number;
  duration: number;
  delay: number;
  opacity: number;
};
type SagaPathSegment = {
  id: string;
  d: string;
  dots: SagaPathDot[];
  strokeColor: string;
  dotColor: string;
  dotAnimationName: string;
};
type CubicArcSample = {
  t: number;
  length: number;
  point: Point;
};

type SagaLevelLocationState = {
  fromSagaMap?: boolean;
  transitionStartedAt?: number;
  bootstrapRows?: SagaLevelRow[];
  fromQuizCompletion?: boolean;
  completedSagaLevelId?: string | null;
  completedCategoryId?: string | null;
  completedStarCount?: number | null;
  completedKnowledgeGained?: number | null;
  completedCoinsEarned?: number | null;
  completedAt?: number;
};

type SagaLevelCompletionReturnStorage = {
  path?: string;
  completedSagaLevelId?: string | null;
  completedCategoryId?: string | null;
  completedStarCount?: number | null;
  completedKnowledgeGained?: number | null;
  completedCoinsEarned?: number | null;
  completedAt?: number;
};

type CompletionFlyInStar = {
  id: string;
  isFilled: boolean;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  delay: number;
};

const normalizeId = (value: unknown): string | null => {
  if (value == null) return null;

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed || trimmed === "null" || trimmed === "undefined") return null;
    return trimmed;
  }

  if (typeof value === "object") {
    const asRecord = value as Record<string, unknown>;
    const maybeOid = asRecord.$oid;
    const normalizedOid = normalizeId(maybeOid);
    if (normalizedOid) return normalizedOid;

    const maybeId = asRecord._id;
    const normalizedId = normalizeId(maybeId);
    if (normalizedId) return normalizedId;

    const maybeIdField = asRecord.id;
    const normalizedIdField = normalizeId(maybeIdField);
    if (normalizedIdField) return normalizedIdField;

    return null;
  }

  const asString = String(value).trim();
  if (!asString || asString === "null" || asString === "undefined") return null;
  return asString;
};

const toNonNegativeInt = (value: unknown): number => {
  const parsed = Number(value ?? 0);
  if (!Number.isFinite(parsed)) return 0;
  return Math.max(0, Math.round(parsed));
};

const getRowId = (row: SagaLevelRow | null | undefined): string | null => {
  return normalizeId(row?._id);
};

const getCategoryId = (row: SagaLevelRow | null | undefined): string | null => {
  return normalizeId(row?.category?._id);
};

const getSeededRandom = (seed: number) => {
  const value = Math.sin(seed * 12.9898) * 43758.5453;
  return value - Math.floor(value);
};

const getCubicPoint = (p0: Point, p1: Point, p2: Point, p3: Point, t: number): Point => {
  const oneMinusT = 1 - t;
  const a = oneMinusT ** 3;
  const b = 3 * oneMinusT ** 2 * t;
  const c = 3 * oneMinusT * t ** 2;
  const d = t ** 3;

  return {
    x: a * p0.x + b * p1.x + c * p2.x + d * p3.x,
    y: a * p0.y + b * p1.y + c * p2.y + d * p3.y,
  };
};

const buildCubicArcTable = (
  p0: Point,
  p1: Point,
  p2: Point,
  p3: Point,
  steps = 120
): CubicArcSample[] => {
  const table: CubicArcSample[] = [];
  let previousPoint = getCubicPoint(p0, p1, p2, p3, 0);
  let totalLength = 0;
  table.push({ t: 0, length: 0, point: previousPoint });

  for (let index = 1; index <= steps; index += 1) {
    const t = index / steps;
    const point = getCubicPoint(p0, p1, p2, p3, t);
    const distance = Math.hypot(point.x - previousPoint.x, point.y - previousPoint.y);
    totalLength += distance;
    table.push({ t, length: totalLength, point });
    previousPoint = point;
  }

  return table;
};

const getPointAtArcDistance = (table: CubicArcSample[], targetDistance: number): Point => {
  if (table.length === 0) {
    return { x: 0, y: 0 };
  }

  const maxLength = table[table.length - 1].length;
  const clampedDistance = Math.max(0, Math.min(targetDistance, maxLength));

  let low = 0;
  let high = table.length - 1;

  while (low < high) {
    const mid = Math.floor((low + high) / 2);
    if (table[mid].length < clampedDistance) {
      low = mid + 1;
    } else {
      high = mid;
    }
  }

  const upper = table[low];
  const lower = table[Math.max(0, low - 1)];
  const segmentLength = upper.length - lower.length;

  if (segmentLength <= 0) {
    return upper.point;
  }

  const ratio = (clampedDistance - lower.length) / segmentLength;
  return {
    x: lower.point.x + (upper.point.x - lower.point.x) * ratio,
    y: lower.point.y + (upper.point.y - lower.point.y) * ratio,
  };
};

export default function SagaLevel() {
  const { user, loading, updateCoins, markUserStale } = useUser();
  const navigate = useNavigate();
  const location = useLocation();
  const { sagaNumber: sagaNumberParam } = useParams();
  const { toast } = useToast();

  const sagaNumber = Number.parseInt(String(sagaNumberParam || ""), 10);
  const hasValidSagaNumber = Number.isInteger(sagaNumber) && sagaNumber > 0;
  const locationState = (location.state as SagaLevelLocationState | null) ?? null;
  const cameFromSagaMap = Boolean(locationState?.fromSagaMap);
  const preloadedRowsFromSagaMap = cameFromSagaMap && Array.isArray(locationState?.bootstrapRows)
    ? (locationState.bootstrapRows as SagaLevelRow[])
    : null;
  const completionReturnFromQuery: SagaLevelCompletionReturnStorage | null = (() => {
    if (typeof window === "undefined") return null;

    const params = new URLSearchParams(location.search || "");
    if (params.get("fromQuizCompletion") !== "1") {
      return null;
    }

    return {
      completedSagaLevelId: params.get("completedSagaLevelId"),
      completedCategoryId: params.get("completedCategoryId"),
      completedStarCount: params.get("completedStarCount"),
      completedKnowledgeGained: params.get("completedKnowledgeGained"),
      completedCoinsEarned: params.get("completedCoinsEarned"),
      completedAt: params.get("completedAt"),
    };
  })();
  const completionReturnFromStorage: SagaLevelCompletionReturnStorage | null = (() => {
    if (typeof window === "undefined" || !hasValidSagaNumber) return null;

    try {
      const raw = sessionStorage.getItem("saga_level_completion_return");
      if (!raw) return null;

      const parsed = JSON.parse(raw) as SagaLevelCompletionReturnStorage;
      if (!parsed || typeof parsed !== "object") return null;
      if (parsed.path !== `/saga-level/${sagaNumber}`) return null;

      const completedAt = Number(parsed.completedAt || 0);
      const ageMs = Date.now() - completedAt;
      if (!Number.isFinite(ageMs) || ageMs < 0 || ageMs > QUIZ_COMPLETION_SIGNAL_MAX_AGE_MS) {
        try {
          sessionStorage.removeItem("saga_level_completion_return");
        } catch {
          // Ignore cleanup failures for stale entries.
        }
        return null;
      }

      return parsed;
    } catch {
      return null;
    }
  })();
  const normalizedCompletedSagaLevelIdCandidate = normalizeId(
    locationState?.completedSagaLevelId ??
      completionReturnFromQuery?.completedSagaLevelId ??
      completionReturnFromStorage?.completedSagaLevelId,
  );
  const normalizedCompletedCategoryIdCandidate = normalizeId(
    locationState?.completedCategoryId ??
      completionReturnFromQuery?.completedCategoryId ??
      completionReturnFromStorage?.completedCategoryId,
  );
  const completionTimestampRaw = Number(
    locationState?.completedAt ??
      completionReturnFromQuery?.completedAt ??
      completionReturnFromStorage?.completedAt ??
      0,
  );
  const completionSignalAgeMs = Date.now() - completionTimestampRaw;
  const hasFreshCompletionSignalTimestamp =
    Number.isFinite(completionSignalAgeMs) &&
    completionSignalAgeMs >= 0 &&
    completionSignalAgeMs <= QUIZ_COMPLETION_SIGNAL_MAX_AGE_MS;
  const hasExplicitCompletionReturnSignal = Boolean(
    locationState?.fromQuizCompletion || completionReturnFromQuery,
  );
  const hasStorageCompletionReturnSignal = Boolean(
    !hasExplicitCompletionReturnSignal && completionReturnFromStorage,
  );
  const isReturningFromQuizCompletion = Boolean(
    (hasExplicitCompletionReturnSignal || hasStorageCompletionReturnSignal) &&
      hasFreshCompletionSignalTimestamp &&
      (normalizedCompletedSagaLevelIdCandidate || normalizedCompletedCategoryIdCandidate),
  );
  const completedSagaLevelIdFromQuizReturn = isReturningFromQuizCompletion
    ? normalizedCompletedSagaLevelIdCandidate
    : null;
  const completedCategoryIdFromQuizReturn = isReturningFromQuizCompletion
    ? normalizedCompletedCategoryIdCandidate
    : null;
  const completedStarCountFromQuizReturn =
    isReturningFromQuizCompletion &&
    (locationState?.completedStarCount != null ||
      completionReturnFromQuery?.completedStarCount != null ||
      completionReturnFromStorage?.completedStarCount != null)
      ? Number(
          locationState?.completedStarCount ??
            completionReturnFromQuery?.completedStarCount ??
            completionReturnFromStorage?.completedStarCount,
        )
      : null;
  const completedKnowledgeGainedFromQuizReturn = isReturningFromQuizCompletion
    ? toNonNegativeInt(
        locationState?.completedKnowledgeGained ??
          completionReturnFromQuery?.completedKnowledgeGained ??
          completionReturnFromStorage?.completedKnowledgeGained,
      )
    : 0;
  const completedCoinsEarnedFromQuizReturn = isReturningFromQuizCompletion
    ? toNonNegativeInt(
        locationState?.completedCoinsEarned ??
          completionReturnFromQuery?.completedCoinsEarned ??
          completionReturnFromStorage?.completedCoinsEarned,
      )
    : 0;

  const [rows, setRows] = useState<SagaLevelRow[]>(preloadedRowsFromSagaMap || []);
  const [isLoadingRows, setIsLoadingRows] = useState(!preloadedRowsFromSagaMap);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [startingCategoryId, setStartingCategoryId] = useState<string | null>(null);
  const [lockedMessageRowId, setLockedMessageRowId] = useState<string | null>(null);
  const [completionStarAnimationRowId, setCompletionStarAnimationRowId] = useState<string | null>(null);
  const [isCompletionStarAnimationActive, setIsCompletionStarAnimationActive] = useState(false);
  const [completionStarAnimationRunId, setCompletionStarAnimationRunId] = useState(0);
  const [completionFlyInStars, setCompletionFlyInStars] = useState<CompletionFlyInStar[]>([]);
  const [showCompletionFlyInOverlay, setShowCompletionFlyInOverlay] = useState(false);
  const [isCompletionFlyInInMotion, setIsCompletionFlyInInMotion] = useState(false);
  const [completionStarsOverride, setCompletionStarsOverride] = useState<{
    rowId: string;
    filledCount: number;
  } | null>(null);
  const [deferredCompletedStarsRowId, setDeferredCompletedStarsRowId] = useState<string | null>(null);
  const [pathSegments, setPathSegments] = useState<SagaPathSegment[]>([]);
  const [isEconomyBarLowered, setIsEconomyBarLowered] = useState(false);
  const [showCompletionRewardsOverlay, setShowCompletionRewardsOverlay] = useState(false);
  const [animatedCompletionKnowledge, setAnimatedCompletionKnowledge] = useState(0);
  const [animatedCompletionCoins, setAnimatedCompletionCoins] = useState(0);
  const gridRef = useRef<HTMLDivElement | null>(null);
  const frameRefs = useRef<Array<HTMLDivElement | null>>([]);
  const starSlotRefs = useRef<Record<string, HTMLSpanElement | null>>({});
  const lockMessageTimerRef = useRef<number | null>(null);
  const hasAutoScrolledRef = useRef(false);
  const hasHandledCompletionReturnRef = useRef(false);
  const bottomAnchorRef = useRef<HTMLDivElement | null>(null);
  const sagaLevelUserToken =
    typeof window !== "undefined" ? localStorage.getItem("token") || "" : "";
  const currentCoins = user?.coins ?? 0;
  const selectedAvatarIndex = Math.max(0, (user?.avatar || 1) - 1);
  const userAvatarImage = avatarUrls[selectedAvatarIndex] || avatarUrls[0];
  const displayRows = rows.slice(0, 6);
  const isShowingLoadingSkeleton = isLoadingRows && rows.length === 0;
  const gridCells: Array<SagaLevelRow | null> = isShowingLoadingSkeleton
    ? Array.from({ length: 6 }, () => null)
    : displayRows;
  const getCategoryImageSrc = (row: SagaLevelRow) => {
    const image64 = row.category?.image64?.trim();
    const hasImage64 = Boolean(image64 && image64 !== "null" && image64 !== "undefined");

    if (hasImage64) {
      return image64.startsWith("data:")
        ? image64
        : `data:image/png;base64,${image64}`;
    }

    return DEFAULT_CATEGORY_IMAGE_SRC;
  };
  const getFilledStarCount = (row: SagaLevelRow | null) => {
    const raw = Number(row?.completionRating ?? 0);
    if (!Number.isFinite(raw)) return 0;
    return Math.max(0, Math.min(STAR_COUNT, Math.round(raw)));
  };
  const isRowUnlocked = (index: number, row: SagaLevelRow | null) => {
    if (!getCategoryId(row)) return false;
    // Progression on this screen is bottom-to-top:
    // a row unlocks when the nearest row below it is completed.
    for (let belowIndex = index + 1; belowIndex < gridCells.length; belowIndex += 1) {
      const rowBelow = gridCells[belowIndex];
      if (getCategoryId(rowBelow)) {
        return Boolean(rowBelow.isCompleted);
      }
    }
    // Bottom-most available row has no prerequisite.
    return true;
  };
  const showLockedMessage = (rowId?: string) => {
    if (!rowId) return;
    setLockedMessageRowId(rowId);
    if (lockMessageTimerRef.current !== null) {
      window.clearTimeout(lockMessageTimerRef.current);
    }
    lockMessageTimerRef.current = window.setTimeout(() => {
      setLockedMessageRowId((currentValue) => (currentValue === rowId ? null : currentValue));
      lockMessageTimerRef.current = null;
    }, 2000);
  };
  const getScrollContainer = () => {
    const rootElement = document.getElementById("root");
    if (rootElement && rootElement.scrollHeight > rootElement.clientHeight) {
      return rootElement;
    }

    if (document.scrollingElement instanceof HTMLElement) {
      return document.scrollingElement;
    }

    return null;
  };
  const scrollFrameToVerticalCenter = (
    targetFrame: HTMLDivElement,
    behavior: ScrollBehavior = "smooth",
  ) => {
    const scrollContainer = getScrollContainer();
    if (!scrollContainer) {
      targetFrame.scrollIntoView({
        behavior,
        block: "center",
        inline: "nearest",
      });
      return;
    }

    const frameRect = targetFrame.getBoundingClientRect();
    const containerRect = scrollContainer.getBoundingClientRect();
    const frameCenterInScrollContent =
      scrollContainer.scrollTop +
      (frameRect.top - containerRect.top) +
      frameRect.height / 2;
    const desiredTop = frameCenterInScrollContent - scrollContainer.clientHeight / 2;
    const maxScrollTop = Math.max(
      0,
      scrollContainer.scrollHeight - scrollContainer.clientHeight,
    );
    const scrollTop = Math.max(0, Math.min(desiredTop, maxScrollTop));

    scrollContainer.scrollTo({ top: scrollTop, behavior });
  };
  const getNextPlayableRowIndex = () => {
    let fallbackPlayableIndex: number | null = null;

    for (let index = displayRows.length - 1; index >= 0; index -= 1) {
      const row = displayRows[index];
      if (!getCategoryId(row)) continue;
      if (row.category.disabled) continue;
      if (!isRowUnlocked(index, row)) continue;

      fallbackPlayableIndex = index;
      if (!row.isCompleted) {
        return index;
      }
    }

    return fallbackPlayableIndex;
  };
  const areAllAvailableLevelsCompleted = (justCompletedRowId?: string | null) => {
    const availableRows = displayRows.filter(
      (row) => Boolean(getCategoryId(row)) && !row.category.disabled,
    );
    if (availableRows.length === 0) return false;

    return availableRows.every((row) => {
      if (row.isCompleted) return true;
      const rowId = getRowId(row);
      return Boolean(justCompletedRowId && rowId && rowId === justCompletedRowId);
    });
  };
  const clearCompletionReturnSignal = () => {
    try {
      sessionStorage.removeItem("saga_level_completion_return");
    } catch {
      // Ignore storage cleanup failures.
    }

    try {
      const params = new URLSearchParams(window.location.search || "");
      params.delete("fromQuizCompletion");
      params.delete("completedSagaLevelId");
      params.delete("completedCategoryId");
      params.delete("completedStarCount");
      params.delete("completedKnowledgeGained");
      params.delete("completedCoinsEarned");
      params.delete("completedAt");
      const queryString = params.toString();
      const nextUrl = `${window.location.pathname}${queryString ? `?${queryString}` : ""}${window.location.hash || ""}`;
      const historyState = window.history.state as
        | { usr?: Record<string, unknown> }
        | null;
      const currentUsr = historyState?.usr;
      const nextUsr =
        currentUsr && typeof currentUsr === "object"
          ? (() => {
              const sanitized = { ...currentUsr };
              delete sanitized.fromQuizCompletion;
              delete sanitized.completedSagaLevelId;
              delete sanitized.completedCategoryId;
              delete sanitized.completedStarCount;
              delete sanitized.completedKnowledgeGained;
              delete sanitized.completedCoinsEarned;
              delete sanitized.completedAt;
              return sanitized;
            })()
          : currentUsr;

      if (historyState && typeof historyState === "object") {
        window.history.replaceState(
          {
            ...historyState,
            usr: nextUsr,
          },
          "",
          nextUrl,
        );
      } else {
        window.history.replaceState(window.history.state, "", nextUrl);
      }
    } catch {
      // Ignore URL cleanup failures.
    }
  };
  const getStarSlotRefKey = (rowId: string, starIndex: number) => `${rowId}-${starIndex}`;
  const buildCompletionFlyInStars = (rowId: string, filledCount: number): CompletionFlyInStar[] => {
    const stars: CompletionFlyInStar[] = [];
    let missingSlots = 0;

    for (let starIndex = 0; starIndex < STAR_COUNT; starIndex += 1) {
      const slotElement = starSlotRefs.current[getStarSlotRefKey(rowId, starIndex)];
      if (!slotElement) {
        missingSlots += 1;
        continue;
      }

      const slotRect = slotElement.getBoundingClientRect();
      const targetX = slotRect.left + slotRect.width / 2 - 12;
      const targetY = slotRect.top + slotRect.height / 2 - 12;
      const horizontalSpread = (starIndex - (STAR_COUNT - 1) / 2) * 30;
      const randomJitter = (Math.random() - 0.5) * 34;
      const startX = window.innerWidth / 2 + horizontalSpread + randomJitter;
      const startY = -140 - Math.random() * 90;

      stars.push({
        id: `${rowId}-fly-${starIndex}-${Date.now()}`,
        isFilled: starIndex < filledCount,
        startX,
        startY,
        endX: targetX,
        endY: targetY,
        delay: starIndex * 0.12,
      });
    }

    console.info("[SagaCompletion] Fly-in targets prepared", {
      rowId,
      starsCount: stars.length,
      missingSlots,
      filledCount,
    });

    return stars;
  };

  const handleStartCategoryQuiz = (categoryId: string, sagaLevelId?: string) => {
    if (!categoryId || startingCategoryId) return;

    if (currentCoins < QUIZ_COST) {
      toast({
        title: "Insufficient Coins",
        description: `You need ${QUIZ_COST} coins to start a quiz.`,
        variant: "destructive",
      });
      return;
    }

    setStartingCategoryId(categoryId);
    updateCoins(currentCoins - QUIZ_COST);
    markUserStale();
    navigate(`/quiz/${categoryId}`, {
      state: {
        from: `/saga-level/${sagaNumber}`,
        sagaLevelId: normalizeId(sagaLevelId) || null,
      },
    });
  };

  useEffect(() => {
    if (loading || !user || !hasValidSagaNumber) return;

    if (preloadedRowsFromSagaMap) {
      setRows(preloadedRowsFromSagaMap);
      setIsLoadingRows(false);
      setErrorMessage(null);
      return;
    }

    let isMounted = true;
    const userToken =
      typeof window !== "undefined" ? localStorage.getItem("token") || "" : "";

    if (!userToken) {
      setIsLoadingRows(false);
      setErrorMessage("Missing session token.");
      return;
    }

    const fetchSagaLevel = async () => {
      setIsLoadingRows(true);
      setErrorMessage(null);
      setRows([]);
      try {
        const shouldBootstrap = cameFromSagaMap;
        const endpoint = shouldBootstrap
          ? `${BASE_URL}/api/saga/levels/${sagaNumber}/bootstrap`
          : `${BASE_URL}/api/saga/levels/${sagaNumber}`;
        const response = await fetch(endpoint, {
          method: shouldBootstrap ? "POST" : "GET",
          headers: {
            Authorization: `Bearer ${userToken}`,
          },
        });

        if (!response.ok) {
          throw new Error(`Failed with status ${response.status}`);
        }

        const data = await response.json();
        if (!isMounted) return;
        setRows(Array.isArray(data?.rows) ? data.rows : []);
      } catch (error) {
        console.error("Failed to load saga level:", error);
        if (!isMounted) return;
        setRows([]);
        setErrorMessage("Unable to load saga level categories.");
      } finally {
        if (isMounted) {
          setIsLoadingRows(false);
        }
      }
    };

    fetchSagaLevel();

    return () => {
      isMounted = false;
    };
  }, [loading, user?._id, hasValidSagaNumber, sagaNumber, preloadedRowsFromSagaMap, cameFromSagaMap]);

  useEffect(() => {
    hasAutoScrolledRef.current = false;
    hasHandledCompletionReturnRef.current = false;
    setCompletionStarAnimationRowId(null);
    setIsCompletionStarAnimationActive(false);
    setCompletionStarAnimationRunId(0);
    setCompletionFlyInStars([]);
    setShowCompletionFlyInOverlay(false);
    setIsCompletionFlyInInMotion(false);
    setCompletionStarsOverride(null);
    setDeferredCompletedStarsRowId(null);
    setShowCompletionRewardsOverlay(false);
    setAnimatedCompletionKnowledge(0);
    setAnimatedCompletionCoins(0);
  }, [sagaNumber]);

  useEffect(() => {
    setLockedMessageRowId(null);
    if (lockMessageTimerRef.current !== null) {
      window.clearTimeout(lockMessageTimerRef.current);
      lockMessageTimerRef.current = null;
    }
  }, [sagaNumber]);

  useEffect(() => {
    document.documentElement.classList.add("saga-level-no-scrollbar");
    document.body.classList.add("saga-level-no-scrollbar");

    return () => {
      document.documentElement.classList.remove("saga-level-no-scrollbar");
      document.body.classList.remove("saga-level-no-scrollbar");
    };
  }, []);

  useEffect(() => {
    if (loading || !user || !hasValidSagaNumber) return;
    trackEnteredSagaLevelMap(user._id, sagaNumber);
  }, [loading, user?._id, hasValidSagaNumber, sagaNumber]);

  useEffect(() => {
    return () => {
      if (lockMessageTimerRef.current !== null) {
        window.clearTimeout(lockMessageTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (
      isLoadingRows ||
      hasHandledCompletionReturnRef.current ||
      !isReturningFromQuizCompletion
    ) {
      return;
    }

    const rowsForTargeting = displayRows;
    console.info("[SagaCompletion] Return detected", {
      sagaNumber,
      completedSagaLevelIdFromQuizReturn,
      completedCategoryIdFromQuizReturn,
      completedStarCountFromQuizReturn,
      rowsCount: rowsForTargeting.length,
    });
    let targetRowIndex = rowsForTargeting.findIndex(
      (row) =>
        Boolean(completedSagaLevelIdFromQuizReturn) &&
        getRowId(row) === completedSagaLevelIdFromQuizReturn,
    );

    if (targetRowIndex < 0) {
      targetRowIndex = rowsForTargeting.findIndex(
        (row) =>
          Boolean(completedCategoryIdFromQuizReturn) &&
          getCategoryId(row) === completedCategoryIdFromQuizReturn,
      );
    }

    if (targetRowIndex < 0) {
      for (let index = 0; index < rowsForTargeting.length; index += 1) {
        const row = rowsForTargeting[index];
        if (getCategoryId(row) && row.isCompleted) {
          targetRowIndex = index;
          break;
        }
      }
    }

    if (targetRowIndex < 0) {
      console.warn("[SagaCompletion] Unable to resolve target row", {
        completedSagaLevelIdFromQuizReturn,
        completedCategoryIdFromQuizReturn,
        rows: rowsForTargeting.map((row, index) => ({
          index,
          rowId: getRowId(row),
          categoryId: getCategoryId(row),
          isCompleted: Boolean(row?.isCompleted),
        })),
      });
      return;
    }

    hasHandledCompletionReturnRef.current = true;

    hasAutoScrolledRef.current = true;
    const targetRow = rowsForTargeting[targetRowIndex];
    const resolvedTargetRowId = getRowId(targetRow) || "";
    if (!resolvedTargetRowId) {
      console.warn("[SagaCompletion] Target row has no resolvable rowId", {
        targetRowIndex,
      });
      return;
    }

    const resolvedStarCountRaw =
      completedStarCountFromQuizReturn != null
        ? completedStarCountFromQuizReturn
        : Number(targetRow?.completionRating ?? 0);
    const resolvedFilledStars = Math.max(
      0,
      Math.min(STAR_COUNT, Math.round(resolvedStarCountRaw)),
    );

    setCompletionStarsOverride({
      rowId: resolvedTargetRowId,
      filledCount: resolvedFilledStars,
    });
    setDeferredCompletedStarsRowId(resolvedTargetRowId);
    setCompletionStarAnimationRowId(resolvedTargetRowId);
    setIsCompletionStarAnimationActive(false);
    console.info("[SagaCompletion] Target resolved", {
      targetRowIndex,
      resolvedTargetRowId,
      resolvedFilledStars,
    });

    let centerCompletedRowTimer: number | null = null;
    let startAnimationTimer: number | null = null;
    let stopAnimationTimer: number | null = null;
    let centerNextPlayableTimer: number | null = null;
    let finishPanelRevealTimer: number | null = null;
    let startFlyInRafOne: number | null = null;
    let startFlyInRafTwo: number | null = null;

    centerCompletedRowTimer = window.setTimeout(() => {
      const completedFrame = frameRefs.current[targetRowIndex];
      if (!completedFrame) return;
      scrollFrameToVerticalCenter(completedFrame, "smooth");
      console.info("[SagaCompletion] Centered completed row", {
        completedRowIndex: targetRowIndex,
        rowId: resolvedTargetRowId,
      });
    }, QUIZ_COMPLETION_SCROLL_TO_COMPLETED_DELAY_MS);

    startAnimationTimer = window.setTimeout(() => {
      const flyInStars = buildCompletionFlyInStars(resolvedTargetRowId, resolvedFilledStars);
      setCompletionFlyInStars(flyInStars);
      setShowCompletionFlyInOverlay(flyInStars.length > 0);
      setIsCompletionFlyInInMotion(false);
      if (flyInStars.length > 0) {
        startFlyInRafOne = window.requestAnimationFrame(() => {
          startFlyInRafTwo = window.requestAnimationFrame(() => {
            setIsCompletionFlyInInMotion(true);
          });
        });
      }
      setCompletionStarAnimationRunId((current) => current + 1);
      setIsCompletionStarAnimationActive(true);
      console.info("[SagaCompletion] Star animation started", {
        rowId: resolvedTargetRowId,
        flyInStars: flyInStars.length,
      });
    }, QUIZ_COMPLETION_SCROLL_TO_COMPLETED_DELAY_MS + QUIZ_COMPLETION_SCROLL_SETTLE_BEFORE_STARS_MS);

    stopAnimationTimer = window.setTimeout(() => {
      setShowCompletionFlyInOverlay(false);
      setCompletionFlyInStars([]);
      setIsCompletionFlyInInMotion(false);
      setDeferredCompletedStarsRowId((currentValue) =>
        currentValue === resolvedTargetRowId ? null : currentValue,
      );
      setCompletionStarAnimationRunId((current) => current + 1);
      setIsCompletionStarAnimationActive(true);
      if (finishPanelRevealTimer !== null) {
        window.clearTimeout(finishPanelRevealTimer);
      }
      finishPanelRevealTimer = window.setTimeout(() => {
        setIsCompletionStarAnimationActive(false);
        finishPanelRevealTimer = null;
      }, QUIZ_COMPLETION_PANEL_REVEAL_ANIMATION_MS);
      clearCompletionReturnSignal();
      console.info("[SagaCompletion] Star animation finished", {
        rowId: resolvedTargetRowId,
      });

      if (areAllAvailableLevelsCompleted(resolvedTargetRowId)) {
        console.info("[SagaCompletion] All levels completed, returning to saga map", {
          sagaNumber,
        });
        navigate("/saga-map", {
          replace: true,
          state: {
            fromSagaLevelCompletion: true,
            unlockedSagaLevel: sagaNumber + 1,
            completedSagaNumber: sagaNumber,
            completedAt: Date.now(),
          },
        });
        return;
      }

      centerNextPlayableTimer = window.setTimeout(() => {
        const nextPlayableRowIndex = getNextPlayableRowIndex();
        if (nextPlayableRowIndex === null) {
          return;
        }

        const nextPlayableFrame = frameRefs.current[nextPlayableRowIndex];
        if (!nextPlayableFrame) {
          return;
        }

        scrollFrameToVerticalCenter(nextPlayableFrame, "smooth");
        console.info("[SagaCompletion] Centered next playable row", {
          nextPlayableRowIndex,
        });
      }, 500);
    }, QUIZ_COMPLETION_SCROLL_TO_COMPLETED_DELAY_MS + QUIZ_COMPLETION_SCROLL_SETTLE_BEFORE_STARS_MS + QUIZ_COMPLETION_STARS_SEQUENCE_MS);

    return () => {
      if (centerCompletedRowTimer !== null) {
        window.clearTimeout(centerCompletedRowTimer);
      }
      if (startFlyInRafOne !== null) {
        window.cancelAnimationFrame(startFlyInRafOne);
      }
      if (startFlyInRafTwo !== null) {
        window.cancelAnimationFrame(startFlyInRafTwo);
      }
      if (startAnimationTimer !== null) {
        window.clearTimeout(startAnimationTimer);
      }
      if (stopAnimationTimer !== null) {
        window.clearTimeout(stopAnimationTimer);
      }
      if (centerNextPlayableTimer !== null) {
        window.clearTimeout(centerNextPlayableTimer);
      }
      if (finishPanelRevealTimer !== null) {
        window.clearTimeout(finishPanelRevealTimer);
      }
    };
  }, [
    isLoadingRows,
    rows,
    isReturningFromQuizCompletion,
    completedSagaLevelIdFromQuizReturn,
    completedCategoryIdFromQuizReturn,
    completedStarCountFromQuizReturn,
    sagaNumber,
  ]);

  useEffect(() => {
    if (isLoadingRows || hasAutoScrolledRef.current) {
      return;
    }

    if (isReturningFromQuizCompletion && !hasHandledCompletionReturnRef.current) {
      return;
    }

    const targetRowIndex = getNextPlayableRowIndex();
    if (targetRowIndex === null) {
      hasAutoScrolledRef.current = true;
      return;
    }

    hasAutoScrolledRef.current = true;
    const scrollTimer = window.setTimeout(() => {
      const targetFrame = frameRefs.current[targetRowIndex];
      if (!targetFrame) return;
      scrollFrameToVerticalCenter(targetFrame, "smooth");
    }, 140);

    return () => {
      window.clearTimeout(scrollTimer);
    };
  }, [isLoadingRows, rows, isReturningFromQuizCompletion]);

  useEffect(() => {
    if (!isShowingLoadingSkeleton && rows.length < 2) {
      setPathSegments([]);
      return;
    }

    const gridElement = gridRef.current;
    if (!gridElement) {
      return;
    }

    let rafId = 0;

    const recomputePaths = () => {
      cancelAnimationFrame(rafId);
      rafId = window.requestAnimationFrame(() => {
        const gridRect = gridElement.getBoundingClientRect();
        const measuredFrames = frameRefs.current.filter(
          (element): element is HTMLDivElement => Boolean(element)
        );

        if (measuredFrames.length < 2) {
          setPathSegments([]);
          return;
        }

        const segments: SagaPathSegment[] = [];

        for (let index = 1; index < measuredFrames.length; index += 1) {
          const lowerFrameRect = measuredFrames[index].getBoundingClientRect();
          const upperFrameRect = measuredFrames[index - 1].getBoundingClientRect();
          const sourceRow = gridCells[index];
          const useLoadingPathColor = isShowingLoadingSkeleton;
          const useLockedPathColor = !useLoadingPathColor && Boolean(sourceRow && !sourceRow.isCompleted);

          const start: Point = {
            x: lowerFrameRect.left + lowerFrameRect.width / 2 - gridRect.left,
            y: lowerFrameRect.top - gridRect.top + 44,
          };
          const end: Point = {
            x: upperFrameRect.left + upperFrameRect.width / 2 - gridRect.left,
            y: upperFrameRect.bottom - gridRect.top - 44,
          };

          const verticalDistance = Math.abs(start.y - end.y);
          const horizontalDelta = end.x - start.x;
          const bendDirection = horizontalDelta >= 0 ? 1 : -1;
          const curveLift = Math.max(82, verticalDistance * 0.4);
          const horizontalBend = Math.max(
            48,
            Math.min(180, Math.abs(horizontalDelta) * 0.45 + verticalDistance * 0.08)
          );
          const control1: Point = {
            x: start.x + bendDirection * horizontalBend,
            y: start.y - curveLift,
          };
          const control2: Point = {
            x: end.x + bendDirection * horizontalBend,
            y: end.y + curveLift,
          };

          const d = `M ${start.x} ${start.y} C ${control1.x} ${control1.y}, ${control2.x} ${control2.y}, ${end.x} ${end.y}`;
          const arcTable = buildCubicArcTable(start, control1, control2, end);
          const totalArcLength = arcTable[arcTable.length - 1]?.length || verticalDistance;
          const dotCount = Math.min(26, Math.max(14, Math.round(totalArcLength / 22)));
          const dots: SagaPathDot[] = Array.from({ length: dotCount }, (_, dotIndex) => {
            const targetDistance = ((dotIndex + 1) / (dotCount + 1)) * totalArcLength;
            const point = getPointAtArcDistance(arcTable, targetDistance);
            const random = getSeededRandom(index * 100 + dotIndex + 1);
            const randomSecondary = getSeededRandom(index * 200 + dotIndex + 11);
            const randomTertiary = getSeededRandom(index * 300 + dotIndex + 23);
            return {
              x: point.x,
              y: point.y,
              radius: 2.1 + random * 2.0,
              duration: 1.3 + randomSecondary * 1.5,
              delay: -randomTertiary * 2.2,
              opacity: 0.5 + random * 0.45,
            };
          });

          segments.push({
            id: `path-${index}`,
            d,
            dots,
            strokeColor: useLoadingPathColor
              ? "rgba(148, 163, 184, 0.42)"
              : useLockedPathColor
              ? "rgba(248, 113, 113, 0.5)"
              : "rgba(125, 211, 252, 0.35)",
            dotColor: useLoadingPathColor
              ? "rgba(226, 232, 240, 0.92)"
              : useLockedPathColor
              ? "rgba(254, 202, 202, 0.95)"
              : "rgba(186, 230, 253, 0.95)",
            dotAnimationName: useLoadingPathColor
              ? "sagaPathGlowLoading"
              : useLockedPathColor
                ? "sagaPathGlowLocked"
                : "sagaPathGlow",
          });
        }

        setPathSegments(segments);
      });
    };

    recomputePaths();

    const resizeObserver = new ResizeObserver(recomputePaths);
    resizeObserver.observe(gridElement);
    frameRefs.current.forEach((element) => {
      if (element) {
        resizeObserver.observe(element);
      }
    });

    window.addEventListener("resize", recomputePaths);

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener("resize", recomputePaths);
      resizeObserver.disconnect();
    };
  }, [rows, isShowingLoadingSkeleton]);

  useEffect(() => {
    if (!showCompletionFlyInOverlay) return;
    console.info("[SagaCompletion] Overlay visible", {
      starsCount: completionFlyInStars.length,
      inMotion: isCompletionFlyInInMotion,
      firstStar: completionFlyInStars[0]
        ? {
            startX: completionFlyInStars[0].startX,
            startY: completionFlyInStars[0].startY,
            endX: completionFlyInStars[0].endX,
            endY: completionFlyInStars[0].endY,
          }
        : null,
    });
  }, [showCompletionFlyInOverlay, completionFlyInStars, isCompletionFlyInInMotion]);

  useEffect(() => {
    setIsEconomyBarLowered(isCompletionStarAnimationActive);
  }, [isCompletionStarAnimationActive]);

  useEffect(() => {
    if (!isCompletionStarAnimationActive) {
      setShowCompletionRewardsOverlay(false);
      setAnimatedCompletionKnowledge(0);
      setAnimatedCompletionCoins(0);
      return;
    }

    const targetKnowledge = completedKnowledgeGainedFromQuizReturn;
    const targetCoins = completedCoinsEarnedFromQuizReturn;
    if (targetKnowledge <= 0 && targetCoins <= 0) {
      setShowCompletionRewardsOverlay(false);
      return;
    }

    setShowCompletionRewardsOverlay(true);
    setAnimatedCompletionKnowledge(0);
    setAnimatedCompletionCoins(0);

    const animationDurationMs = Math.max(900, QUIZ_COMPLETION_STARS_SEQUENCE_MS - 600);
    const startTime = performance.now();
    let rafId = 0;

    const animateCounts = (timestamp: number) => {
      const elapsed = timestamp - startTime;
      const progress = Math.max(0, Math.min(1, elapsed / animationDurationMs));
      const easedProgress = 1 - Math.pow(1 - progress, 3);
      setAnimatedCompletionKnowledge(Math.round(targetKnowledge * easedProgress));
      setAnimatedCompletionCoins(Math.round(targetCoins * easedProgress));

      if (progress < 1) {
        rafId = window.requestAnimationFrame(animateCounts);
      }
    };

    rafId = window.requestAnimationFrame(animateCounts);

    return () => {
      if (rafId) {
        window.cancelAnimationFrame(rafId);
      }
    };
  }, [
    isCompletionStarAnimationActive,
    completedKnowledgeGainedFromQuizReturn,
    completedCoinsEarnedFromQuizReturn,
  ]);

  if (loading) {
    return (
      <div className="min-h-[100dvh] grid place-items-center bg-[#0b1325] text-slate-200">
        Loading Saga Level...
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

  if (!hasValidSagaNumber) {
    return <Navigate to="/saga-map" replace />;
  }

  const backButtonOverlay =
    typeof document !== "undefined"
      ? createPortal(
          <Button
            type="button"
            size="icon"
            variant="ghost"
            onClick={() => navigate("/saga-map")}
            aria-label="Back to Saga Map"
            title="Back to Saga Map"
            className="fixed top-[max(0.5rem,env(safe-area-inset-top))] left-2 sm:left-4 z-[10010] h-11 w-11 sm:h-12 sm:w-12 rounded-full border border-cyan-200/75 bg-slate-950/45 text-cyan-50 backdrop-blur-md shadow-[0_10px_24px_rgba(8,47,73,0.45),0_0_16px_rgba(34,211,238,0.3)] transition-all duration-200 hover:scale-[1.05] hover:border-cyan-100 hover:bg-cyan-500/22 hover:shadow-[0_14px_28px_rgba(8,47,73,0.55),0_0_22px_rgba(103,232,249,0.45)] active:scale-[0.98]"
          >
            <ArrowLeft className="h-5 w-5 sm:h-6 sm:w-6" />
            <span className="sr-only">Back</span>
          </Button>,
          document.body,
        )
      : null;
  const economyBarOverlay =
    typeof document !== "undefined"
      ? createPortal(
          <div className="pointer-events-none fixed inset-x-0 top-0 z-[10005]">
            <div
              className={`mx-auto w-full max-w-5xl px-1 pt-[max(0.25rem,env(safe-area-inset-top))] transition-transform duration-300 ${
                isEconomyBarLowered ? "translate-y-10" : "-translate-y-[140%]"
              }`}
            >
              <GameStatsHeader
                userToken={sagaLevelUserToken}
                isParentLoading={false}
                currentCoinsFromParent={currentCoins}
                userXP={user.knowledgePoints ?? 0}
                userGem1={user.wisdomGems ?? 0}
                userGem2={user.enlightenmentCrystals ?? 0}
                compactMode
                centerImageSrc={userAvatarImage}
                centerSubLabel={user.alias || ""}
                centerBadgeValue={user.level ?? 1}
              />
            </div>
          </div>,
          document.body,
        )
      : null;
  const completionRewardsOverlay =
    showCompletionRewardsOverlay && typeof document !== "undefined"
      ? createPortal(
          <div className="pointer-events-none fixed inset-x-0 top-0 z-[10008] flex justify-center px-3 pt-[max(5.8rem,env(safe-area-inset-top)+4.8rem)]">
            <div className="saga-reward-overlay-enter flex w-full max-w-md items-center justify-center gap-2 rounded-2xl border border-amber-200/40 bg-slate-950/70 px-3 py-2 backdrop-blur-md shadow-[0_10px_30px_rgba(2,6,23,0.5)] sm:gap-3 sm:px-4 sm:py-3">
              <div className="flex min-w-0 flex-1 items-center gap-2 rounded-xl border border-cyan-200/35 bg-cyan-900/25 px-2 py-2 sm:px-3">
                <div className="rounded-full bg-cyan-200/20 p-1.5 text-cyan-100">
                  <Brain className="h-4 w-4 sm:h-5 sm:w-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-cyan-200/80 sm:text-xs">
                    KP Earned
                  </p>
                  <p className="saga-reward-value text-base font-extrabold leading-none text-cyan-100 tabular-nums sm:text-xl">
                    +{animatedCompletionKnowledge}
                  </p>
                </div>
              </div>
              <div className="flex min-w-0 flex-1 items-center gap-2 rounded-xl border border-amber-200/35 bg-amber-900/20 px-2 py-2 sm:px-3">
                <div className="rounded-full bg-amber-200/20 p-1.5 text-amber-100">
                  <CircleDollarSign className="h-4 w-4 sm:h-5 sm:w-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-amber-200/80 sm:text-xs">
                    Coins Earned
                  </p>
                  <p className="saga-reward-value text-base font-extrabold leading-none text-amber-100 tabular-nums sm:text-xl">
                    +{animatedCompletionCoins}
                  </p>
                </div>
              </div>
            </div>
          </div>,
          document.body,
        )
      : null;

  const completionFlyInOverlay =
    showCompletionFlyInOverlay && typeof document !== "undefined"
      ? createPortal(
          <div className="pointer-events-none fixed inset-0 z-[9999]">
            {completionFlyInStars.map((star) => (
              <span
                key={star.id}
                className="fixed block"
                style={{
                  left: 0,
                  top: 0,
                  opacity: isCompletionFlyInInMotion ? 1 : 0.24,
                  transform: `translate(${isCompletionFlyInInMotion ? star.endX : star.startX}px, ${isCompletionFlyInInMotion ? star.endY : star.startY}px) scale(${isCompletionFlyInInMotion ? 1 : 0.46}) rotate(${isCompletionFlyInInMotion ? 0 : -18}deg)`,
                  transition: `transform 1200ms cubic-bezier(0.18,0.9,0.25,1.05) ${star.delay}s, opacity 240ms ease-out ${star.delay}s`,
                  willChange: "transform, opacity",
                }}
              >
                <Star
                  aria-hidden="true"
                  className={star.isFilled ? "h-10 w-10 text-amber-200" : "h-10 w-10 text-slate-300/80"}
                  fill={star.isFilled ? "rgba(253, 224, 71, 0.95)" : "rgba(148, 163, 184, 0.34)"}
                  strokeWidth={1.9}
                  style={{
                    filter: star.isFilled
                      ? "drop-shadow(0 0 14px rgba(251, 191, 36, 0.85)) drop-shadow(0 0 28px rgba(250, 204, 21, 0.55))"
                      : "drop-shadow(0 0 8px rgba(148, 163, 184, 0.5))",
                  }}
                />
              </span>
            ))}
          </div>,
          document.body,
        )
      : null;
  const lastPlayableRowIndex = getNextPlayableRowIndex();

  return (
    <div
      className="saga-level-panel-theme relative min-h-[100dvh] px-2 sm:px-4 py-2 sm:py-3 pb-[max(0.5rem,env(safe-area-inset-bottom))] overflow-x-hidden bg-[#0a1730]"
    >
      <style>
        {`
          .saga-level-panel-theme {
            --bg-1: #10182f;
            --bg-2: #19284a;
            --panel: rgba(14, 24, 48, 0.88);
            --panel-2: rgba(27, 39, 71, 0.95);
            --gold-1: #fff2b3;
            --gold-2: #ffd76a;
            --gold-3: #d9961a;
            --gold-4: #7b4d00;
            --blue-1: #9fe7ff;
            --blue-2: #46c8ff;
            --blue-3: #1d74ff;
            --green-1: #7dffb2;
            --green-2: #18c46b;
            --locked-1: #8c94aa;
            --locked-2: #495066;
            --radius: 1.25rem;
            --border-size: clamp(2px, 0.35vw, 4px);
            --glow-size: clamp(8px, 1vw, 18px);
          }

          .saga-level-panel-theme .category-card {
            width: 100%;
            position: relative;
            transition: transform 220ms ease, filter 220ms ease;
          }

          .saga-level-panel-theme .category-card:hover {
            transform: translateY(-6px) scale(1.01);
          }

          .saga-level-panel-theme .category-frame {
            position: relative;
            border-radius: var(--radius);
            padding: clamp(0.5rem, 1vw, 0.8rem);
            background:
              linear-gradient(145deg, rgba(255, 255, 255, 0.12), rgba(255, 255, 255, 0.02));
            overflow: hidden;
            isolation: isolate;
          }

          .saga-level-panel-theme .category-frame::before {
            content: "";
            position: absolute;
            inset: 0;
            border-radius: inherit;
            padding: var(--border-size);
            background:
              linear-gradient(
                135deg,
                var(--gold-1) 0%,
                var(--gold-2) 18%,
                var(--blue-1) 35%,
                var(--blue-2) 50%,
                var(--gold-2) 68%,
                var(--gold-3) 84%,
                var(--gold-1) 100%
              );
            -webkit-mask:
              linear-gradient(#000 0 0) content-box,
              linear-gradient(#000 0 0);
            -webkit-mask-composite: xor;
                    mask-composite: exclude;
            animation: sagaPanelBorderFlow 6s linear infinite;
            z-index: 0;
          }

          .saga-level-panel-theme .category-frame::after {
            content: "";
            position: absolute;
            inset: -8px;
            border-radius: calc(var(--radius) + 8px);
            background:
              radial-gradient(circle at 50% 50%, rgba(116, 225, 255, 0.18), transparent 60%);
            filter: blur(var(--glow-size));
            z-index: -1;
            opacity: 0.9;
          }

          .saga-level-panel-theme .category-content {
            position: relative;
            display: grid;
            grid-template-columns: minmax(136px, 34%) 1fr;
            gap: clamp(0.72rem, 2vw, 1.1rem);
            background:
              linear-gradient(180deg, var(--panel-2), var(--panel));
            border-radius: calc(var(--radius) - 0.3rem);
            padding: clamp(0.8rem, 2vw, 1.1rem);
            min-height: clamp(156px, 26vw, 212px);
            overflow: hidden;
            z-index: 1;
          }

          .saga-level-panel-theme .category-content::before {
            content: "";
            position: absolute;
            top: -20%;
            left: -35%;
            width: 35%;
            height: 140%;
            transform: rotate(18deg);
            background: linear-gradient(
              90deg,
              transparent,
              rgba(255, 255, 255, 0.08),
              rgba(255, 255, 255, 0.18),
              transparent
            );
            opacity: 0;
            pointer-events: none;
          }

          .saga-level-panel-theme .category-card.current .category-content::before {
            opacity: 1;
            animation: sagaPanelShineSweep 4.5s ease-in-out infinite;
          }

          .saga-level-panel-theme .category-image {
            position: relative;
            border-radius: 1rem;
            min-height: 136px;
            background:
              linear-gradient(180deg, rgba(255, 255, 255, 0.08), rgba(255, 255, 255, 0.02)),
              radial-gradient(circle at 30% 20%, rgba(255, 219, 110, 0.22), transparent 35%),
              linear-gradient(135deg, #4d6ea8, #223456 60%, #18243d);
            border: 1px solid rgba(255, 255, 255, 0.08);
            box-shadow:
              inset 0 1px 0 rgba(255, 255, 255, 0.12),
              inset 0 -1px 0 rgba(0, 0, 0, 0.2);
            overflow: hidden;
          }

          .saga-level-panel-theme .category-image img {
            width: 100%;
            height: 100%;
            object-fit: cover;
            display: block;
          }

          .saga-level-panel-theme .category-info {
            display: flex;
            flex-direction: column;
            justify-content: center;
            min-width: 0;
          }

          .saga-level-panel-theme .category-badge {
            position: absolute;
            left: 0.5rem;
            bottom: 0.5rem;
            z-index: 2;
            padding: 0.34rem 0.74rem;
            border-radius: 999px;
            font-size: 0.72rem;
            font-weight: 800;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            color: #f8fafc;
            background: linear-gradient(180deg, #48bfff, #1978ff);
            box-shadow:
              0 0 0 1px rgba(255, 255, 255, 0.2) inset,
              0 8px 20px rgba(50, 130, 255, 0.35);
            backdrop-filter: blur(4px);
            pointer-events: none;
          }

          .saga-level-panel-theme .category-info h3 {
            margin: 0 0 0.45rem;
            font-size: clamp(1.12rem, 2.2vw, 1.65rem);
            line-height: 1.1;
            color: #f8fafc;
            text-wrap: balance;
          }

          .saga-level-panel-theme .category-info p {
            margin: 0 0 0.9rem;
            font-size: clamp(0.88rem, 1.45vw, 1rem);
            color: rgba(255, 255, 255, 0.82);
          }

          .saga-level-panel-theme .corner {
            position: absolute;
            width: clamp(18px, 2.5vw, 26px);
            aspect-ratio: 1;
            z-index: 3;
            pointer-events: none;
          }

          .saga-level-panel-theme .corner::before {
            content: "";
            position: absolute;
            inset: 0;
            background: linear-gradient(180deg, #d6fbff, #67dbff 55%, #1e8fff);
            clip-path: polygon(50% 0%, 88% 25%, 100% 70%, 50% 100%, 0% 70%, 12% 25%);
            box-shadow:
              0 0 14px rgba(90, 220, 255, 0.55),
              inset 0 1px 3px rgba(255, 255, 255, 0.7);
          }

          .saga-level-panel-theme .tl { top: 0.3rem; left: 0.3rem; }
          .saga-level-panel-theme .tr { top: 0.3rem; right: 0.3rem; }
          .saga-level-panel-theme .bl { bottom: 0.3rem; left: 0.3rem; }
          .saga-level-panel-theme .br { bottom: 0.3rem; right: 0.3rem; }

          .saga-level-panel-theme .category-card.current .category-frame::after {
            background:
              radial-gradient(circle at 50% 50%, rgba(84, 227, 255, 0.28), transparent 60%);
            animation: sagaPanelPulseGlow 1.8s ease-in-out infinite;
          }

          .saga-level-panel-theme .category-card.current .category-frame {
            filter: drop-shadow(0 0 16px rgba(92, 214, 255, 0.35));
          }

          .saga-level-panel-theme .category-card.completed .category-frame::before {
            background:
              linear-gradient(
                135deg,
                #e9ffd9 0%,
                #72ffb0 25%,
                #2fda7d 50%,
                #72ffb0 75%,
                #e9ffd9 100%
              );
          }

          .saga-level-panel-theme .category-card.completed .category-badge {
            background: linear-gradient(180deg, #41d884, #159a53);
          }

          .saga-level-panel-theme .category-card.locked {
            filter: grayscale(0.35) saturate(0.7);
          }

          .saga-level-panel-theme .category-card.locked .category-frame::before {
            background: linear-gradient(135deg, var(--locked-1), var(--locked-2));
          }

          .saga-level-panel-theme .category-card.locked .category-badge {
            background: linear-gradient(180deg, #8d94a8, #586074);
          }

          .saga-level-panel-theme .category-card.locked .category-content {
            opacity: 0.78;
          }

          .saga-level-panel-theme .category-card.loading {
            opacity: 0.84;
            filter: saturate(0.65);
          }

          .saga-level-panel-theme .category-image-loading {
            width: 100%;
            height: 100%;
            animation: pulse 1.6s ease-in-out infinite;
            background: linear-gradient(
              120deg,
              rgba(148, 163, 184, 0.25) 25%,
              rgba(226, 232, 240, 0.35) 40%,
              rgba(148, 163, 184, 0.25) 55%
            );
          }

          .saga-level-panel-theme .category-image-fallback {
            display: grid;
            place-items: center;
            height: 100%;
            width: 100%;
            text-align: center;
            font-size: 0.8rem;
            color: rgba(241, 245, 249, 0.85);
            font-weight: 600;
          }

          @media (max-width: 640px) {
            .saga-level-panel-theme .category-content {
              grid-template-columns: 1fr;
            }

            .saga-level-panel-theme .category-image {
              min-height: 124px;
            }
          }

          @keyframes sagaPanelBorderFlow {
            0% { filter: hue-rotate(0deg) brightness(1); }
            50% { filter: hue-rotate(18deg) brightness(1.08); }
            100% { filter: hue-rotate(0deg) brightness(1); }
          }

          @keyframes sagaPanelShineSweep {
            0% { transform: translateX(-180%) rotate(18deg); }
            100% { transform: translateX(420%) rotate(18deg); }
          }

          @keyframes sagaPanelPulseGlow {
            0%, 100% { opacity: 0.7; transform: scale(0.99); }
            50% { opacity: 1; transform: scale(1.02); }
          }

          @keyframes pulse {
            0%, 100% {
              opacity: 0.55;
            }
            50% {
              opacity: 1;
            }
          }

          @keyframes sagaPathGlow {
            0%, 100% {
              opacity: 0.35;
              filter: drop-shadow(0 0 2px rgba(125, 211, 252, 0.5));
            }
            50% {
              opacity: 1;
              filter: drop-shadow(0 0 8px rgba(56, 189, 248, 0.9));
            }
          }

          @keyframes sagaPathGlowLocked {
            0%, 100% {
              opacity: 0.35;
              filter: drop-shadow(0 0 2px rgba(248, 113, 113, 0.5));
            }
            50% {
              opacity: 1;
              filter: drop-shadow(0 0 8px rgba(239, 68, 68, 0.9));
            }
          }

          @keyframes sagaPathGlowLoading {
            0%, 100% {
              opacity: 0.3;
              filter: drop-shadow(0 0 2px rgba(203, 213, 225, 0.45));
            }
            50% {
              opacity: 0.9;
              filter: drop-shadow(0 0 7px rgba(226, 232, 240, 0.75));
            }
          }

          @keyframes sagaStarTwinkle {
            0%, 100% {
              opacity: 0.45;
              transform: translateY(0) scale(0.96);
              filter: drop-shadow(0 0 2px rgba(250, 204, 21, 0.25));
            }
            50% {
              opacity: 0.88;
              transform: translateY(-1px) scale(1.05);
              filter: drop-shadow(0 0 6px rgba(250, 204, 21, 0.5));
            }
          }

          @keyframes sagaStarDropIn {
            0% {
              opacity: 0;
              transform: translateY(-150px) scale(0.45) rotate(-16deg);
              filter: drop-shadow(0 0 4px rgba(250, 204, 21, 0.25));
            }
            68% {
              opacity: 1;
              transform: translateY(12px) scale(1.16) rotate(6deg);
              filter: drop-shadow(0 0 12px rgba(251, 191, 36, 0.7));
            }
            100% {
              opacity: 1;
              transform: translateY(0) scale(1);
            }
          }

          @keyframes sagaRewardOverlayIn {
            0% {
              opacity: 0;
              transform: translateY(-12px) scale(0.97);
            }
            100% {
              opacity: 1;
              transform: translateY(0) scale(1);
            }
          }

          @keyframes sagaRewardValuePulse {
            0%, 100% {
              transform: scale(1);
              text-shadow: 0 0 6px rgba(255, 255, 255, 0.15);
            }
            50% {
              transform: scale(1.05);
              text-shadow: 0 0 14px rgba(255, 255, 255, 0.32);
            }
          }

          .saga-reward-overlay-enter {
            animation: sagaRewardOverlayIn 260ms cubic-bezier(0.22, 1, 0.36, 1) both;
          }

          .saga-reward-value {
            animation: sagaRewardValuePulse 0.9s ease-in-out infinite;
          }

          .saga-rating-star {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            line-height: 1;
            font-size: 0;
            animation: sagaStarTwinkle 2.2s ease-in-out infinite;
          }

          .saga-rating-star::before {
            content: "\\2605";
            font-size: clamp(27px, 4.2vw, 38px);
            line-height: 1;
          }

          .saga-rating-star-filled {
            color: rgba(250, 226, 132, 0.9);
            text-shadow:
              0 0 7px rgba(251, 191, 36, 0.55),
              0 0 15px rgba(250, 204, 21, 0.35);
          }

          .saga-rating-star-empty {
            color: rgba(226, 232, 240, 0.45);
            text-shadow: 0 0 4px rgba(148, 163, 184, 0.25);
          }

          html.saga-level-no-scrollbar,
          body.saga-level-no-scrollbar {
            scrollbar-width: none;
            -ms-overflow-style: none;
          }

          html.saga-level-no-scrollbar::-webkit-scrollbar,
          body.saga-level-no-scrollbar::-webkit-scrollbar {
            width: 0;
            height: 0;
            display: none;
          }

          .saga-level-scroll-bg-base {
            background:
              linear-gradient(
                180deg,
                #0a1831 0%,
                #1f447a 50%,
                #0a1831 100%
              );
            background-size: 100% 980px;
            background-repeat: repeat-y;
            background-position: center top;
          }

          .saga-level-scroll-bg-glow {
            background:
              linear-gradient(
                180deg,
                rgba(96, 156, 234, 0) 0%,
                rgba(131, 187, 255, 0.1) 22%,
                rgba(196, 229, 255, 0.46) 50%,
                rgba(131, 187, 255, 0.1) 78%,
                rgba(96, 156, 234, 0) 100%
              ),
              radial-gradient(
                88% 56% at 50% 50%,
                rgba(209, 236, 255, 0.42) 0%,
                rgba(171, 214, 255, 0.2) 46%,
                rgba(113, 156, 221, 0) 80%
              );
            background-size: 100% 980px;
            background-repeat: repeat-y;
            background-position: center top;
            mix-blend-mode: screen;
            opacity: 1;
          }

          .saga-level-scroll-bg-speckles {
            background-image:
              radial-gradient(circle at 14% 42%, rgba(255, 244, 220, 0.62) 0 0.9px, transparent 1.9px),
              radial-gradient(circle at 26% 60%, rgba(202, 235, 255, 0.58) 0 0.85px, transparent 1.8px),
              radial-gradient(circle at 39% 49%, rgba(255, 228, 241, 0.54) 0 0.8px, transparent 1.8px),
              radial-gradient(circle at 51% 58%, rgba(255, 255, 255, 0.6) 0 0.9px, transparent 1.9px),
              radial-gradient(circle at 63% 44%, rgba(196, 233, 255, 0.58) 0 0.85px, transparent 1.8px),
              radial-gradient(circle at 74% 61%, rgba(255, 230, 243, 0.56) 0 0.85px, transparent 1.8px),
              radial-gradient(circle at 86% 48%, rgba(255, 247, 228, 0.6) 0 0.9px, transparent 1.9px);
            background-size: 100% 980px;
            background-repeat: repeat-y;
            background-position: center top;
            opacity: 0.45;
          }
        `}
      </style>
      <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
        <div className="absolute inset-0 saga-level-scroll-bg-base" />
        <div className="absolute inset-0 saga-level-scroll-bg-glow" />
        <div className="absolute inset-0 saga-level-scroll-bg-speckles" />
      </div>
      {backButtonOverlay}
      {economyBarOverlay}
      {completionRewardsOverlay}
      <div className="relative z-10 mx-auto min-h-[100dvh] w-full max-w-5xl flex flex-col gap-2 sm:gap-3">
        <div className="relative flex-1 min-h-0">
        {isShowingLoadingSkeleton ? (
          <div className="pointer-events-none absolute inset-x-0 top-2 z-20 flex justify-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-slate-200/30 bg-slate-900/70 px-3 py-1.5 text-xs font-semibold text-slate-100 backdrop-blur-sm">
              <span className="inline-block h-4 w-4 rounded-full border-2 border-slate-200/75 border-t-transparent animate-spin" />
              Loading saga level...
            </div>
          </div>
        ) : null}
        {errorMessage ? (
          <div className="h-full rounded-xl border border-red-400/40 bg-red-900/20 p-4 text-red-200 grid place-items-center">
            {errorMessage}
          </div>
        ) : !isShowingLoadingSkeleton && rows.length === 0 ? (
          <div className="h-full rounded-xl border border-slate-500/40 bg-slate-900/30 p-4 text-slate-200 grid place-items-center">
            No categories found for this saga level.
          </div>
        ) : (
          <div
            ref={gridRef}
            className="relative grid grid-cols-1 gap-[50px] sm:gap-[56px] auto-rows-[minmax(228px,1fr)] sm:auto-rows-[minmax(258px,1fr)] max-w-4xl mx-auto w-full"
          >
            <svg className="pointer-events-none absolute inset-0 z-0 h-full w-full overflow-visible">
              {pathSegments.map((segment) => (
                <g key={segment.id}>
                  <path
                    d={segment.d}
                    fill="none"
                    stroke={segment.strokeColor}
                    strokeWidth={1.4}
                    strokeLinecap="round"
                  />
                  {segment.dots.map((dot, dotIndex) => (
                    <circle
                      key={`${segment.id}-dot-${dotIndex}`}
                      cx={dot.x}
                      cy={dot.y}
                      r={dot.radius}
                      fill={segment.dotColor}
                      style={{
                        opacity: dot.opacity,
                        animation: `${segment.dotAnimationName} ${dot.duration}s ease-in-out ${dot.delay}s infinite`,
                      }}
                    />
                  ))}
                </g>
              ))}
            </svg>
            {gridCells.map((row, index) => {
              const rowId = getRowId(row);
              const categoryIdForRow = getCategoryId(row);
              const frameShift =
                "max(0px, calc((100vw - clamp(280px, calc(100vw - 48px), 760px) - 40px) / 2))";
              const horizontalOffsetStyle = {
                transform: `translateX(${(index + 1) % 2 === 0 ? "-" : ""}${frameShift})`,
              };
              const categoryImageSrc = row ? getCategoryImageSrc(row) : "";
              const isLoadingPlaceholder = isShowingLoadingSkeleton;
              const isUnlocked = isLoadingPlaceholder ? false : isRowUnlocked(index, row);
              const isCategoryDisabled = Boolean(categoryIdForRow && row?.category?.disabled);
              const isLockedByProgress = Boolean(categoryIdForRow) && !isUnlocked;
              const isVisuallyNotPlayable = isCategoryDisabled || isLockedByProgress;
              const shouldShowFrameAura =
                !isLoadingPlaceholder &&
                index === lastPlayableRowIndex &&
                Boolean(categoryIdForRow) &&
                !isCategoryDisabled &&
                isUnlocked;
              const isFrameDisabled =
                isLoadingPlaceholder ||
                !categoryIdForRow ||
                isCategoryDisabled ||
                startingCategoryId !== null ||
                !isUnlocked;
              const completionOverrideForRow =
                rowId && completionStarsOverride?.rowId === rowId
                  ? completionStarsOverride
                  : null;
              const isCompleted = Boolean(row?.isCompleted || completionOverrideForRow);
              const shouldRenderCompletedStars = isCompleted;
              const filledStars = completionOverrideForRow
                ? completionOverrideForRow.filledCount
                : getFilledStarCount(row);
              const isCompletionAnimationTarget = Boolean(
                rowId &&
                completionStarAnimationRowId &&
                rowId === completionStarAnimationRowId &&
                isCompletionStarAnimationActive,
              );
              const isCompletionTargetRow = Boolean(
                rowId &&
                completionStarAnimationRowId &&
                rowId === completionStarAnimationRowId,
              );
              const shouldDeferCompletedStars = Boolean(
                rowId &&
                deferredCompletedStarsRowId &&
                rowId === deferredCompletedStarsRowId,
              );
              const shouldHideCompletedStars =
                shouldDeferCompletedStars ||
                (isCompletionAnimationTarget && showCompletionFlyInOverlay);
              const panelStatusClass = isLoadingPlaceholder
                ? "loading"
                : isVisuallyNotPlayable
                  ? "locked"
                  : isCompleted
                    ? "completed"
                    : shouldShowFrameAura
                      ? "current"
                      : "";
              const badgeLabel = isLoadingPlaceholder
                ? "Loading"
                : isCategoryDisabled
                  ? "Unavailable"
                  : isLockedByProgress
                    ? "Locked"
                    : isCompleted
                      ? "Play Again"
                      : shouldShowFrameAura
                        ? "Next Up"
                        : "Ready";
              return (
                <div
                  key={rowId || `placeholder-${index}`}
                  ref={(element) => {
                    frameRefs.current[index] = element;
                  }}
                  className="relative z-10 mx-auto w-[clamp(280px,calc(100vw-48px),760px)]"
                  style={horizontalOffsetStyle}
                >
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => {
                      if (isLoadingPlaceholder) return;
                      const categoryId = categoryIdForRow;
                      if (!categoryId) return;
                      if (isCategoryDisabled) {
                        toast({
                          title: "Category Unavailable",
                          description: "This saga category is currently disabled.",
                          variant: "destructive",
                        });
                        return;
                      }
                      if (!isUnlocked) {
                        showLockedMessage(rowId || undefined);
                        return;
                      }
                      handleStartCategoryQuiz(categoryId, rowId || undefined);
                    }}
                    onKeyDown={(event) => {
                      if (isLoadingPlaceholder) return;
                      const categoryId = categoryIdForRow;
                      if ((event.key === "Enter" || event.key === " ") && categoryId) {
                        event.preventDefault();
                        if (isCategoryDisabled) {
                          toast({
                            title: "Category Unavailable",
                            description: "This saga category is currently disabled.",
                            variant: "destructive",
                          });
                          return;
                        }
                        if (!isUnlocked) {
                          showLockedMessage(rowId || undefined);
                          return;
                        }
                        handleStartCategoryQuiz(categoryId, rowId || undefined);
                      }
                    }}
                    aria-disabled={isFrameDisabled}
                    className={`rounded-[1.35rem] transition-transform ${
                      isLoadingPlaceholder
                        ? "opacity-90 cursor-default"
                        : categoryIdForRow && !isCategoryDisabled && startingCategoryId === null && isUnlocked
                        ? "cursor-pointer"
                        : categoryIdForRow && (isCategoryDisabled || !isUnlocked)
                          ? "cursor-not-allowed"
                          : "opacity-80 cursor-default"
                    }`}
                  >
                    <div className={`category-card ${panelStatusClass}`}>
                      <div className="category-frame">
                        {!isLoadingPlaceholder ? (
                          <>
                            <span className="corner tl" />
                            <span className="corner tr" />
                            <span className="corner bl" />
                            <span className="corner br" />
                          </>
                        ) : null}
                        <div className="category-content">
                          <div className="category-image">
                            {isLoadingPlaceholder ? (
                              <div className="category-image-loading" />
                            ) : row && categoryImageSrc ? (
                              <img
                                src={categoryImageSrc}
                                alt={row.category?.name || "Category image"}
                                onError={(event) => {
                                  const element = event.currentTarget;
                                  element.src = DEFAULT_CATEGORY_IMAGE_SRC;
                                }}
                              />
                            ) : (
                              <div className="category-image-fallback">
                                {isCategoryDisabled ? "Unavailable" : isLockedByProgress ? "Locked" : ""}
                              </div>
                            )}
                            {!isLoadingPlaceholder ? (
                              <div className="category-badge">{badgeLabel}</div>
                            ) : null}
                          </div>
                          <div className="category-info">
                            {isLoadingPlaceholder ? (
                              <div className="mb-2 h-6 w-[72%] rounded-md bg-slate-200/20 animate-pulse" />
                            ) : (
                              <>
                                <h3>{row?.category?.name || "Category"}</h3>
                                {shouldRenderCompletedStars ? (
                                  <div
                                    className="pointer-events-none mt-1.5 flex w-full items-center justify-center gap-1"
                                    style={shouldHideCompletedStars ? { opacity: 0 } : undefined}
                                  >
                                    {Array.from({ length: STAR_COUNT }, (_, starIndex) => {
                                      const isFilled = starIndex < filledStars;
                                      const baseDelay = (index * STAR_COUNT + starIndex) * 0.12;
                                      const dropDelay = starIndex * 0.1;
                                      return (
                                        <span
                                          key={`${rowId || `row-${index}`}-star-${starIndex}-${isCompletionTargetRow ? `run-${completionStarAnimationRunId}` : "steady"}`}
                                          ref={(element) => {
                                            if (!rowId) return;
                                            starSlotRefs.current[getStarSlotRefKey(rowId, starIndex)] = element;
                                          }}
                                          aria-hidden="true"
                                          className={`saga-rating-star ${isFilled ? "saga-rating-star-filled" : "saga-rating-star-empty"}`}
                                          style={{
                                            animation: isCompletionAnimationTarget
                                              ? `sagaStarDropIn 900ms cubic-bezier(0.18,0.9,0.25,1.15) ${dropDelay}s both, sagaStarTwinkle 2.2s ease-in-out ${1.1 + dropDelay}s infinite`
                                              : undefined,
                                            animationDelay: isCompletionAnimationTarget
                                              ? undefined
                                              : `${baseDelay}s`,
                                          }}
                                        >
                                          {"\u2605"}
                                        </span>
                                      );
                                    })}
                                  </div>
                                ) : null}
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                      {rowId && isCategoryDisabled ? (
                        <div className="pointer-events-none absolute inset-x-4 bottom-3 z-30 rounded-md bg-black/70 px-3 py-2 text-center text-[11px] sm:text-sm font-semibold text-slate-100">
                          This category is currently disabled.
                        </div>
                      ) : null}
                      {rowId && lockedMessageRowId === rowId ? (
                        <div className="pointer-events-none absolute inset-x-4 bottom-3 z-30 rounded-md bg-black/80 px-3 py-2 text-center text-[11px] sm:text-sm font-semibold text-amber-100">
                          You must first complete the previous quiz.
                        </div>
                      ) : null}
                    </div>
                  </div>
                  {false ? (
                    <div
                      className="pointer-events-none absolute left-1/2 bottom-[32px] z-20 -translate-x-1/2 flex items-center gap-1 rounded-full px-2 py-0.5 bg-black/20"
                      style={isCompletionAnimationTarget && showCompletionFlyInOverlay ? { opacity: 0 } : undefined}
                    >
                      {Array.from({ length: STAR_COUNT }, (_, starIndex) => {
                        const isFilled = starIndex < filledStars;
                        const baseDelay = (index * STAR_COUNT + starIndex) * 0.12;
                        const dropDelay = starIndex * 0.1;
                        return (
                          <span
                            key={`${rowId || `row-${index}`}-star-${starIndex}-${isCompletionTargetRow ? `run-${completionStarAnimationRunId}` : "steady"}`}
                            ref={(element) => {
                              if (!rowId) return;
                              starSlotRefs.current[getStarSlotRefKey(rowId, starIndex)] = element;
                            }}
                            aria-hidden="true"
                            className={`saga-rating-star ${isFilled ? "saga-rating-star-filled" : "saga-rating-star-empty"}`}
                            style={{
                              animation: isCompletionAnimationTarget
                                ? `sagaStarDropIn 900ms cubic-bezier(0.18,0.9,0.25,1.15) ${dropDelay}s both, sagaStarTwinkle 2.2s ease-in-out ${1.1 + dropDelay}s infinite`
                                : undefined,
                              animationDelay: isCompletionAnimationTarget
                                ? undefined
                                : `${baseDelay}s`,
                            }}
                          >
                            ★
                          </span>
                        );
                      })}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}
        </div>
        <div ref={bottomAnchorRef} />
      </div>
      {completionFlyInOverlay}
    </div>
  );
}
