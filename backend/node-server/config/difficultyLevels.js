const DIFFICULTY_LEVEL_LABELS = Object.freeze({
  1: "Basic",
  2: "Easy",
  3: "Casual",
  4: "Moderate",
  5: "Challenging",
  6: "Hard",
  7: "Tough",
  8: "Expert",
  9: "Master",
  10: "Legendary",
});

const UNKNOWN_DIFFICULTY_KEY = "unknown";
const UNKNOWN_DIFFICULTY_LABEL = "Unknown";

function normalizeDifficultyLevel(level) {
  if (level === null || level === undefined) return null;
  const asNumber = Number(level);
  if (!Number.isFinite(asNumber)) return null;
  return Math.round(asNumber);
}

function getDifficultyLabel(level) {
  const normalized = normalizeDifficultyLevel(level);
  if (normalized !== null && DIFFICULTY_LEVEL_LABELS[normalized]) {
    return DIFFICULTY_LEVEL_LABELS[normalized];
  }
  return UNKNOWN_DIFFICULTY_LABEL;
}

function getDifficultyLabelsByKey() {
  const labelsByKey = {
    [UNKNOWN_DIFFICULTY_KEY]: UNKNOWN_DIFFICULTY_LABEL,
  };

  Object.entries(DIFFICULTY_LEVEL_LABELS).forEach(([level, label]) => {
    labelsByKey[String(level)] = label;
  });

  return labelsByKey;
}

module.exports = {
  DIFFICULTY_LEVEL_LABELS,
  UNKNOWN_DIFFICULTY_KEY,
  UNKNOWN_DIFFICULTY_LABEL,
  normalizeDifficultyLevel,
  getDifficultyLabel,
  getDifficultyLabelsByKey,
};
