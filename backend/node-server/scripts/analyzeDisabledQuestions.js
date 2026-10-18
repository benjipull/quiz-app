require("dotenv").config();
const mongoose = require("mongoose");
const Category = require("../models/categoryModel");
const connectDB = require("../config/db");

async function analyzeDisabledQuestions() {
  try {
    await connectDB();
    console.log("🔗 Connected to MongoDB\n");

    // First, check what versions exist
    console.log("📋 Checking question versions in database...\n");
    const versionStats = await Category.aggregate([
      { $unwind: "$questions" },
      {
        $group: {
          _id: "$questions.version",
          count: { $sum: 1 },
          disabled: {
            $sum: { $cond: [{ $eq: ["$questions.disabled", true] }, 1, 0] }
          }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    console.log("Version statistics:");
    versionStats.forEach(v => {
      console.log(`  Version ${v._id || "null"}: ${v.count} total, ${v.disabled} disabled`);
    });
    console.log("");

    // Aggregate all disabled questions across all categories - FILTER FOR VERSION 3.51 ONLY
    const TARGET_VERSION = 3.51;
    const results = await Category.aggregate([
      {
        $project: {
          name: 1,
          disabledQuestions: {
            $filter: {
              input: "$questions",
              as: "q",
              cond: {
                $and: [
                  { $eq: ["$$q.disabled", true] },
                  { $eq: ["$$q.version", TARGET_VERSION] }
                ]
              }
            }
          }
        }
      },
      {
        $match: {
          "disabledQuestions.0": { $exists: true }
        }
      }
    ]);

    let totalDisabled = 0;
    let verdictCounts = {
      Incorrect: 0,
      Ambiguous: 0,
      Other: 0
    };
    let ambiguityTypes = {};
    let disabledReasons = {};
    let ambiguityFixAttempted = 0;
    let ambiguityFixApplied = 0;
    let explanationInconsistent = 0;
    let incorrectAnswers = 0;

    const allDisabledQuestions = [];

    console.log(`📊 DISABLED QUESTIONS ANALYSIS (VERSION ${TARGET_VERSION} ONLY)\n`);
    console.log("=".repeat(80) + "\n");

    for (const category of results) {
      console.log(`📁 Category: ${category.name}`);
      console.log(`   Disabled questions: ${category.disabledQuestions.length}\n`);

      for (const question of category.disabledQuestions) {
        totalDisabled++;

        const validation = question.validation || {};
        const verdict = validation.final_verdict || "No Validation Data";
        const ambiguityType = validation.ambiguity_type || "unknown";
        const disabledReason = question.disabled_reason || "Unknown";

        // Track verdicts
        if (verdict === "Incorrect") verdictCounts.Incorrect++;
        else if (verdict === "Ambiguous") verdictCounts.Ambiguous++;
        else verdictCounts.Other++;

        // Track ambiguity types
        if (verdict === "Ambiguous") {
          ambiguityTypes[ambiguityType] = (ambiguityTypes[ambiguityType] || 0) + 1;
        }

        // Track disabled reasons
        disabledReasons[disabledReason] = (disabledReasons[disabledReason] || 0) + 1;

        // Track fix attempts
        if (validation.ambiguity_fix_attempted) ambiguityFixAttempted++;
        if (validation.ambiguity_fix_applied) ambiguityFixApplied++;

        // Track other issues
        if (validation.explanation_consistent === false) explanationInconsistent++;
        if (validation.is_correct_answer_valid === false) incorrectAnswers++;

        // Store for detailed output
        allDisabledQuestions.push({
          category: category.name,
          question: question.text,
          correctAnswer: question.correct_answer,
          version: question.version,
          verdict,
          ambiguityType,
          ambiguityReasoning: validation.ambiguity_reasoning || "",
          correctAnswerReasoning: validation.correct_answer_reasoning || "",
          otherAnswersPossible: validation.other_answers_possible || [],
          ambiguityFixFailureReason: validation.ambiguity_fix_failure_reason || "",
          disabledReason,
          hasValidation: !!question.validation
        });
      }
    }

    console.log("\n" + "=".repeat(80));
    console.log("📈 SUMMARY STATISTICS");
    console.log("=".repeat(80) + "\n");

    console.log(`Total disabled questions: ${totalDisabled}\n`);

    console.log("Verdict breakdown:");
    console.log(`  ❌ Incorrect: ${verdictCounts.Incorrect} (${((verdictCounts.Incorrect / totalDisabled) * 100).toFixed(1)}%)`);
    console.log(`  ⚠️  Ambiguous: ${verdictCounts.Ambiguous} (${((verdictCounts.Ambiguous / totalDisabled) * 100).toFixed(1)}%)`);
    console.log(`  ❓ Other: ${verdictCounts.Other} (${((verdictCounts.Other / totalDisabled) * 100).toFixed(1)}%)\n`);

    if (Object.keys(ambiguityTypes).length > 0) {
      console.log("Ambiguity type breakdown:");
      Object.entries(ambiguityTypes)
        .sort((a, b) => b[1] - a[1])
        .forEach(([type, count]) => {
          console.log(`  • ${type}: ${count} (${((count / verdictCounts.Ambiguous) * 100).toFixed(1)}% of ambiguous)`);
        });
      console.log("");
    }

    console.log("Other metrics:");
    console.log(`  🛠️  Ambiguity fix attempted: ${ambiguityFixAttempted}`);
    console.log(`  ✅ Ambiguity fix applied: ${ambiguityFixApplied}`);
    console.log(`  📝 Explanation inconsistent: ${explanationInconsistent}`);
    console.log(`  ❌ Incorrect answers: ${incorrectAnswers}\n`);

    console.log("=".repeat(80));
    console.log("🔍 DETAILED QUESTION ANALYSIS");
    console.log("=".repeat(80) + "\n");

    // Group by verdict and show examples
    const noValidationQuestions = allDisabledQuestions.filter(q => !q.hasValidation);
    const incorrectQuestions = allDisabledQuestions.filter(q => q.verdict === "Incorrect");
    const ambiguousQuestions = allDisabledQuestions.filter(q => q.verdict === "Ambiguous");

    if (noValidationQuestions.length > 0) {
      console.log(`\n❓ QUESTIONS WITHOUT VALIDATION DATA (${noValidationQuestions.length} total)\n`);
      noValidationQuestions.slice(0, 20).forEach((q, i) => {
        console.log(`${i + 1}. [${q.category}] v${q.version}`);
        console.log(`   Q: ${q.question}`);
        console.log(`   A: ${q.correctAnswer}`);
        console.log(`   Disabled reason: ${q.disabledReason}`);
        console.log("");
      });
      if (noValidationQuestions.length > 20) {
        console.log(`   ... and ${noValidationQuestions.length - 20} more\n`);
      }
    }

    if (incorrectQuestions.length > 0) {
      console.log(`\n❌ INCORRECT QUESTIONS (${incorrectQuestions.length} total)\n`);
      incorrectQuestions.slice(0, 10).forEach((q, i) => {
        console.log(`${i + 1}. [${q.category}]`);
        console.log(`   Q: ${q.question}`);
        console.log(`   Reasoning: ${q.correctAnswerReasoning}`);
        console.log("");
      });
      if (incorrectQuestions.length > 10) {
        console.log(`   ... and ${incorrectQuestions.length - 10} more\n`);
      }
    }

    if (ambiguousQuestions.length > 0) {
      console.log(`\n⚠️  AMBIGUOUS QUESTIONS (${ambiguousQuestions.length} total)\n`);

      // Group by ambiguity type
      const byType = {};
      ambiguousQuestions.forEach(q => {
        const type = q.ambiguityType || "unknown";
        if (!byType[type]) byType[type] = [];
        byType[type].push(q);
      });

      Object.entries(byType)
        .sort((a, b) => b[1].length - a[1].length)
        .forEach(([type, questions]) => {
          console.log(`\n  📌 Type: ${type.toUpperCase()} (${questions.length} questions)\n`);
          questions.slice(0, 5).forEach((q, i) => {
            console.log(`  ${i + 1}. [${q.category}]`);
            console.log(`     Q: ${q.question}`);
            if (q.ambiguityReasoning) {
              console.log(`     Reasoning: ${q.ambiguityReasoning}`);
            }
            if (q.otherAnswersPossible && q.otherAnswersPossible.length > 0) {
              console.log(`     Other possible answers: ${q.otherAnswersPossible.join(", ")}`);
            }
            if (q.ambiguityFixFailureReason) {
              console.log(`     Fix failure: ${q.ambiguityFixFailureReason}`);
            }
            console.log("");
          });
          if (questions.length > 5) {
            console.log(`     ... and ${questions.length - 5} more\n`);
          }
        });
    }

    console.log("\n" + "=".repeat(80));
    console.log("💡 RECOMMENDATIONS");
    console.log("=".repeat(80) + "\n");

    // Generate recommendations based on data
    const recommendations = [];

    if (verdictCounts.Incorrect > totalDisabled * 0.3) {
      recommendations.push("⚠️  HIGH INCORRECT RATE: " + ((verdictCounts.Incorrect / totalDisabled) * 100).toFixed(1) + "% of questions have factually incorrect answers. Consider strengthening fact verification in prompts.");
    }

    if (verdictCounts.Ambiguous > totalDisabled * 0.5) {
      recommendations.push("⚠️  HIGH AMBIGUITY RATE: " + ((verdictCounts.Ambiguous / totalDisabled) * 100).toFixed(1) + "% of questions are ambiguous. Review prompt clarity and add more anti-ambiguity rules.");
    }

    const topAmbiguityType = Object.entries(ambiguityTypes).sort((a, b) => b[1] - a[1])[0];
    if (topAmbiguityType && topAmbiguityType[1] > verdictCounts.Ambiguous * 0.3) {
      recommendations.push(`⚠️  COMMON AMBIGUITY TYPE: "${topAmbiguityType[0]}" appears in ${topAmbiguityType[1]} questions. Add specific rules to address this type.`);
    }

    if (ambiguityFixAttempted > 0 && ambiguityFixApplied / ambiguityFixAttempted < 0.3) {
      recommendations.push(`⚠️  LOW FIX SUCCESS RATE: Only ${((ambiguityFixApplied / ambiguityFixAttempted) * 100).toFixed(1)}% of fix attempts succeeded. Consider improving the ambiguity fix prompt.`);
    }

    if (recommendations.length > 0) {
      recommendations.forEach(rec => console.log(rec + "\n"));
    } else {
      console.log("✅ No major issues detected. Quality looks good!\n");
    }

    await mongoose.connection.close();
    console.log("🔒 MongoDB connection closed.");

  } catch (error) {
    console.error("❌ Error analyzing disabled questions:", error);
    await mongoose.connection.close();
  }
}

analyzeDisabledQuestions();
