const levelConfigData = require("./level-config.json");

function sanitizeLevels(rawLevels) {
  if (!Array.isArray(rawLevels) || rawLevels.length === 0) {
    throw new Error("Invalid level config: levels must be a non-empty array.");
  }

  const normalized = rawLevels
    .map((entry) => ({
      level: Number(entry.level),
      kpRequired: Number(entry.kpRequired),
    }))
    .filter((entry) => Number.isFinite(entry.level) && Number.isFinite(entry.kpRequired))
    .sort((a, b) => a.level - b.level);

  if (normalized.length === 0) {
    throw new Error("Invalid level config: no valid levels after normalization.");
  }

  return normalized;
}

const levels = sanitizeLevels(levelConfigData.levels);

function normalizeKnowledgePoints(knowledgePoints) {
  const parsed = Number(knowledgePoints);
  if (!Number.isFinite(parsed)) return 0;
  return Math.max(0, parsed);
}

function getLevelForKnowledgePoints(knowledgePoints) {
  const points = normalizeKnowledgePoints(knowledgePoints);
  let resolvedLevel = levels[0].level;

  for (const levelEntry of levels) {
    if (points >= levelEntry.kpRequired) {
      resolvedLevel = levelEntry.level;
    } else {
      break;
    }
  }

  return resolvedLevel;
}

function getLevelProgressForKnowledgePoints(knowledgePoints) {
  const points = normalizeKnowledgePoints(knowledgePoints);
  let currentIndex = 0;

  for (let index = 0; index < levels.length; index += 1) {
    if (points >= levels[index].kpRequired) {
      currentIndex = index;
    } else {
      break;
    }
  }

  const current = levels[currentIndex];
  const next = levels[currentIndex + 1] || null;
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
}

module.exports = {
  levels,
  getLevelForKnowledgePoints,
  getLevelProgressForKnowledgePoints,
};
