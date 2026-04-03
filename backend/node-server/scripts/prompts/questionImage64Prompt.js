function buildQuestionImage64Prompt(question, categoryName = "") {
  const correctAnswer = String(question?.correct_answer || "").trim();
  const questionText = String(question?.text || "").trim();
  const fallbackCategory = String(categoryName || "").trim();

  const subject =
    correctAnswer ||
    questionText ||
    fallbackCategory ||
    "trivia subject";

  // Keep this prompt independent from category/question prompt builders.
  return `A photorealistic image clearly representing ${subject}, focused on the defining visual traits most commonly associated with ${subject}`;
}

module.exports = {
  buildQuestionImage64Prompt,
};
