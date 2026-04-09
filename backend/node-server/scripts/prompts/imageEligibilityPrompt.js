function buildImageEligibilityPrompt(question) {
  const questionText = String(question?.text ?? question?.question ?? "").trim();
  const answers = Array.isArray(question?.answers)
    ? question.answers
        .map((answer) => {
          if (answer && typeof answer === "object") {
            return String(answer.text ?? "").trim();
          }
          return String(answer ?? "").trim();
        })
        .filter(Boolean)
    : [];
  const correctAnswer = String(question?.correct_answer ?? question?.correctAnswer ?? "").trim();
  const explanation = String(question?.explanation ?? "").trim();

  return `
You are an assistant that determines whether a trivia question would benefit from displaying an image.

Output STRICT JSON only. No prose or markdown.

=== TASK ===
Determine if showing an image would help the player answer the question.

Return:
- "should_use_image": true or false
- "reason": short explanation

=== DECISION RULE ===

An image SHOULD be used if the correct answer is a visually recognizable, concrete entity that can be clearly depicted.

Examples where image SHOULD be true:
- animals (lion, elephant)
- landmarks (Eiffel Tower, Colosseum)
- flags
- famous people (recognizable faces)
- artworks
- food dishes
- logos
- maps or geographic shapes
- objects with a distinct visual identity

Examples where image SHOULD be false:
- numbers (e.g. "8848 meters")
- dates
- abstract concepts (freedom, gravity)
- definitions
- processes or theories
- units or measurements
- anything where an image would not meaningfully help answer

=== IMPORTANT ===
- Be strict. Only return true if the image would clearly improve the question.
- If unsure, return false.
- Base the decision primarily on the correct_answer.

=== INPUT ===
Question: ${questionText || "N/A"}
Answers: ${answers.length > 0 ? answers.join(", ") : "N/A"}
Correct Answer: ${correctAnswer || "N/A"}
Explanation: ${explanation || "N/A"}

=== OUTPUT FORMAT ===
{
  "should_use_image": boolean,
  "reason": string
}
  `.trim();
}

module.exports = {
  buildImageEligibilityPrompt,
};
