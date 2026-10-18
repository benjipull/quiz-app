import { useEffect, useRef, useState, type CSSProperties } from "react";
import { Navigate, useLocation, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Star } from "lucide-react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import { useUser } from "@/contexts/UserContext";
import { getApiBaseUrl } from "@/utils/baseUrl";
import { useToast } from "@/hooks/use-toast";
import { trackEnteredSagaLevelMap } from "@/utils/analytics";
import GameStatsHeader from "@/components/GameStatsHeader";
import { avatarUrls } from "@/utils/avatarPaths";
import { playSound } from "@/utils/soundCache";
import { loadLevelConfig, resolveLevelProgress, type LevelConfigEntry } from "@/utils/levelConfig";

const BASE_URL = getApiBaseUrl();
const QUIZ_COST = 100;
const STAR_COUNT = 5;
const QUIZ_COMPLETION_SIGNAL_MAX_AGE_MS = 2 * 60 * 1000;
const QUIZ_COMPLETION_SCROLL_TO_COMPLETED_DELAY_MS = 120;
const QUIZ_COMPLETION_SCROLL_SETTLE_BEFORE_STARS_MS = 820;
const QUIZ_COMPLETION_STARS_SEQUENCE_MS = 4110;
const QUIZ_COMPLETION_PANEL_REVEAL_ANIMATION_MS = 980;
const QUIZ_COMPLETION_CENTER_COIN_LAUNCH_DELAY_MS = 680;
const QUIZ_COMPLETION_CENTER_COIN_FLIGHT_MS = 1180;
const QUIZ_COMPLETION_CENTER_COIN_STAGGER_MS = 110;
const QUIZ_COMPLETION_CENTER_MINI_COIN_COUNT = 15;
const QUIZ_COMPLETION_CENTER_MINI_COIN_SIZE_PX = 60;
const QUIZ_COMPLETION_CENTER_COIN_HIDE_TAIL_MS = 290;
const QUIZ_COMPLETION_CENTER_REWARD_PHASE_GAP_MS = 180;
const QUIZ_COMPLETION_COIN_PHASE_TOTAL_MS =
  QUIZ_COMPLETION_CENTER_COIN_LAUNCH_DELAY_MS +
  QUIZ_COMPLETION_CENTER_COIN_FLIGHT_MS +
  QUIZ_COMPLETION_CENTER_COIN_STAGGER_MS * (QUIZ_COMPLETION_CENTER_MINI_COIN_COUNT - 1) +
  QUIZ_COMPLETION_CENTER_COIN_HIDE_TAIL_MS;
const QUIZ_PANEL_SWAY_DURATION_MS = 500;
const DEFAULT_CATEGORY_IMAGE_SRC = "/assets/images/SagaLevelGraphics/Enchanted-Forest.png";
const SAGA_CATEGORY_CACHE_STORAGE_KEY = "saga_category_cache_v1";
const SAGA_CATEGORY_CACHE_MAX_ITEMS = 90;
const SAGA_CATEGORY_CACHE_MAX_BYTES = 3_500_000;

type SagaLevelCategory = {
  _id: string;
  name?: string;
  image64?: string;
  disabled?: boolean;
};

type SagaLevelRow = {
  _id: string;
  sagaNumber: number;
  isCompleted?: boolean;
  completionRating?: number;
  category: SagaLevelCategory | null;
};

type SagaCategoryPayload = {
  _id: string;
  name: string;
  image64: string;
  disabled: boolean;
};

type SagaCategoryCacheEntry = SagaCategoryPayload & {
  cachedAt: number;
};

type SagaCategoryCacheMap = Record<string, SagaCategoryCacheEntry>;

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

type CompletionMiniCoin = {
  id: string;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  delay: number;
  startScale: number;
  endScale: number;
  startRotateDeg: number;
  endRotateDeg: number;
};

const getCompletionRewardPhaseTotalMs = (
  hasCoinPhase: boolean,
  hasKpPhase: boolean,
) => {
  if (!hasCoinPhase && !hasKpPhase) return 0;
  if (hasCoinPhase && hasKpPhase) {
    return QUIZ_COMPLETION_COIN_PHASE_TOTAL_MS +
      QUIZ_COMPLETION_CENTER_REWARD_PHASE_GAP_MS +
      QUIZ_COMPLETION_COIN_PHASE_TOTAL_MS;
  }
  return QUIZ_COMPLETION_COIN_PHASE_TOTAL_MS;
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

const normalizeSagaLevelCategory = (value: unknown): SagaLevelCategory | null => {
  const categoryId = normalizeId(
    typeof value === "object" && value !== null
      ? (value as Record<string, unknown>)._id ?? value
      : value,
  );
  if (!categoryId) return null;

  if (typeof value !== "object" || value === null) {
    return { _id: categoryId };
  }

  const asRecord = value as Record<string, unknown>;
  const name = typeof asRecord.name === "string" ? asRecord.name : undefined;
  const image64 = typeof asRecord.image64 === "string" ? asRecord.image64 : undefined;
  const disabled = typeof asRecord.disabled === "boolean" ? asRecord.disabled : undefined;

  return {
    _id: categoryId,
    name,
    image64,
    disabled,
  };
};

const normalizeSagaLevelRows = (rowsValue: unknown): SagaLevelRow[] => {
  if (!Array.isArray(rowsValue)) return [];

  return rowsValue.map((rowValue, index) => {
    const rowRecord =
      typeof rowValue === "object" && rowValue !== null
        ? (rowValue as Record<string, unknown>)
        : {};
    const category = normalizeSagaLevelCategory(rowRecord.category);
    const fallbackRowId = `${Number(rowRecord.sagaNumber || 0)}-${category?._id || index}`;
    const normalizedRowId = normalizeId(rowRecord._id) || fallbackRowId;
    const normalizedSagaNumber = Number(rowRecord.sagaNumber || 0);
    const normalizedCompletionRating = Number(rowRecord.completionRating || 0);

    return {
      _id: normalizedRowId,
      sagaNumber:
        Number.isFinite(normalizedSagaNumber) && normalizedSagaNumber > 0
          ? normalizedSagaNumber
          : 0,
      isCompleted: Boolean(rowRecord.isCompleted),
      completionRating: Number.isFinite(normalizedCompletionRating)
        ? normalizedCompletionRating
        : 0,
      category,
    };
  });
};

const toPersistableSagaCategory = (
  category: SagaLevelCategory | null | undefined,
): SagaCategoryPayload | null => {
  const categoryId = normalizeId(category?._id);
  if (!categoryId) return null;

  const name = typeof category?.name === "string" ? category.name : "";
  const image64 = typeof category?.image64 === "string" ? category.image64 : "";
  const disabled = Boolean(category?.disabled);
  const hasPayload = Boolean(name.trim() || image64.trim() || category?.disabled === true);
  if (!hasPayload) return null;

  return {
    _id: categoryId,
    name,
    image64,
    disabled,
  };
};

const collectSagaCategoriesFromRows = (rows: SagaLevelRow[]): SagaCategoryPayload[] => {
  const seenIds = new Set<string>();
  const categories: SagaCategoryPayload[] = [];

  rows.forEach((row) => {
    const payload = toPersistableSagaCategory(row.category);
    if (!payload || seenIds.has(payload._id)) return;
    seenIds.add(payload._id);
    categories.push(payload);
  });

  return categories;
};

const trimSagaCategoryCache = (cache: SagaCategoryCacheMap): SagaCategoryCacheMap => {
  const sortedEntries = Object.values(cache).sort(
    (left, right) => (right.cachedAt || 0) - (left.cachedAt || 0),
  );
  const trimmedByCount = sortedEntries.slice(0, SAGA_CATEGORY_CACHE_MAX_ITEMS);
  const trimmedByBytes: SagaCategoryCacheMap = {};
  let estimatedSize = 2;

  for (const entry of trimmedByCount) {
    const normalizedId = normalizeId(entry._id);
    if (!normalizedId) continue;
    const normalizedEntry: SagaCategoryCacheEntry = {
      _id: normalizedId,
      name: typeof entry.name === "string" ? entry.name : "",
      image64: typeof entry.image64 === "string" ? entry.image64 : "",
      disabled: Boolean(entry.disabled),
      cachedAt: Number.isFinite(entry.cachedAt) ? entry.cachedAt : 0,
    };
    const serializedEntry = JSON.stringify({ [normalizedId]: normalizedEntry });
    if (estimatedSize + serializedEntry.length > SAGA_CATEGORY_CACHE_MAX_BYTES) {
      break;
    }

    trimmedByBytes[normalizedId] = normalizedEntry;
    estimatedSize += serializedEntry.length;
  }

  return trimmedByBytes;
};

const readSagaCategoryCache = (): SagaCategoryCacheMap => {
  if (typeof window === "undefined") return {};

  try {
    const raw = localStorage.getItem(SAGA_CATEGORY_CACHE_STORAGE_KEY);
    if (!raw) return {};

    const parsed = JSON.parse(raw) as Record<string, unknown>;
    if (!parsed || typeof parsed !== "object") return {};

    const cache: SagaCategoryCacheMap = {};
    Object.entries(parsed).forEach(([key, value]) => {
      if (!value || typeof value !== "object") return;
      const asRecord = value as Record<string, unknown>;
      const categoryId = normalizeId(asRecord._id ?? key);
      if (!categoryId) return;

      cache[categoryId] = {
        _id: categoryId,
        name: typeof asRecord.name === "string" ? asRecord.name : "",
        image64: typeof asRecord.image64 === "string" ? asRecord.image64 : "",
        disabled: Boolean(asRecord.disabled),
        cachedAt: Number(asRecord.cachedAt || 0),
      };
    });

    return trimSagaCategoryCache(cache);
  } catch {
    return {};
  }
};

const writeSagaCategoryCache = (cache: SagaCategoryCacheMap) => {
  if (typeof window === "undefined") return;

  try {
    localStorage.setItem(
      SAGA_CATEGORY_CACHE_STORAGE_KEY,
      JSON.stringify(trimSagaCategoryCache(cache)),
    );
  } catch (error) {
    console.warn("Failed to persist saga category cache:", error);
  }
};

const upsertSagaCategoryCache = (
  currentCache: SagaCategoryCacheMap,
  categories: SagaCategoryPayload[],
): SagaCategoryCacheMap => {
  if (!categories.length) return currentCache;

  const now = Date.now();
  const nextCache: SagaCategoryCacheMap = { ...currentCache };

  categories.forEach((category) => {
    const categoryId = normalizeId(category._id);
    if (!categoryId) return;

    nextCache[categoryId] = {
      _id: categoryId,
      name: category.name || "",
      image64: category.image64 || "",
      disabled: Boolean(category.disabled),
      cachedAt: now,
    };
  });

  return trimSagaCategoryCache(nextCache);
};

const hydrateRowsWithSagaCategoryCache = (
  rows: SagaLevelRow[],
  categoryCache: SagaCategoryCacheMap,
): { rows: SagaLevelRow[]; missingCategoryIds: string[] } => {
  const missingCategoryIds = new Set<string>();
  const hydratedRows = rows.map((row) => {
    const categoryId = normalizeId(row.category?._id);
    if (!categoryId) {
      return {
        ...row,
        category: null,
      };
    }

    const cachedCategory = categoryCache[categoryId];
    if (!cachedCategory) {
      missingCategoryIds.add(categoryId);
      return {
        ...row,
        category: {
          _id: categoryId,
          name: row.category?.name,
          image64: row.category?.image64,
          disabled: row.category?.disabled,
        },
      };
    }

    return {
      ...row,
      category: {
        _id: categoryId,
        name: cachedCategory.name,
        image64: cachedCategory.image64,
        disabled: cachedCategory.disabled,
      },
    };
  });

  return {
    rows: hydratedRows,
    missingCategoryIds: Array.from(missingCategoryIds),
  };
};

const fetchSagaCategoriesByIds = async (
  userToken: string,
  categoryIds: string[],
): Promise<SagaCategoryPayload[]> => {
  if (!categoryIds.length) return [];

  const response = await fetch(
    `${BASE_URL}/api/saga/categories?ids=${encodeURIComponent(categoryIds.join(","))}`,
    {
      headers: {
        Authorization: `Bearer ${userToken}`,
      },
    },
  );

  if (!response.ok) {
    throw new Error(`Failed with status ${response.status}`);
  }

  const data = await response.json();
  if (!Array.isArray(data?.categories)) return [];

  return data.categories
    .map((categoryValue: unknown) => {
      if (!categoryValue || typeof categoryValue !== "object") return null;
      const categoryRecord = categoryValue as Record<string, unknown>;
      const categoryId = normalizeId(categoryRecord._id);
      if (!categoryId) return null;

      return {
        _id: categoryId,
        name: typeof categoryRecord.name === "string" ? categoryRecord.name : "",
        image64: typeof categoryRecord.image64 === "string" ? categoryRecord.image64 : "",
        disabled: Boolean(categoryRecord.disabled),
      };
    })
    .filter(Boolean) as SagaCategoryPayload[];
};

type SagaLevelTransitionScreenProps = {
  sagaNumber: number | null;
  isRestoringSession: boolean;
};

const SagaLevelTransitionScreen = ({
  sagaNumber,
  isRestoringSession,
}: SagaLevelTransitionScreenProps) => {
  const orbitNodes = Array.from({ length: 8 }, (_, index) => ({
    id: index,
    delay: index * 0.12,
    angle: index * 45,
  }));

  return (
    <div className="relative min-h-[100dvh] overflow-hidden bg-[#0a1730] text-slate-100">
      <div className="absolute inset-0">
        <div className="absolute inset-0 saga-level-transition-bg" />
        <div className="absolute inset-0 saga-level-transition-vignette" />
      </div>

      <div className="relative z-10 min-h-[100dvh] grid place-items-center px-6">
        <div className="flex flex-col items-center gap-6">
          <div className="relative h-40 w-40">
            <div className="absolute inset-0 rounded-full border border-cyan-200/40 saga-level-transition-ring-a" />
            <div className="absolute inset-[14%] rounded-full border border-blue-200/35 saga-level-transition-ring-b" />
            <div className="absolute inset-[29%] rounded-full border border-amber-200/40 saga-level-transition-ring-c" />
            <div className="absolute left-1/2 top-1/2 h-9 w-9 -translate-x-1/2 -translate-y-1/2 rounded-full bg-gradient-to-br from-amber-200 via-amber-300 to-yellow-500 shadow-[0_0_24px_rgba(250,204,21,0.58)]" />
            {orbitNodes.map((node) => (
              <span
                key={node.id}
                className="absolute left-1/2 top-1/2 h-2.5 w-2.5 rounded-full bg-cyan-200 shadow-[0_0_10px_rgba(125,211,252,0.8)] saga-level-transition-orb"
                style={
                  {
                    "--orb-angle": `${node.angle}deg`,
                    animationDelay: `${node.delay}s`,
                  } as CSSProperties
                }
              />
            ))}
          </div>

          <div className="text-center">
            <p className="text-lg sm:text-xl font-extrabold tracking-wide text-cyan-100 drop-shadow-[0_2px_12px_rgba(34,211,238,0.35)]">
              {isRestoringSession
                ? "Restoring your session..."
                : sagaNumber
                ? `Preparing Saga ${sagaNumber}`
                : "Preparing Saga Level"}
            </p>
            <p className="mt-2 text-xs sm:text-sm text-cyan-100/80 saga-level-transition-dots">
              Entering the map
            </p>
          </div>
        </div>
      </div>

      <style>{`
        .saga-level-transition-bg {
          background:
            radial-gradient(64% 44% at 50% 38%, rgba(56, 189, 248, 0.34) 0%, rgba(56, 189, 248, 0.05) 58%, rgba(56, 189, 248, 0) 100%),
            radial-gradient(46% 36% at 72% 68%, rgba(250, 204, 21, 0.2) 0%, rgba(250, 204, 21, 0.02) 62%, rgba(250, 204, 21, 0) 100%),
            linear-gradient(180deg, #0a1730 0%, #12274a 48%, #0a1730 100%);
          animation: sagaLevelTransitionBgPulse 2.8s ease-in-out infinite;
        }

        .saga-level-transition-vignette {
          background: radial-gradient(ellipse at center, rgba(0,0,0,0) 35%, rgba(0,0,0,0.45) 100%);
        }

        .saga-level-transition-ring-a {
          animation: sagaLevelTransitionSpinA 3.2s linear infinite;
        }

        .saga-level-transition-ring-b {
          animation: sagaLevelTransitionSpinB 2.2s linear infinite;
        }

        .saga-level-transition-ring-c {
          animation: sagaLevelTransitionPulse 1.4s ease-in-out infinite;
        }

        .saga-level-transition-orb {
          transform-origin: 0 0;
          animation: sagaLevelTransitionOrbit 1.8s ease-in-out infinite;
        }

        .saga-level-transition-dots::after {
          content: "";
          animation: sagaLevelTransitionDots 1.3s steps(4, end) infinite;
        }

        @keyframes sagaLevelTransitionSpinA {
          0% { transform: rotate(0deg) scale(1); }
          100% { transform: rotate(360deg) scale(1); }
        }

        @keyframes sagaLevelTransitionSpinB {
          0% { transform: rotate(360deg) scale(1); }
          100% { transform: rotate(0deg) scale(1); }
        }

        @keyframes sagaLevelTransitionPulse {
          0%, 100% { transform: scale(0.92); opacity: 0.55; }
          50% { transform: scale(1); opacity: 1; }
        }

        @keyframes sagaLevelTransitionOrbit {
          0%, 100% {
            transform: rotate(var(--orb-angle)) translateX(63px) scale(0.7);
            opacity: 0.5;
          }
          50% {
            transform: rotate(calc(var(--orb-angle) + 26deg)) translateX(72px) scale(1.15);
            opacity: 1;
          }
        }

        @keyframes sagaLevelTransitionBgPulse {
          0%, 100% { filter: saturate(1) brightness(1); }
          50% { filter: saturate(1.16) brightness(1.08); }
        }

        @keyframes sagaLevelTransitionDots {
          0% { content: ""; }
          25% { content: "."; }
          50% { content: ".."; }
          75% { content: "..."; }
          100% { content: ""; }
        }
      `}</style>
    </div>
  );
};

export default function SagaLevel() {
  const { user, loading, refreshUser, updateUserLocally, updateCoins, markUserStale } = useUser();
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
  const completedCoinsEarnedFromQuizReturn = isReturningFromQuizCompletion
    ? toNonNegativeInt(
        locationState?.completedCoinsEarned ??
          completionReturnFromQuery?.completedCoinsEarned ??
          completionReturnFromStorage?.completedCoinsEarned,
      )
    : 0;
  const completedKnowledgeGainedFromQuizReturn = isReturningFromQuizCompletion
    ? toNonNegativeInt(
        locationState?.completedKnowledgeGained ??
          completionReturnFromQuery?.completedKnowledgeGained ??
          completionReturnFromStorage?.completedKnowledgeGained,
      )
    : 0;

  const [rows, setRows] = useState<SagaLevelRow[]>(
    () => normalizeSagaLevelRows(preloadedRowsFromSagaMap || []),
  );
  const [levelConfig, setLevelConfig] = useState<LevelConfigEntry[] | null>(null);
  const [isLoadingRows, setIsLoadingRows] = useState(!preloadedRowsFromSagaMap);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [startingCategoryId, setStartingCategoryId] = useState<string | null>(null);
  const [swayingCategoryId, setSwayingCategoryId] = useState<string | null>(null);
  const [lockedMessageRowId, setLockedMessageRowId] = useState<string | null>(null);
  const [completionStarAnimationRowId, setCompletionStarAnimationRowId] = useState<string | null>(null);
  const [isCompletionStarAnimationActive, setIsCompletionStarAnimationActive] = useState(false);
  const [isCompletionCoinAnimationActive, setIsCompletionCoinAnimationActive] = useState(false);
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
  const [showCompletionCoinOverlay, setShowCompletionCoinOverlay] = useState(false);
  const [isCompletionCenterCoinVisible, setIsCompletionCenterCoinVisible] = useState(false);
  const [completionMiniCoins, setCompletionMiniCoins] = useState<CompletionMiniCoin[]>([]);
  const [isCompletionMiniCoinsInMotion, setIsCompletionMiniCoinsInMotion] = useState(false);
  const [showCompletionKpOverlay, setShowCompletionKpOverlay] = useState(false);
  const [isCompletionCenterKpVisible, setIsCompletionCenterKpVisible] = useState(false);
  const [completionMiniKpIcons, setCompletionMiniKpIcons] = useState<CompletionMiniCoin[]>([]);
  const [isCompletionMiniKpInMotion, setIsCompletionMiniKpInMotion] = useState(false);
  const [displayKnowledgePoints, setDisplayKnowledgePoints] = useState(
    Math.max(0, Number(user?.knowledgePoints ?? 0)),
  );
  const [edgeCenterSpacerHeights, setEdgeCenterSpacerHeights] = useState({
    top: 0,
    bottom: 0,
  });
  const gridRef = useRef<HTMLDivElement | null>(null);
  const frameRefs = useRef<Array<HTMLDivElement | null>>([]);
  const starSlotRefs = useRef<Record<string, HTMLSpanElement | null>>({});
  const lockMessageTimerRef = useRef<number | null>(null);
  const panelSwayTimerRef = useRef<number | null>(null);
  const hasAutoScrolledRef = useRef(false);
  const hasHandledCompletionReturnRef = useRef(false);
  const hasAppliedCompletionCoinsRef = useRef(false);
  const hasAppliedCompletionKnowledgeRef = useRef(false);
  const hasTriggeredCompletionCoinSequenceRef = useRef(false);
  const hasTriggeredCompletionKpSequenceRef = useRef(false);
  const bottomAnchorRef = useRef<HTMLDivElement | null>(null);
  const sagaLevelUserToken =
    typeof window !== "undefined" ? localStorage.getItem("token") || "" : "";
  const currentCoins = user?.coins ?? 0;
  const knowledgePoints = displayKnowledgePoints;
  const levelProgress = levelConfig ? resolveLevelProgress(knowledgePoints, levelConfig) : null;
  const levelProgressPoints = levelProgress?.progressIntoLevel ?? 0;
  const levelProgressTarget = levelProgress?.progressToNextLevel ?? 0;
  const levelProgressPercent = levelProgressTarget > 0
    ? Math.min(100, (levelProgressPoints / levelProgressTarget) * 100)
    : levelProgress?.isMaxLevel
      ? 100
      : 0;
  const remainingKpToNextLevel = levelProgress?.remainingKpToNextLevel ?? 0;
  const nextLevel = levelProgress?.nextLevel ?? Math.max(1, Number(user?.level ?? 1));
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
  const buildCompletionMiniCoins = (): CompletionMiniCoin[] => {
    const coinTargetElement =
      (document.querySelector("[data-coin-header-icon]") as HTMLElement | null) ||
      (document.querySelector("[data-coin-header]") as HTMLElement | null);
    if (!coinTargetElement) {
      return [];
    }

    const targetRect = coinTargetElement.getBoundingClientRect();
    const halfMiniCoinSize = QUIZ_COMPLETION_CENTER_MINI_COIN_SIZE_PX / 2;
    const centerX = window.innerWidth / 2;
    const centerY = window.innerHeight * 0.56;
    const endX = targetRect.left + targetRect.width / 2 - halfMiniCoinSize;
    const endY = targetRect.top + targetRect.height / 2 - halfMiniCoinSize;
    const baseRadius = Math.min(72, Math.max(42, window.innerWidth * 0.1));

    return Array.from({ length: QUIZ_COMPLETION_CENTER_MINI_COIN_COUNT }, (_, index) => {
      const angle =
        (index / QUIZ_COMPLETION_CENTER_MINI_COIN_COUNT) * Math.PI * 2 - Math.PI / 2;
      const jitter = (Math.random() - 0.5) * 16;
      const radialDistance = baseRadius + jitter;
      const startX = centerX + Math.cos(angle) * radialDistance - halfMiniCoinSize;
      const startY = centerY + Math.sin(angle) * radialDistance - halfMiniCoinSize;

      return {
        id: `completion-mini-coin-${Date.now()}-${index}`,
        startX,
        startY,
        endX,
        endY,
        delay: index * QUIZ_COMPLETION_CENTER_COIN_STAGGER_MS,
        startScale: 0.78 + Math.random() * 0.18,
        endScale: 0.42 + Math.random() * 0.14,
        startRotateDeg: (Math.random() - 0.5) * 32,
        endRotateDeg: (Math.random() - 0.5) * 100,
      };
    });
  };
  const buildCompletionMiniKpIcons = (): CompletionMiniCoin[] => {
    const kpProgressTargetElement =
      (document.querySelector("[data-kp-progress-bar]") as HTMLElement | null) ||
      (document.querySelector("[data-kp-progress-bar-fill]") as HTMLElement | null) ||
      (document.querySelector("[data-kp-header-icon]") as HTMLElement | null);
    if (!kpProgressTargetElement) {
      return [];
    }

    const targetRect = kpProgressTargetElement.getBoundingClientRect();
    const halfMiniKpSize = QUIZ_COMPLETION_CENTER_MINI_COIN_SIZE_PX / 2;
    const centerX = window.innerWidth / 2;
    const centerY = window.innerHeight * 0.56;
    const baseRadius = Math.min(72, Math.max(42, window.innerWidth * 0.1));
    const targetSpreadX = Math.max(16, targetRect.width * 0.42);
    const targetSpreadY = Math.max(6, targetRect.height * 0.22);

    return Array.from({ length: QUIZ_COMPLETION_CENTER_MINI_COIN_COUNT }, (_, index) => {
      const angle =
        (index / QUIZ_COMPLETION_CENTER_MINI_COIN_COUNT) * Math.PI * 2 - Math.PI / 2;
      const jitter = (Math.random() - 0.5) * 16;
      const radialDistance = baseRadius + jitter;
      const startX = centerX + Math.cos(angle) * radialDistance - halfMiniKpSize;
      const startY = centerY + Math.sin(angle) * radialDistance - halfMiniKpSize;
      const spreadRatio = QUIZ_COMPLETION_CENTER_MINI_COIN_COUNT > 1
        ? index / (QUIZ_COMPLETION_CENTER_MINI_COIN_COUNT - 1)
        : 0.5;
      const spreadOffsetX = (spreadRatio - 0.5) * targetSpreadX + (Math.random() - 0.5) * 10;
      const spreadOffsetY = (Math.random() - 0.5) * targetSpreadY;
      const endX = targetRect.left + targetRect.width / 2 + spreadOffsetX - halfMiniKpSize;
      const endY = targetRect.top + targetRect.height / 2 + spreadOffsetY - halfMiniKpSize;

      return {
        id: `completion-mini-kp-${Date.now()}-${index}`,
        startX,
        startY,
        endX,
        endY,
        delay: index * QUIZ_COMPLETION_CENTER_COIN_STAGGER_MS,
        startScale: 0.78 + Math.random() * 0.18,
        endScale: 0.42 + Math.random() * 0.14,
        startRotateDeg: (Math.random() - 0.5) * 32,
        endRotateDeg: (Math.random() - 0.5) * 100,
      };
    });
  };

  const handleStartCategoryQuiz = async (categoryId: string, sagaLevelId?: string) => {
    if (!categoryId || startingCategoryId) return;

    if (currentCoins < QUIZ_COST) {
      toast({
        title: "Insufficient Coins",
        description: `You need ${QUIZ_COST} coins to start a quiz.`,
        variant: "destructive",
      });
      return;
    }

    const userToken =
      typeof window !== "undefined" ? localStorage.getItem("token") || "" : "";
    if (!userToken) {
      toast({
        title: "Authentication Error",
        description: "Please log in again.",
        variant: "destructive",
      });
      return;
    }

    setStartingCategoryId(categoryId);
    updateCoins(currentCoins - QUIZ_COST);

    if (panelSwayTimerRef.current !== null) {
      window.clearTimeout(panelSwayTimerRef.current);
    }
    setSwayingCategoryId(categoryId);
    panelSwayTimerRef.current = window.setTimeout(() => {
      setSwayingCategoryId((currentValue) =>
        currentValue === categoryId ? null : currentValue,
      );
      panelSwayTimerRef.current = null;
    }, QUIZ_PANEL_SWAY_DURATION_MS);

    const animationDelayPromise = new Promise<void>((resolve) => {
      window.setTimeout(() => resolve(), QUIZ_PANEL_SWAY_DURATION_MS);
    });

    try {
      const startQuizPromise = fetch(`${BASE_URL}/api/startQuiz`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${userToken}`,
        },
        body: JSON.stringify({ categoryId }),
      }).then(async (response) => {
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData?.message || "Failed to start quiz session.");
        }

        return response.json();
      });

      const [startData] = await Promise.all([startQuizPromise, animationDelayPromise]);
      const resolvedUserCoins = Number(startData?.userCoins);
      if (Number.isFinite(resolvedUserCoins)) {
        updateCoins(Math.max(0, resolvedUserCoins));
      }
      markUserStale();

      navigate(`/quiz/${categoryId}`, {
        state: {
          from: `/saga-level/${sagaNumber}`,
          sagaLevelId: normalizeId(sagaLevelId) || null,
          prestartedQuiz: {
            categoryId,
            totalQuestions: Number(startData?.total) || 0,
          },
        },
      });
    } catch (error) {
      updateCoins(currentCoins);
      setStartingCategoryId(null);
      setSwayingCategoryId(null);
      toast({
        title: "Unable to start quiz",
        description:
          error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    if (loading || !user || !hasValidSagaNumber) return;

    let isMounted = true;
    const userToken =
      typeof window !== "undefined" ? localStorage.getItem("token") || "" : "";

    if (!userToken) {
      setIsLoadingRows(false);
      setErrorMessage("Missing session token.");
      return () => {
        isMounted = false;
      };
    }

    const hydrateRowsWithCategoryCache = async (rowsValue: unknown) => {
      const normalizedRows = normalizeSagaLevelRows(rowsValue);
      let categoryCache = readSagaCategoryCache();
      const categoriesFromRows = collectSagaCategoriesFromRows(normalizedRows);

      if (categoriesFromRows.length) {
        categoryCache = upsertSagaCategoryCache(categoryCache, categoriesFromRows);
        writeSagaCategoryCache(categoryCache);
      }

      const {
        rows: cachedRows,
        missingCategoryIds,
      } = hydrateRowsWithSagaCategoryCache(normalizedRows, categoryCache);

      if (!isMounted) return;
      setRows(cachedRows);

      if (!missingCategoryIds.length) return;

      try {
        const fetchedCategories = await fetchSagaCategoriesByIds(userToken, missingCategoryIds);
        if (!fetchedCategories.length) return;
        categoryCache = upsertSagaCategoryCache(categoryCache, fetchedCategories);
        writeSagaCategoryCache(categoryCache);

        if (!isMounted) return;
        const { rows: fullyHydratedRows } = hydrateRowsWithSagaCategoryCache(
          normalizedRows,
          categoryCache,
        );
        setRows(fullyHydratedRows);
      } catch (categoryError) {
        console.error("Failed to hydrate missing saga categories:", categoryError);
      }
    };

    const fetchSagaLevel = async (rowsOverride?: unknown) => {
      setIsLoadingRows(true);
      setErrorMessage(null);

      try {
        if (rowsOverride) {
          await hydrateRowsWithCategoryCache(rowsOverride);
          return;
        }

        setRows([]);
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
        await hydrateRowsWithCategoryCache(data?.rows);
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

    if (preloadedRowsFromSagaMap) {
      void fetchSagaLevel(preloadedRowsFromSagaMap);
    } else {
      void fetchSagaLevel();
    }

    return () => {
      isMounted = false;
    };
  }, [loading, user?._id, hasValidSagaNumber, sagaNumber, preloadedRowsFromSagaMap, cameFromSagaMap]);

  useEffect(() => {
    if (isCompletionCoinAnimationActive) {
      return;
    }
    setDisplayKnowledgePoints(Math.max(0, Number(user?.knowledgePoints ?? 0)));
  }, [user?.knowledgePoints, isCompletionCoinAnimationActive]);

  useEffect(() => {
    hasAutoScrolledRef.current = false;
    hasHandledCompletionReturnRef.current = false;
    setCompletionStarAnimationRowId(null);
    setIsCompletionStarAnimationActive(false);
    setIsCompletionCoinAnimationActive(false);
    setCompletionStarAnimationRunId(0);
    setCompletionFlyInStars([]);
    setShowCompletionFlyInOverlay(false);
    setIsCompletionFlyInInMotion(false);
    setCompletionStarsOverride(null);
    setDeferredCompletedStarsRowId(null);
    setShowCompletionCoinOverlay(false);
    setIsCompletionCenterCoinVisible(false);
    setCompletionMiniCoins([]);
    setIsCompletionMiniCoinsInMotion(false);
    setShowCompletionKpOverlay(false);
    setIsCompletionCenterKpVisible(false);
    setCompletionMiniKpIcons([]);
    setIsCompletionMiniKpInMotion(false);
    hasAppliedCompletionCoinsRef.current = false;
    hasAppliedCompletionKnowledgeRef.current = false;
    hasTriggeredCompletionCoinSequenceRef.current = false;
    hasTriggeredCompletionKpSequenceRef.current = false;
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
    let isMounted = true;

    loadLevelConfig()
      .then((config) => {
        if (!isMounted) return;
        setLevelConfig(config);
      })
      .catch((error) => {
        console.error("Failed to load level config for saga level:", error);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (loading || !user || !isReturningFromQuizCompletion) return;
    if (hasAppliedCompletionCoinsRef.current) return;
    if (completedCoinsEarnedFromQuizReturn <= 0) {
      hasAppliedCompletionCoinsRef.current = true;
      return;
    }
    if (isCompletionMiniCoinsInMotion) return;

    const fallbackDelayMs =
      QUIZ_COMPLETION_SCROLL_TO_COMPLETED_DELAY_MS +
      QUIZ_COMPLETION_SCROLL_SETTLE_BEFORE_STARS_MS +
      QUIZ_COMPLETION_STARS_SEQUENCE_MS +
      QUIZ_COMPLETION_COIN_PHASE_TOTAL_MS +
      400;
    const fallbackTimer = window.setTimeout(() => {
      if (hasAppliedCompletionCoinsRef.current) return;
      hasAppliedCompletionCoinsRef.current = true;
      const nextCoins = Math.max(0, (user.coins ?? 0) + completedCoinsEarnedFromQuizReturn);
      updateCoins(nextCoins);
      markUserStale();
      void refreshUser();
    }, fallbackDelayMs);

    return () => {
      window.clearTimeout(fallbackTimer);
    };
  }, [
    loading,
    user?._id,
    user?.coins,
    isReturningFromQuizCompletion,
    completedCoinsEarnedFromQuizReturn,
    isCompletionMiniCoinsInMotion,
    refreshUser,
    updateCoins,
    markUserStale,
  ]);

  useEffect(() => {
    if (loading || !user || !isReturningFromQuizCompletion) return;
    if (hasAppliedCompletionKnowledgeRef.current) return;
    if (completedKnowledgeGainedFromQuizReturn <= 0) {
      hasAppliedCompletionKnowledgeRef.current = true;
      return;
    }
    if (isCompletionMiniKpInMotion) return;

    const hasCoinPhase = completedCoinsEarnedFromQuizReturn > 0;
    const fallbackDelayMs =
      QUIZ_COMPLETION_SCROLL_TO_COMPLETED_DELAY_MS +
      QUIZ_COMPLETION_SCROLL_SETTLE_BEFORE_STARS_MS +
      QUIZ_COMPLETION_STARS_SEQUENCE_MS +
      getCompletionRewardPhaseTotalMs(hasCoinPhase, true) +
      450;
    const fallbackTimer = window.setTimeout(() => {
      if (hasAppliedCompletionKnowledgeRef.current) return;
      hasAppliedCompletionKnowledgeRef.current = true;
      const nextKnowledgePoints = Math.max(
        0,
        Number(displayKnowledgePoints ?? 0) + completedKnowledgeGainedFromQuizReturn,
      );
      setDisplayKnowledgePoints(nextKnowledgePoints);
      updateUserLocally({ knowledgePoints: nextKnowledgePoints });
      markUserStale();
      void refreshUser();
    }, fallbackDelayMs);

    return () => {
      window.clearTimeout(fallbackTimer);
    };
  }, [
    loading,
    user?._id,
    user?.knowledgePoints,
    isReturningFromQuizCompletion,
    completedKnowledgeGainedFromQuizReturn,
    completedCoinsEarnedFromQuizReturn,
    isCompletionMiniKpInMotion,
    displayKnowledgePoints,
    refreshUser,
    updateUserLocally,
    markUserStale,
  ]);

  useEffect(() => {
    return () => {
      if (lockMessageTimerRef.current !== null) {
        window.clearTimeout(lockMessageTimerRef.current);
      }
      if (panelSwayTimerRef.current !== null) {
        window.clearTimeout(panelSwayTimerRef.current);
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
    setIsCompletionCoinAnimationActive(false);
    console.info("[SagaCompletion] Target resolved", {
      targetRowIndex,
      resolvedTargetRowId,
      resolvedFilledStars,
    });

    let centerCompletedRowTimer: number | null = null;
    let startAnimationTimer: number | null = null;
    let stopAnimationTimer: number | null = null;
    let finalizeCompletionTimer: number | null = null;
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
      console.info("[SagaCompletion] Star animation finished", {
        rowId: resolvedTargetRowId,
      });

      const hasCoinPhase = completedCoinsEarnedFromQuizReturn > 0;
      const hasKpPhase = completedKnowledgeGainedFromQuizReturn > 0;
      const hasRewardPhase = hasCoinPhase || hasKpPhase;
      setIsCompletionCoinAnimationActive(hasRewardPhase);

      if (finalizeCompletionTimer !== null) {
        window.clearTimeout(finalizeCompletionTimer);
      }
      finalizeCompletionTimer = window.setTimeout(() => {
        setIsCompletionCoinAnimationActive(false);
        setIsCompletionStarAnimationActive(true);
        if (finishPanelRevealTimer !== null) {
          window.clearTimeout(finishPanelRevealTimer);
        }
        finishPanelRevealTimer = window.setTimeout(() => {
          setIsCompletionStarAnimationActive(false);
          finishPanelRevealTimer = null;
        }, QUIZ_COMPLETION_PANEL_REVEAL_ANIMATION_MS);
        clearCompletionReturnSignal();

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
      }, getCompletionRewardPhaseTotalMs(hasCoinPhase, hasKpPhase));
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
      if (finalizeCompletionTimer !== null) {
        window.clearTimeout(finalizeCompletionTimer);
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
    completedCoinsEarnedFromQuizReturn,
    completedKnowledgeGainedFromQuizReturn,
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
    const updateEdgeCenterSpacers = () => {
      const viewportHeight = window.innerHeight || 0;
      if (viewportHeight <= 0) return;

      const fallbackFrameHeight = window.innerWidth >= 640 ? 243 : 214;
      const lastIndex = Math.max(0, gridCells.length - 1);
      const firstFrameHeight =
        frameRefs.current[0]?.getBoundingClientRect().height ?? fallbackFrameHeight;
      const lastFrameHeight =
        frameRefs.current[lastIndex]?.getBoundingClientRect().height ?? fallbackFrameHeight;

      const nextTop = Math.max(0, viewportHeight / 2 - firstFrameHeight / 2);
      const nextBottom = Math.max(0, viewportHeight / 2 - lastFrameHeight / 2);

      setEdgeCenterSpacerHeights((current) => {
        if (
          Math.abs(current.top - nextTop) < 1 &&
          Math.abs(current.bottom - nextBottom) < 1
        ) {
          return current;
        }
        return {
          top: nextTop,
          bottom: nextBottom,
        };
      });
    };

    const rafId = window.requestAnimationFrame(updateEdgeCenterSpacers);
    window.addEventListener("resize", updateEdgeCenterSpacers);

    return () => {
      window.cancelAnimationFrame(rafId);
      window.removeEventListener("resize", updateEdgeCenterSpacers);
    };
  }, [gridCells.length, rows]);

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
            y: lowerFrameRect.top - gridRect.top + 20,
          };
          const end: Point = {
            x: upperFrameRect.left + upperFrameRect.width / 2 - gridRect.left,
            y: upperFrameRect.bottom - gridRect.top - 20,
          };

          const verticalDistance = Math.abs(start.y - end.y);
          const horizontalDelta = end.x - start.x;
          const bendDirection = horizontalDelta >= 0 ? 1 : -1;
          const curveLift = Math.max(62, verticalDistance * 0.4);
          const horizontalBend = Math.max(
            36,
            Math.min(135, Math.abs(horizontalDelta) * 0.45 + verticalDistance * 0.08)
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
    if (
      !isCompletionCoinAnimationActive ||
      !isReturningFromQuizCompletion ||
      completedCoinsEarnedFromQuizReturn <= 0
    ) {
      setShowCompletionCoinOverlay(false);
      setIsCompletionCenterCoinVisible(false);
      setCompletionMiniCoins([]);
      setIsCompletionMiniCoinsInMotion(false);
      return;
    }

    if (hasTriggeredCompletionCoinSequenceRef.current) {
      return;
    }
    hasTriggeredCompletionCoinSequenceRef.current = true;
    const coinsBeforeReward = Math.max(0, Number(user?.coins ?? 0));

    setShowCompletionCoinOverlay(true);
    setIsCompletionCenterCoinVisible(false);
    setCompletionMiniCoins([]);
    setIsCompletionMiniCoinsInMotion(false);

    let fadeInRafOne: number | null = null;
    let fadeInRafTwo: number | null = null;
    let launchMiniCoinsTimer: number | null = null;
    let launchMotionRafOne: number | null = null;
    let launchMotionRafTwo: number | null = null;
    let hideOverlayTimer: number | null = null;

    fadeInRafOne = window.requestAnimationFrame(() => {
      fadeInRafTwo = window.requestAnimationFrame(() => {
        setIsCompletionCenterCoinVisible(true);
      });
    });

    launchMiniCoinsTimer = window.setTimeout(() => {
      const miniCoins = buildCompletionMiniCoins();
      setCompletionMiniCoins(miniCoins);

      launchMotionRafOne = window.requestAnimationFrame(() => {
        launchMotionRafTwo = window.requestAnimationFrame(() => {
          setIsCompletionMiniCoinsInMotion(true);
          if (!hasAppliedCompletionCoinsRef.current) {
            hasAppliedCompletionCoinsRef.current = true;
            const nextCoins = Math.max(0, coinsBeforeReward + completedCoinsEarnedFromQuizReturn);
            updateCoins(nextCoins);
            markUserStale();
            void refreshUser();
          }
        });
      });
    }, QUIZ_COMPLETION_CENTER_COIN_LAUNCH_DELAY_MS);

    hideOverlayTimer = window.setTimeout(() => {
      setShowCompletionCoinOverlay(false);
      setIsCompletionCenterCoinVisible(false);
      setCompletionMiniCoins([]);
      setIsCompletionMiniCoinsInMotion(false);
    }, QUIZ_COMPLETION_CENTER_COIN_LAUNCH_DELAY_MS +
      QUIZ_COMPLETION_CENTER_COIN_FLIGHT_MS +
      QUIZ_COMPLETION_CENTER_COIN_STAGGER_MS * (QUIZ_COMPLETION_CENTER_MINI_COIN_COUNT - 1) +
      QUIZ_COMPLETION_CENTER_COIN_HIDE_TAIL_MS);

    return () => {
      if (fadeInRafOne !== null) {
        window.cancelAnimationFrame(fadeInRafOne);
      }
      if (fadeInRafTwo !== null) {
        window.cancelAnimationFrame(fadeInRafTwo);
      }
      if (launchMiniCoinsTimer !== null) {
        window.clearTimeout(launchMiniCoinsTimer);
      }
      if (launchMotionRafOne !== null) {
        window.cancelAnimationFrame(launchMotionRafOne);
      }
      if (launchMotionRafTwo !== null) {
        window.cancelAnimationFrame(launchMotionRafTwo);
      }
      if (hideOverlayTimer !== null) {
        window.clearTimeout(hideOverlayTimer);
      }
    };
  }, [
    isCompletionCoinAnimationActive,
    isReturningFromQuizCompletion,
    completedCoinsEarnedFromQuizReturn,
    user?._id,
  ]);

  useEffect(() => {
    if (
      !isCompletionCoinAnimationActive ||
      !isReturningFromQuizCompletion ||
      completedKnowledgeGainedFromQuizReturn <= 0
    ) {
      setShowCompletionKpOverlay(false);
      setIsCompletionCenterKpVisible(false);
      setCompletionMiniKpIcons([]);
      setIsCompletionMiniKpInMotion(false);
      return;
    }

    if (hasTriggeredCompletionKpSequenceRef.current) {
      return;
    }
    const knowledgePointsBeforeReward = Math.max(0, Number(knowledgePoints ?? 0));

    const hasCoinPhase = completedCoinsEarnedFromQuizReturn > 0;
    const phaseStartDelay = hasCoinPhase
      ? QUIZ_COMPLETION_COIN_PHASE_TOTAL_MS + QUIZ_COMPLETION_CENTER_REWARD_PHASE_GAP_MS
      : 0;

    setShowCompletionKpOverlay(false);
    setIsCompletionCenterKpVisible(false);
    setCompletionMiniKpIcons([]);
    setIsCompletionMiniKpInMotion(false);

    let startPhaseTimer: number | null = null;
    let fadeInRafOne: number | null = null;
    let fadeInRafTwo: number | null = null;
    let launchMiniKpTimer: number | null = null;
    let launchMotionRafOne: number | null = null;
    let launchMotionRafTwo: number | null = null;
    let hideOverlayTimer: number | null = null;

    startPhaseTimer = window.setTimeout(() => {
      hasTriggeredCompletionKpSequenceRef.current = true;
      setShowCompletionKpOverlay(true);

      fadeInRafOne = window.requestAnimationFrame(() => {
        fadeInRafTwo = window.requestAnimationFrame(() => {
          setIsCompletionCenterKpVisible(true);
        });
      });

      launchMiniKpTimer = window.setTimeout(() => {
        const miniKpIcons = buildCompletionMiniKpIcons();
        setCompletionMiniKpIcons(miniKpIcons);

        launchMotionRafOne = window.requestAnimationFrame(() => {
          launchMotionRafTwo = window.requestAnimationFrame(() => {
            setIsCompletionMiniKpInMotion(true);
            if (!hasAppliedCompletionKnowledgeRef.current) {
              hasAppliedCompletionKnowledgeRef.current = true;
              const nextKnowledgePoints = Math.max(
                0,
                knowledgePointsBeforeReward + completedKnowledgeGainedFromQuizReturn,
              );
              setDisplayKnowledgePoints(nextKnowledgePoints);
              updateUserLocally({ knowledgePoints: nextKnowledgePoints });
              markUserStale();
              void refreshUser();
            }
          });
        });
      }, QUIZ_COMPLETION_CENTER_COIN_LAUNCH_DELAY_MS);
    }, phaseStartDelay);

    hideOverlayTimer = window.setTimeout(() => {
      setShowCompletionKpOverlay(false);
      setIsCompletionCenterKpVisible(false);
      setCompletionMiniKpIcons([]);
      setIsCompletionMiniKpInMotion(false);
    }, phaseStartDelay +
      QUIZ_COMPLETION_CENTER_COIN_LAUNCH_DELAY_MS +
      QUIZ_COMPLETION_CENTER_COIN_FLIGHT_MS +
      QUIZ_COMPLETION_CENTER_COIN_STAGGER_MS * (QUIZ_COMPLETION_CENTER_MINI_COIN_COUNT - 1) +
      QUIZ_COMPLETION_CENTER_COIN_HIDE_TAIL_MS);

    return () => {
      if (startPhaseTimer !== null) {
        window.clearTimeout(startPhaseTimer);
      }
      if (fadeInRafOne !== null) {
        window.cancelAnimationFrame(fadeInRafOne);
      }
      if (fadeInRafTwo !== null) {
        window.cancelAnimationFrame(fadeInRafTwo);
      }
      if (launchMiniKpTimer !== null) {
        window.clearTimeout(launchMiniKpTimer);
      }
      if (launchMotionRafOne !== null) {
        window.cancelAnimationFrame(launchMotionRafOne);
      }
      if (launchMotionRafTwo !== null) {
        window.cancelAnimationFrame(launchMotionRafTwo);
      }
      if (hideOverlayTimer !== null) {
        window.clearTimeout(hideOverlayTimer);
      }
    };
  }, [
    isCompletionCoinAnimationActive,
    isReturningFromQuizCompletion,
    completedCoinsEarnedFromQuizReturn,
    completedKnowledgeGainedFromQuizReturn,
    knowledgePoints,
  ]);

  if (!hasValidSagaNumber) {
    return <Navigate to="/saga-map" replace />;
  }

  const showSagaLevelTransition = loading || !user || isLoadingRows;
  if (showSagaLevelTransition) {
    return (
      <SagaLevelTransitionScreen
        sagaNumber={sagaNumber}
        isRestoringSession={!loading && !user}
      />
    );
  }

  const backButtonOverlay =
    typeof document !== "undefined"
      ? createPortal(
          <Button
            type="button"
            size="icon"
            variant="ghost"
            onClick={() => navigate("/saga-map")}
            disabled={isCompletionStarAnimationActive}
            aria-label="Back to Saga Map"
            title="Back to Saga Map"
            className={`fixed top-[max(0.5rem,env(safe-area-inset-top))] left-2 sm:left-4 z-[10010] h-11 w-11 sm:h-12 sm:w-12 rounded-full border border-cyan-200/75 bg-slate-950/45 text-cyan-50 backdrop-blur-md shadow-[0_10px_24px_rgba(8,47,73,0.45),0_0_16px_rgba(34,211,238,0.3)] transition-all duration-500 hover:scale-[1.05] hover:border-cyan-100 hover:bg-cyan-500/22 hover:shadow-[0_14px_28px_rgba(8,47,73,0.55),0_0_22px_rgba(103,232,249,0.45)] active:scale-[0.98] ${
              isCompletionStarAnimationActive
                ? "opacity-0 pointer-events-none scale-95"
                : "opacity-100 pointer-events-auto scale-100"
            }`}
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
                userXP={knowledgePoints}
                userGem1={user.wisdomGems ?? 0}
                userGem2={user.enlightenmentCrystals ?? 0}
                showSecondaryEconomyItems={false}
                showKpProgressBar
                kpProgressPercent={levelProgressPercent}
                kpProgressLabel={
                  levelProgressTarget > 0
                    ? `${levelProgressPoints}/${levelProgressTarget}`
                    : `${knowledgePoints}`
                }
                kpProgressMeta={
                  levelProgress?.isMaxLevel
                    ? "Max level reached"
                    : `${remainingKpToNextLevel} KP to Level ${nextLevel}`
                }
                economyNumberStyle="whiteOutline"
                economyValueTextSize="large"
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
  const completionCoinOverlay =
    showCompletionCoinOverlay &&
    completedCoinsEarnedFromQuizReturn > 0 &&
    typeof document !== "undefined"
      ? createPortal(
          <div className="pointer-events-none fixed inset-0 z-[10009]">
            <div className="absolute left-1/2 top-[56%] -translate-x-1/2 -translate-y-1/2">
              <div className="flex flex-col items-center gap-2">
                <div
                  className={`saga-completion-center-coin relative transition-all duration-500 ${
                    isCompletionCenterCoinVisible
                      ? "opacity-100 scale-100"
                      : "opacity-0 scale-75"
                  }`}
                >
                  <span
                    aria-hidden="true"
                    className="saga-completion-center-coin-glow absolute left-1/2 top-1/2 block -translate-x-1/2 -translate-y-1/2 rounded-full"
                  />
                  <img
                    src="/assets/images/icons/coin.png"
                    alt="Coin reward"
                    className="relative z-10 h-[8.5rem] w-[8.5rem] sm:h-[10rem] sm:w-[10rem] drop-shadow-[0_0_20px_rgba(251,146,60,0.72)]"
                  />
                </div>
                <p
                  className={`saga-completion-coin-label text-center text-sm font-black tracking-wide text-amber-100 drop-shadow-[0_2px_8px_rgba(0,0,0,0.65)] transition-all duration-500 sm:text-base ${
                    isCompletionCenterCoinVisible
                      ? "opacity-100 translate-y-0"
                      : "opacity-0 translate-y-2"
                  }`}
                >
                  +{completedCoinsEarnedFromQuizReturn.toLocaleString("en-US")} Coins Won
                </p>
              </div>
            </div>
            {completionMiniCoins.map((coin) => (
              <span
                key={coin.id}
                className="fixed block"
                style={{
                  left: 0,
                  top: 0,
                  opacity: isCompletionMiniCoinsInMotion ? 0.98 : 0,
                  transform: `translate(${isCompletionMiniCoinsInMotion ? coin.endX : coin.startX}px, ${isCompletionMiniCoinsInMotion ? coin.endY : coin.startY}px) scale(${isCompletionMiniCoinsInMotion ? coin.endScale : coin.startScale}) rotate(${isCompletionMiniCoinsInMotion ? coin.endRotateDeg : coin.startRotateDeg}deg)`,
                  transition: `transform ${QUIZ_COMPLETION_CENTER_COIN_FLIGHT_MS}ms cubic-bezier(0.2,0.86,0.26,1.05) ${coin.delay}ms, opacity 180ms ease-out ${coin.delay}ms`,
                  willChange: "transform, opacity",
                }}
              >
                <img
                  src="/assets/images/icons/coin.png"
                  alt=""
                  aria-hidden="true"
                  className="h-[3.75rem] w-[3.75rem] rounded-full shadow-[0_0_18px_rgba(250,204,21,0.58)]"
                />
              </span>
            ))}
          </div>,
          document.body,
        )
      : null;
  const completionKpOverlay =
    showCompletionKpOverlay &&
    completedKnowledgeGainedFromQuizReturn > 0 &&
    typeof document !== "undefined"
      ? createPortal(
          <div className="pointer-events-none fixed inset-0 z-[10009]">
            <div className="absolute left-1/2 top-[56%] -translate-x-1/2 -translate-y-1/2">
              <div className="flex flex-col items-center gap-2">
                <div
                  className={`saga-completion-center-coin relative transition-all duration-500 ${
                    isCompletionCenterKpVisible
                      ? "opacity-100 scale-100"
                      : "opacity-0 scale-75"
                  }`}
                >
                  <span
                    aria-hidden="true"
                    className="saga-completion-center-coin-glow absolute left-1/2 top-1/2 block -translate-x-1/2 -translate-y-1/2 rounded-full"
                    style={{
                      background:
                        "radial-gradient(circle, rgba(34,211,238,0.76) 0%, rgba(59,130,246,0.42) 48%, rgba(12,74,110,0) 72%)",
                      boxShadow: "0 0 44px rgba(34,211,238,0.62), 0 0 72px rgba(56,189,248,0.3)",
                    }}
                  />
                  <img
                    src="/assets/images/icons/KP Icon.png"
                    alt="KP reward"
                    className="relative z-10 h-[8.5rem] w-[8.5rem] sm:h-[10rem] sm:w-[10rem] drop-shadow-[0_0_22px_rgba(56,189,248,0.7)]"
                  />
                </div>
                <p
                  className={`saga-completion-coin-label text-center text-sm font-black tracking-wide text-cyan-100 drop-shadow-[0_2px_8px_rgba(0,0,0,0.65)] transition-all duration-500 sm:text-base ${
                    isCompletionCenterKpVisible
                      ? "opacity-100 translate-y-0"
                      : "opacity-0 translate-y-2"
                  }`}
                >
                  +{completedKnowledgeGainedFromQuizReturn.toLocaleString("en-US")} KP Won
                </p>
              </div>
            </div>
            {completionMiniKpIcons.map((kpIcon) => (
              <span
                key={kpIcon.id}
                className="fixed block"
                style={{
                  left: 0,
                  top: 0,
                  opacity: isCompletionMiniKpInMotion ? 0.98 : 0,
                  transform: `translate(${isCompletionMiniKpInMotion ? kpIcon.endX : kpIcon.startX}px, ${isCompletionMiniKpInMotion ? kpIcon.endY : kpIcon.startY}px) scale(${isCompletionMiniKpInMotion ? kpIcon.endScale : kpIcon.startScale}) rotate(${isCompletionMiniKpInMotion ? kpIcon.endRotateDeg : kpIcon.startRotateDeg}deg)`,
                  transition: `transform ${QUIZ_COMPLETION_CENTER_COIN_FLIGHT_MS}ms cubic-bezier(0.2,0.86,0.26,1.05) ${kpIcon.delay}ms, opacity 180ms ease-out ${kpIcon.delay}ms`,
                  willChange: "transform, opacity",
                }}
              >
                <img
                  src="/assets/images/icons/KP Icon.png"
                  alt=""
                  aria-hidden="true"
                  className="h-[3.75rem] w-[3.75rem] rounded-full shadow-[0_0_18px_rgba(34,211,238,0.65)]"
                />
              </span>
            ))}
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
  const progressRows = displayRows.filter((row) => Boolean(getCategoryId(row)));
  const totalProgressRows = progressRows.length;
  const completedProgressRows = progressRows.reduce((count, row) => {
    const rowId = getRowId(row);
    const hasCompletionOverride = Boolean(
      rowId && completionStarsOverride?.rowId === rowId,
    );
    return row.isCompleted || hasCompletionOverride ? count + 1 : count;
  }, 0);
  const progressPercent = totalProgressRows > 0
    ? Math.min(100, Math.max(0, (completedProgressRows / totalProgressRows) * 100))
    : 0;
  const sagaProgressOverlay =
    typeof document !== "undefined"
      ? createPortal(
          <div className="pointer-events-none fixed inset-x-0 bottom-0 z-[10006]">
            <div className="mx-auto w-full max-w-5xl px-3 pb-[max(0.6rem,env(safe-area-inset-bottom)+0.4rem)]">
              <div className="relative mx-auto w-full max-w-[14rem] rounded-[28px] border border-[#5f77bd]/55 bg-gradient-to-b from-[#37539a] via-[#223a78] to-[#15295a] px-4 py-3 shadow-[0_-4px_24px_rgba(9,19,52,0.35),0_18px_45px_rgba(6,15,42,0.7)] backdrop-blur-xl">
                <div className="pointer-events-none absolute inset-x-10 top-0 h-px bg-gradient-to-r from-transparent via-white/70 to-transparent" />
                <div className="flex items-center justify-between text-[11px] font-semibold text-[#e5edff] sm:text-xs">
                  <span>Progress</span>
                  <span>{completedProgressRows}/{totalProgressRows || 0}</span>
                </div>
                <div className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-[#162b5d]/80 ring-1 ring-[#93b6ff]/35">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-emerald-400 via-emerald-500 to-green-400 shadow-[0_0_16px_rgba(74,222,128,0.6)] transition-[width] duration-500 ease-out"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              </div>
            </div>
          </div>,
          document.body,
        )
      : null;

  return (
    <div
      className="saga-level-panel-theme relative min-h-[100dvh] px-2 sm:px-4 py-2 sm:py-3 pb-[max(0.5rem,env(safe-area-inset-bottom))] overflow-x-hidden bg-[#0a1730]"
    >
      <style>
        {`
          .saga-level-panel-theme {
            --bg-1: #0f1d41;
            --bg-2: #162c61;
            --panel: rgba(22, 41, 92, 0.94);
            --panel-2: rgba(45, 68, 132, 0.95);
            --nav-top: #37539a;
            --nav-mid: #223a78;
            --nav-bottom: #15295a;
            --nav-border: rgba(95, 119, 189, 0.55);
            --nav-border-soft: rgba(123, 154, 222, 0.35);
            --nav-highlight: rgba(255, 255, 255, 0.7);
            --nav-glow: rgba(9, 19, 52, 0.42);
            --blue-1: #cfe0ff;
            --blue-2: #93b6ff;
            --blue-3: #4b66b4;
            --green-1: #83f6be;
            --green-2: #2ab373;
            --locked-1: #8c94aa;
            --locked-2: #495066;
            --panel-scale: 0.78125;
            --radius: calc(1.25rem * var(--panel-scale));
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

          @keyframes sagaPanelWindSway {
            0% {
              transform: perspective(980px) rotateY(0deg) translateX(0);
            }
            24% {
              transform: perspective(980px) rotateY(-8deg) translateX(-3px);
            }
            50% {
              transform: perspective(980px) rotateY(9deg) translateX(4px);
            }
            76% {
              transform: perspective(980px) rotateY(-5deg) translateX(-2px);
            }
            100% {
              transform: perspective(980px) rotateY(0deg) translateX(0);
            }
          }

          .saga-level-panel-theme .saga-level-panel-wind-sway {
            animation: sagaPanelWindSway 500ms cubic-bezier(0.22, 0.92, 0.3, 1) both;
            transform-origin: 50% 50%;
            transform-style: preserve-3d;
            will-change: transform;
          }

          .saga-level-panel-theme .category-frame {
            position: relative;
            border-radius: var(--radius);
            padding: calc(clamp(0.38rem, 0.75vw, 0.6rem) * var(--panel-scale));
            background:
              linear-gradient(180deg, var(--nav-top) 0%, var(--nav-mid) 52%, var(--nav-bottom) 100%);
            border: 1px solid var(--nav-border);
            box-shadow:
              0 -4px 24px rgba(9, 19, 52, 0.35),
              0 14px 34px rgba(6, 15, 42, 0.62);
            overflow: hidden;
            isolation: isolate;
          }

          .saga-level-panel-theme .category-frame::before {
            content: "";
            position: absolute;
            inset: 0.1rem 14% auto;
            height: 1px;
            border-radius: 999px;
            background:
              linear-gradient(
                90deg,
                transparent 0%,
                var(--nav-highlight) 50%,
                transparent 100%
              );
            z-index: 0;
            opacity: 0.95;
          }

          .saga-level-panel-theme .category-frame::after {
            content: "";
            position: absolute;
            inset: 0;
            border-radius: inherit;
            background:
              radial-gradient(circle at 50% 8%, rgba(195, 214, 255, 0.2), transparent 48%),
              radial-gradient(circle at 50% 100%, rgba(91, 127, 212, 0.16), transparent 56%);
            z-index: 0;
            pointer-events: none;
          }

          .saga-level-panel-theme .category-content {
            position: relative;
            display: grid;
            grid-template-columns: minmax(calc(102px * var(--panel-scale)), 34%) 1fr;
            gap: calc(clamp(0.54rem, 1.5vw, 0.82rem) * var(--panel-scale));
            background:
              linear-gradient(180deg, rgba(39, 63, 125, 0.92), rgba(27, 47, 102, 0.96));
            border: 1px solid var(--nav-border-soft);
            box-shadow:
              inset 0 1px 0 rgba(255, 255, 255, 0.12),
              inset 0 -1px 0 rgba(0, 0, 0, 0.25);
            border-radius: calc(var(--radius) - 0.3rem);
            padding: calc(clamp(0.6rem, 1.5vw, 0.82rem) * var(--panel-scale));
            min-height: calc(clamp(117px, 19.5vw, 159px) * var(--panel-scale));
            overflow: hidden;
            z-index: 2;
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
            border-radius: calc(1rem * var(--panel-scale));
            min-height: calc(102px * var(--panel-scale));
            background:
              linear-gradient(180deg, rgba(75, 102, 180, 0.94), rgba(48, 74, 144, 0.96));
            border: 1px solid rgba(147, 182, 255, 0.45);
            box-shadow:
              inset 0 1px 0 rgba(255, 255, 255, 0.16),
              inset 0 -1px 0 rgba(0, 0, 0, 0.22),
              0 8px 20px rgba(44, 86, 178, 0.34);
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
            left: calc(0.38rem * var(--panel-scale));
            bottom: calc(0.38rem * var(--panel-scale));
            z-index: 2;
            padding: calc(0.26rem * var(--panel-scale)) calc(0.56rem * var(--panel-scale));
            border-radius: 999px;
            font-size: calc(0.62rem * var(--panel-scale));
            font-weight: 800;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            color: #f8fafc;
            border: 1px solid rgba(147, 182, 255, 0.8);
            background: linear-gradient(180deg, #4b66b4, #304a90);
            box-shadow:
              0 0 0 1px rgba(255, 255, 255, 0.14) inset,
              0 8px 20px rgba(44, 86, 178, 0.44);
            backdrop-filter: blur(4px);
            pointer-events: none;
          }

          .saga-level-panel-theme .category-info h3 {
            margin: 0 0 calc(0.45rem * var(--panel-scale));
            font-size: calc(clamp(1.02rem, 1.9vw, 1.38rem) * var(--panel-scale));
            line-height: 1.1;
            font-family: "Poppins", "Segoe UI", sans-serif;
            font-weight: 800;
            letter-spacing: 0.045em;
            text-transform: uppercase;
            color: #f2f7ff;
            text-shadow:
              0 1px 0 rgba(7, 19, 50, 0.95),
              0 0 12px rgba(147, 182, 255, 0.38),
              0 3px 10px rgba(7, 19, 50, 0.6);
            -webkit-text-stroke: 0.3px rgba(217, 232, 255, 0.5);
            text-wrap: balance;
          }

          .saga-level-panel-theme .category-info p {
            margin: 0 0 calc(0.68rem * var(--panel-scale));
            font-size: calc(clamp(0.72rem, 1.08vw, 0.84rem) * var(--panel-scale));
            color: rgba(255, 255, 255, 0.82);
          }

          .saga-level-panel-theme .corner {
            position: absolute;
            width: calc(clamp(14px, 1.9vw, 20px) * var(--panel-scale));
            aspect-ratio: 1;
            z-index: 3;
            pointer-events: none;
          }

          .saga-level-panel-theme .corner::before {
            content: "";
            position: absolute;
            inset: 0;
            background: linear-gradient(180deg, #d6e4ff, #9db8f6 55%, #5278d1);
            clip-path: polygon(50% 0%, 88% 25%, 100% 70%, 50% 100%, 0% 70%, 12% 25%);
            box-shadow:
              0 0 12px rgba(151, 180, 252, 0.45),
              inset 0 1px 3px rgba(255, 255, 255, 0.62);
          }

          .saga-level-panel-theme .tl { top: calc(0.22rem * var(--panel-scale)); left: calc(0.22rem * var(--panel-scale)); }
          .saga-level-panel-theme .tr { top: calc(0.22rem * var(--panel-scale)); right: calc(0.22rem * var(--panel-scale)); }
          .saga-level-panel-theme .bl { bottom: calc(0.22rem * var(--panel-scale)); left: calc(0.22rem * var(--panel-scale)); }
          .saga-level-panel-theme .br { bottom: calc(0.22rem * var(--panel-scale)); right: calc(0.22rem * var(--panel-scale)); }

          .saga-level-panel-theme .category-card.current .category-frame::after {
            background:
              radial-gradient(circle at 50% 50%, rgba(173, 195, 255, 0.24), transparent 60%);
            animation: sagaPanelPulseGlow 1.8s ease-in-out infinite;
          }

          .saga-level-panel-theme .category-card.current .category-frame {
            border-color: rgba(251, 146, 60, 0.88);
            box-shadow:
              0 -5px 26px rgba(9, 19, 52, 0.42),
              0 18px 42px rgba(6, 15, 42, 0.68),
              0 0 0 1px rgba(251, 146, 60, 0.34) inset;
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

          .saga-level-panel-theme .category-card.completed .category-frame {
            border-color: rgba(115, 228, 168, 0.72);
          }

          .saga-level-panel-theme .category-card.completed .category-badge {
            background: linear-gradient(180deg, #41d884, #159a53);
            border-color: rgba(125, 255, 178, 0.85);
          }

          .saga-level-panel-theme .category-card.locked {
            filter: grayscale(0.35) saturate(0.7);
          }

          .saga-level-panel-theme .category-card.locked .category-frame::before {
            background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.24), transparent);
          }

          .saga-level-panel-theme .category-card.locked .category-badge {
            background: linear-gradient(180deg, #8d94a8, #586074);
            border-color: rgba(169, 178, 197, 0.68);
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
              min-height: calc(93px * var(--panel-scale));
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

          @keyframes sagaCompletionCoinPulse {
            0%, 100% {
              transform: translateY(0) scale(1);
              filter: drop-shadow(0 0 10px rgba(250, 204, 21, 0.45));
            }
            50% {
              transform: translateY(-2px) scale(1.045);
              filter: drop-shadow(0 0 18px rgba(250, 204, 21, 0.72));
            }
          }

          .saga-completion-center-coin {
            animation: sagaCompletionCoinPulse 1.1s ease-in-out infinite;
          }

          .saga-completion-center-coin-glow {
            width: 7.2rem;
            height: 7.2rem;
            background:
              radial-gradient(
                circle,
                rgba(251, 146, 60, 0.48) 0%,
                rgba(249, 115, 22, 0.36) 42%,
                rgba(245, 158, 11, 0.12) 68%,
                rgba(245, 158, 11, 0) 100%
              );
            filter: blur(11px);
            box-shadow: 0 0 42px rgba(249, 115, 22, 0.34);
            animation: sagaCompletionCoinGlowPulse 1.1s ease-in-out infinite;
            z-index: 0;
          }

          @media (min-width: 640px) {
            .saga-completion-center-coin-glow {
              width: 8.6rem;
              height: 8.6rem;
            }
          }

          @keyframes sagaCompletionCoinGlowPulse {
            0%, 100% {
              opacity: 0.66;
              transform: translate(-50%, -50%) scale(0.94);
            }
            50% {
              opacity: 1;
              transform: translate(-50%, -50%) scale(1.05);
            }
          }

          .saga-completion-coin-label {
            text-shadow:
              0 0 12px rgba(250, 204, 21, 0.26),
              0 0 18px rgba(245, 158, 11, 0.3);
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
      {sagaProgressOverlay}
      {completionCoinOverlay}
      {completionKpOverlay}
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
          <>
            <div
              aria-hidden="true"
              style={{ height: `${edgeCenterSpacerHeights.top}px` }}
            />
            <div
              ref={gridRef}
              className="relative grid grid-cols-1 gap-[24px] sm:gap-[26px] auto-rows-[minmax(135px,1fr)] sm:auto-rows-[minmax(151px,1fr)] max-w-3xl mx-auto w-full"
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
              const frameShift = "clamp(35px, 12.5vw, 148px)";
              const isPanelOnRightSide = index % 2 === 1;
              const horizontalOffsetStyle = {
                transform: `translateX(${isPanelOnRightSide ? "" : "-"}${frameShift})`,
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
              const isPanelSwaying = Boolean(
                categoryIdForRow && swayingCategoryId === categoryIdForRow,
              );
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
                  className="relative z-10 mx-auto w-[clamp(164px,calc((100vw-48px)*0.58625),445px)]"
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
                      playSound("/clicksound.m4a", 0.35);
                      void handleStartCategoryQuiz(categoryId, rowId || undefined);
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
                        playSound("/clicksound.m4a", 0.35);
                        void handleStartCategoryQuiz(categoryId, rowId || undefined);
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
                    } ${isPanelSwaying ? "saga-level-panel-wind-sway" : ""}`}
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
            <div
              aria-hidden="true"
              style={{ height: `${edgeCenterSpacerHeights.bottom}px` }}
            />
          </>
        )}
        </div>
        <div ref={bottomAnchorRef} />
      </div>
      {completionFlyInOverlay}
    </div>
  );
}
