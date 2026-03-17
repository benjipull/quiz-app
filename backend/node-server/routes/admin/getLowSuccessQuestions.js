const express = require("express");
const router = express.Router();
const Category = require("../../models/categoryModel");
const auth = require("../../middleware/auth");
const adminAuth = require("../../middleware/adminauth");

function parseNumber(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function normalizeText(value) {
  return String(value ?? "").trim().toLowerCase();
}

// GET /api/admin/questions/low-success
// Returns questions answered more than `minAttempts` times
// where correct answer success-rate is below `maxSuccessRate` percent.
router.get("/low-success", auth, adminAuth, async (req, res) => {
  try {
    const minAttempts = Math.max(0, Math.trunc(parseNumber(req.query.minAttempts, 10)));
    const maxSuccessRate = Math.max(0, Math.min(100, parseNumber(req.query.maxSuccessRate, 50)));
    const showDisabled = req.query.showDisabled === "true";
    const limit = Math.max(1, Math.min(2000, Math.trunc(parseNumber(req.query.limit, 500))));

    const pipeline = [
      { $unwind: "$questions" },
      {
        $project: {
          categoryId: "$_id",
          categoryName: "$name",
          questionId: "$questions._id",
          text: "$questions.text",
          answers: { $ifNull: ["$questions.answers", []] },
          correct_answer: { $ifNull: ["$questions.correct_answer", ""] },
          explanation: { $ifNull: ["$questions.explanation", ""] },
          difficulty_level: "$questions.difficulty_level",
          disabled: "$questions.disabled",
          popularity: "$questions.popularity",
          version: "$questions.version",
          validation_verdict: { $ifNull: ["$questions.validation.final_verdict", "Not validated"] },
          createdAt: "$questions.createdAt",
        },
      },
    ];

    if (!showDisabled) {
      pipeline.push({ $match: { disabled: { $ne: true } } });
    }

    pipeline.push(
      {
        $addFields: {
          correctAnswerNormalized: {
            $toLower: {
              $trim: { input: "$correct_answer" },
            },
          },
          totalAttempts: {
            $reduce: {
              input: "$answers",
              initialValue: 0,
              in: { $add: ["$$value", { $ifNull: ["$$this.correctCount", 0] }] },
            },
          },
        },
      },
      {
        $addFields: {
          correctSelections: {
            $reduce: {
              input: "$answers",
              initialValue: 0,
              in: {
                $add: [
                  "$$value",
                  {
                    $cond: [
                      {
                        $eq: [
                          {
                            $toLower: {
                              $trim: { input: { $ifNull: ["$$this.text", ""] } },
                            },
                          },
                          "$correctAnswerNormalized",
                        ],
                      },
                      { $ifNull: ["$$this.correctCount", 0] },
                      0,
                    ],
                  },
                ],
              },
            },
          },
        },
      },
      {
        $addFields: {
          incorrectSelections: {
            $max: [{ $subtract: ["$totalAttempts", "$correctSelections"] }, 0],
          },
          successRate: {
            $cond: [
              { $gt: ["$totalAttempts", 0] },
              { $multiply: [{ $divide: ["$correctSelections", "$totalAttempts"] }, 100] },
              0,
            ],
          },
        },
      },
      {
        $match: {
          totalAttempts: { $gt: minAttempts },
          successRate: { $lt: maxSuccessRate },
        },
      },
      { $sort: { successRate: 1, totalAttempts: -1, createdAt: -1 } },
      { $limit: limit },
      {
        $project: {
          correctAnswerNormalized: 0,
        },
      }
    );

    const rows = await Category.aggregate(pipeline);

    const questions = rows.map((row) => {
      const totalAttempts = Number(row.totalAttempts || 0);
      const correctAnswer = String(row.correct_answer || "");
      const answers = Array.isArray(row.answers) ? row.answers : [];

      return {
        ...row,
        answers: answers.map((answer) => {
          const count = Number(answer?.correctCount || 0);
          return {
            text: String(answer?.text || ""),
            count,
            percentage: totalAttempts > 0 ? Math.round((count / totalAttempts) * 100) : 0,
            isCorrect: normalizeText(answer?.text) === normalizeText(correctAnswer),
          };
        }),
        successRate: Number((Number(row.successRate || 0)).toFixed(2)),
      };
    });

    return res.json({
      criteria: {
        minAttempts,
        maxSuccessRate,
        showDisabled,
        limit,
      },
      questionCount: questions.length,
      questions,
    });
  } catch (error) {
    console.error("Error fetching low success questions:", error);
    return res.status(500).json({ message: "Server error fetching low success questions" });
  }
});

module.exports = router;
