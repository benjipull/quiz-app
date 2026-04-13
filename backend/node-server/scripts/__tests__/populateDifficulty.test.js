const test = require("node:test");
const assert = require("node:assert/strict");

const {
  isCorrectAnswerInQuestionText,
  calculateFinalDifficultyLevel,
} = require("../populateDifficulty");

test("returns true when correct answer appears in question text", () => {
  const result = isCorrectAnswerInQuestionText({
    text: "Which city is known as the City of Light, Paris or Rome?",
    correct_answer: "Paris",
  });

  assert.equal(result, true);
});

test("matches answer case-insensitively", () => {
  const result = isCorrectAnswerInQuestionText({
    text: "What element has the symbol h2o in this trick question?",
    correct_answer: "H2O",
  });

  assert.equal(result, true);
});

test("returns false when answer is not present", () => {
  const result = isCorrectAnswerInQuestionText({
    text: "What is the capital of Italy?",
    correct_answer: "Paris",
  });

  assert.equal(result, false);
});

test("does not treat partial-word matches as present", () => {
  const result = isCorrectAnswerInQuestionText({
    text: "Which craft maps the world?",
    correct_answer: "art",
  });

  assert.equal(result, false);
});

test("returns false when question or answer is empty", () => {
  assert.equal(
    isCorrectAnswerInQuestionText({
      text: "",
      correct_answer: "Paris",
    }),
    false,
  );

  assert.equal(
    isCorrectAnswerInQuestionText({
      text: "What is the capital of France?",
      correct_answer: "",
    }),
    false,
  );
});

test("reduces by 1 when image is present", () => {
  const result = calculateFinalDifficultyLevel(7, {
    reduceForImage: true,
    reduceForAnswerInQuestion: false,
  });

  assert.equal(result, 6);
});

test("reduces by 2 when answer is in question", () => {
  const result = calculateFinalDifficultyLevel(7, {
    reduceForImage: false,
    reduceForAnswerInQuestion: true,
  });

  assert.equal(result, 5);
});

test("reduces by 3 when image is present and answer is in question", () => {
  const result = calculateFinalDifficultyLevel(7, {
    reduceForImage: true,
    reduceForAnswerInQuestion: true,
  });

  assert.equal(result, 4);
});

test("never goes below 1 after reductions", () => {
  const result = calculateFinalDifficultyLevel(2, {
    reduceForImage: true,
    reduceForAnswerInQuestion: true,
  });

  assert.equal(result, 1);
});
