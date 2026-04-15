const express = require("express");
const router = express.Router();
const Category = require("../models/categoryModel");
const { userQuestions } = require("../index");

async function hydrateQuestionImage64IfMissing(question) {
  if (!question || !question._id) {
    return question;
  }

  const hasImage64Field = Object.prototype.hasOwnProperty.call(question, "image64");
  if (hasImage64Field && question.image64 != null) {
    return question;
  }

  const category = await Category.findOne(
    { "questions._id": question._id },
    { questions: { $elemMatch: { _id: question._id } } }
  ).lean();

  const dbImage64 = String(category?.questions?.[0]?.image64 ?? "").trim();
  return {
    ...question,
    image64: dbImage64,
  };
}

async function buildQuestionResponsePayload(question) {
  const hydrated = await hydrateQuestionImage64IfMissing(question);
  return {
    ...hydrated,
    image64: String(hydrated?.image64 ?? ""),
  };
}

// Route: Get Current or Next Question for User Token
router.get("/:userToken", async (req, res) => {
  try {
    const { userToken } = req.params;
    const peekParam = String(req.query.peek || "").toLowerCase();
    const isPeekMode = peekParam === "1" || peekParam === "true";
    const userSession = userQuestions[userToken];

    if (!userSession) {
      console.warn(`No active quiz session for token: ${userToken}`);
      return res.status(404).json({ message: "No more questions available for this token." });
    }

    if (isPeekMode) {
      const hasCurrentQuestion = Boolean(userSession.current);
      const peekIndex = hasCurrentQuestion ? 1 : 0;
      const peekQuestion = Array.isArray(userSession.queue) ? userSession.queue[peekIndex] : null;

      if (!peekQuestion) {
        return res.status(404).json({ message: "No upcoming question available to preload." });
      }

      const responseQuestion = await buildQuestionResponsePayload(peekQuestion);
      const remainingAfterPeek = hasCurrentQuestion
        ? Math.max(userSession.queue.length - 1, 0)
        : userSession.queue.length;

      return res.status(200).json({
        question: responseQuestion,
        timerInSeconds: 20,
        remaining: remainingAfterPeek,
        peek: true,
      });
    }

    // If user already has a current question, return it
    if (userSession.current) {
      const responseQuestion = await buildQuestionResponsePayload(userSession.current);
      userSession.current = responseQuestion;
      return res.status(200).json({
        question: responseQuestion,
        remaining: userSession.queue.length,
      });
    }

    if (!Array.isArray(userSession.queue) || userSession.queue.length === 0) {
      console.warn(`Question queue exhausted for token: ${userToken}`);
      return res.status(404).json({ message: "No more questions available for this token." });
    }

    // Otherwise, set the first one in queue as current (but don't remove it yet)
    const nextQuestion = userSession.queue[0];
    const responseQuestion = await buildQuestionResponsePayload(nextQuestion);
    userSession.current = responseQuestion;
    userSession.queue[0] = responseQuestion;

    // Increment timesLoaded in DB
    await Category.findOneAndUpdate(
      { "questions._id": nextQuestion._id },
      { $inc: { "questions.$.timesLoaded": 1 } },
      { new: true }
    );

    return res.status(200).json({
      question: responseQuestion,
      timerInSeconds: 20,
      remaining: userSession.queue.length,
    });
  } catch (error) {
    console.error("Error processing next question request:", error.message);
    return res.status(500).json({ message: "Server error", error: error.message });
  }
});

module.exports = router;
