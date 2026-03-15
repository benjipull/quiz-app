import { getApiBaseUrl } from "@/utils/baseUrl";

export interface LevelConfigEntry {
  level: number;
  kpRequired: number;
}

interface LevelConfigApiResponse {
  levels: LevelConfigEntry[];
}

export interface LevelProgress {
  currentLevel: number;
  nextLevel: number;
  currentLevelFloor: number;
  nextLevelThreshold: number;
  progressIntoLevel: number;
  progressToNextLevel: number;
  remainingKpToNextLevel: number;
  isMaxLevel: boolean;
}

let cachedLevelConfig: LevelConfigEntry[] | null = null;
let levelConfigInFlight: Promise<LevelConfigEntry[]> | null = null;

const normalizeKnowledgePoints = (knowledgePoints: number) => {
  if (!Number.isFinite(knowledgePoints)) return 0;
  return Math.max(0, Number(knowledgePoints));
};

const normalizeLevels = (levels: LevelConfigEntry[]): LevelConfigEntry[] => {
  if (!Array.isArray(levels) || levels.length === 0) {
    throw new Error("Level config is empty.");
  }

  const normalized = levels
    .map((entry) => ({
      level: Number(entry.level),
      kpRequired: Number(entry.kpRequired),
    }))
    .filter((entry) => Number.isFinite(entry.level) && Number.isFinite(entry.kpRequired))
    .sort((a, b) => a.level - b.level);

  if (normalized.length === 0) {
    throw new Error("Level config has no valid levels.");
  }

  return normalized;
};

export const loadLevelConfig = async (): Promise<LevelConfigEntry[]> => {
  if (cachedLevelConfig) {
    return cachedLevelConfig;
  }

  if (!levelConfigInFlight) {
    levelConfigInFlight = (async () => {
      const response = await fetch(`${getApiBaseUrl()}/api/level-config`);
      if (!response.ok) {
        throw new Error(`Failed to load level config: ${response.status}`);
      }

      const payload = (await response.json()) as LevelConfigApiResponse;
      cachedLevelConfig = normalizeLevels(payload.levels);
      return cachedLevelConfig;
    })().finally(() => {
      levelConfigInFlight = null;
    });
  }

  return levelConfigInFlight;
};

export const resolveLevelProgress = (
  knowledgePoints: number,
  levels: LevelConfigEntry[]
): LevelProgress => {
  const normalizedLevels = normalizeLevels(levels);
  const points = normalizeKnowledgePoints(knowledgePoints);
  let currentIndex = 0;

  for (let index = 0; index < normalizedLevels.length; index += 1) {
    if (points >= normalizedLevels[index].kpRequired) {
      currentIndex = index;
    } else {
      break;
    }
  }

  const current = normalizedLevels[currentIndex];
  const next = normalizedLevels[currentIndex + 1] || null;
  const currentLevelFloor = current.kpRequired;
  const nextLevelThreshold = next ? next.kpRequired : current.kpRequired;
  const progressToNextLevel = next
    ? Math.max(0, nextLevelThreshold - currentLevelFloor)
    : 0;
  const progressIntoLevel = next
    ? Math.max(0, points - currentLevelFloor)
    : 0;
  const remainingKpToNextLevel = next
    ? Math.max(0, nextLevelThreshold - points)
    : 0;

  return {
    currentLevel: current.level,
    nextLevel: next ? next.level : current.level,
    currentLevelFloor,
    nextLevelThreshold,
    progressIntoLevel,
    progressToNextLevel,
    remainingKpToNextLevel,
    isMaxLevel: !next,
  };
};
