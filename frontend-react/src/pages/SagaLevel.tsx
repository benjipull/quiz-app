import { useEffect, useRef, useState } from "react";
import { Navigate, useLocation, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Lock, Star } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import { useUser } from "@/contexts/UserContext";
import { getApiBaseUrl } from "@/utils/baseUrl";
import { useToast } from "@/hooks/use-toast";

const BASE_URL = getApiBaseUrl();
const QUIZ_COST = 100;
const STAR_COUNT = 5;
const QUIZ_COMPLETION_SIGNAL_MAX_AGE_MS = 2 * 60 * 1000;
const QUIZ_COMPLETION_SCROLL_TO_COMPLETED_DELAY_MS = 120;
const QUIZ_COMPLETION_SCROLL_SETTLE_BEFORE_STARS_MS = 820;
const QUIZ_COMPLETION_STARS_SEQUENCE_MS = 3400;
const WOODEN_FRAME_SRC = "/assets/images/SagaLevelGraphics/wooden-frame.png";
const DEFAULT_CATEGORY_IMAGE_SRC = "/assets/images/SagaLevelGraphics/Enchanted-Forest.png";

type SagaLevelRow = {
  _id: string;
  sagaNumber: number;
  isCompleted?: boolean;
  completionRating?: number;
  category: {
    _id: string;
    name: string;
    imageUrl: string;
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
  fromQuizCompletion?: boolean;
  completedSagaLevelId?: string | null;
  completedCategoryId?: string | null;
  completedStarCount?: number | null;
  completedAt?: number;
};

type SagaLevelCompletionReturnStorage = {
  path?: string;
  completedSagaLevelId?: string | null;
  completedCategoryId?: string | null;
  completedStarCount?: number | null;
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

  const [rows, setRows] = useState<SagaLevelRow[]>([]);
  const [isLoadingRows, setIsLoadingRows] = useState(true);
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
  const [showEntryTransitionCover, setShowEntryTransitionCover] = useState(cameFromSagaMap);
  const [pathSegments, setPathSegments] = useState<SagaPathSegment[]>([]);
  const gridRef = useRef<HTMLDivElement | null>(null);
  const frameRefs = useRef<Array<HTMLDivElement | null>>([]);
  const starSlotRefs = useRef<Record<string, HTMLSpanElement | null>>({});
  const lockMessageTimerRef = useRef<number | null>(null);
  const entryTransitionStartAtRef = useRef<number>(
    cameFromSagaMap ? Date.now() : 0
  );
  const hasAutoScrolledRef = useRef(false);
  const hasHandledCompletionReturnRef = useRef(false);
  const bottomAnchorRef = useRef<HTMLDivElement | null>(null);
  const currentCoins = user?.coins ?? 0;
  const displayRows = rows.slice(0, 6);
  const gridCells: Array<SagaLevelRow | null> = [
    ...displayRows,
    ...Array.from({ length: Math.max(0, 6 - displayRows.length) }, () => null),
  ];
  const getCategoryImageSrc = (row: SagaLevelRow) => {
    const image64 = row.category?.image64?.trim();
    if (image64 && image64 !== "null" && image64 !== "undefined") {
      return image64.startsWith("data:")
        ? image64
        : `data:image/png;base64,${image64}`;
    }
    const imageUrl = row.category?.imageUrl?.trim() || "";
    if (imageUrl) return imageUrl;
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
    if (loading || !user || user.userType !== "Admin" || !hasValidSagaNumber) return;

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
      try {
        const response = await fetch(`${BASE_URL}/api/saga/levels/${sagaNumber}`, {
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
  }, [loading, user?._id, user?.userType, hasValidSagaNumber, sagaNumber]);

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
  }, [sagaNumber]);

  useEffect(() => {
    if (cameFromSagaMap) {
      entryTransitionStartAtRef.current = Date.now();
      setShowEntryTransitionCover(true);
      return;
    }

    setShowEntryTransitionCover(false);
  }, [cameFromSagaMap, sagaNumber]);

  useEffect(() => {
    if (!showEntryTransitionCover || isLoadingRows) {
      return;
    }

    const minVisibleDurationMs = 520;
    const elapsed = Date.now() - entryTransitionStartAtRef.current;
    const remaining = Math.max(0, minVisibleDurationMs - elapsed);
    const timerId = window.setTimeout(() => {
      setShowEntryTransitionCover(false);
    }, remaining);

    return () => {
      window.clearTimeout(timerId);
    };
  }, [showEntryTransitionCover, isLoadingRows]);

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
      setIsCompletionStarAnimationActive(false);
      setShowCompletionFlyInOverlay(false);
      setCompletionFlyInStars([]);
      setIsCompletionFlyInInMotion(false);
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
    if (isLoadingRows || rows.length < 2) {
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
          const useLockedPathColor = Boolean(sourceRow && !sourceRow.isCompleted);

          const start: Point = {
            x: lowerFrameRect.left + lowerFrameRect.width / 2 - gridRect.left,
            y: lowerFrameRect.top - gridRect.top + 60,
          };
          const end: Point = {
            x: upperFrameRect.left + upperFrameRect.width / 2 - gridRect.left,
            y: upperFrameRect.bottom - gridRect.top - 60,
          };

          const verticalDistance = Math.abs(start.y - end.y);
          const horizontalDelta = end.x - start.x;
          const bendDirection = horizontalDelta >= 0 ? 1 : -1;
          const curveLift = Math.max(120, verticalDistance * 0.42);
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
            strokeColor: useLockedPathColor
              ? "rgba(248, 113, 113, 0.5)"
              : "rgba(125, 211, 252, 0.35)",
            dotColor: useLockedPathColor
              ? "rgba(254, 202, 202, 0.95)"
              : "rgba(186, 230, 253, 0.95)",
            dotAnimationName: useLockedPathColor ? "sagaPathGlowLocked" : "sagaPathGlow",
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
  }, [isLoadingRows, rows]);

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

  if (loading) {
    return (
      <div className="min-h-[100dvh] grid place-items-center bg-[#0b1325] text-slate-200">
        Loading Saga Level...
      </div>
    );
  }

  if (!user || user.userType !== "Admin") {
    return <Navigate to="/" replace />;
  }

  if (!hasValidSagaNumber) {
    return <Navigate to="/saga-map" replace />;
  }

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

  return (
    <div
      className="relative min-h-[100dvh] px-2 sm:px-4 py-2 sm:py-3 pb-[max(0.5rem,env(safe-area-inset-bottom))] overflow-x-hidden"
    >
      <style>
        {`
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

          @keyframes sagaFrameAura {
            0%, 100% {
              opacity: 0.55;
              transform: scale(1);
              filter:
                drop-shadow(0 0 6px rgba(253, 224, 150, 0.35))
                drop-shadow(0 0 12px rgba(217, 119, 6, 0.25));
            }
            50% {
              opacity: 0.95;
              transform: scale(1.015);
              filter:
                drop-shadow(0 0 12px rgba(253, 224, 150, 0.55))
                drop-shadow(0 0 24px rgba(217, 119, 6, 0.4));
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

          .saga-rating-star {
            display: inline-block;
            line-height: 1;
            font-size: clamp(18px, 2.8vw, 25px);
            animation: sagaStarTwinkle 2.2s ease-in-out infinite;
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
        `}
      </style>
      <Button
        type="button"
        size="sm"
        variant="outline"
        onClick={() => navigate("/saga-map")}
        className="fixed top-[max(0.5rem,env(safe-area-inset-top))] left-2 sm:left-4 z-[70] h-8 px-2 sm:px-3 border-cyan-300/60 text-cyan-100 hover:bg-cyan-500/15"
      >
        <ArrowLeft className="h-4 w-4" />
        <span className="ml-1 hidden sm:inline">Back</span>
      </Button>
      <div className="relative z-10 mx-auto min-h-[100dvh] w-full max-w-5xl flex flex-col gap-2 sm:gap-3">
        <div className="flex-1 min-h-0">
        {isLoadingRows ? (
          <div className="h-full rounded-xl border border-cyan-400/30 bg-cyan-900/20 p-4 text-cyan-100 grid place-items-center">
            Loading categories...
          </div>
        ) : errorMessage ? (
          <div className="h-full rounded-xl border border-red-400/40 bg-red-900/20 p-4 text-red-200 grid place-items-center">
            {errorMessage}
          </div>
        ) : rows.length === 0 ? (
          <div className="h-full rounded-xl border border-slate-500/40 bg-slate-900/30 p-4 text-slate-200 grid place-items-center">
            No categories found for this saga level.
          </div>
        ) : (
          <div
            ref={gridRef}
            className="relative grid grid-cols-1 gap-[62px] sm:gap-[66px] auto-rows-[minmax(330px,1fr)] sm:auto-rows-[minmax(420px,1fr)] max-w-4xl mx-auto w-full"
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
                "max(0px, calc((100vw - clamp(260px, calc(100vw - 200px), 760px) - 40px) / 2))";
              const horizontalOffsetStyle = {
                transform: `translateX(${(index + 1) % 2 === 0 ? "-" : ""}${frameShift})`,
              };
              const categoryImageSrc = row ? getCategoryImageSrc(row) : "";
              const isUnlocked = isRowUnlocked(index, row);
              const isCategoryDisabled = Boolean(categoryIdForRow && row?.category?.disabled);
              const isLockedByProgress = Boolean(categoryIdForRow) && !isUnlocked;
              const isVisuallyNotPlayable = isCategoryDisabled || isLockedByProgress;
              const isFrameDisabled =
                !categoryIdForRow || isCategoryDisabled || startingCategoryId !== null || !isUnlocked;
              const nonPlayableVisualClasses = isVisuallyNotPlayable
                ? "grayscale opacity-80"
                : "";
              const completionOverrideForRow =
                rowId && completionStarsOverride?.rowId === rowId
                  ? completionStarsOverride
                  : null;
              const shouldRenderCompletedStars = Boolean(row?.isCompleted || completionOverrideForRow);
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
              return (
                <div
                  key={rowId || `placeholder-${index}`}
                  ref={(element) => {
                    frameRefs.current[index] = element;
                  }}
                  className="relative z-10 mx-auto w-[clamp(260px,calc(100vw-200px),760px)]"
                  style={horizontalOffsetStyle}
                >
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => {
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
                    className={`rounded-lg p-1 sm:p-2 transition-transform overflow-hidden ${
                      categoryIdForRow && !isCategoryDisabled && startingCategoryId === null && isUnlocked
                        ? "cursor-pointer hover:scale-[1.01]"
                        : categoryIdForRow && (isCategoryDisabled || !isUnlocked)
                          ? "cursor-not-allowed"
                          : "opacity-80 cursor-default"
                    }`}
                  >
                    <div className="relative h-full min-h-[330px] sm:min-h-[420px]">
                      <div className="h-full w-full">
                        <div className="absolute left-[calc(53%-5px)] top-[calc(56%+10px)] z-[8] w-[calc(77%-20px)] h-[calc(67%-20px)] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-sm bg-black/15">
                          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_35%,rgba(255,255,255,0.16),rgba(255,255,255,0)_62%),linear-gradient(180deg,rgba(2,6,23,0.32),rgba(2,6,23,0.58))]" />
                          {row && categoryImageSrc ? (
                            <img
                              src={categoryImageSrc}
                              alt={row.category?.name || "Category image"}
                              className={`relative z-10 h-full w-full object-contain ${nonPlayableVisualClasses}`}
                              onError={(event) => {
                                const element = event.currentTarget;
                                element.src = DEFAULT_CATEGORY_IMAGE_SRC;
                              }}
                            />
                          ) : (
                            <div className="relative z-10 grid h-full w-full place-items-center text-[10px] sm:text-xs font-semibold text-slate-200/85">
                              {isCategoryDisabled ? "Unavailable" : isLockedByProgress ? "Locked" : ""}
                            </div>
                          )}
                        </div>
                        <div className="absolute left-1/2 top-[calc(18%+20px)] z-20 w-[60%] -translate-x-1/2 pointer-events-none">
                          <p className="text-[#F2E1BF] font-bold text-sm sm:text-base text-center truncate drop-shadow-[0_1px_1px_rgba(0,0,0,0.65)]">
                            {row?.category?.name || " "}
                          </p>
                        </div>
                        <>
                          <img
                            src={WOODEN_FRAME_SRC}
                            alt=""
                            aria-hidden="true"
                            className={`absolute inset-0 z-[9] h-full w-full object-contain pointer-events-none ${nonPlayableVisualClasses}`}
                            style={{
                              animation: "sagaFrameAura 2.8s ease-in-out infinite",
                            }}
                          />
                          <img
                            src={WOODEN_FRAME_SRC}
                            alt=""
                            aria-hidden="true"
                            className={`absolute inset-0 z-10 h-full w-full object-contain pointer-events-none drop-shadow-[0_2px_6px_rgba(0,0,0,0.45)] ${nonPlayableVisualClasses}`}
                          />
                        </>
                      </div>
                      {rowId && isCategoryDisabled ? (
                        <div className="pointer-events-none absolute inset-x-4 bottom-8 z-30 rounded-md bg-black/75 px-3 py-2 text-center text-[11px] sm:text-sm font-semibold text-slate-200">
                          This category is currently disabled.
                        </div>
                      ) : null}
                      {rowId && isLockedByProgress ? (
                        <div className="pointer-events-none absolute left-1/2 bottom-8 z-30 -translate-x-1/2 rounded-full bg-black/75 p-2 text-slate-200">
                          <Lock className="h-4 w-4 sm:h-5 sm:w-5" aria-hidden="true" />
                        </div>
                      ) : null}
                      {rowId && lockedMessageRowId === rowId ? (
                        <div className="pointer-events-none absolute inset-x-4 bottom-8 z-30 rounded-md bg-black/75 px-3 py-2 text-center text-[11px] sm:text-sm font-semibold text-amber-100">
                          You must first complete the previous quiz.
                        </div>
                      ) : null}
                    </div>
                  </div>
                  {shouldRenderCompletedStars ? (
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
      <AnimatePresence>
        {showEntryTransitionCover ? (
          <motion.div
            key="saga-level-entry-transition-cover"
            className="fixed inset-0 z-[130] pointer-events-auto"
            initial={{ opacity: 1 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] } }}
          >
            <div
              className="absolute inset-0"
              style={{
                background:
                  "linear-gradient(180deg, #050b16 0%, #071125 54%, #0b1730 100%)",
              }}
            />
            <motion.div
              className="absolute inset-0"
              style={{
                background:
                  "radial-gradient(circle at 20% 22%, rgba(56,189,248,0.34) 0%, rgba(56,189,248,0) 38%), radial-gradient(circle at 80% 72%, rgba(34,197,94,0.18) 0%, rgba(34,197,94,0) 32%)",
              }}
              animate={{ opacity: [0.5, 0.86, 0.5], scale: [1, 1.02, 1] }}
              transition={{ duration: 1.35, repeat: Infinity, ease: "easeInOut" }}
            />
            <motion.div
              className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-cyan-300/50 bg-cyan-950/55 px-4 py-2 text-sm font-semibold text-cyan-100 backdrop-blur-sm"
              animate={{ opacity: [0.72, 1, 0.72] }}
              transition={{ duration: 1.05, repeat: Infinity, ease: "easeInOut" }}
            >
              Loading Saga Level...
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
