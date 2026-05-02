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
- plants or natural objects (sunflower, cactus, volcano, coral reef)
- landmarks (Eiffel Tower, Colosseum)
- flags
- famous people (recognizable faces)
- artworks
- food dishes
- logos
- maps or geographic shapes
- vehicles (bicycle, airplane, submarine)
- tools and equipment (camp stove, compass, telescope, microscope)
- musical instruments (guitar, piano, violin)
- clothing or accessories (kimono, crown, helmet)
- buildings or structures (castle, pyramid, lighthouse)
- sports equipment (tennis racket, football, skis)
- everyday objects with a distinct visual identity
- sports or physical activities with recognizable visuals (soccer, tennis, basketball, skiing, boxing)
- sport scenes or playing fields/courts with distinct visual identity (soccer field, tennis court, basketball court)

An image SHOULD be used if either:
1. the correct answer is visually recognizable, OR
2. the main subject of the question is visually recognizable, OR
3. the answer belongs to a visual category such as animals, landmarks, sports, tools, vehicles, foods, flags, maps, artworks, or famous people.

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
- Base the decision primarily on the correct answer, but also consider the main subject of the question when the correct answer is a purpose, use, function, or action.

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
