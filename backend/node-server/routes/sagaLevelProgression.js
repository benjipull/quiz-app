const express = require("express");
const mongoose = require("mongoose");
const authenticateToken = require("../middleware/auth");
const User = require("../models/user");
const Category = require("../models/categoryModel");
const SagaLevelProgression = require("../models/SagaLevelProgression");

const router = express.Router();

const MIN_QUESTIONS_FOR_PLAY = 5;
const REQUIRED_LEVEL_RECORDS = 10;
const LEVEL_ROWS_LIMIT = 6;
const COMPLETED_ROWS_TO_UNLOCK_NEXT_SAGA = 6;
const SAGA_COMPLETION_REWARD_COINS = 500;

const getDifficultyWindow = (userLevel) => ({
  minDifficulty: Math.max(1, userLevel),
  maxDifficulty: Math.min(10, userLevel + 1),
});

const parseSagaNumber = (value) => {
  const parsed = Number.parseInt(String(value), 10);
  if (Number.isNaN(parsed) || parsed < 1) return null;
  return parsed;
};

const parseCategoryIdsQuery = (value) => {
  if (!value) return [];

  const tokens = Array.isArray(value)
    ? value.flatMap((item) => String(item).split(","))
    : String(value).split(",");

  return tokens
    .map((token) => token.trim())
    .filter(Boolean);
};

const shuffle = (array) => {
  const copy = [...array];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
};

const toObjectId = (value) => {
  if (!value) return null;
  if (value instanceof mongoose.Types.ObjectId) return value;
  const valueAsString = String(value);
  if (!mongoose.Types.ObjectId.isValid(valueAsString)) return null;
  return new mongoose.Types.ObjectId(valueAsString);
};

const sortSagaLevels = (sagaLevels = []) =>
  [...sagaLevels].sort((a, b) => {
    const aTime = a?.createdAt ? new Date(a.createdAt).getTime() : 0;
    const bTime = b?.createdAt ? new Date(b.createdAt).getTime() : 0;
    if (aTime !== bTime) {
      return aTime - bTime;
    }

    const aId = String(a?._id || a?.category || "");
    const bId = String(b?._id || b?.category || "");
    return aId.localeCompare(bId);
  });

const normalizeSagaNumber = (value) => {
  const parsed = Number.parseInt(String(value), 10);
  if (Number.isNaN(parsed) || parsed < 1) return null;
  return parsed;
};

const addSagaLevelToMap = (map, sagaNumber, categoryValue, createdAtValue) => {
  const normalizedSagaNumber = normalizeSagaNumber(sagaNumber);
  const categoryObjectId = toObjectId(categoryValue);
  if (!normalizedSagaNumber || !categoryObjectId) return;

  const sagaKey = String(normalizedSagaNumber);
  if (!map.has(sagaKey)) {
    map.set(sagaKey, new Map());
  }

  const categoryKey = String(categoryObjectId);
  const levelMap = map.get(sagaKey);
  const parsedDate = createdAtValue ? new Date(createdAtValue) : new Date(0);
  const safeDate = Number.isNaN(parsedDate.getTime()) ? new Date(0) : parsedDate;
  const existing = levelMap.get(categoryKey);

  if (!existing || safeDate.getTime() < existing.createdAt.getTime()) {
    levelMap.set(categoryKey, {
      category: categoryObjectId,
      createdAt: safeDate,
    });
  }
};

const mergeSagaArrayIntoMap = (map, sagas) => {
  if (!Array.isArray(sagas)) return;

  sagas.forEach((saga) => {
    const sagaNumber = normalizeSagaNumber(saga?.sagaNumber);
    if (!sagaNumber) return;

    const sagaLevels = Array.isArray(saga?.sagaLevels) ? saga.sagaLevels : [];
    sagaLevels.forEach((sagaLevel) => {
      addSagaLevelToMap(
        map,
        sagaNumber,
        sagaLevel?.category?._id || sagaLevel?.category,
        sagaLevel?.createdAt,
      );
    });
  });
};

const buildMergedSagasFromRawDocs = (rawDocs) => {
  const merged = new Map();

  rawDocs.forEach((doc) => {
    if (Array.isArray(doc.sagas)) {
      mergeSagaArrayIntoMap(merged, doc.sagas);
      return;
    }

    addSagaLevelToMap(merged, doc.sagaNumber, doc.category, doc.createdAt);
  });

  return Array.from(merged.entries())
    .map(([sagaKey, categoryMap]) => ({
      sagaNumber: Number.parseInt(sagaKey, 10),
      sagaLevels: Array.from(categoryMap.values())
        .sort((a, b) => {
          const aTime = a.createdAt.getTime();
          const bTime = b.createdAt.getTime();
          if (aTime !== bTime) return aTime - bTime;
          return String(a.category).localeCompare(String(b.category));
        })
        .map((entry) => ({
          category: entry.category,
          createdAt: entry.createdAt,
        })),
    }))
    .sort((a, b) => a.sagaNumber - b.sagaNumber);
};

const findSagaByNumber = (sagas = [], sagaNumber) =>
  sagas.find((saga) => Number(saga?.sagaNumber) === Number(sagaNumber)) || null;

const flattenSagasToRows = (playerId, sagas = []) => {
  const orderedSagas = [...sagas].sort(
    (a, b) => Number(a?.sagaNumber || 0) - Number(b?.sagaNumber || 0),
  );

  const rows = [];
  orderedSagas.forEach((saga) => {
    const sagaNumber = Number(saga?.sagaNumber || 0);
    if (!sagaNumber) return;

    const sagaLevels = sortSagaLevels(Array.isArray(saga?.sagaLevels) ? saga.sagaLevels : []);
    sagaLevels.forEach((sagaLevel) => {
      const categoryId = sagaLevel?.category?._id || sagaLevel?.category || null;
      rows.push({
        _id: String(sagaLevel?._id || `${sagaNumber}-${String(categoryId || "")}`),
        player: String(playerId),
        sagaNumber,
        category: categoryId,
        createdAt: sagaLevel?.createdAt || null,
      });
    });
  });

  return rows;
};

const mapSagasForResponse = (sagas = []) =>
  [...sagas]
    .sort((a, b) => Number(a?.sagaNumber || 0) - Number(b?.sagaNumber || 0))
    .map((saga) => {
      const sagaNumber = Number(saga?.sagaNumber || 0);
      const sagaLevels = sortSagaLevels(Array.isArray(saga?.sagaLevels) ? saga.sagaLevels : []);

      return {
        sagaNumber,
        completionRewardClaimed: Boolean(saga?.completionRewardClaimed),
        completionRewardClaimedAt: saga?.completionRewardClaimedAt || null,
        sagaLevels: sagaLevels.map((sagaLevel) => {
          const categoryId = sagaLevel?.category?._id || sagaLevel?.category || null;
          return {
            _id: String(sagaLevel?._id || `${sagaNumber}-${String(categoryId || "")}`),
            category: categoryId ? String(categoryId) : null,
            isCompleted: Boolean(sagaLevel?.isCompleted),
            completionRating: Number(sagaLevel?.completionRating || 0),
            createdAt: sagaLevel?.createdAt || null,
          };
        }),
      };
    });

const buildSagaLevelRows = (playerId, sagaNumber, sagaLevels = []) => {
  const orderedLevels = sortSagaLevels(sagaLevels);

  return orderedLevels.map((sagaLevel) => {
    const categoryId = toObjectId(sagaLevel?.category?._id || sagaLevel?.category);

    return {
      _id: String(sagaLevel?._id || `${sagaNumber}-${String(categoryId || "")}`),
      player: String(playerId),
      sagaNumber,
      isCompleted: Boolean(sagaLevel?.isCompleted),
      completionRating: Number(sagaLevel?.completionRating || 0),
      category: categoryId ? String(categoryId) : null,
      createdAt: sagaLevel?.createdAt || null,
    };
  });
};

const calculateUnlockedSagaNumber = (sagas = []) => {
  const maxSagaNumber = sagas.length
    ? Math.max(...sagas.map((saga) => Number(saga?.sagaNumber) || 0))
    : 0;

  let sagaNumber = maxSagaNumber > 0 ? maxSagaNumber : 0;
  if (maxSagaNumber > 0) {
    const latestSaga = findSagaByNumber(sagas, maxSagaNumber);
    const completedCount = (latestSaga?.sagaLevels || []).reduce(
      (count, sagaLevel) => count + (sagaLevel?.isCompleted ? 1 : 0),
      0,
    );

    if (completedCount >= COMPLETED_ROWS_TO_UNLOCK_NEXT_SAGA) {
      sagaNumber += 1;
    }
  }

  return sagaNumber;
};

const getCompletedLevelsCount = (saga) =>
  (saga?.sagaLevels || []).reduce(
    (count, sagaLevel) => count + (sagaLevel?.isCompleted ? 1 : 0),
    0,
  );

const buildProgressionSummary = (sagas = []) => {
  const sagaNumber = calculateUnlockedSagaNumber(sagas);
  const currentSaga = findSagaByNumber(sagas, sagaNumber);
  const completedLevelsInCurrentSaga = Math.min(
    COMPLETED_ROWS_TO_UNLOCK_NEXT_SAGA,
    Math.max(0, getCompletedLevelsCount(currentSaga)),
  );

  return {
    sagaNumber,
    completedLevelsInCurrentSaga,
    levelsPerSaga: COMPLETED_ROWS_TO_UNLOCK_NEXT_SAGA,
  };
};

const getCanonicalProgression = async (playerId, { migrate = false } = {}) => {
  const playerObjectId = toObjectId(playerId);
  if (!playerObjectId) {
    throw new Error("Invalid player ID.");
  }

  const rawDocs = await SagaLevelProgression.collection
    .find({ player: playerObjectId })
    .toArray();

  if (!rawDocs.length) {
    if (!migrate) {
      return { doc: null, sagas: [] };
    }

    const created = await SagaLevelProgression.create({
      player: playerObjectId,
      sagas: [],
    });
    return { doc: created, sagas: created.sagas || [] };
  }

  const sagaDocs = rawDocs.filter((doc) => Array.isArray(doc.sagas));
  const hasLegacyDocs = rawDocs.some((doc) => !Array.isArray(doc.sagas));

  if (!hasLegacyDocs && sagaDocs.length === 1) {
    const doc = await SagaLevelProgression.findById(sagaDocs[0]._id);
    return { doc, sagas: doc?.sagas || [] };
  }

  const mergedSagas = buildMergedSagasFromRawDocs(rawDocs);
  if (!migrate) {
    return { doc: null, sagas: mergedSagas };
  }

  const canonicalId = sagaDocs[0]?._id || null;
  let canonicalDoc = canonicalId
    ? await SagaLevelProgression.findById(canonicalId)
    : null;

  if (!canonicalDoc) {
    canonicalDoc = new SagaLevelProgression({
      player: playerObjectId,
      sagas: [],
    });
  }

  canonicalDoc.player = playerObjectId;
  canonicalDoc.sagas = mergedSagas;
  await canonicalDoc.save();

  const staleIds = rawDocs
    .map((doc) => doc._id)
    .filter((id) => String(id) !== String(canonicalDoc._id));

  if (staleIds.length) {
    await SagaLevelProgression.deleteMany({ _id: { $in: staleIds } });
  }

  return { doc: canonicalDoc, sagas: canonicalDoc.sagas || [] };
};

const getEligibleCategories = async (minDifficulty, maxDifficulty) => {
  const categories = await Category.find({ disabled: false })
    .select("_id name")
    .lean();

  if (!categories.length) {
    return [];
  }

  const categoryIds = categories.map((category) => category._id);

  const questionCounts = await Category.aggregate([
    {
      $match: {
        _id: { $in: categoryIds },
        disabled: false,
        "questions.disabled": false,
      },
    },
    {
      $project: {
        eligibleCount: {
          $size: {
            $filter: {
              input: "$questions",
              as: "q",
              cond: {
                $and: [
                  { $eq: ["$$q.disabled", false] },
                  { $gte: ["$$q.difficulty_level", minDifficulty] },
                  { $lte: ["$$q.difficulty_level", maxDifficulty] },
                ],
              },
            },
          },
        },
      },
    },
    {
      $match: {
        eligibleCount: { $gte: MIN_QUESTIONS_FOR_PLAY },
      },
    },
  ]);

  const countMap = new Map();
  questionCounts.forEach((entry) => {
    countMap.set(String(entry._id), entry.eligibleCount);
  });

  return categories.filter((category) => countMap.has(String(category._id)));
};

router.get("/progression", authenticateToken, async (req, res) => {
  try {
    const playerId = req.user?.id;

    if (!playerId || !mongoose.Types.ObjectId.isValid(playerId)) {
      return res.status(400).json({ message: "Invalid player ID." });
    }

    const { sagas } = await getCanonicalProgression(playerId, { migrate: false });
    const progressionSummary = buildProgressionSummary(sagas);

    return res.status(200).json({
      playerId,
      sagaNumber: progressionSummary.sagaNumber,
      completedLevelsInCurrentSaga: progressionSummary.completedLevelsInCurrentSaga,
      levelsPerSaga: progressionSummary.levelsPerSaga,
      sagas: mapSagasForResponse(sagas),
    });
  } catch (error) {
    console.error("Failed to load saga progression:", error);
    return res.status(500).json({
      message: "Server error while loading saga progression.",
      error: error.message,
    });
  }
});

router.post("/claim-unlock-reward", authenticateToken, async (req, res) => {
  try {
    const playerId = req.user?.id;
    const sagaNumber = parseSagaNumber(req.body?.sagaNumber);

    if (!playerId || !mongoose.Types.ObjectId.isValid(playerId)) {
      return res.status(400).json({ message: "Invalid player ID." });
    }

    if (!sagaNumber) {
      return res.status(400).json({ message: "Invalid saga number." });
    }

    if (sagaNumber !== 1) {
      return res.status(409).json({
        message: "Saga completion chest reward is only available for saga 1.",
      });
    }

    const { doc: progression } = await getCanonicalProgression(playerId, { migrate: true });
    if (!progression) {
      return res.status(404).json({ message: "Saga progression not found." });
    }

    const saga = findSagaByNumber(progression.sagas, sagaNumber);
    if (!saga) {
      return res.status(404).json({ message: "Saga not found." });
    }

    const completedCount = getCompletedLevelsCount(saga);
    if (completedCount < COMPLETED_ROWS_TO_UNLOCK_NEXT_SAGA) {
      return res.status(409).json({
        message: "Saga completion reward is not available yet.",
        requiredCompletedLevels: COMPLETED_ROWS_TO_UNLOCK_NEXT_SAGA,
        completedLevels: completedCount,
      });
    }

    const user = await User.findById(playerId).select("coins");
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    if (saga.completionRewardClaimed) {
      return res.status(200).json({
        message: "Saga completion reward already claimed.",
        sagaNumber,
        alreadyClaimed: true,
        coinsEarned: 0,
        totalCoins: Number(user.coins || 0),
      });
    }

    saga.completionRewardClaimed = true;
    saga.completionRewardClaimedAt = new Date();
    user.coins = Number(user.coins || 0) + SAGA_COMPLETION_REWARD_COINS;

    await Promise.all([progression.save(), user.save()]);

    return res.status(200).json({
      message: "Saga completion reward claimed successfully.",
      sagaNumber,
      alreadyClaimed: false,
      coinsEarned: SAGA_COMPLETION_REWARD_COINS,
      totalCoins: Number(user.coins || 0),
    });
  } catch (error) {
    console.error("Failed to claim saga unlock reward:", error);
    return res.status(500).json({
      message: "Server error while claiming saga unlock reward.",
      error: error.message,
    });
  }
});

router.get("/categories", authenticateToken, async (req, res) => {
  try {
    const playerId = req.user?.id;
    if (!playerId || !mongoose.Types.ObjectId.isValid(playerId)) {
      return res.status(400).json({ message: "Invalid player ID." });
    }

    const requestedCategoryIds = parseCategoryIdsQuery(req.query.ids);
    const uniqueCategoryIds = Array.from(
      new Set(
        requestedCategoryIds
          .map((categoryId) => toObjectId(categoryId))
          .filter(Boolean)
          .map((categoryId) => String(categoryId)),
      ),
    );

    if (!uniqueCategoryIds.length) {
      return res.status(200).json({ categories: [] });
    }

    const objectIds = uniqueCategoryIds.map((categoryId) => new mongoose.Types.ObjectId(categoryId));
    const categories = await Category.find({ _id: { $in: objectIds } })
      .select("_id name image64 disabled")
      .lean();

    return res.status(200).json({
      categories: categories.map((category) => ({
        _id: String(category._id),
        name: category.name || "",
        image64: category.image64 || "",
        disabled: Boolean(category.disabled),
      })),
    });
  } catch (error) {
    console.error("Failed to load saga category details:", error);
    return res.status(500).json({
      message: "Server error while loading saga category details.",
      error: error.message,
    });
  }
});

router.post("/levels/:sagaNumber/bootstrap", authenticateToken, async (req, res) => {
  try {
    const playerId = req.user?.id;
    const sagaNumber = parseSagaNumber(req.params.sagaNumber);

    if (!playerId || !mongoose.Types.ObjectId.isValid(playerId)) {
      return res.status(400).json({ message: "Invalid player ID." });
    }

    if (!sagaNumber) {
      return res.status(400).json({ message: "Invalid saga number." });
    }

    const user = await User.findById(playerId).select("level").lean();
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    const { doc: progression } = await getCanonicalProgression(playerId, { migrate: true });
    let saga = findSagaByNumber(progression.sagas, sagaNumber);

    if (!saga) {
      progression.sagas.push({
        sagaNumber,
        sagaLevels: [],
      });
      saga = findSagaByNumber(progression.sagas, sagaNumber);
    }

    const existingCategoryIds = new Set(
      (saga?.sagaLevels || [])
        .map((sagaLevel) => sagaLevel?.category)
        .filter(Boolean)
        .map((categoryId) => String(categoryId)),
    );

    const recordsToCreate = REQUIRED_LEVEL_RECORDS - existingCategoryIds.size;

    if (recordsToCreate > 0) {
      const { minDifficulty, maxDifficulty } = getDifficultyWindow(user.level || 1);
      const eligibleCategories = await getEligibleCategories(minDifficulty, maxDifficulty);
      const availableCategories = eligibleCategories.filter(
        (category) => !existingCategoryIds.has(String(category._id)),
      );

      if (availableCategories.length < recordsToCreate) {
        return res.status(404).json({
          message:
            "Not enough eligible categories available to create this saga level.",
          required: REQUIRED_LEVEL_RECORDS,
          existing: existingCategoryIds.size,
          available: availableCategories.length + existingCategoryIds.size,
        });
      }

      const selectedCategories = shuffle(availableCategories).slice(0, recordsToCreate);
      selectedCategories.forEach((category) => {
        saga.sagaLevels.push({
          category: category._id,
        });
      });

      await progression.save();
      saga = findSagaByNumber(progression.sagas, sagaNumber);
    }

    const rows = buildSagaLevelRows(
      playerId,
      sagaNumber,
      saga?.sagaLevels || [],
    );

    return res.status(200).json({
      playerId,
      sagaNumber,
      rows: rows.slice(0, LEVEL_ROWS_LIMIT),
    });
  } catch (error) {
    console.error("Failed to bootstrap saga level:", error);
    return res.status(500).json({
      message: "Server error while creating saga level progression.",
      error: error.message,
    });
  }
});

router.get("/levels/:sagaNumber", authenticateToken, async (req, res) => {
  try {
    const playerId = req.user?.id;
    const sagaNumber = parseSagaNumber(req.params.sagaNumber);

    if (!playerId || !mongoose.Types.ObjectId.isValid(playerId)) {
      return res.status(400).json({ message: "Invalid player ID." });
    }

    if (!sagaNumber) {
      return res.status(400).json({ message: "Invalid saga number." });
    }

    const { sagas } = await getCanonicalProgression(playerId, { migrate: false });
    const saga = findSagaByNumber(sagas, sagaNumber);
    const rows = buildSagaLevelRows(
      playerId,
      sagaNumber,
      saga?.sagaLevels || [],
    );

    return res.status(200).json({
      playerId,
      sagaNumber,
      rows: rows.slice(0, LEVEL_ROWS_LIMIT),
    });
  } catch (error) {
    console.error("Failed to load saga level:", error);
    return res.status(500).json({
      message: "Server error while loading saga level progression.",
      error: error.message,
    });
  }
});

module.exports = router;
